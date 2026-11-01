const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const pool = require('../config/db');

// ─── Konstanta ────────────────────────────────────────────────────────────────

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'manuscripts');
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

// Pastikan folder upload ada
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * Magic bytes untuk tipe file yang diizinkan.
 * Kita baca 8 byte pertama file dan cocokkan.
 */
const MAGIC_BYTES = {
  // DOCX (Office Open XML) – dimulai dengan PK (ZIP)
  docx: Buffer.from([0x50, 0x4b, 0x03, 0x04]),
  // PDF
  pdf: Buffer.from([0x25, 0x50, 0x44, 0x46]),
};

/**
 * Memeriksa tipe file berdasarkan magic bytes.
 * Mengembalikan 'application/pdf', 'application/vnd.openxmlformats-...' atau null.
 */
function detectMime(filePath) {
  let fd;
  try {
    fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(8);
    fs.readSync(fd, buf, 0, 8, 0);

    if (buf.slice(0, 4).equals(MAGIC_BYTES.pdf)) {
      return 'application/pdf';
    }
    if (buf.slice(0, 4).equals(MAGIC_BYTES.docx)) {
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }
    return null;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

// ─── Multer – simpan sementara di memori (buffer) ────────────────────────────
// Kita pakai memoryStorage supaya bisa periksa magic bytes sebelum menyimpan ke disk.

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE },
  fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.pdf', '.docx'].includes(ext)) {
      return cb(
        Object.assign(new Error('Hanya file PDF dan DOCX yang diizinkan'), { code: 'EXT_INVALID' })
      );
    }
    cb(null, true);
  },
}).single('file');

/**
 * Middleware pembungkus multer yang mengembalikan error 400 yang ramah.
 */
function handleUpload(req, res, next) {
  upload(req, res, (err) => {
    if (!err) return next();

    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'Ukuran file maksimal 10 MB' });
    }
    if (err.code === 'EXT_INVALID') {
      return res.status(400).json({ message: err.message });
    }
    next(err);
  });
}

// ─── Upload naskah ────────────────────────────────────────────────────────────

/**
 * POST /api/consultations/:id/manuscripts
 * Unggah naskah baru (klien atau konsultan). Versi naik otomatis.
 */
async function uploadManuscript(req, res) {
  const { role, id: userId } = req.user;
  const consultationId = req.params.id;

  if (!req.file) {
    return res.status(400).json({ message: 'File wajib diunggah (field: file)' });
  }

  // Periksa konsultasi
  const [cRows] = await pool.query('SELECT * FROM consultations WHERE id = ?', [consultationId]);
  if (cRows.length === 0) {
    return res.status(404).json({ message: 'Konsultasi tidak ditemukan' });
  }
  const consultation = cRows[0];

  // Hak akses: klien hanya untuk konsultasinya, konsultan hanya yang ditugaskan
  if (role === 'client' && consultation.client_id !== userId) {
    return res.status(403).json({ message: 'Anda tidak memiliki akses ke konsultasi ini' });
  }
  if (role === 'consultant' && consultation.consultant_id !== userId) {
    return res.status(403).json({ message: 'Konsultasi ini tidak ditugaskan kepada Anda' });
  }

  // Simpan buffer ke file sementara untuk pemeriksaan magic bytes
  const tmpName = `tmp_${crypto.randomBytes(8).toString('hex')}`;
  const tmpPath = path.join(UPLOAD_DIR, tmpName);
  fs.writeFileSync(tmpPath, req.file.buffer);

  let mime;
  try {
    mime = detectMime(tmpPath);
  } catch (e) {
    fs.unlinkSync(tmpPath);
    return res.status(400).json({ message: 'Gagal membaca file yang diunggah' });
  }

  if (!mime) {
    fs.unlinkSync(tmpPath);
    return res
      .status(400)
      .json({ message: 'Tipe file tidak valid. Hanya PDF dan DOCX yang diizinkan' });
  }

  // Tentukan versi berikutnya
  const [vRows] = await pool.query(
    'SELECT COALESCE(MAX(version), 0) AS max_ver FROM manuscripts WHERE consultation_id = ?',
    [consultationId]
  );
  const nextVersion = parseInt(vRows[0].max_ver || 0, 10) + 1;

  // Nama file final: <consultationId>_v<version>_<random>.<ext>
  const ext = path.extname(req.file.originalname).toLowerCase();
  const finalName = `${consultationId}_v${nextVersion}_${crypto.randomBytes(6).toString('hex')}${ext}`;
  const finalPath = path.join(UPLOAD_DIR, finalName);
  fs.renameSync(tmpPath, finalPath);

  // Simpan ke database
  const storedRelative = path.join('uploads', 'manuscripts', finalName);
  const [result] = await pool.query(
    `INSERT INTO manuscripts
       (consultation_id, version, original_name, stored_path, mime_type, size_bytes, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      consultationId,
      nextVersion,
      req.file.originalname,
      storedRelative,
      mime,
      req.file.size,
      userId,
    ]
  );

  const [rows] = await pool.query('SELECT * FROM manuscripts WHERE id = ?', [result.insertId]);
  return res.status(201).json({
    message: `Naskah versi ${nextVersion} berhasil diunggah`,
    data: rows[0],
  });
}

// ─── Download naskah ──────────────────────────────────────────────────────────

/**
 * GET /api/manuscripts/:id/download
 * Hanya klien pemilik, konsultan yang ditugaskan, dan admin yang boleh mengunduh.
 */
async function downloadManuscript(req, res) {
  const { role, id: userId } = req.user;

  const [mRows] = await pool.query(
    `SELECT m.*, c.client_id, c.consultant_id
       FROM manuscripts m
       JOIN consultations c ON c.id = m.consultation_id
      WHERE m.id = ?`,
    [req.params.id]
  );
  if (mRows.length === 0) {
    return res.status(404).json({ message: 'Naskah tidak ditemukan' });
  }
  const manuscript = mRows[0];

  // Periksa hak akses
  if (role === 'client' && manuscript.client_id !== userId) {
    return res.status(403).json({ message: 'Anda tidak memiliki akses ke naskah ini' });
  }
  if (role === 'consultant' && manuscript.consultant_id !== userId) {
    return res.status(403).json({ message: 'Naskah ini tidak terkait konsultasi yang ditugaskan kepada Anda' });
  }

  // Path absolut dari root backend
  const absolutePath = path.join(__dirname, '..', '..', manuscript.stored_path);
  if (!fs.existsSync(absolutePath)) {
    return res.status(404).json({ message: 'File tidak ditemukan di server' });
  }

  res.setHeader('Content-Type', manuscript.mime_type || 'application/octet-stream');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${encodeURIComponent(manuscript.original_name)}"`
  );
  res.sendFile(absolutePath);
}

module.exports = { handleUpload, uploadManuscript, downloadManuscript };
