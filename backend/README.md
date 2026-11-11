# Scientia Advantage: Backend API

Node.js + Express 5 + MySQL · cPanel-compatible (pure-JS dependencies only)

---

## Daftar isi

1. [Cara menjalankan](#cara-menjalankan)
2. [Struktur file](#struktur-file)
3. [Endpoint yang tersedia](#endpoint-yang-tersedia)
4. [Contoh curl](#contoh-curl)
5. [Catatan deploy cPanel](#catatan-deploy-cpanel)
6. [Keamanan](#keamanan)

---

## Cara menjalankan

1. Buat database MySQL kosong (lewat phpMyAdmin atau MySQL lokal).
2. Impor berurutan:
   - `database/schema.sql`
   - `database/migrations/001_add_mime_type_to_manuscripts.sql`
   - `database/migrations/002_add_settings_payments_messages.sql`
3. Salin `.env.example` menjadi `.env`, lalu sesuaikan variabelnya.
4. Install dependensi dan jalankan:

```bash
npm install
npm run dev
```

5. Cek status server: `curl http://localhost:3000/api/health` → `{"status":"ok","db":"connected"}`.
6. Buat akun admin awal:

```bash
npm run seed:admin
```

7. Buat 6 layanan awal:

```bash
npm run seed:services
```

---

## Struktur file

```
backend/
├── database/
│   ├── schema.sql
│   └── migrations/
│       ├── 001_add_mime_type_to_manuscripts.sql
│       └── 002_add_settings_payments_messages.sql    # BARU: tabel settings, kolom payments & messages
├── scripts/
│   ├── createAdmin.js
│   ├── seedServices.js
│   └── SecurityTest.js                              # Pengujian keamanan & lintas pengguna (60 tes)
├── src/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── serviceController.js
│   │   ├── consultationController.js                # Diperbarui: summary, detail lengkap, tagihan otomatis
│   │   ├── manuscriptController.js
│   │   ├── settingController.js                     # BARU: pengaturan rekening & admin settings
│   │   ├── paymentController.js                     # BARU: bukti transfer, daftar pembayaran, verifikasi
│   │   └── messageController.js                     # BARU: pesan, lampiran, tandai dibaca
│   ├── middleware/
│   │   └── auth.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── services.js
│   │   ├── admin.js                                 # Diperbarui: route admin/settings
│   │   ├── consultations.js                         # Diperbarui: summary, filter, proof, messages
│   │   ├── manuscripts.js
│   │   ├── settings.js                              # BARU: route settings publik/klien
│   │   ├── payments.js                              # BARU: route payments
│   │   └── messages.js                              # BARU: route download attachment
│   └── services/
│       └── emailService.js
└── uploads/
    ├── manuscripts/                                 # Di luar folder publik
    ├── payments/                                    # BARU: Bukti transfer
    └── messages/                                    # BARU: Lampiran pesan
```

---

## Endpoint yang tersedia

### Autentikasi

| Metode | URL | Akses | Keterangan |
|--------|-----|-------|------------|
| POST | `/api/auth/register` | Publik | Daftar akun klien |
| POST | `/api/auth/login` | Publik | Login, mengembalikan JWT |
| POST | `/api/auth/forgot-password` | Publik | Kirim kode verifikasi reset password |
| POST | `/api/auth/reset-password` | Publik | Reset password dengan kode 6 digit |
| GET | `/api/auth/me` | Login | Info pengguna aktif |

### Layanan

| Metode | URL | Akses | Keterangan |
|--------|-----|-------|------------|
| GET | `/api/services` | Publik | Daftar layanan aktif |
| GET | `/api/admin/services` | Admin | Semua layanan (termasuk tidak aktif) |
| POST | `/api/admin/services` | Admin | Buat layanan baru |
| GET | `/api/admin/services/:id` | Admin | Detail layanan |
| PUT | `/api/admin/services/:id` | Admin | Perbarui layanan |
| DELETE | `/api/admin/services/:id` | Admin | Nonaktifkan layanan (soft-delete) |

### Pengaturan Situs (Settings)

| Metode | URL | Akses | Keterangan |
|--------|-----|-------|------------|
| GET | `/api/settings/payment` | Login | Ambil info rekening tujuan transfer |
| GET | `/api/admin/settings` | Admin | Ambil semua pengaturan sistem |
| PUT | `/api/admin/settings` | Admin | Perbarui pengaturan (key-value) |

### Konsultasi

| Metode | URL | Akses | Keterangan |
|--------|-----|-------|------------|
| POST | `/api/consultations` | Klien | Ajukan konsultasi baru (otomatis membuat tagihan pending) |
| GET | `/api/consultations/summary` | Login | Jumlah konsultasi per status sesuai peran pemanggil |
| GET | `/api/consultations` | Login | Daftar konsultasi (?status=, ?q=, memuat unread_count) |
| GET | `/api/consultations/:id` | Pihak terkait | Detail konsultasi + naskah, log status, payment, unread |
| PATCH | `/api/consultations/:id/assign` | Admin | Tugaskan konsultan |
| PATCH | `/api/consultations/:id/status` | Konsultan/Admin/Klien* | Ubah status dengan validasi transisi |

\* Klien hanya boleh membatalkan (`cancelled`) selama belum `in_progress`.

**Alur transisi status yang valid:**
```
submitted → awaiting_payment → in_review → in_progress ⇆ revision → completed
                                                        ↘ completed
Setiap status dapat pindah ke → cancelled (kecuali completed & cancelled)
```

### Pembayaran

| Metode | URL | Akses | Keterangan |
|--------|-----|-------|------------|
| POST | `/api/consultations/:id/payments/proof` | Klien pemilik | Unggah bukti transfer (JPG/PNG/PDF ≤5 MB, magic bytes) |
| GET | `/api/payments` | Login | Klien: miliknya · Admin: semua (?status=, ?q=) |
| GET | `/api/payments/:id/proof` | Klien / Admin | Unduh/lihat file bukti transfer |
| PATCH | `/api/payments/:id` | Admin | Verifikasi: `paid` (ubah konsultasi ke in_review) atau `rejected` |

### Pesan & Komunikasi

| Metode | URL | Akses | Keterangan |
|--------|-----|-------|------------|
| GET | `/api/consultations/:id/messages` | Pihak terkait | Riwayat pesan (dukung `?after_id=`) |
| POST | `/api/consultations/:id/messages` | Pihak terkait | Kirim pesan (teks maks 2000 char, lampiran opsional ≤5 MB) |
| PATCH | `/api/consultations/:id/messages/read` | Pihak terkait | Tandai pesan dari pihak lain sebagai sudah dibaca |
| GET | `/api/messages/:id/attachment` | Pihak terkait | Unduh file lampiran pesan |

### Naskah

| Metode | URL | Akses | Keterangan |
|--------|-----|-------|------------|
| POST | `/api/consultations/:id/manuscripts` | Klien/Konsultan/Admin | Upload naskah (DOCX/PDF ≤10 MB, cek magic bytes) |
| GET | `/api/manuscripts/:id/download` | Pihak terkait | Download naskah |

---

## Contoh curl

> Catatan: Semua contoh di bawah menggunakan placeholder `<token>` dan data contoh tanpa menyertakan kredensial asli.

### 1. Login Akun
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@contoh.com","password":"<password_anda>"}'
```

### 2. Mengambil Informasi Rekening Pembayaran (Klien)
```bash
curl http://localhost:3000/api/settings/payment \
  -H "Authorization: Bearer <token_klien>"
```

### 3. Mengelola Pengaturan Situs (Admin)
```bash
# Ambil semua pengaturan
curl http://localhost:3000/api/admin/settings \
  -H "Authorization: Bearer <token_admin>"

# Update pengaturan rekening
curl -X PUT http://localhost:3000/api/admin/settings \
  -H "Authorization: Bearer <token_admin>" \
  -H "Content-Type: application/json" \
  -d '{
    "payment_bank": "BCA",
    "payment_account_number": "1234567890",
    "payment_account_name": "Scientia Advantage"
  }'
```

### 4. Pengajuan Konsultasi & Ringkasan Status
```bash
# Ajukan konsultasi
curl -X POST http://localhost:3000/api/consultations \
  -H "Authorization: Bearer <token_klien>" \
  -H "Content-Type: application/json" \
  -d '{
    "service_id": 1,
    "manuscript_title": "Penerapan Deep Learning pada Citra Satelit",
    "field": "Ilmu Komputer",
    "target_index": "Scopus",
    "target_quartile": "Q2",
    "notes": "Draf pertama naskah"
  }'

# Ringkasan jumlah konsultasi per status (tab filter)
curl http://localhost:3000/api/consultations/summary \
  -H "Authorization: Bearer <token_klien>"

# Cari konsultasi dengan query dan filter
curl "http://localhost:3000/api/consultations?status=submitted&q=Satelit" \
  -H "Authorization: Bearer <token_klien>"

# Detail lengkap konsultasi
curl http://localhost:3000/api/consultations/1 \
  -H "Authorization: Bearer <token_klien>"
```

### 5. Pembayaran & Verifikasi
```bash
# Klien mengunggah bukti transfer
curl -X POST http://localhost:3000/api/consultations/1/payments/proof \
  -H "Authorization: Bearer <token_klien>" \
  -F "file=@bukti_transfer.jpg"

# Admin melihat daftar pembayaran
curl "http://localhost:3000/api/payments?status=pending" \
  -H "Authorization: Bearer <token_admin>"

# Unduh/lihat bukti transfer
curl http://localhost:3000/api/payments/1/proof \
  -H "Authorization: Bearer <token_admin>" \
  --output bukti.jpg

# Admin menyetujui pembayaran
curl -X PATCH http://localhost:3000/api/payments/1 \
  -H "Authorization: Bearer <token_admin>" \
  -H "Content-Type: application/json" \
  -d '{"status":"paid"}'

# Admin menolak pembayaran (wajib reject_note)
curl -X PATCH http://localhost:3000/api/payments/1 \
  -H "Authorization: Bearer <token_admin>" \
  -H "Content-Type: application/json" \
  -d '{"status":"rejected","reject_note":"Nominal transfer tidak sesuai dengan kode unik"}'
```

### 6. Pesan & Lampiran Diskusi
```bash
# Kirim pesan teks
curl -X POST http://localhost:3000/api/consultations/1/messages \
  -H "Authorization: Bearer <token_klien>" \
  -H "Content-Type: application/json" \
  -d '{"body":"Selamat siang, berikut saya sampaikan revisi bagian metodologi."}'

# Kirim pesan dengan lampiran dokumen
curl -X POST http://localhost:3000/api/consultations/1/messages \
  -H "Authorization: Bearer <token_klien>" \
  -F "body=File data mentah terlampir" \
  -F "attachment=@data_mentah.pdf"

# Ambil pesan (polling pesan baru dengan after_id)
curl "http://localhost:3000/api/consultations/1/messages?after_id=10" \
  -H "Authorization: Bearer <token_konsultan>"

# Tandai pesan sebagai sudah dibaca
curl -X PATCH http://localhost:3000/api/consultations/1/messages/read \
  -H "Authorization: Bearer <token_konsultan>"

# Unduh lampiran pesan
curl http://localhost:3000/api/messages/5/attachment \
  -H "Authorization: Bearer <token_konsultan>" \
  --output lampiran.pdf
```

---

## Catatan deploy cPanel

- Buat database dan user di **Manage My Databases**, lalu isi `.env` di server. Jangan commit `.env` ke Git repository.
- Impor berurutan lewat phpMyAdmin:
  1. `database/schema.sql`
  2. `database/migrations/001_add_mime_type_to_manuscripts.sql`
  3. `database/migrations/002_add_settings_payments_messages.sql`
- Startup file di **Setup Node.js App**: `app.js`.
- Gunakan `JWT_SECRET` acak yang kuat dan unik di lingkungan production.
- Folder `uploads/manuscripts/`, `uploads/payments/`, dan `uploads/messages/` tersimpan aman di luar `public_html`.
- Jalankan `npm run seed:admin` dan `npm run seed:services` setelah deploy awal.

---

## Keamanan

- **SQL Injection Prevention:** Seluruh query ke MySQL menggunakan parameterized queries (`mysql2/promise`).
- **Pemeriksaan Magic Bytes:** File unggahan naskah, bukti pembayaran, dan lampiran diperiksa integritas header byte-nya (bukan hanya ekstensi file).
- **Access Control Lintas Pengguna:** Dilindungi verifikasi kepemilikan di level controller (klien hanya dapat mengakses data miliknya, konsultan hanya yang ditugaskan, admin memiliki akses penuh).
- **Rate Limiting:** Dilengkapi pembatas frekuensi request untuk autentikasi dan pengiriman pesan (30 pesan/menit).
- **Proteksi Data Sensitif:** Password disimpan menggunakan hash `bcryptjs`, dan tidak pernah dicatat pada log server.
- **Uji Keamanan:** Dilengkapi `scripts/SecurityTest.js` dengan cakupan 60 tes otomatis untuk memvalidasi isolasi lintas pengguna.
