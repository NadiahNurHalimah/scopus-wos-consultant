-- Migrasi 003: Tambah role 'owner' pada tabel users
-- Jalankan setelah 002_add_settings_payments_messages.sql

ALTER TABLE users
  MODIFY COLUMN role ENUM('client', 'consultant', 'admin', 'owner') NOT NULL DEFAULT 'client';

