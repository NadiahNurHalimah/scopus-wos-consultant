const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const pool = require('../config/db');

// Folder penyimpanan lampiran pesan
const UPLOAD_MESSAGES_DIR = path.join(__dirname, '..', '..', 'uploads', 'messages');
const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024; // 5 MB

if (!fs.existsSync(UPLOAD_MESSAGES_DIR)) {
  fs.mkdirSync(UPLOAD_MESSAGES_DIR, { recursive: true });
}

/**
 * Magic bytes untuk lampiran: PDF, DOCX, JPG, PNG
 */
const MAGIC = {
  pdf: Buffer.from([0x25, 0x50, 0x44, 0x46]),       // %PDF
  png: Buffer.from([0x89, 0x50, 0x4e, 0x47]),       // .PNG
  jpg: Buffer.from([0xff, 0xd8, 0xff]),             // JPEG
  docx: Buffer.from([0x50, 0x4b, 0x03, 0x04]),       // PK.. (ZIP / Office Open XML)
};

function detectAttachmentMime(buffer) {
  if (!buffer || buffer.length < 4) return null;
  if (buffer.slice(0, 4).equals(MAGIC.pdf)) return 'application/pdf';
  if (buffer.slice(0, 4).equals(MAGIC.png)) return 'image/png';
  if (buffer.slice(0, 3).equals(MAGIC.jpg)) return 'image/jpeg';
  if (buffer.slice(0, 4).equals(MAGIC.docx)) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  return null;
}

// Multer memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_ATTACHMENT_SIZE },
  fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.pdf', '.docx', '.jpg', '.jpeg', '.png'].includes(ext)) {
      return cb(
        Object.assign(
          new Error('Lampiran hanya boleh berformat PDF, DOCX, JPG, atau PNG'),
          { code: 'EXT_INVALID' }
        )
      );
    }
    cb(null, true);
  },
}).single('attachment');

function handleAttachmentUpload(req, res, next) {
  upload(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'Ukuran lampiran pesan maksimal 5 MB' });
    }
    if (err.code === 'EXT_INVALID') {
      return res.status(400).json({ message: err.message });
    }
    next(err);
  });
}

/**
 * Helper verifikasi hak akses konsultasi:
 * Klien pemilik, konsultan yang ditugaskan, atau admin.
 */
async function checkConsultationAccess(consultationId, user) {
  const [rows] = await pool.query('SELECT * FROM consultations WHERE id = ?', [consultationId]);
  if (rows.length === 0) {
    return { error: { status: 404, message: 'Konsultasi tidak ditemukan' } };
  }
  const consultation = rows[0];

  if (user.role === 'client' && consultation.client_id !== user.id) {
    return { error: { status: 403, message: 'Anda tidak memiliki akses ke konsultasi ini' } };
  }
  if (user.role === 'consultant' && consultation.consultant_id !== user.id) {
    return { error: { status: 403, message: 'Konsultasi ini tidak ditugaskan kepada Anda' } };
  }

  return { consultation };
}

/**
 * GET /api/consultations/:id/messages
 * Mendukung query ?after_id= (mengambil pesan dengan id > after_id).
 */
async function listMessages(req, res) {
  const consultationId = req.params.id;
  const access = await checkConsultationAccess(consultationId, req.user);
  if (access.error) {
    return res.status(access.error.status).json({ message: access.error.message });
  }

  const { after_id } = req.query;
  let sql = `
    SELECT m.id, m.consultation_id, m.sender_id, m.body,
           m.attachment_path, m.mime_type, m.size_bytes, m.is_read, m.created_at,
           u.name AS sender_name, u.role AS sender_role
      FROM messages m
      JOIN users u ON u.id = m.sender_id
     WHERE m.consultation_id = ?
  `;
  const params = [consultationId];

  if (after_id && !isNaN(Number(after_id))) {
    sql += ' AND m.id > ?';
    params.push(Number(after_id));
  }

  sql += ' ORDER BY m.id ASC';

  const [rows] = await pool.query(sql, params);
  res.json({ data: rows });
}

/**
 * POST /api/consultations/:id/messages
 * Body teks (maksimal 2000 karakter), lampiran opsional (maks 5 MB).
 */
