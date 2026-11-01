# Scientia Advantage: Backend API

Node.js + Express 5 + MySQL · cPanel-compatible (pure-JS dependencies only)

---

## Daftar isi

1. [Cara menjalankan](#cara-menjalankan)
2. [Struktur file baru](#struktur-file-baru)
3. [Endpoint yang tersedia](#endpoint-yang-tersedia)
4. [Contoh curl](#contoh-curl)
5. [Catatan deploy cPanel](#catatan-deploy-cpanel)

---

## Cara menjalankan

1. Buat database MySQL kosong (lewat phpMyAdmin atau MySQL lokal).
2. Impor `database/schema.sql`, lalu `database/migrations/001_add_mime_type_to_manuscripts.sql`.
3. Salin `.env.example` menjadi `.env`, lalu isi semua variabel.
4. Install dependensi dan jalankan:

```bash
npm install
npm run dev
```

5. Cek: `curl http://localhost:3000/api/health` → `{"status":"ok","db":"connected"}`.
6. Buat akun admin:

```bash
npm run seed:admin
```

7. Buat 6 layanan awal:

```bash
npm run seed:services
```

---

## Struktur file baru

```
backend/
├── database/
│   ├── schema.sql                       # Skema awal (sudah ada)
│   └── migrations/
│       └── 001_add_mime_type_to_manuscripts.sql
├── scripts/
│   ├── createAdmin.js                   # Sudah ada
│   └── seedServices.js                  # BARU – seed 6 layanan
├── src/
│   ├── controllers/
│   │   ├── authController.js            # Sudah ada
│   │   ├── serviceController.js         # BARU
│   │   ├── consultationController.js    # BARU
│   │   └── manuscriptController.js      # BARU
│   ├── middleware/
│   │   └── auth.js                      # Sudah ada
│   └── routes/
│       ├── auth.js                      # Sudah ada
│       ├── services.js                  # BARU
│       ├── admin.js                     # BARU
│       ├── consultations.js             # BARU
│       └── manuscripts.js              # BARU
└── uploads/
    └── manuscripts/                     # Disimpan di sini, bukan folder publik
```

---

## Endpoint yang tersedia

### Autentikasi

| Metode | URL | Akses | Keterangan |
|--------|-----|-------|------------|
| POST | `/api/auth/register` | Publik | Daftar akun klien |
| POST | `/api/auth/login` | Publik | Login, mengembalikan JWT |
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

### Konsultasi

| Metode | URL | Akses | Keterangan |
|--------|-----|-------|------------|
| POST | `/api/consultations` | Klien | Ajukan konsultasi baru, kode SA-YYYY-NNNN |
| GET | `/api/consultations` | Login | Klien: miliknya · Konsultan: ditugaskan · Admin: semua |
| GET | `/api/consultations/:id` | Pihak terkait | Detail konsultasi |
| PATCH | `/api/consultations/:id/assign` | Admin | Tugaskan konsultan |
| PATCH | `/api/consultations/:id/status` | Konsultan/Admin/Klien* | Ubah status dengan validasi transisi |

\* Klien hanya boleh membatalkan (`cancelled`) selama belum `in_progress`.

**Alur transisi status yang valid:**

```
submitted → awaiting_payment → in_review → in_progress ⇆ revision → completed
                                                        ↘ completed
Setiap status dapat pindah ke → cancelled (kecuali completed & cancelled)
```

### Naskah

| Metode | URL | Akses | Keterangan |
|--------|-----|-------|------------|
| POST | `/api/consultations/:id/manuscripts` | Klien/Konsultan/Admin | Upload naskah (DOCX/PDF ≤10 MB, cek magic bytes) |
| GET | `/api/manuscripts/:id/download` | Pihak terkait | Download naskah |

---

## Contoh curl

### 1. Daftar layanan (publik)
```bash
curl http://localhost:3000/api/services
```

### 2. Login admin
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@scientia.com","password":"admin2026!"}'
```

### 3. CRUD layanan (admin)
```bash
TOKEN="<token_admin>"

# Daftar semua layanan
curl http://localhost:3000/api/admin/services \
  -H "Authorization: Bearer $TOKEN"

# Buat layanan baru
curl -X POST http://localhost:3000/api/admin/services \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name_id": "Layanan Baru",
    "name_en": "New Service",
    "description_id": "Deskripsi layanan baru",
    "description_en": "New service description",
    "price": 1000000,
    "is_active": 1
  }'

# Update layanan
curl -X PUT http://localhost:3000/api/admin/services/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name_id":"Updated","name_en":"Updated EN","price":999000,"is_active":1}'

# Nonaktifkan layanan
curl -X DELETE http://localhost:3000/api/admin/services/1 \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Ajukan konsultasi (klien)
```bash
CLIENT_TOKEN="<token_klien>"

curl -X POST http://localhost:3000/api/consultations \
  -H "Authorization: Bearer $CLIENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "service_id": 1,
    "manuscript_title": "Analisis Sentimen Berbasis BERT",
    "field": "Ilmu Komputer",
    "target_index": "Scopus",
    "target_quartile": "Q2",
    "notes": "Naskah sudah siap"
  }'
```

### 5. Tugaskan konsultan (admin)
```bash
curl -X PATCH http://localhost:3000/api/consultations/1/assign \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"consultant_id": 4}'
```

### 6. Ubah status (admin/konsultan)
```bash
curl -X PATCH http://localhost:3000/api/consultations/1/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "awaiting_payment"}'
```

### 7. Upload naskah (klien/konsultan)
```bash
curl -X POST http://localhost:3000/api/consultations/1/manuscripts \
  -H "Authorization: Bearer $CLIENT_TOKEN" \
  -F "file=@naskah_saya.pdf"
```

### 8. Download naskah
```bash
curl -o naskah_v1.pdf \
  http://localhost:3000/api/manuscripts/1/download \
  -H "Authorization: Bearer $TOKEN"
```

### 9. Batalkan konsultasi (klien)
```bash
curl -X PATCH http://localhost:3000/api/consultations/2/status \
  -H "Authorization: Bearer $CLIENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "cancelled"}'
```

---

## Catatan deploy cPanel

- Buat database dan user di **Manage My Databases**, lalu isi `.env` di server. Jangan commit `.env` ke GitHub.
- Impor `database/schema.sql` lalu `database/migrations/001_add_mime_type_to_manuscripts.sql` lewat phpMyAdmin.
- Startup file di **Setup Node.js App**: `app.js`.
- Gunakan `JWT_SECRET` yang berbeda dari di laptop.
- Folder `uploads/manuscripts/` harus berada di luar `public_html`. Periksa path absolut di cPanel.
- Jalankan `npm run seed:services` setelah deploy awal untuk mengisi 6 layanan.

---

## Keamanan

- Semua query menggunakan parameterized queries (mencegah SQL injection).
- File upload diperiksa dengan magic bytes (bukan hanya ekstensi).
- File disimpan dengan nama acak di luar folder publik.
- Download hanya bisa dilakukan oleh pihak yang terkait (cek di server).
- Password tidak pernah di-log.
