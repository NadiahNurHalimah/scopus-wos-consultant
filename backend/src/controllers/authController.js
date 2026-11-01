const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

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

module.exports = { register, login, me };
