# Scientia Advantage: Backend API

Node.js + Express + MySQL.

## Jalankan di laptop

1. Buat database MySQL kosong (lewat phpMyAdmin atau MySQL lokal).
2. Impor `database/schema.sql` ke database itu.
3. Salin `.env.example` menjadi `.env`, lalu isi data database dan `JWT_SECRET`.
4. Install dan jalankan:

```
npm install
npm run dev
```

5. Cek: buka http://localhost:3000/api/health. Harus muncul `"db":"connected"`.
6. Buat akun admin: isi `ADMIN_EMAIL` dan `ADMIN_PASSWORD` di `.env`, lalu `npm run seed:admin`.

## Coba endpoint

```
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Nadia","email":"nadia@contoh.com","password":"rahasia123"}'

curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"nadia@contoh.com","password":"rahasia123"}'

curl http://localhost:3000/api/auth/me -H "Authorization: Bearer TOKEN_DARI_LOGIN"
```

## Catatan untuk cPanel (nanti)

- Buat database dan user di Manage My Databases, lalu isi `.env` di server dengan data itu. Jangan commit `.env` ke GitHub.
- Startup file di Setup Node.js App: `app.js`.
- Gunakan `JWT_SECRET` yang berbeda dari di laptop.
