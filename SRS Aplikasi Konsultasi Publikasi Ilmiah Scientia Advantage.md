# SRS Aplikasi Konsultasi Publikasi Ilmiah Scientia Advantage

Software Requirements Specification (SRS), versi 1.0 (draf), 1 November 2026

Disusun oleh: Nadia. Domain target: scopus-wos-consultant.com

Status dokumen: draf kerja. Daftar fitur final masih menunggu hasil pengamatan situs referensi (Rumah Scopus) dan konfirmasi mentor. Bagian yang belum pasti ditandai pada bagian 13 (Pertanyaan terbuka).

## 1. Pendahuluan

### 1.1 Tujuan

Dokumen ini menjelaskan kebutuhan fungsional dan non-fungsional untuk aplikasi web konsultasi publikasi ilmiah (Scopus dan Web of Science) milik Scientia Advantage Publication Consultancy. Dokumen ini menjadi acuan perancangan, pengembangan, pengujian, dan serah terima aplikasi.

### 1.2 Ruang lingkup

Aplikasi berupa website responsif yang nyaman dibuka di HP dan laptop (dapat dipasang ke layar HP sebagai PWA), tayang di domain utama scopus-wos-consultant.com, dengan dua bahasa: Indonesia dan Inggris.

Di dalam ruang lingkup:

- Halaman publik (profil, layanan, FAQ, testimoni, kontak).
- Pendaftaran dan login pengguna dengan peran berbeda.
- Pengajuan konsultasi, unggah naskah, pelacakan status, dan pesan antara klien dan konsultan.
- Pembayaran (awal: transfer manual dengan konfirmasi admin).
- Dashboard klien, konsultan, dan admin.
- Notifikasi email dan pengelolaan konten dasar.

Di luar ruang lingkup (versi 1.0):

- Aplikasi unduhan Play Store atau App Store (diputuskan tidak perlu karena layanannya berupa konsultasi).
- Penilaian naskah otomatis berbasis AI (dipertimbangkan sebagai pengembangan lanjutan dengan layanan Python terpisah).
- Pembayaran online penuh lewat payment gateway (opsional, fase lanjutan).
- Pengiriman naskah otomatis ke sistem jurnal penerbit.

### 1.3 Definisi dan singkatan

| Istilah | Arti |
| --- | --- |
| SRS | Software Requirements Specification, dokumen kebutuhan perangkat lunak |
| Klien | Pengguna yang mengajukan konsultasi (dosen, mahasiswa, peneliti, umum) |
| Konsultan | Pakar yang menangani konsultasi dan mereviu naskah |
| Admin | Pengelola sistem dan konten |
| Naskah | Dokumen artikel ilmiah (DOCX atau PDF) yang diunggah klien |
| PWA | Progressive Web App, website yang dapat dipasang ke layar HP |
| API | Antarmuka antara tampilan (web) dan server |
| JWT | JSON Web Token, token untuk menjaga sesi login |
| i18n | Internasionalisasi, dukungan banyak bahasa |
| cPanel | Panel kontrol hosting yang dipakai untuk memasang aplikasi |

### 1.4 Referensi

- Website Rumah Scopus (referensi fitur dan alur, sesuai arahan mentor).
- Website Scopus dan WoS Consultant yang ada saat ini (Sitejet Builder), sebagai sumber teks layanan, FAQ, dan kontak.
- Logo dan identitas merek Scientia Advantage Publication Consultancy.
- Standar penulisan SRS: IEEE 830 (disederhanakan).

### 1.5 Gambaran dokumen

Bagian 2 menjelaskan gambaran umum. Bagian 3 sampai 6 memuat kebutuhan. Bagian 7 sampai 9 memuat model data, arsitektur, dan API. Bagian 10 sampai 12 memuat rencana implementasi, pengujian, dan risiko. Bagian 13 memuat hal yang masih perlu dikonfirmasi.

## 2. Deskripsi umum

### 2.1 Perspektif produk

Aplikasi menggantikan website profil sederhana yang sekarang berjalan di domain utama. Aplikasi terdiri dari satu API (Node.js dan Express) dengan database MySQL, dan satu antarmuka web (React) yang mengonsumsi API tersebut. Arsitektur dibuat agar layanan tambahan, misalnya layanan Python untuk analisis naskah, bisa dipasang belakangan tanpa membongkar sistem.

