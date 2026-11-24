require('dotenv').config({ quiet: true });
const bcrypt = require('bcryptjs');
const pool = require('../src/config/db');

async function main() {
  const name = process.env.OWNER_NAME || 'Owner Scientia';
  const email = (process.env.OWNER_EMAIL || 'owner@contoh.com').toLowerCase();
  const password = process.env.OWNER_PASSWORD || 'owner2026';

  if (!email || password.length < 8) {
    console.error('Isi OWNER_EMAIL dan OWNER_PASSWORD (min 8 karakter) di .env');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 10);
  await pool.query(
    `INSERT INTO users (name, email, password_hash, role, email_verified)
     VALUES (?, ?, ?, 'owner', 1)
     ON DUPLICATE KEY UPDATE role = 'owner', password_hash = VALUES(password_hash)`,
    [name, email, hash]
  );
  console.log(`Akun Owner siap: ${email}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

