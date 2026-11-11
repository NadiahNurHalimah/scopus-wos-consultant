const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const pool = require('../config/db');

// Folder penyimpanan bukti pembayaran
const UPLOAD_PAYMENTS_DIR = path.join(__dirname, '..', '..', 'uploads', 'payments');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

if (!fs.existsSync(UPLOAD_PAYMENTS_DIR)) {
  fs.mkdirSync(UPLOAD_PAYMENTS_DIR, { recursive: true });
}

/**
 * Magic bytes untuk JPEG, PNG, dan PDF.
 */
const MAGIC = {
  pdf: Buffer.from([0x25, 0x50, 0x44, 0x46]),       // %PDF
  png: Buffer.from([0x89, 0x50, 0x4e, 0x47]),       // .PNG
  jpg: Buffer.from([0xff, 0xd8, 0xff]),             // JPEG
};

function detectProofMime(buffer) {
  if (!buffer || buffer.length < 4) return null;
  if (buffer.slice(0, 4).equals(MAGIC.pdf)) return 'application/pdf';
  if (buffer.slice(0, 4).equals(MAGIC.png)) return 'image/png';
  if (buffer.slice(0, 3).equals(MAGIC.jpg)) return 'image/jpeg';
  return null;
}

// Multer memory storage agar bisa cek magic bytes
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.pdf'].includes(ext)) {
      return cb(
        Object.assign(new Error('Hanya file JPG, PNG, atau PDF yang diizinkan'), {
          code: 'EXT_INVALID',
        })
      );
    }
    cb(null, true);
  },
}).single('file');

function handleProofUpload(req, res, next) {
  upload(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'Ukuran file bukti pembayaran maksimal 5 MB' });
    }
    if (err.code === 'EXT_INVALID') {
      return res.status(400).json({ message: err.message });
    }
    next(err);
  });
}

/**
 * POST /api/consultations/:id/payments/proof
 * Klien pemilik mengunggah bukti transfer.
 * Jika status konsultasi masih 'submitted', ubah ke 'awaiting_payment' dan catat ke consultation_status_logs.
 * Boleh diunggah ulang bila sebelumnya ditolak (atau pending).
 */
async function uploadPaymentProof(req, res) {
  const { id: userId, role } = req.user;
  const consultationId = req.params.id;

  if (!req.file) {
    return res.status(400).json({ message: 'File bukti pembayaran wajib diunggah (field: file)' });
  }

  // 1. Cek konsultasi
  const [cRows] = await pool.query('SELECT * FROM consultations WHERE id = ?', [consultationId]);
  if (cRows.length === 0) {
    return res.status(404).json({ message: 'Konsultasi tidak ditemukan' });
  }
  const consultation = cRows[0];

  // Klien pemilik saja
  if (role === 'client' && consultation.client_id !== userId) {
    return res.status(403).json({ message: 'Anda tidak memiliki akses ke konsultasi ini' });
  }

  // 2. Cek tagihan payment untuk konsultasi ini (ambil yang terbaru)
  const [pRows] = await pool.query(
    'SELECT * FROM payments WHERE consultation_id = ? ORDER BY id DESC LIMIT 1',
    [consultationId]
  );
  if (pRows.length === 0) {
    return res.status(404).json({ message: 'Tagihan pembayaran tidak ditemukan untuk konsultasi ini' });
  }
  const payment = pRows[0];

  // Jika sudah paid, tidak boleh upload ulang bukti
  if (payment.status === 'paid') {
    return res.status(400).json({ message: 'Pembayaran untuk konsultasi ini sudah lunas' });
  }

  // 3. Validasi magic bytes
  const mime = detectProofMime(req.file.buffer);
  if (!mime) {
    return res.status(400).json({
      message: 'Format file tidak valid. Pastikan file berformat JPG, PNG, atau PDF asli',
    });
  }

  // 4. Simpan ke disk dengan nama acak
  const ext = path.extname(req.file.originalname).toLowerCase();
  const filename = `proof_${consultationId}_${crypto.randomBytes(8).toString('hex')}${ext}`;
  const filePath = path.join(UPLOAD_PAYMENTS_DIR, filename);
  fs.writeFileSync(filePath, req.file.buffer);

  const storedRelative = path.join('uploads', 'payments', filename);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Update payment: proof_path, status kembali ke 'pending' (jika sebelumnya rejected)
    await conn.query(
      `UPDATE payments 
          SET proof_path = ?, status = 'pending', reject_note = NULL, updated_at = NOW()
        WHERE id = ?`,
      [storedRelative, payment.id]
    );

    // Jika status konsultasi masih submitted, ubah ke awaiting_payment
    let statusChanged = false;
    if (consultation.status === 'submitted') {
      await conn.query(
        "UPDATE consultations SET status = 'awaiting_payment', updated_at = NOW() WHERE id = ?",
        [consultationId]
      );
      await conn.query(
        `INSERT INTO consultation_status_logs (consultation_id, old_status, new_status, changed_by)
         VALUES (?, 'submitted', 'awaiting_payment', ?)`,
        [consultationId, userId]
      );
      statusChanged = true;
    }

    await conn.commit();

    const [updatedP] = await pool.query('SELECT * FROM payments WHERE id = ?', [payment.id]);
    res.status(200).json({
      message: 'Bukti pembayaran berhasil diunggah',
      data: updatedP[0],
      consultation_status: statusChanged ? 'awaiting_payment' : consultation.status,
    });
  } catch (err) {
    await conn.rollback();
    // Hapus file jika database gagal
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (e) {}
    }
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * GET /api/payments
 * Klien: hanya miliknya (berdasarkan konsultasi milik klien).
 * Admin: semua, dengan dukungan ?status= dan ?q= (cari kode konsultasi atau nama klien/judul).
 */
