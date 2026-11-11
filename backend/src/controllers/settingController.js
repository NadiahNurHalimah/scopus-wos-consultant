const pool = require('../config/db');

/**
 * GET /api/settings/payment
 * Harus login. Mengembalikan informasi rekening pembayaran.
 */
async function getPaymentSettings(req, res) {
  const [rows] = await pool.query(
    `SELECT \`key\`, \`value\` FROM settings 
     WHERE \`key\` IN ('payment_bank', 'payment_account_number', 'payment_account_name')`
  );

  const settingsMap = {};
  rows.forEach((r) => {
    settingsMap[r.key] = r.value;
  });

  res.json({
    data: {
      bank: settingsMap['payment_bank'] || '',
      account_number: settingsMap['payment_account_number'] || '',
      account_name: settingsMap['payment_account_name'] || '',
    },
  });
}

/**
 * GET /api/admin/settings
 * Khusus admin. Mengambil semua pengaturan dalam bentuk array atau key-value map.
 */
async function adminGetSettings(req, res) {
  const [rows] = await pool.query(
    'SELECT `key`, `value`, created_at, updated_at FROM settings ORDER BY `key` ASC'
  );

  const settingsMap = {};
  rows.forEach((r) => {
    settingsMap[r.key] = r.value;
  });

  res.json({
    data: rows,
    settings: settingsMap,
  });
}

/**
 * PUT /api/admin/settings
 * Khusus admin. Memperbarui pengaturan (menerima object key-value di req.body).
 * Contoh body: { "payment_bank": "BCA", "payment_account_number": "1234567890", "payment_account_name": "Scientia" }
 */
async function adminUpdateSettings(req, res) {
  const updates = req.body;
  if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
    return res.status(400).json({ message: 'Body request harus berupa object key-value pengaturan' });
  }

  const entries = Object.entries(updates);
  if (entries.length === 0) {
    return res.status(400).json({ message: 'Tidak ada data pengaturan yang dikirim' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    for (const [key, val] of entries) {
      if (typeof key !== 'string' || !key.trim()) continue;
      const strVal = val === null || val === undefined ? '' : String(val);
      await conn.query(
        `INSERT INTO settings (\`key\`, \`value\`)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`), \`updated_at\` = NOW()`,
        [key.trim(), strVal]
      );
    }

    await conn.commit();

    const [rows] = await pool.query(
      'SELECT `key`, `value`, created_at, updated_at FROM settings ORDER BY `key` ASC'
    );
    const settingsMap = {};
    rows.forEach((r) => {
      settingsMap[r.key] = r.value;
    });

    res.json({
      message: 'Pengaturan berhasil diperbarui',
      data: rows,
      settings: settingsMap,
    });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = {
  getPaymentSettings,
  adminGetSettings,
  adminUpdateSettings,
};

