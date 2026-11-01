const pool = require('../config/db');

// ─── Publik ──────────────────────────────────────────────────────────────────

/**
 * GET /api/services
 * Mengembalikan daftar layanan yang aktif (is_active = 1).
 */
async function listServices(req, res) {
  const [rows] = await pool.query(
    `SELECT id, name_id, name_en, description_id, description_en, price
       FROM services
      WHERE is_active = 1
      ORDER BY id ASC`
  );
  res.json({ data: rows });
}

// ─── Admin ────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/services
 * Mengembalikan seluruh layanan (termasuk yang tidak aktif) untuk admin.
 */
async function adminListServices(req, res) {
  const [rows] = await pool.query(
    `SELECT id, name_id, name_en, description_id, description_en, price, is_active
       FROM services
      ORDER BY id ASC`
  );
  res.json({ data: rows });
}

/**
 * POST /api/admin/services
 * Membuat layanan baru.
 */
async function createService(req, res) {
  const { name_id, name_en, description_id, description_en, price, is_active } = req.body || {};

  if (!name_id || !name_en) {
    return res.status(400).json({ message: 'name_id dan name_en wajib diisi' });
  }
  const priceVal = parseFloat(price) || 0;
  if (priceVal < 0) {
    return res.status(400).json({ message: 'Harga tidak boleh negatif' });
  }
  const activeVal = is_active === undefined ? 1 : (is_active ? 1 : 0);

  const [result] = await pool.query(
    `INSERT INTO services (name_id, name_en, description_id, description_en, price, is_active)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      String(name_id).trim(),
      String(name_en).trim(),
      description_id ? String(description_id).trim() : null,
      description_en ? String(description_en).trim() : null,
      priceVal,
      activeVal,
    ]
  );
  const [rows] = await pool.query('SELECT * FROM services WHERE id = ?', [result.insertId]);
  res.status(201).json({ message: 'Layanan berhasil dibuat', data: rows[0] });
}

/**
 * GET /api/admin/services/:id
 * Melihat detail satu layanan.
 */
async function getService(req, res) {
  const [rows] = await pool.query('SELECT * FROM services WHERE id = ?', [req.params.id]);
  if (rows.length === 0) {
    return res.status(404).json({ message: 'Layanan tidak ditemukan' });
  }
  res.json({ data: rows[0] });
}

/**
 * PUT /api/admin/services/:id
 * Memperbarui layanan.
 */
async function updateService(req, res) {
  const [existing] = await pool.query('SELECT id FROM services WHERE id = ?', [req.params.id]);
  if (existing.length === 0) {
    return res.status(404).json({ message: 'Layanan tidak ditemukan' });
  }

  const { name_id, name_en, description_id, description_en, price, is_active } = req.body || {};

  if (!name_id || !name_en) {
    return res.status(400).json({ message: 'name_id dan name_en wajib diisi' });
  }
  const priceVal = parseFloat(price) || 0;
  if (priceVal < 0) {
    return res.status(400).json({ message: 'Harga tidak boleh negatif' });
  }

  await pool.query(
    `UPDATE services
        SET name_id = ?, name_en = ?, description_id = ?, description_en = ?,
            price = ?, is_active = ?
      WHERE id = ?`,
    [
      String(name_id).trim(),
      String(name_en).trim(),
      description_id ? String(description_id).trim() : null,
      description_en ? String(description_en).trim() : null,
      priceVal,
      is_active ? 1 : 0,
      req.params.id,
    ]
  );

  const [rows] = await pool.query('SELECT * FROM services WHERE id = ?', [req.params.id]);
  res.json({ message: 'Layanan berhasil diperbarui', data: rows[0] });
}

/**
 * DELETE /api/admin/services/:id
 * Menonaktifkan layanan (soft-delete: set is_active = 0).
 * Tidak menghapus baris agar referensi konsultasi lama tetap valid.
 */
async function deleteService(req, res) {
  const [existing] = await pool.query('SELECT id FROM services WHERE id = ?', [req.params.id]);
  if (existing.length === 0) {
    return res.status(404).json({ message: 'Layanan tidak ditemukan' });
  }
  await pool.query('UPDATE services SET is_active = 0 WHERE id = ?', [req.params.id]);
  res.json({ message: 'Layanan berhasil dinonaktifkan' });
}

module.exports = {
  listServices,
  adminListServices,
  createService,
  getService,
  updateService,
  deleteService,
};