### 2.2 Fungsi utama

1. Memperkenalkan layanan dan membangun kepercayaan (halaman publik).
2. Menerima pendaftaran dan pengajuan konsultasi dari pengguna umum.
3. Mengelola naskah, versi revisi, dan komunikasi klien dengan konsultan.
4. Melacak status konsultasi dari pengajuan sampai selesai.
5. Mencatat pembayaran dan memberi laporan kepada admin.

### 2.3 Karakteristik pengguna

| Pengguna | Deskripsi | Kemampuan teknis | Hak akses |
| --- | --- | --- | --- |
| Pengunjung | Belum login, melihat halaman publik | Beragam | Baca halaman publik, daftar, login |
| Klien | Akun terdaftar, mengajukan konsultasi | Pemula hingga menengah | Kelola konsultasi, naskah, pesan, dan pembayaran miliknya sendiri |
| Konsultan | Menangani konsultasi yang ditugaskan | Menengah | Lihat konsultasi yang ditugaskan, balas pesan, unggah hasil reviu, ubah status |
| Admin | Mengelola seluruh sistem | Menengah hingga mahir | Semua akses: pengguna, layanan, penugasan, pembayaran, konten, laporan |

Pengguna umum dari semua kalangan, sehingga antarmuka harus sederhana, jelas, dan bisa dipakai tanpa pelatihan.

### 2.4 Batasan

- Aplikasi dipasang di hosting cPanel (neohosting) yang menyediakan Setup Node.js App, Git Version Control, dan MySQL. Terminal tidak tersedia, sehingga instalasi paket dilakukan lewat Run NPM Install di cPanel atau hasil build diunggah.
- Tujuan akhir adalah domain utama. Website lama (Sitejet) akan tergantikan saat peluncuran.
- Sumber daya hosting bersama (shared hosting) terbatas, sehingga arsitektur harus ringan.
- Naskah klien bersifat rahasia dan tidak boleh diakses pihak yang tidak berwenang.
- Bahasa antarmuka: Indonesia dan Inggris.

### 2.5 Asumsi dan ketergantungan

- Mentor menyediakan logo versi PNG transparan atau SVG, daftar layanan, harga paket, dan kontak resmi.
- Daftar fitur final mengikuti situs referensi dan disetujui mentor.
- Email dengan domain sendiri (misal info@scopus-wos-consultant.com) bisa dipakai untuk pengiriman notifikasi.
- Kode disimpan di repository GitHub.

## 3. Kebutuhan fungsional

Prioritas: W = wajib (versi 1.0), P = penting (versi 1.1), O = opsional (jika waktu tersedia).

### 3.1 Halaman publik

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-PUB-01 | Sistem menampilkan halaman beranda berisi hero, tentang kami, layanan, alur kerja, FAQ, testimoni, dan kontak | W |
| FR-PUB-02 | Sistem menampilkan daftar layanan beserta deskripsi dan paket | W |
| FR-PUB-03 | Sistem menyediakan tombol konsultasi yang mengarah ke pendaftaran atau ke WhatsApp | W |
| FR-PUB-04 | Sistem menampilkan FAQ yang dapat dibuka dan ditutup | W |
| FR-PUB-05 | Sistem menampilkan halaman Kebijakan Privasi dan Ketentuan Layanan | W |
| FR-PUB-06 | Sistem menyediakan formulir kontak yang mengirim pesan ke email admin | P |
| FR-PUB-07 | Sistem menampilkan testimoni klien yang disetujui admin | P |
| FR-PUB-08 | Sistem menampilkan artikel atau tips publikasi (blog) | O |

### 3.2 Akun dan autentikasi

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-AUT-01 | Pengguna dapat mendaftar dengan nama, email, kata sandi, dan nomor WhatsApp | W |
| FR-AUT-02 | Sistem memverifikasi email pendaftar lewat tautan verifikasi | P |
| FR-AUT-03 | Pengguna dapat login dan logout | W |
| FR-AUT-04 | Pengguna dapat mengatur ulang kata sandi lewat email | W |
| FR-AUT-05 | Pengguna dapat mengubah profil (nama, institusi, bidang riset, kontak) | W |
| FR-AUT-06 | Sistem membatasi akses halaman sesuai peran (klien, konsultan, admin) | W |
| FR-AUT-07 | Sistem membatasi percobaan login gagal berulang | P |
| FR-AUT-08 | Pengguna dapat login dengan akun Google | O |