async function listPayments(req, res) {
  const { role, id: userId } = req.user;
  const { status, q } = req.query;

  let sql = `
    SELECT p.*,
           c.code AS consultation_code,
           c.manuscript_title,
           c.status AS consultation_status,
           u_client.id AS client_id,
           u_client.name AS client_name,
           u_client.email AS client_email,
           u_admin.name AS verified_by_name
      FROM payments p
      JOIN consultations c ON c.id = p.consultation_id
      JOIN users u_client ON u_client.id = c.client_id
      LEFT JOIN users u_admin ON u_admin.id = p.verified_by
  `;
  const conditions = [];
  const params = [];

  if (role === 'client') {
    conditions.push('c.client_id = ?');
    params.push(userId);
  } else if (role === 'consultant') {
    // Jika konsultan mengakses, batasi ke konsultasi yang ditugaskan
    conditions.push('c.consultant_id = ?');
    params.push(userId);
  }

  if (status && typeof status === 'string' && status.trim()) {
    conditions.push('p.status = ?');
    params.push(status.trim());
  }

  if (q && typeof q === 'string' && q.trim()) {
    conditions.push('(c.code LIKE ? OR c.manuscript_title LIKE ? OR u_client.name LIKE ?)');
    const searchTerm = `%${q.trim()}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' ORDER BY p.created_at DESC';

  const [rows] = await pool.query(sql, params);
  res.json({ data: rows });
}

/**
 * GET /api/payments/:id/proof
 * Hanya klien pemilik konsultasi dan admin yang boleh mengunduh/melihat bukti.
 */
async function getPaymentProof(req, res) {
  const { role, id: userId } = req.user;
  const paymentId = req.params.id;

  const [rows] = await pool.query(
    `SELECT p.*, c.client_id
       FROM payments p
       JOIN consultations c ON c.id = p.consultation_id
      WHERE p.id = ?`,
    [paymentId]
  );

  if (rows.length === 0) {
    return res.status(404).json({ message: 'Data pembayaran tidak ditemukan' });
  }

  const payment = rows[0];

  if (role === 'client' && payment.client_id !== userId) {
    return res.status(403).json({ message: 'Anda tidak memiliki akses ke bukti pembayaran ini' });
  }
  if (role === 'consultant') {
    return res.status(403).json({ message: 'Konsultan tidak memiliki akses ke bukti pembayaran' });
  }

  if (!payment.proof_path) {
    return res.status(404).json({ message: 'Bukti pembayaran belum diunggah' });
  }

  const absolutePath = path.join(__dirname, '..', '..', payment.proof_path);
  if (!fs.existsSync(absolutePath)) {
    return res.status(404).json({ message: 'File bukti pembayaran tidak ditemukan di server' });
  }

  // Tentukan content-type
  const ext = path.extname(payment.proof_path).toLowerCase();
  let contentType = 'application/octet-stream';
  if (ext === '.pdf') contentType = 'application/pdf';
  else if (ext === '.png') contentType = 'image/png';
  else if (['.jpg', '.jpeg'].includes(ext)) contentType = 'image/jpeg';

  res.setHeader('Content-Type', contentType);
  res.sendFile(absolutePath);
}

/**
 * PATCH /api/payments/:id
 * Khusus Admin.
 * Status: 'paid' atau 'rejected'.
 * Catatan penolakan (reject_note) WAJIB saat 'rejected'.
 * Jika paid dan status konsultasi masih 'awaiting_payment' atau 'submitted', ubah konsultasi ke 'in_review' dan catat log.
 * Pembayaran yang sudah paid tidak boleh diubah lagi.
 */
async function updatePaymentStatus(req, res) {
  const adminId = req.user.id;
  const paymentId = req.params.id;
  const { status: newStatus, reject_note } = req.body || {};

  if (!newStatus || !['paid', 'rejected'].includes(newStatus)) {
    return res.status(400).json({ message: "Status pembayaran hanya boleh 'paid' atau 'rejected'" });
  }

  if (newStatus === 'rejected' && (!reject_note || !String(reject_note).trim())) {
    return res.status(400).json({ message: 'Catatan penolakan (reject_note) wajib diisi saat menolak pembayaran' });
  }

  const [pRows] = await pool.query(
    `SELECT p.*, c.status AS consultation_status, c.client_id
       FROM payments p
       JOIN consultations c ON c.id = p.consultation_id
      WHERE p.id = ?`,
    [paymentId]
  );

  if (pRows.length === 0) {
    return res.status(404).json({ message: 'Data pembayaran tidak ditemukan' });
  }

  const payment = pRows[0];

  // Pembayaran yang sudah paid tidak boleh diubah lagi
  if (payment.status === 'paid') {
    return res.status(400).json({ message: 'Pembayaran yang sudah berstatus lunas (paid) tidak dapat diubah lagi' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const note = newStatus === 'rejected' ? String(reject_note).trim() : null;

    await conn.query(
      `UPDATE payments 
          SET status = ?, verified_by = ?, reject_note = ?, updated_at = NOW()
        WHERE id = ?`,
      [newStatus, adminId, note, paymentId]
    );

    // Jika status 'paid' dan konsultasi masih 'awaiting_payment' atau 'submitted', ubah konsultasi ke 'in_review'
    let consUpdated = false;
    if (newStatus === 'paid' && ['awaiting_payment', 'submitted'].includes(payment.consultation_status)) {
      await conn.query(
        "UPDATE consultations SET status = 'in_review', updated_at = NOW() WHERE id = ?",
        [payment.consultation_id]
      );
      await conn.query(
        `INSERT INTO consultation_status_logs (consultation_id, old_status, new_status, changed_by)
         VALUES (?, ?, 'in_review', ?)`,
        [payment.consultation_id, payment.consultation_status, adminId]
      );
      consUpdated = true;
    }

    await conn.commit();

    const [updatedP] = await pool.query('SELECT * FROM payments WHERE id = ?', [paymentId]);
    res.json({
      message: `Status pembayaran berhasil diubah menjadi ${newStatus}`,
      data: updatedP[0],
      consultation_status: consUpdated ? 'in_review' : payment.consultation_status,
    });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = {
  handleProofUpload,
  uploadPaymentProof,
  listPayments,
  getPaymentProof,
  updatePaymentStatus,
};

