const pool = require('../config/db');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const VALID_INDICES = ['Scopus', 'WoS', 'Scopus & WoS', ''];
const VALID_QUARTILES = ['Q1', 'Q2', 'Q3', 'Q4', ''];

/**
 * Membuat kode konsultasi unik SA-YYYY-NNNN.
 * Menggunakan transaksi agar tidak ada race condition.
 */
async function generateCode(conn) {
  const year = new Date().getFullYear();
  const prefix = `SA-${year}-`;

  const [rows] = await conn.query(
    `SELECT code FROM consultations WHERE code LIKE ? ORDER BY id DESC LIMIT 1 FOR UPDATE`,
    [`${prefix}%`]
  );

  let nextNum = 1;
  if (rows.length > 0) {
    const lastCode = rows[0].code; // mis: SA-2026-0042
    const parts = lastCode.split('-');
    nextNum = parseInt(parts[2], 10) + 1;
  }

  return `${prefix}${String(nextNum).padStart(4, '0')}`;
}

/**
 * Menghasilkan unique_code 1..999 yang tidak sedang dipakai tagihan pending lain.
 */
async function generateUniqueCode(conn) {
  const [rows] = await conn.query(
    "SELECT unique_code FROM payments WHERE status = 'pending' AND unique_code > 0 FOR UPDATE"
  );
  const usedCodes = new Set(rows.map((r) => r.unique_code));

  // Coba acak 1..999
  for (let i = 0; i < 2000; i++) {
    const candidate = Math.floor(Math.random() * 999) + 1;
    if (!usedCodes.has(candidate)) {
      return candidate;
    }
  }

  // Jika random padat, cari angka 1..999 pertama yang kosong
  for (let c = 1; c <= 999; c++) {
    if (!usedCodes.has(c)) {
      return c;
    }
  }

  // Fallback
  return Math.floor(Math.random() * 999) + 1;
}

/**
 * Transisi status yang diizinkan.
 * Key = status saat ini, value = array status tujuan yang valid.
 */
const TRANSITIONS = {
  submitted: ['awaiting_payment', 'cancelled'],
  awaiting_payment: ['in_review', 'cancelled'],
  in_review: ['in_progress', 'cancelled'],
  in_progress: ['revision', 'completed'],
  revision: ['in_progress', 'completed'],
  completed: [],
  cancelled: [],
};

// ─── Klien ────────────────────────────────────────────────────────────────────

/**
 * POST /api/consultations
 * Klien mengajukan konsultasi baru.
 * Buat satu tagihan pending di payments: base_amount = harga layanan, unique_code = 1..999, amount = base_amount + unique_code.
 * Status konsultasi tetap 'submitted'.
 */
