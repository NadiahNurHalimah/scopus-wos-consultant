-- Migrasi 002: Tambah tabel settings dan kolom pelengkap untuk payments serta messages
-- Jalankan setelah 001_add_mime_type_to_manuscripts.sql

-- 1. Tabel settings untuk pengaturan situs (key, value)
CREATE TABLE IF NOT EXISTS settings (
  `key` VARCHAR(100) NOT NULL PRIMARY KEY,
  `value` TEXT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed nilai awal pengaturan rekening (placeholder, bukan rekening asli)
INSERT INTO settings (`key`, `value`) VALUES
  ('payment_bank', 'BANK_ISI_DI_ADMIN'),
  ('payment_account_number', 'REKENING_ISI_DI_ADMIN'),
  ('payment_account_name', 'ATAS_NAMA_ISI_DI_ADMIN')
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);

-- 2. Tambah kolom pada tabel payments untuk transfer manual
ALTER TABLE payments
  ADD COLUMN base_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER amount,
  ADD COLUMN unique_code INT UNSIGNED NOT NULL DEFAULT 0 AFTER base_amount,
  ADD COLUMN reject_note TEXT NULL AFTER proof_path,
  ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

-- 3. Tambah kolom mime_type dan size_bytes pada tabel messages untuk lampiran
ALTER TABLE messages
  ADD COLUMN mime_type VARCHAR(100) NULL AFTER attachment_path,
  ADD COLUMN size_bytes INT UNSIGNED NULL AFTER mime_type;