### 3.3 Pengajuan konsultasi

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-KON-01 | Klien dapat mengajukan konsultasi dengan memilih layanan, mengisi judul naskah, bidang, target indeks (Scopus atau WoS, kuartil), dan catatan | W |
| FR-KON-02 | Sistem membuat nomor konsultasi unik dan status awal Diajukan | W |
| FR-KON-03 | Klien dapat melihat daftar dan detail konsultasi miliknya | W |
| FR-KON-04 | Klien dapat membatalkan konsultasi selama belum berstatus Berjalan | P |
| FR-KON-05 | Admin dapat menugaskan konsultan pada konsultasi | W |
| FR-KON-06 | Konsultan dan admin dapat mengubah status konsultasi sesuai alur pada bagian 4 | W |
| FR-KON-07 | Sistem menyimpan riwayat perubahan status beserta waktu dan pelakunya | P |
| FR-KON-08 | Klien dapat memberi penilaian dan ulasan setelah konsultasi selesai | O |

### 3.4 Naskah

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-NAS-01 | Klien dapat mengunggah naskah berformat DOCX atau PDF | W |
| FR-NAS-02 | Sistem membatasi ukuran dan tipe file yang diunggah dan memeriksa tipe file sebenarnya, bukan hanya ekstensi | W |
| FR-NAS-03 | Sistem menyimpan setiap unggahan sebagai versi baru (v1, v2, dan seterusnya) tanpa menimpa versi lama | W |
| FR-NAS-04 | Konsultan dapat mengunggah hasil reviu atau naskah yang sudah diperbaiki | W |
| FR-NAS-05 | Klien dan konsultan dapat mengunduh naskah, dan akses unduh dibatasi pada pihak yang terkait | W |
| FR-NAS-06 | Konsultan dapat menambahkan catatan reviu pada tiap versi | P |
| FR-NAS-07 | Sistem menyimpan data analisis naskah (misal skor kemiripan) jika layanan analisis ditambahkan | O |

### 3.5 Komunikasi

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-MSG-01 | Klien dan konsultan dapat saling berkirim pesan dalam satu konsultasi | W |
| FR-MSG-02 | Pesan dapat memuat lampiran | P |
| FR-MSG-03 | Sistem menandai pesan yang belum dibaca | P |
| FR-MSG-04 | Sistem menampilkan pesan hampir seketika tanpa memuat ulang halaman | O |

### 3.5.1 Pembayaran

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-PAY-01 | Sistem membuat tagihan berdasarkan layanan yang dipilih | W |
| FR-PAY-02 | Klien dapat mengunggah bukti transfer | W |
| FR-PAY-03 | Admin dapat memverifikasi pembayaran dan mengubah statusnya (Menunggu, Lunas, Ditolak) | W |
| FR-PAY-04 | Sistem membuat bukti pembayaran atau invoice yang dapat diunduh | P |
| FR-PAY-05 | Sistem terintegrasi dengan payment gateway lokal (QRIS, virtual account, e-wallet) | O |

### 3.6 Dashboard

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-DSB-01 | Dashboard klien menampilkan konsultasi aktif, status, pesan baru, dan tagihan | W |
| FR-DSB-02 | Dashboard konsultan menampilkan konsultasi yang ditugaskan dan tenggatnya | W |
| FR-DSB-03 | Dashboard admin menampilkan jumlah konsultasi per status, pembayaran menunggu verifikasi, dan pengguna baru | W |
| FR-DSB-04 | Admin dapat mengelola pengguna: melihat, menonaktifkan, dan mengubah peran | W |
| FR-DSB-05 | Admin dapat mengekspor laporan konsultasi dan pembayaran ke CSV | P |

### 3.7 Notifikasi

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-NTF-01 | Sistem mengirim email saat pendaftaran, pengajuan konsultasi, perubahan status, pesan baru, dan konfirmasi pembayaran | P |
| FR-NTF-02 | Sistem menampilkan notifikasi di dalam aplikasi | P |
| FR-NTF-03 | Sistem menyediakan tautan WhatsApp ke nomor resmi untuk komunikasi cepat | W |