async function createConsultation(req, res) {
  const clientId = req.user.id;
  const { service_id, manuscript_title, field, target_index, target_quartile, notes } =
    req.body || {};

  // Validasi input wajib
  if (!service_id || !manuscript_title) {
    return res.status(400).json({ message: 'service_id dan manuscript_title wajib diisi' });
  }
  if (String(manuscript_title).trim().length < 5) {
    return res.status(400).json({ message: 'Judul naskah minimal 5 karakter' });
  }
  if (target_index && !VALID_INDICES.includes(target_index)) {
    return res
      .status(400)
      .json({ message: `target_index tidak valid. Gunakan: ${VALID_INDICES.filter(Boolean).join(', ')}` });
  }
  if (target_quartile && !VALID_QUARTILES.includes(target_quartile)) {
    return res
      .status(400)
      .json({ message: `target_quartile tidak valid. Gunakan: ${VALID_QUARTILES.filter(Boolean).join(', ')}` });
  }

  // Pastikan layanan ada dan aktif
  const [svcRows] = await pool.query(
    'SELECT id, price FROM services WHERE id = ? AND is_active = 1',
    [service_id]
  );
  if (svcRows.length === 0) {
    return res.status(404).json({ message: 'Layanan tidak ditemukan atau tidak aktif' });
  }
  const service = svcRows[0];
  const baseAmount = Number(service.price) || 0;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const code = await generateCode(conn);

    const [result] = await conn.query(
      `INSERT INTO consultations
         (code, client_id, service_id, manuscript_title, field, target_index, target_quartile, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'submitted')`,
      [
        code,
        clientId,
        service_id,
        String(manuscript_title).trim(),
        field ? String(field).trim() : null,
        target_index || null,
        target_quartile || null,
        notes ? String(notes).trim() : null,
      ]
    );

    const consultationId = result.insertId;

    // Catat log status awal
    await conn.query(
      `INSERT INTO consultation_status_logs (consultation_id, old_status, new_status, changed_by)
       VALUES (?, NULL, 'submitted', ?)`,
      [consultationId, clientId]
    );

    // Buat tagihan pending di payments
    const uniqueCode = await generateUniqueCode(conn);
    const totalAmount = baseAmount + uniqueCode;

    await conn.query(
      `INSERT INTO payments (consultation_id, base_amount, unique_code, amount, method, status)
       VALUES (?, ?, ?, ?, 'transfer', 'pending')`,
      [consultationId, baseAmount, uniqueCode, totalAmount]
    );

    await conn.commit();

    const [rows] = await pool.query(
      `SELECT c.*, s.name_id AS service_name_id, s.name_en AS service_name_en
         FROM consultations c
         JOIN services s ON s.id = c.service_id
        WHERE c.id = ?`,
      [consultationId]
    );
    return res.status(201).json({ message: 'Konsultasi berhasil diajukan', data: rows[0] });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// ─── GET list ─────────────────────────────────────────────────────────────────

/**
 * GET /api/consultations
 * - Klien: hanya miliknya
 * - Konsultan: yang ditugaskan padanya
 * - Admin: semua
 * Mendukung ?status= dan ?q= (cari kode atau judul), serta memuat unread_count per konsultasi.
 */
async function listConsultations(req, res) {
  const { role, id: userId } = req.user;
  const { status, q } = req.query;

  let sql = `
    SELECT c.id, c.code, c.manuscript_title, c.field, c.target_index, c.target_quartile,
           c.status, c.created_at, c.updated_at,
           s.name_id AS service_name_id, s.name_en AS service_name_en,
           u_client.name AS client_name,
           u_consultant.name AS consultant_name,
           (
             SELECT COUNT(*)
               FROM messages m
              WHERE m.consultation_id = c.id
                AND m.sender_id != ?
                AND m.is_read = 0
           ) AS unread_count
      FROM consultations c
      JOIN services s ON s.id = c.service_id
      JOIN users u_client ON u_client.id = c.client_id
      LEFT JOIN users u_consultant ON u_consultant.id = c.consultant_id
  `;
  const conditions = [];
  const params = [userId]; // untuk subquery unread_count

  if (role === 'client') {
    conditions.push('c.client_id = ?');
    params.push(userId);
  } else if (role === 'consultant') {
    conditions.push('c.consultant_id = ?');
    params.push(userId);
  }
  // admin: tanpa filter peran

  if (status && typeof status === 'string' && status.trim()) {
    conditions.push('c.status = ?');
    params.push(status.trim());
  }

  if (q && typeof q === 'string' && q.trim()) {
    conditions.push('(c.code LIKE ? OR c.manuscript_title LIKE ?)');
    const searchTerm = `%${q.trim()}%`;
    params.push(searchTerm, searchTerm);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' ORDER BY c.created_at DESC';

  const [rows] = await pool.query(sql, params);
  res.json({ data: rows });
}

// ─── GET summary ──────────────────────────────────────────────────────────────

/**
 * GET /api/consultations/summary
 * Jumlah konsultasi per status sesuai peran pemanggil (untuk tab filter).
 */
async function getConsultationsSummary(req, res) {
  const { role, id: userId } = req.user;

  let sql = `
    SELECT status, COUNT(*) AS count
      FROM consultations
  `;
  const conditions = [];
  const params = [];

  if (role === 'client') {
    conditions.push('client_id = ?');
    params.push(userId);
  } else if (role === 'consultant') {
    conditions.push('consultant_id = ?');
    params.push(userId);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' GROUP BY status';

  const [rows] = await pool.query(sql, params);

  const allStatuses = [
    'submitted',
    'awaiting_payment',
    'in_review',
    'in_progress',
    'revision',
    'completed',
    'cancelled',
  ];

  const summary = { total: 0 };
  allStatuses.forEach((s) => {
    summary[s] = 0;
  });

  rows.forEach((r) => {
    summary[r.status] = Number(r.count);
    summary.total += Number(r.count);
  });

  res.json({ data: summary });
}

// ─── GET detail ───────────────────────────────────────────────────────────────

/**
 * GET /api/consultations/:id
 * Cek bahwa peminta adalah pihak yang terkait.
 * Memuat:
 * - nama konsultan yang ditugaskan
 * - daftar naskah (id, versi, nama file asli, pengunggah dan perannya, tanggal)
 * - riwayat status dari consultation_status_logs (status lama, baru, pelaku, waktu)
 * - ringkasan pembayaran terbaru (status, total)
 * - jumlah pesan belum dibaca
 */
async function getConsultation(req, res) {
  const { role, id: userId } = req.user;
  const consultationId = req.params.id;

  const [rows] = await pool.query(
    `SELECT c.*,
            s.name_id AS service_name_id, s.name_en AS service_name_en, s.price AS service_price,
            u_client.name AS client_name, u_client.email AS client_email,
            u_client.whatsapp AS client_whatsapp,
            u_consultant.name AS consultant_name, u_consultant.email AS consultant_email
       FROM consultations c
       JOIN services s ON s.id = c.service_id
       JOIN users u_client ON u_client.id = c.client_id
       LEFT JOIN users u_consultant ON u_consultant.id = c.consultant_id
      WHERE c.id = ?`,
    [consultationId]
  );
  if (rows.length === 0) {
    return res.status(404).json({ message: 'Konsultasi tidak ditemukan' });
  }

  const c = rows[0];

  // Periksa hak akses berdasarkan peran
  if (role === 'client' && c.client_id !== userId) {
    return res.status(403).json({ message: 'Anda tidak memiliki akses ke konsultasi ini' });
  }
  if (role === 'consultant' && c.consultant_id !== userId) {
    return res.status(403).json({ message: 'Konsultasi ini tidak ditugaskan kepada Anda' });
  }

  // 1. Daftar naskah (id, versi, nama file asli, pengunggah dan perannya, tanggal)
  const [manuscripts] = await pool.query(
    `SELECT m.id, m.version, m.original_name, m.size_bytes, m.mime_type, m.created_at,
            u.id AS uploader_id, u.name AS uploader_name, u.role AS uploader_role
       FROM manuscripts m
       JOIN users u ON u.id = m.uploaded_by
      WHERE m.consultation_id = ?
      ORDER BY m.version ASC`,
    [consultationId]
  );

  // 2. Riwayat status dari consultation_status_logs (status lama, baru, pelaku, waktu)
  const [statusLogs] = await pool.query(
    `SELECT l.id, l.old_status, l.new_status, l.created_at,
            u.id AS changer_id, u.name AS changer_name, u.role AS changer_role
       FROM consultation_status_logs l
       LEFT JOIN users u ON u.id = l.changed_by
      WHERE l.consultation_id = ?
      ORDER BY l.created_at ASC, l.id ASC`,
    [consultationId]
  );

  // 3. Ringkasan pembayaran terbaru (status, total / amount, base_amount, unique_code)
  const [paymentRows] = await pool.query(
    `SELECT id, amount, base_amount, unique_code, method, status, proof_path, reject_note, created_at, updated_at
       FROM payments
      WHERE consultation_id = ?
      ORDER BY id DESC LIMIT 1`,
    [consultationId]
  );
  const latestPayment = paymentRows.length > 0 ? paymentRows[0] : null;

  // 4. Jumlah pesan belum dibaca
  const [unreadRows] = await pool.query(
    `SELECT COUNT(*) AS count
       FROM messages
      WHERE consultation_id = ?
        AND sender_id != ?
        AND is_read = 0`,
    [consultationId, userId]
  );
  const unreadCount = Number(unreadRows[0]?.count || 0);

  // Tambahkan field tanpa menghapus field lama
  const responseData = {
    ...c,
    manuscripts,
    status_logs: statusLogs,
    latest_payment: latestPayment,
    payment_summary: latestPayment
      ? {
          status: latestPayment.status,
          total: latestPayment.amount,
          base_amount: latestPayment.base_amount,
          unique_code: latestPayment.unique_code,
        }
      : null,
    unread_count: unreadCount,
  };

  res.json({ data: responseData });
}

// ─── Assign konsultan ─────────────────────────────────────────────────────────

/**
 * PATCH /api/consultations/:id/assign
 * Admin menugaskan konsultan ke konsultasi.
 */
async function assignConsultant(req, res) {
  const { consultant_id } = req.body || {};
  if (!consultant_id) {
    return res.status(400).json({ message: 'consultant_id wajib diisi' });
  }

  // Pastikan user tersebut memang konsultan
  const [consRows] = await pool.query(
    "SELECT id FROM users WHERE id = ? AND role = 'consultant' AND is_active = 1",
    [consultant_id]
  );
  if (consRows.length === 0) {
    return res.status(404).json({ message: 'Konsultan tidak ditemukan atau tidak aktif' });
  }

  const [cRows] = await pool.query('SELECT id FROM consultations WHERE id = ?', [req.params.id]);
  if (cRows.length === 0) {
    return res.status(404).json({ message: 'Konsultasi tidak ditemukan' });
  }

  await pool.query('UPDATE consultations SET consultant_id = ? WHERE id = ?', [
    consultant_id,
    req.params.id,
  ]);

  const [rows] = await pool.query(
    `SELECT c.id, c.code, c.status, c.consultant_id,
            u.name AS consultant_name
       FROM consultations c
       LEFT JOIN users u ON u.id = c.consultant_id
      WHERE c.id = ?`,
    [req.params.id]
  );
  res.json({ message: 'Konsultan berhasil ditugaskan', data: rows[0] });
}

// ─── Update status ────────────────────────────────────────────────────────────

/**
 * PATCH /api/consultations/:id/status
 * Konsultan atau admin mengubah status konsultasi dengan validasi transisi.
 * Klien boleh membatalkan selama belum in_progress.
 */
async function updateStatus(req, res) {
  const { role, id: userId } = req.user;
  const { status: newStatus, notes } = req.body || {};

  if (!newStatus) {
    return res.status(400).json({ message: 'status wajib diisi' });
  }

  const [cRows] = await pool.query('SELECT * FROM consultations WHERE id = ?', [req.params.id]);
  if (cRows.length === 0) {
    return res.status(404).json({ message: 'Konsultasi tidak ditemukan' });
  }
  const consultation = cRows[0];

  // Periksa hak akses
  if (role === 'client') {
    // Klien hanya boleh membatalkan, dan hanya sebelum in_progress
    if (newStatus !== 'cancelled') {
      return res.status(403).json({ message: 'Klien hanya dapat membatalkan konsultasi' });
    }
    if (consultation.client_id !== userId) {
      return res.status(403).json({ message: 'Anda tidak memiliki akses ke konsultasi ini' });
    }
    const noCancel = ['in_progress', 'revision', 'completed', 'cancelled'];
    if (noCancel.includes(consultation.status)) {
      return res
        .status(422)
        .json({ message: 'Konsultasi tidak dapat dibatalkan pada status ini' });
    }
  } else if (role === 'consultant') {
    if (consultation.consultant_id !== userId) {
      return res.status(403).json({ message: 'Konsultasi ini tidak ditugaskan kepada Anda' });
    }
  }
  // Admin: akses penuh

  // Validasi transisi
  const allowed = TRANSITIONS[consultation.status] || [];
  if (!allowed.includes(newStatus)) {
    return res.status(422).json({
      message: `Tidak dapat berpindah dari '${consultation.status}' ke '${newStatus}'`,
    });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const updateFields = ['status = ?', 'updated_at = NOW()'];
    const updateParams = [newStatus];
    if (notes) {
      // notes dapat disimpan bila diperlukan di masa mendatang
    }
    updateParams.push(req.params.id);

    await conn.query(
      `UPDATE consultations SET ${updateFields.join(', ')} WHERE id = ?`,
      updateParams
    );

    await conn.query(
      `INSERT INTO consultation_status_logs (consultation_id, old_status, new_status, changed_by)
       VALUES (?, ?, ?, ?)`,
      [req.params.id, consultation.status, newStatus, userId]
    );

    await conn.commit();

    const [rows] = await pool.query(
      'SELECT id, code, status, updated_at FROM consultations WHERE id = ?',
      [req.params.id]
    );
    return res.json({ message: 'Status berhasil diperbarui', data: rows[0] });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = {
  createConsultation,
  listConsultations,
  getConsultationsSummary,
  getConsultation,
  assignConsultant,
  updateStatus,
};