async function sendMessage(req, res) {
  const consultationId = req.params.id;
  const senderId = req.user.id;

  const access = await checkConsultationAccess(consultationId, req.user);
  if (access.error) {
    return res.status(access.error.status).json({ message: access.error.message });
  }

  const { body } = req.body || {};
  const hasText = body && typeof body === 'string' && body.trim().length > 0;
  const hasFile = Boolean(req.file);

  if (!hasText && !hasFile) {
    return res.status(400).json({ message: 'Pesan atau lampiran wajib diisi' });
  }

  const cleanBody = hasText ? body.trim() : '';
  if (cleanBody.length > 2000) {
    return res.status(400).json({ message: 'Isi pesan maksimal 2000 karakter' });
  }

  let storedPath = null;
  let mimeType = null;
  let sizeBytes = null;

  if (hasFile) {
    const detectedMime = detectAttachmentMime(req.file.buffer);
    if (!detectedMime) {
      return res.status(400).json({
        message: 'Lampiran tidak valid. Pastikan file berformat PDF, DOCX, JPG, atau PNG asli',
      });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const filename = `msg_${consultationId}_${crypto.randomBytes(8).toString('hex')}${ext}`;
    const filePath = path.join(UPLOAD_MESSAGES_DIR, filename);
    fs.writeFileSync(filePath, req.file.buffer);

    storedPath = path.join('uploads', 'messages', filename);
    mimeType = detectedMime;
    sizeBytes = req.file.size;
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO messages 
         (consultation_id, sender_id, body, attachment_path, mime_type, size_bytes, is_read)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [consultationId, senderId, cleanBody, storedPath, mimeType, sizeBytes]
    );

    const [rows] = await pool.query(
      `SELECT m.*, u.name AS sender_name, u.role AS sender_role
         FROM messages m
         JOIN users u ON u.id = m.sender_id
        WHERE m.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      message: 'Pesan berhasil dikirim',
      data: rows[0],
    });
  } catch (err) {
    if (storedPath) {
      const full = path.join(__dirname, '..', '..', storedPath);
      if (fs.existsSync(full)) {
        try { fs.unlinkSync(full); } catch (e) {}
      }
    }
    throw err;
  }
}

/**
 * PATCH /api/consultations/:id/messages/read
 * Menandai pesan dari pihak lain (sender_id != req.user.id) sebagai sudah dibaca (is_read = 1).
 */
async function markMessagesAsRead(req, res) {
  const consultationId = req.params.id;
  const userId = req.user.id;

  const access = await checkConsultationAccess(consultationId, req.user);
  if (access.error) {
    return res.status(access.error.status).json({ message: access.error.message });
  }

  const [result] = await pool.query(
    'UPDATE messages SET is_read = 1 WHERE consultation_id = ? AND sender_id != ? AND is_read = 0',
    [consultationId, userId]
  );

  res.json({
    message: 'Pesan berhasil ditandai sebagai sudah dibaca',
    affected_rows: result.affectedRows,
  });
}

/**
 * GET /api/messages/:id/attachment
 * Download lampiran pesan dengan pemeriksaan hak akses (klien pemilik, konsultan terkait, admin).
 */
async function downloadAttachment(req, res) {
  const messageId = req.params.id;

  const [rows] = await pool.query(
    `SELECT m.*, c.client_id, c.consultant_id
       FROM messages m
       JOIN consultations c ON c.id = m.consultation_id
      WHERE m.id = ?`,
    [messageId]
  );

  if (rows.length === 0) {
    return res.status(404).json({ message: 'Pesan tidak ditemukan' });
  }

  const msg = rows[0];

  // Cek hak akses
  if (req.user.role === 'client' && msg.client_id !== req.user.id) {
    return res.status(403).json({ message: 'Anda tidak memiliki akses ke lampiran ini' });
  }
  if (req.user.role === 'consultant' && msg.consultant_id !== req.user.id) {
    return res.status(403).json({ message: 'Anda tidak memiliki akses ke lampiran ini' });
  }

  if (!msg.attachment_path) {
    return res.status(404).json({ message: 'Pesan ini tidak memiliki lampiran' });
  }

  const absolutePath = path.join(__dirname, '..', '..', msg.attachment_path);
  if (!fs.existsSync(absolutePath)) {
    return res.status(404).json({ message: 'File lampiran tidak ditemukan di server' });
  }

  res.setHeader('Content-Type', msg.mime_type || 'application/octet-stream');
  res.sendFile(absolutePath);
}

module.exports = {
  handleAttachmentUpload,
  listMessages,
  sendMessage,
  markMessagesAsRead,
  downloadAttachment,
};