### 3.8 Multibahasa

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-I18-01 | Seluruh teks antarmuka tersedia dalam bahasa Indonesia dan Inggris | W |
| FR-I18-02 | Pengguna dapat berpindah bahasa kapan saja, dan pilihannya diingat | W |
| FR-I18-03 | Bahasa awal ditentukan dari bahasa browser, dengan Indonesia sebagai cadangan | P |
| FR-I18-04 | Alamat halaman memuat kode bahasa (misal /id dan /en) | P |

### 3.9 Pengelolaan konten

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-CMS-01 | Admin dapat menambah, mengubah, dan menghapus layanan beserta harga paket | W |
| FR-CMS-02 | Admin dapat mengelola FAQ dalam dua bahasa | P |
| FR-CMS-03 | Admin dapat menyetujui atau menyembunyikan testimoni | P |
| FR-CMS-04 | Admin dapat mengubah info kontak (alamat, nomor, email, media sosial) | P |

## 4. Alur dan status

### 4.1 Alur utama klien

1. Pengunjung membuka beranda, membaca layanan, lalu mendaftar.
2. Klien login dan mengajukan konsultasi (pilih layanan, isi data naskah, unggah naskah).
3. Sistem membuat tagihan. Klien mentransfer dan mengunggah bukti.
4. Admin memverifikasi pembayaran dan menugaskan konsultan.
5. Konsultan mereviu naskah, mengunggah hasil, dan berdiskusi lewat pesan.
6. Klien merevisi dan mengunggah versi baru. Proses berulang sampai naskah siap.
7. Konsultan menyatakan selesai. Klien dapat memberi ulasan.

### 4.2 Status konsultasi

| Status | Arti | Diubah oleh |
| --- | --- | --- |
| Diajukan | Konsultasi baru dibuat | Sistem |
| Menunggu pembayaran | Tagihan terbit, belum lunas | Sistem |
| Ditinjau | Pembayaran terverifikasi, menunggu penugasan konsultan | Admin |
| Berjalan | Konsultan menangani naskah | Admin atau konsultan |
| Revisi | Menunggu perbaikan dari klien | Konsultan |
| Selesai | Konsultasi tuntas | Konsultan atau admin |
| Dibatalkan | Dibatalkan klien atau admin | Klien atau admin |

Perpindahan status hanya boleh mengikuti urutan yang valid. Setiap perpindahan dicatat pada riwayat status.

## 5. Kebutuhan antarmuka

### 5.1 Antarmuka pengguna

- Rancangan mobile-first: tata letak dibuat untuk layar HP lebih dulu, lalu diperluas untuk tablet dan laptop.
- Identitas visual mengikuti logo: biru navy untuk teks dan tombol utama, emas untuk aksen, teal sebagai aksen kecil, dan krem sebagai latar. Font judul tebal bergaya geometris, font isi mudah dibaca.
- Navigasi sederhana, dengan tombol konsultasi yang selalu mudah ditemukan.
- Mendukung mode PWA: ikon logo di layar HP dan tampilan layar penuh.
- Aksesibilitas dasar: kontras warna cukup, ukuran tombol nyaman disentuh, label formulir jelas, dan teks alternatif pada gambar.

### 5.2 Antarmuka perangkat lunak

- Web berkomunikasi dengan server lewat REST API berformat JSON.
- Server mengakses MySQL lewat pustaka database (query terparameter).
- Opsional di masa depan: layanan Python (FastAPI) yang dipanggil oleh API untuk analisis naskah.

### 5.3 Antarmuka komunikasi

- Seluruh lalu lintas memakai HTTPS.
- Email notifikasi dikirim lewat SMTP dari akun email domain.
- Tautan WhatsApp memakai format wa.me ke nomor resmi.

## 6. Kebutuhan non-fungsional

