const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { sendResetCodeEmail } = require('../services/emailService');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

function publicUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    whatsapp: u.whatsapp,
    institution: u.institution,
    role: u.role,
  };
}

async function register(req, res) {
  const { name, email, password, whatsapp, institution } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Nama, email, dan kata sandi wajib diisi' });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ message: 'Format email tidak valid' });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ message: 'Kata sandi minimal 8 karakter' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
  if (existing.length > 0) {
    return res.status(409).json({ message: 'Email sudah terdaftar' });
  }

  const passwordHash = await bcrypt.hash(String(password), 10);

  try {
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password_hash, whatsapp, institution) VALUES (?, ?, ?, ?, ?)',
      [String(name).trim(), cleanEmail, passwordHash, whatsapp || null, institution || null]
    );
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
    const user = rows[0];
    return res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Email sudah terdaftar' });
    }
    throw err;
  }
}

async function login(req, res) {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: 'Email dan kata sandi wajib diisi' });
  }

  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [
    String(email).trim().toLowerCase(),
  ]);
  const user = rows[0];

  const valid = user && (await bcrypt.compare(String(password), user.password_hash));
  if (!valid) {
    return res.status(401).json({ message: 'Email atau kata sandi salah' });
  }
  if (!user.is_active) {
    return res.status(403).json({ message: 'Akun dinonaktifkan' });
  }

  res.json({ token: signToken(user), user: publicUser(user) });
}

async function me(req, res) {
  const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
  if (rows.length === 0) {
    return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
  }
  res.json({ user: publicUser(rows[0]) });
}

async function forgotPassword(req, res) {
  const { email } = req.body || {};
  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ message: 'Masukkan email yang valid' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const [rows] = await pool.query('SELECT id, name FROM users WHERE email = ?', [cleanEmail]);

  // Untuk keamanan, tetap berikan pesan berhasil meskipun email tidak terdaftar
  if (rows.length === 0) {
    return res.json({ message: 'Jika email terdaftar, kode verifikasi telah dikirimkan ke email Anda' });
  }

  // Generate 6 digit random number
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  // Berlaku 15 menit
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  // Tandai kode lama untuk email ini sebagai used
  await pool.query('UPDATE password_resets SET used = 1 WHERE email = ? AND used = 0', [cleanEmail]);

  await pool.query(
    'INSERT INTO password_resets (email, code, expires_at) VALUES (?, ?, ?)',
    [cleanEmail, code, expiresAt]
  );

  try {
    await sendResetCodeEmail(cleanEmail, code);
  } catch (mailErr) {
    console.error('Gagal mengirim email reset password:', mailErr);
  }

  res.json({ message: 'Kode verifikasi telah dikirimkan ke email Anda' });
}

async function resetPassword(req, res) {
  const { email, code, new_password } = req.body || {};

  if (!email || !code || !new_password) {
    return res.status(400).json({ message: 'Email, kode verifikasi, dan kata sandi baru wajib diisi' });
  }

  if (String(new_password).length < 8) {
    return res.status(400).json({ message: 'Kata sandi minimal 8 karakter' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const cleanCode = String(code).trim();

  const [resets] = await pool.query(
    'SELECT * FROM password_resets WHERE email = ? AND code = ? AND used = 0 AND expires_at > NOW() ORDER BY id DESC LIMIT 1',
    [cleanEmail, cleanCode]
  );

  if (resets.length === 0) {
    return res.status(400).json({ message: 'Kode verifikasi tidak valid atau telah kedaluwarsa' });
  }

  const passwordHash = await bcrypt.hash(String(new_password), 10);

  // Update password user
  await pool.query('UPDATE users SET password_hash = ? WHERE email = ?', [passwordHash, cleanEmail]);

  // Tandai kode sebagai terpakai
  await pool.query('UPDATE password_resets SET used = 1 WHERE id = ?', [resets[0].id]);

  res.json({ message: 'Kata sandi berhasil diperbarui. Silakan masuk dengan kata sandi baru Anda.' });
}

module.exports = { register, login, me, forgotPassword, resetPassword };
