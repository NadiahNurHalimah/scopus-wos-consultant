require('dotenv').config({ quiet: true });
const bcrypt = require('bcryptjs');
const pool = require('../src/config/db');

async function main() {
  const name = process.env.ADMIN_NAME || 'Admin';
  const email = (process.env.ADMIN_EMAIL || '').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';

  if (!email || password.length < 8) {
    console.error('Isi ADMIN_EMAIL dan ADMIN_PASSWORD (min 8 karakter) di .env');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 10);
  await pool.query(
    `INSERT INTO users (name, email, password_hash, role, email_verified)
     VALUES (?, ?, ?, 'admin', 1)
     ON DUPLICATE KEY UPDATE role = 'admin', password_hash = VALUES(password_hash)`,
    [name, email, hash]
  );
  console.log(`Admin siap: ${email}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