| ID | Kategori | Kebutuhan |
| --- | --- | --- |
| NFR-01 | Performa | Halaman publik termuat kurang dari 3 detik pada koneksi seluler normal |
| NFR-02 | Performa | Respons API untuk operasi umum kurang dari 1 detik pada beban normal |
| NFR-03 | Keamanan | Kata sandi disimpan dengan hash (bcrypt atau argon2), tidak pernah dalam bentuk asli |
| NFR-04 | Keamanan | Sesi memakai token (JWT) dengan masa berlaku terbatas |
| NFR-05 | Keamanan | Seluruh input divalidasi di server untuk mencegah SQL injection, XSS, dan CSRF |
| NFR-06 | Keamanan | File unggahan disimpan di luar folder publik, nama file diacak, dan unduhan lewat pemeriksaan hak akses |
| NFR-07 | Keamanan | Hak akses diperiksa di server pada setiap permintaan, bukan hanya disembunyikan di tampilan |
| NFR-08 | Privasi | Naskah dan data pribadi hanya dapat diakses pemilik, konsultan yang ditugaskan, dan admin. Kebijakan privasi mengacu pada UU Pelindungan Data Pribadi |
| NFR-09 | Ketersediaan | Target ketersediaan 99 persen mengikuti kemampuan hosting |
| NFR-10 | Cadangan | Backup database dan file naskah dilakukan berkala (minimal mingguan) lewat fitur Backup cPanel |
| NFR-11 | Kompatibilitas | Berjalan baik di Chrome, Firefox, Safari, dan Edge versi terbaru, serta Android dan iOS |
| NFR-12 | Kegunaan | Pengguna baru dapat mengajukan konsultasi tanpa panduan tambahan |
| NFR-13 | Pemeliharaan | Kode terstruktur (route, controller, service, model), terdokumentasi, dan disimpan di GitHub |
| NFR-14 | Skalabilitas | Struktur memungkinkan penambahan fitur (misal layanan Python, payment gateway) tanpa mengubah fitur lama |
| NFR-15 | Lokalisasi | Format tanggal, mata uang (Rupiah), dan zona waktu (WIB) mengikuti Indonesia |

## 7. Model data

### 7.1 Entitas utama

**users**: id, nama, email (unik), password\_hash, no\_whatsapp, institusi, bidang\_riset, peran (klien, konsultan, admin), status\_aktif, email\_terverifikasi, dibuat\_pada.

**services**: id, nama\_id, nama\_en, deskripsi\_id, deskripsi\_en, harga, aktif.

**consultations**: id, nomor, klien\_id, konsultan\_id, layanan\_id, judul\_naskah, bidang, target\_indeks, target\_kuartil, catatan, status, dibuat\_pada, diperbarui\_pada.

**consultation\_status\_logs**: id, konsultasi\_id, status\_lama, status\_baru, diubah\_oleh, waktu.

**manuscripts**: id, konsultasi\_id, versi, nama\_file\_asli, path\_file, ukuran, diunggah\_oleh, catatan\_reviu, dibuat\_pada.

**messages**: id, konsultasi\_id, pengirim\_id, isi, lampiran\_path, dibaca, dibuat\_pada.

**payments**: id, konsultasi\_id, jumlah, metode, bukti\_path, status (menunggu, lunas, ditolak), diverifikasi\_oleh, dibuat\_pada.

**faqs**: id, pertanyaan\_id, pertanyaan\_en, jawaban\_id, jawaban\_en, urutan.

**testimonials**: id, nama, institusi, isi\_id, isi\_en, disetujui.

### 7.2 Relasi

- Satu user (klien) memiliki banyak consultations.
- Satu consultation dikerjakan satu konsultan dan memiliki banyak manuscripts, messages, payments, dan status logs.
- Satu service dipakai oleh banyak consultations.

## 8. Arsitektur dan teknologi

| Lapisan | Pilihan | Catatan |
| --- | --- | --- |
| Tampilan web | React (Vite), Tailwind CSS | Mobile-first, PWA lewat vite-plugin-pwa |
| Multibahasa | react-i18next | Berkas terjemahan id dan en |
| Backend | Node.js, Express | Dijalankan lewat Setup Node.js App di cPanel |
| Database | MySQL | Dibuat lewat Manage My Databases di cPanel |
| Autentikasi | JWT dan bcrypt | Peran: klien, konsultan, admin |
| Penyimpanan file | Folder server di luar area publik | Pemeriksaan akses sebelum unduh |
| Email | SMTP domain | Untuk verifikasi dan notifikasi |
| Kode dan deploy | GitHub dan Git Version Control cPanel | Update lewat pull dari repository |
| Tambahan (nanti) | Layanan Python (FastAPI) | Untuk analisis naskah, dipanggil oleh API Express |

