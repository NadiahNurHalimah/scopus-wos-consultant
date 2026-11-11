# Progress Pengembangan Frontend – Scientia Advantage

Dokumen ini memantau status pengembangan antarmuka pengguna (frontend) Scientia Advantage berdasarkan Software Requirements Specification (SRS) versi 1.0 dan kapabilitas backend Express 5 + MySQL.

---

## 1. Status Fitur Target 4A (per 11 November 2026)

| Target | Fitur | Status | Keterangan |
|---|---|---|---|
| **Target G** | **Riwayat Konsultasi** | **SELESAI** | Tab status terstruktur dengan counter jumlah (**Semua**, **Menunggu pembayaran**, **Berjalan**, **Selesai**, **Dibatalkan**) bersumber dari `GET /api/consultations/summary`, kolom pencarian kode atau judul (`?q=`), dan penanda badge pesan belum dibaca (`unread_count > 0` dengan animasi pulsing). |
| **Target H** | **Detail Konsultasi Lengkap** | **SELESAI** | - **Timeline Status**: Menampilkan urutan alur status utama dan riwayat perubahan status (`status_logs`).<br>- **Versi Naskah**: Daftar versi naskah lengkap dengan nama pengunggah dan tanggal, serta unduhan ber-token (fetch blob lalu simpan sebagai file).<br>- **Panel Pesan**: Kirim pesan (maks 2000 char), lampiran (≤ 5 MB), polling pesan baru tiap 15 detik menggunakan `after_id` yang otomatis berhenti saat tab tidak aktif (`visibilitychange`), serta otomatis menandai pesan sebagai terbaca saat dibuka.<br>- **Bagian Tagihan**: Biaya layanan (`base_amount`), kode unik (`unique_code`), total transfer (`amount`), informasi rekening transfer dari `/api/settings/payment` dengan tombol salin 1-klik, unggah bukti transfer (JPG, PNG, PDF ≤ 5 MB), badge status (Menunggu, Lunas, Ditolak), catatan penolakan jika ditolak, dan opsi unggah ulang bukti. |
| **Target I** | **Formulir Ajukan Konsultasi** | **SELESAI** | Modal pengajuan konsultasi otomatis memuat data profil pengusul (nama, nomor WhatsApp, institusi, dan bidang riset) dari akun aktif pengguna. Dilengkapi kartu ringkasan estimasi harga dan deskripsi layanan begitu pengguna memilih opsi layanan pada dropdown. |
| **Target J** | **Halaman Profil & Keamanan** | **SELESAI** | Halaman khusus [`/profil`](file:///home/nadiah/Documents/projectku/scopus-wos-consultant/frontend/src/pages/ProfilePage.jsx) untuk memperbarui informasi pribadi (nama, WhatsApp, institusi, bidang riset) dengan catatan email tidak dapat diubah, serta formulir pembaruan kata sandi (kata sandi lama, kata sandi baru min 8 karakter, konfirmasi) dengan ikon mata untuk melihat kata sandi. |
| **Target K** | **Dashboard Klien (4 Kartu Ringkasan)** | **SELESAI** | Menampilkan 4 kartu ringkasan di bagian atas dashboard klien:<br>1. **Konsultasi Aktif**: Total konsultasi yang sedang dalam penanganan.<br>2. **Pesan Baru**: Akumulasi pesan belum dibaca dari seluruh konsultasi.<br>3. **Tagihan Menunggu**: Konsultasi dengan tagihan atau status menunggu pembayaran.<br>4. **Status Terakhir**: Indikator status konsultasi paling baru yang diajukan. |

---

## 2. File yang Dikerjakan & Diperbarui pada Target 4A

1. **`frontend/src/pages/DashboardPage.jsx`**:
   - Menambahkan 4 kartu ringkasan metrik klien di atas dashboard.
   - Mengimplementasikan 5 tab status utama sesuai Target G (Semua, Menunggu pembayaran, Berjalan, Selesai, Dibatalkan) dengan akumulasi counter dari API summary.
   - Menyempurnakan `NewConsultationModal`: pre-fill data profil pengusul dan kartu ringkasan harga layanan yang dipilih secara dinamis.
2. **`frontend/src/pages/ConsultationDetailPage.jsx`**:
   - Memperbarui sistem polling pesan menjadi interval 15 detik dengan parameter `after_id`.
   - Mengintegrasikan deteksi tab aktif/tidak aktif (`document.hidden` dan event `visibilitychange`) agar tidak membebani jaringan saat browser diminimalkan.
   - Memastikan pengunduhan naskah dan bukti transfer ber-token (fetch blob dan trigger download).
3. **`frontend/src/pages/ProfilePage.jsx`**:
   - Membuat halaman baru untuk pembaruan profil pengguna dan perubahan kata sandi.
4. **`frontend/src/App.jsx` & `frontend/src/components/Navbar.jsx`**:
   - Mendaftarkan rute terlindungi `/profil` (`PrivateRoute`) dengan layout dashboard.
   - Mengarahkan tautan profil di menu navigasi navbar pengguna ke `/profil`.
5. **`frontend/src/context/AuthContext.jsx` & `frontend/src/lib/api.js`**:
   - Menyediakan fungsi `updateUser()` pada context untuk sinkronisasi state profil di antarmuka.
   - Menambahkan metode `auth.updateProfile()` dan `auth.changePassword()` di modul API.
6. **`frontend/src/locales/id.json` & `frontend/src/locales/en.json`**:
   - Menambahkan seluruh string terjemahan untuk metrik dashboard, ringkasan harga layanan, dan halaman profil & keamanan.

---

## 3. Kebutuhan Backend (Catatan)
- `PATCH /api/auth/me`: Dibutuhkan untuk menyimpan pembaruan profil pengguna (`name`, `whatsapp`, `institution`, `research_field`) ke database secara permanen. Frontend saat ini sudah siap memanggil endpoint ini dan tetap mengupdate state lokal sesi pengguna.
- `PATCH /api/auth/password`: Dibutuhkan untuk memperbarui kata sandi pengguna (`current_password`, `new_password`). Frontend saat ini sudah siap memanggil endpoint ini lengkap dengan validasi form dan feedback.
