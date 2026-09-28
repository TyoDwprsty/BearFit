# BearFit 🐻

Aplikasi pemantau diet & latihan **mobile-first** (PWA) bareng Beru si beruang — member mencatat makan & latihan, coach memantau, menyemangati, dan menyusun program.

**Stack:** Next.js 16 (App Router) · Tailwind CSS v4 · Supabase (Auth Google, Postgres + RLS, Realtime, pg_cron) · Prisma (skema & migrasi) · Cloudflare R2 (foto) · Web Push (VAPID) · Groq Vision (estimasi kalori) · Vercel.

## Fitur

| Member | Coach |
| --- | --- |
| Beranda: streak, ring target (latihan/makan/air), nutrisi harian, pengingat berikutnya | Dasbor anggota: siapa sudah posting makan / latihan / perlu dicek |
| Catatan makan per hari + like & komentar coach | Detail anggota: timeline hari ini, ringkasan minggu, rencana 7 hari |
| **Komunitas**: lihat postingan makan & progres latihan teman satu coach, like & komentar | Pasang program ke banyak anggota langsung dari halaman program |
| Posting makanan: foto → **estimasi kalori & makro AI (Groq)**, bisa dikoreksi | Like & komentar makanan, “kirim semangat cepat” |
| Pilih latihan harian, **timer latihan** (aba-aba 5 detik → timer → getar 3 detik / Done) | Atur rencana latihan per tanggal + catatan |
| Pengingat + **alarm** (Web Push, layar “Alarm Berbunyi”, tunda) | **Program** mingguan (template Sen–Min) & pasang ke anggota |
| Progres: streak, menit latihan, kalori, berat badan, lencana | **Katalog latihan custom** + link video tutorial |
| Chat realtime + kirim foto | Chat realtime + kirim foto |

- Daftar/masuk dengan **Google**. Saat onboarding pilih **Member**, **Coach**, atau **keduanya** — pengguna ganda punya tombol **pindah mode** (⇄).
- Relasi coach ↔ member: **kode/link undangan** (`/join/KODE`, langsung terhubung) **atau** member **cari coach & kirim permintaan** yang di-approve coach. 1 member = 1 coach aktif.
- Bahasa **Indonesia / English**, tema **terang / gelap / sistem**.
- Desktop: sidebar kiri + layout 2 kolom; ponsel: bottom nav sesuai desain.

## Menjalankan lokal

```bash
npm install
cp .env.example .env.local   # lalu isi nilainya
npm run dev
```

Tanpa env yang valid, halaman Selamat Datang tetap tampil dengan catatan “Env belum diatur”.

## Setup layanan