Alur arsitektur: Browser (web atau PWA) memanggil API Express, yang membaca dan menulis ke MySQL dan folder naskah. Bila fitur analisis ditambahkan, API Express memanggil layanan Python.

## 9. Endpoint API (ringkas)

| Metode | Alamat | Fungsi | Akses |
| --- | --- | --- | --- |
| POST | /api/auth/register | Daftar akun | Publik |
| POST | /api/auth/login | Login | Publik |
| POST | /api/auth/forgot-password | Minta atur ulang kata sandi | Publik |
| GET, PUT | /api/me | Lihat dan ubah profil | Login |
| GET | /api/services | Daftar layanan | Publik |
| POST | /api/consultations | Ajukan konsultasi | Klien |
| GET | /api/consultations | Daftar konsultasi sesuai peran | Login |
| GET | /api/consultations/:id | Detail konsultasi | Pihak terkait |
| PATCH | /api/consultations/:id/status | Ubah status | Konsultan, admin |
| PATCH | /api/consultations/:id/assign | Tugaskan konsultan | Admin |
| POST | /api/consultations/:id/manuscripts | Unggah naskah | Klien, konsultan |
| GET | /api/manuscripts/:id/download | Unduh naskah | Pihak terkait |
| GET, POST | /api/consultations/:id/messages | Baca dan kirim pesan | Pihak terkait |
| POST | /api/consultations/:id/payments | Unggah bukti bayar | Klien |
| PATCH | /api/payments/:id | Verifikasi pembayaran | Admin |
| GET | /api/admin/stats | Ringkasan dashboard | Admin |
| CRUD | /api/admin/users, /services, /faqs, /testimonials | Kelola data | Admin |

## 10. Rencana implementasi

### 10.1 Fase pengerjaan

Estimasi waktu bersifat perkiraan dan perlu disesuaikan dengan tenggat dari mentor.

| Fase | Isi pekerjaan | Keluaran | Perkiraan |
| --- | --- | --- | --- |
| 0. Persiapan | Finalisasi fitur dari situs referensi, repo GitHub, struktur folder, rancangan database | SRS final, repo siap | 1 minggu |
| 1. Fondasi backend | Koneksi MySQL, migrasi tabel, autentikasi, peran, validasi | API login dan pendaftaran berjalan | 1 sampai 2 minggu |
| 2. Inti konsultasi | Layanan, pengajuan konsultasi, unggah naskah dan versi, status, penugasan | Alur konsultasi dasar berfungsi | 2 minggu |
| 3. Tampilan web | Halaman publik, login, dashboard tiga peran, dua bahasa | Web responsif utuh | 2 sampai 3 minggu |
| 4. Komunikasi dan pembayaran | Pesan, bukti transfer, verifikasi admin, notifikasi email | Alur penuh dari pengajuan sampai selesai | 1 sampai 2 minggu |
| 5. Penyempurnaan | PWA, uji keamanan dan performa, perbaikan, dokumentasi | Versi siap rilis | 1 sampai 2 minggu |
| 6. Peluncuran | Backup, deploy ke domain utama, uji produksi, serah terima | Aplikasi live | 1 minggu |
| 7. Lanjutan (opsional) | Payment gateway, layanan Python, blog, login Google | Fitur tambahan | Menyesuaikan |

### 10.2 Rencana deploy ke domain utama

1. Kembangkan dan uji seluruhnya di laptop sampai versi siap rilis.
2. Beri tahu mentor jadwal penggantian website lama.
3. Backup website Sitejet yang ada, serta backup penuh akun hosting lewat menu Backup cPanel.
4. Buat database baru khusus aplikasi (terpisah dari data lain) dan impor struktur tabel.
5. Ambil kode dari GitHub lewat Git Version Control, atur Setup Node.js App dengan Application URL domain utama, lalu jalankan Run NPM Install dan Restart.
6. Pastikan HTTPS aktif dan uji seluruh alur utama di produksi.
7. Siapkan rencana mundur: bila ada masalah serius, kembalikan domain ke website lama dari backup.

