# Scientia Advantage – Frontend

React 18 + Vite 5 + Tailwind CSS 3.4 + PWA

## Menjalankan di laptop

Pastikan backend sudah berjalan di port 3000, lalu:

```bash
cd frontend
npm install
npm run dev
```

Buka: http://localhost:5173

## Build produksi

```bash
npm run build
# Output ada di dist/
```

## Variabel lingkungan

Tidak ada file `.env` – alamat API dikonfigurasi sebagai proxy di `vite.config.js`:

```
/api  →  http://localhost:3000
```

Untuk produksi (cPanel): arahkan `/api` ke URL backend sesuai domain.

## Struktur folder

```
src/
├── components/       # Komponen reusable
│   ├── Navbar.jsx
│   ├── Footer.jsx
│   ├── WhatsAppButton.jsx
│   └── ui.jsx        # Button, Input, Spinner, Modal, dll.
├── config/
│   └── site.js       # Kontak & info situs (edit di sini)
├── context/
│   └── AuthContext.jsx
├── lib/
│   ├── api.js        # Semua panggilan API terpusat
│   └── i18n.js       # Konfigurasi i18next
├── locales/
│   ├── id.json       # Terjemahan Indonesia
│   └── en.json       # Terjemahan Inggris
└── pages/
    ├── HomePage.jsx
    ├── LoginPage.jsx
    ├── RegisterPage.jsx
    ├── DashboardPage.jsx
    ├── ConsultationDetailPage.jsx
    └── NotFoundPage.jsx
```

## Versi dependency utama

| Package | Versi |
|---|---|
| React | 18.x |
| Vite | 5.x |
| Tailwind CSS | 3.4 |
| react-router-dom | 6.x |
| react-i18next | 14.x |
| vite-plugin-pwa | 0.19.x |
| @fontsource/montserrat | 5.x |
| @fontsource/inter | 5.x |

## Deploy ke cPanel

1. Build lokal: `npm run build`
2. Upload isi folder `dist/` ke `public_html/` atau subdirektori
3. Tambahkan `.htaccess` di root untuk SPA routing:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```
