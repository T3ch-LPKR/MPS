# Champion SJP — Admin (Next.js + Supabase)

Web admin untuk Sales Journey Plan (PT Multi Prima Sejahtera Tbk). Next.js 14 (App Router, TS) + Tailwind,
akses DB **server-side** via `pg` ke Supabase Postgres (schema `MPS_SJP`). Login sendiri (tabel `sjp_user_login`,
password **bcrypt** via pgcrypto). Deploy target: **Vercel**.

## Fitur
- **Login** (username/password, bcrypt) + proteksi route (middleware, cookie JWT httpOnly).
- **Dashboard** — ringkasan (salesman, customer, geo, assignment, jadwal/kunjungan hari ini). Monitoring kunjungan
  aktif setelah app Salesman jalan.
- **Master & Assign** — master salesman (Division MARKETING), master customer (+ AR/geo/last order badge),
  assign customer→salesman + frekuensi (W/BW/M/C) + hari.
- **Generate & Kalender** — generate jadwal harian Senin–Sabtu dari assignment + weekly grid.
- **LOV** — kelola catatan kunjungan & alasan OOS.
- **Prospek** — data lokal SJP, tautkan Cust_Code / arsip.
- **Kelola User** — tambah user, reset password (bcrypt), aktif/nonaktif.

## Jalankan lokal
```bash
npm install
# .env.local sudah berisi kredensial DB (dev pakai pooler 5432)
npm run dev        # http://localhost:3000
```
Login awal: **admin / Champion#2026** → segera ganti password di menu Kelola User.

## Env (lihat .env.example)
| Var | Keterangan |
|-----|-----------|
| PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD | Koneksi Supabase Postgres |
| PGSSL | `require` (Supabase wajib SSL) |
| SJP_SCHEMA | `MPS_SJP` |
| SESSION_SECRET | rahasia sign cookie (≥32 char, random di produksi) |

## Deploy ke Vercel
1. Push folder ini ke repo Git (node_modules ter-gitignore).
2. Vercel → New Project → import repo → root = `champion-sjp-admin`.
3. **Environment Variables** (Settings): isi semua var di atas.
   - **PGPORT = 6543** (Transaction Pooler) untuk serverless Vercel — bukan 5432.
   - PGHOST/PGUSER/PGPASSWORD sama seperti `.env.local`.
   - SESSION_SECRET: string random baru (jangan pakai yang dev).
4. Deploy. Vercel otomatis HTTPS.

## Catatan
- Akses DB hanya di server (Server Components/Actions) — kredensial tak pernah ke browser. RLS boleh OFF.
- Password tak pernah plaintext — hash bcrypt `crypt(pwd, gen_salt('bf'))` di Postgres.
- Data master/AR/last-order diisi oleh script sync on-prem (`../sync/*.py`), dijalankan dini hari.
- `.env.local` JANGAN di-commit (sudah di .gitignore). Untuk produksi, rotate password DB & pindahkan kredensial keluar OneDrive.