## 11. Pengujian dan kriteria penerimaan

### 11.1 Strategi pengujian

- Uji fungsional per modul sesuai tabel kebutuhan pada bagian 3.
- Uji hak akses: setiap peran hanya dapat mengakses data yang menjadi haknya.
- Uji unggah file: tipe tidak valid, ukuran berlebih, dan nama file berbahaya harus ditolak.
- Uji tampilan di HP dan laptop pada beberapa browser.
- Uji dua bahasa: tidak ada teks yang tertinggal tanpa terjemahan.
- Uji keamanan dasar: injeksi SQL, XSS, brute force login.
- Uji penerimaan pengguna (UAT) bersama mentor dengan data contoh.

### 11.2 Kriteria penerimaan versi 1.0

- Semua kebutuhan berprioritas W berfungsi tanpa galat kritis.
- Alur penuh dari pendaftaran, pengajuan, unggah naskah, pembayaran, reviu, sampai selesai dapat dijalankan oleh tiga peran.
- Aplikasi tayang di domain utama dengan HTTPS dan dapat dibuka nyaman di HP.
- Mentor menyetujui hasil UAT.

## 12. Risiko dan mitigasi

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Fitur dari situs referensi berubah atau meluas | Cakupan membengkak | Bekukan daftar fitur versi 1.0 lewat persetujuan mentor |
| Keterbatasan hosting bersama (memori, tanpa Terminal) | Aplikasi lambat atau sulit dipasang | Arsitektur ringan, build di laptop, uji pasang lebih awal |
| Website lama tergantikan sebelum aplikasi siap | Situs mati | Backup dan jadwal peluncuran yang disepakati, rencana mundur |
| Kebocoran naskah klien | Pelanggaran privasi | Penyimpanan di luar area publik, kontrol akses server, HTTPS |
| Pembayaran manual lambat diverifikasi | Alur tersendat | Notifikasi ke admin, payment gateway sebagai tahap lanjutan |
| Tenggat terlalu ketat | Kualitas turun | Prioritas W dahulu, fitur P dan O menyusul |
| Terjemahan dua bahasa tidak konsisten | Pengalaman buruk | Semua teks lewat berkas terjemahan, ditinjau sebelum rilis |

## 13. Pertanyaan terbuka

Hal berikut perlu dikonfirmasi ke mentor sebelum dokumen ini dibekukan menjadi versi 1.0:

1. Fitur final: bagian mana dari situs Rumah Scopus yang harus ditiru (tampilan, alur, atau fitur akun), dan apakah login, unggah naskah, serta status konsultasi memang harus ditambahkan sendiri.
2. Apakah mobile cukup berupa web responsif dan PWA, bukan aplikasi toko.
3. Pembayaran: transfer manual dengan verifikasi admin, atau payment gateway sejak awal.
4. Tenggat dan bentuk hasil akhir (aplikasi jadi, demo, dokumentasi, atau laporan).
5. Siapa konsultan yang akan memakai sistem, dan siapa yang menjadi admin.
6. Materi: logo PNG transparan atau SVG, daftar layanan dan harga paket, kontak resmi, dan teks dua bahasa.
7. Kepemilikan repository: akun GitHub pribadi atau akun milik perusahaan.
8. Rencana pengelolaan DNS dan email domain, termasuk siapa yang memegang aksesnya.

## Lampiran A. Struktur folder project

- scientia-advantage/backend/src/config: koneksi database dan pengaturan
- scientia-advantage/backend/src/routes: alamat API
- scientia-advantage/backend/src/controllers: logika tiap fitur
- scientia-advantage/backend/src/services: logika bisnis dan integrasi (email, analisis naskah)
- scientia-advantage/backend/src/middleware: pemeriksaan login dan peran
- scientia-advantage/backend/src/models: query ke MySQL
- scientia-advantage/backend/uploads: file naskah dan bukti bayar (tidak publik)
- scientia-advantage/backend/app.js: file utama (startup file di cPanel)
- scientia-advantage/web/src/pages: halaman depan, login, dashboard
- scientia-advantage/web/src/components: komponen tampilan
- scientia-advantage/web/src/locales: terjemahan id.json dan en.json
- scientia-advantage/README.md: panduan instalasi dan deploy
