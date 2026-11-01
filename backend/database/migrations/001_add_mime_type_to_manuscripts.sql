-- Migrasi 001: tambah kolom mime_type pada tabel manuscripts
-- Jalankan setelah schema.sql sudah diimpor.

ALTER TABLE manuscripts
  ADD COLUMN mime_type VARCHAR(80) NOT NULL DEFAULT '' AFTER stored_path;