### 1. Supabase
1. Buat project, lalu isi `DIRECT_URL` (Supabase → **Connect** → *Session pooler*, port 5432) dan jalankan `npm run db:deploy` — semua tabel, RLS, RPC & seed latihan dibuat otomatis. Lihat [Database & migrasi](#database--migrasi).
2. **Authentication → Providers → Google**: aktifkan, isi Client ID & Secret dari Google Cloud Console (OAuth client “Web application”, Authorized redirect URI = `https://<project>.supabase.co/auth/v1/callback`).
3. **Authentication → URL Configuration**: Site URL = domain produksi; tambahkan Redirect URLs `http://localhost:3000/auth/callback` dan `https://<domain>/auth/callback`.
4. Salin **Project URL**, **publishable key**, dan **secret key** ke env.

### 2. Cloudflare R2
1. Buat bucket (mis. `bearfit`) → **Settings → Public access**: aktifkan r2.dev subdomain atau custom domain → isi `R2_PUBLIC_URL`.
2. **CORS policy** bucket (upload langsung dari browser):
   ```json
   [
     {
       "AllowedOrigins": ["http://localhost:3000", "https://<domain-kamu>"],
       "AllowedMethods": ["PUT", "GET"],
       "AllowedHeaders": ["Content-Type"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
3. **Manage R2 API Tokens** → buat token **Object Read & Write** untuk bucket itu → isi `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`. `R2_ACCOUNT_ID` ambil dari URL *S3 API* di Settings bucket: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com/bearfit` (bukan Zone ID domain).

4. **Lifecycle rule** (hapus foto staging yang tidak jadi dipakai): bucket → **Settings → Object lifecycle rules → Add rule** → prefix `tmp/` → *Delete objects* setelah **1 hari**.

Alur foto (makanan & chat):
1. Foto dikompres di HP → **WebP** maks 1440px (≈80–200 KB, fallback JPEG di browser lama). AI menerima salinan JPEG 1024px terpisah.
2. Langsung diunggah ke **staging** `tmp/<userId>/…` lewat presigned URL (tidak lewat bandwidth Vercel) sambil user mengisi form.
3. Saat posting/kirim, server memindahkan foto ke `meals/…` atau `chats/…`. Foto yang batal dipakai tetap di `tmp/` dan dihapus lifecycle rule.

### 3. Web Push (VAPID)
```bash
npx web-push generate-vapid-keys
```
Isi `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (mailto:email-kamu).

### 4. Groq
Buat API key di console.groq.com → `GROQ_API_KEY`. Model default `qwen/qwen3.8-27b` (vision); ganti lewat `GROQ_VISION_MODEL` bila Groq mengganti model.

### 5. Deploy ke Vercel (Hobby)
1. Import repo → isi semua env (lihat `.env.example`). Dengan `DIRECT_URL` terisi, setiap deploy otomatis menjalankan `prisma migrate deploy` sebelum build (`npm run vercel-build`).
2. Buat `CRON_SECRET` acak (mis. `openssl rand -hex 32`).

### 6. Penjadwal pengingat (pg_cron)
Vercel Hobby hanya mengizinkan cron 1×/hari, jadi Supabase yang memanggil app **tiap menit**:
1. Edit `supabase/reminder_cron.sql` → ganti `YOUR-APP.vercel.app` & `YOUR_CRON_SECRET` (sengaja bukan migrasi Prisma karena berisi URL & secret per-deploy).
2. Jalankan sekali di SQL Editor (butuh extension `pg_cron` & `pg_net`, keduanya tersedia di Supabase).

`/api/cron/reminders` mengecek pengingat yang jatuh tempo (sesuai zona waktu tiap user) lalu mengirim push.

## Database & migrasi

Prisma dipakai untuk **skema & migrasi** saja; aplikasi tetap membaca/menulis lewat Supabase client supaya **RLS** (izin per user) dijaga database.

- `prisma/schema.prisma` — sumber kebenaran tabel, enum, index, relasi.
- `prisma/migrations/` — riwayat migrasi SQL. Hal yang tak bisa dimodelkan Prisma (policy RLS, fungsi RPC, trigger, CHECK) ditulis manual di SQL migrasi.

| Perintah | Fungsi |
| --- | --- |
| `npm run db:status` | cek migrasi yang belum diterapkan |
| `npm run db:deploy` | terapkan migrasi ke database (`DIRECT_URL`) |
| `npm run db:new -- <nama>` | buat migrasi baru dari selisih database ↔ `schema.prisma` |
| `npm run db:diff` | lihat selisih tanpa membuat file |
| `npm run db:baseline` | **sekali saja** untuk database yang dulu disetup manual via SQL Editor |

**Mengubah skema:**
1. Edit `prisma/schema.prisma` (mis. tambah kolom).
2. `npm run db:new -- tambah_kolom_x` → cek file SQL yang dibuat. Untuk **tabel baru**, tambahkan `ENABLE ROW LEVEL SECURITY` + policy di file itu.
3. `npm run db:deploy` (atau cukup push — Vercel menjalankannya saat build).

**Database yang dulu disetup manual** (SQL ditempel di SQL Editor): jalankan sekali `npm run db:baseline`, lalu `npm run db:deploy`.

> `prisma migrate dev` tidak dipakai: shadow database-nya butuh skema `auth` milik Supabase. `db:new` membandingkan langsung dengan database sungguhan, jadi pastikan `db:status` sudah bersih dulu (skrip mengeceknya otomatis).

## Instal di HP & catatan alarm

- **Android (Chrome):** banner “Pasang BearFit” muncul otomatis, atau menu ⋮ → *Install app*.
- **iPhone (iOS 16.4+):** Safari → Bagikan → **Tambah ke Layar Utama**, lalu buka dari ikon. Web Push di iOS **hanya** bekerja untuk PWA yang sudah dipasang.
- Aktifkan notifikasi di halaman **Pengingat** atau **Profil**, lalu tekan **Kirim tes**.

Keterbatasan PWA: saat aplikasi tertutup, alarm muncul sebagai **notifikasi push** dengan suara/getar bawaan HP (tombol *Buka* & *Tunda*). Nada alarm berulang (“Beru Semangat”, dll.) berbunyi di layar **Alarm Berbunyi** saat aplikasi dibuka/terbuka. Untuk alarm ala aplikasi jam (nada custom saat app tertutup), app perlu dibungkus native (mis. Capacitor) nanti.

## Struktur

```
app/
  (member)/      home, food, food/new, workout, reminders, progress, chat
  (shared)/      profile, notifications   (nav mengikuti mode aktif)
  coach/         dasbor, members/[id], members/[id]/plan, chat, programs, exercises
  alarm/[id]     layar alarm penuh
  join/[code]    halaman undangan coach
  onboarding/    pilih peran + data awal
  actions/       server actions (meals, workout, reminders, links, coach, chat, …)
  api/           upload (R2), ai/nutrition (Groq), push, cron/reminders
components/      Beru (maskot SVG), FoodArt, Icon, ui, shell (nav), fitur per domain
lib/             supabase, auth, i18n (id/en), dates (zona waktu), data, push, r2, groq
prisma/            schema.prisma + migrations/ (tabel, RLS, RPC, trigger)
supabase/reminder_cron.sql   jadwal pg_cron (dijalankan manual sekali)
public/sw.js     service worker (push, klik notifikasi, tunda)
scripts/generate-icons.mjs   ikon PWA dari maskot
```

## Skrip

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | server pengembangan |
| `npm run build` / `npm start` | build & jalankan produksi |
| `npm run lint` | ESLint |
| `node scripts/generate-icons.mjs` | buat ulang ikon PWA di `public/icons` |
