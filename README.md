# Kasbon

Catat utang piutang pribadi: siapa hutang berapa ke kamu, kamu hutang berapa ke siapa, dan tandai lunas kalau sudah dibayar.

**Demo:** _(link Vercel menyusul)_

Dokumentasi teknis lengkap (arsitektur, skema, API, RLS): [docs/DOCUMENTATION.md](docs/DOCUMENTATION.md)

## Stack

| | Versi |
|---|---|
| Next.js (App Router) + TypeScript strict | 16.3.8 |
| Tailwind CSS | v4 |
| Supabase (PostgreSQL + Auth) via `@supabase/ssr` | ssr 0.12.7, supabase-js 2.117.2 |
| Lucide React | 1.49.0 |
| Zod | 4.6.5 |

### Library tambahan

- **Zod.** Validasi form dijalankan di client dan di server, dan dua-duanya pakai satu skema yang sama (`src/lib/debts/schema.ts`). Pesan error-nya dalam Bahasa Indonesia dan type `DebtInput` diturunkan dari skema itu, jadi aturan validasi client dan server tidak bisa beda.
- **Supabase CLI** (devDependency). Dipakai untuk `db push` migration dari `supabase/migrations/`, supaya skema dan RLS ter-versi di repo, bukan diklik manual di dashboard.

Sengaja **tidak** pakai library tanggal, chart, atau UI kit:
- Format Rupiah memakai `Intl.NumberFormat('id-ID')`.
- Tanggal relatif memakai `Intl.RelativeTimeFormat('id-ID')`.
- Bar chart dibuat dari CSS.
- Modal memakai `<dialog>` native.

## Setup lokal

Butuh Node.js 22+ dan project Supabase (free tier cukup).

```bash
npm install
cp .env.example .env
```

Isi `.env` dari Supabase Dashboard → Project Settings → API:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
```

Di Dashboard → Authentication → Sign In / Providers → Email, matikan **Confirm email** supaya signup langsung bisa masuk.

### Migrate

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

### Jalankan

```bash
npm run dev            # http://localhost:3000
npm run build && npm start
```

### Cek

```bash
npm run lint
npx tsc --noEmit
npm run check:format   # self-check format Rupiah & tanggal relatif
bash scripts/rls-test.sh   # tes kebocoran RLS lewat Supabase REST API langsung
```

`scripts/rls-test.sh` bikin 2 user, lalu memastikan user B tidak bisa baca, edit, hapus, atau insert atas nama data user A, dan request anon tanpa login ditolak. Row tesnya dihapus lagi, tapi user tesnya tetap ada di Auth.

## Approach

Keputusan yang paling saya banggakan: **otorisasi sepenuhnya dipegang database, bukan kode aplikasi.**
- Tabel `debts` punya RLS yang di-*force* dan 4 policy (`select`/`insert`/`update`/`delete`) dengan syarat `auth.uid() = user_id`.
- Policy UPDATE pakai `using` + `with check`, jadi row tidak bisa "dipindahkan" ke user lain.
- Role `anon` dicabut aksesnya sama sekali.
- API route Next.js tidak pernah memakai `service_role`. Setiap request memanggil Supabase dengan anon key dan cookie sesi user, jadi query di route tetap tunduk ke RLS. Kalaupun ada bug di route (misalnya lupa filter `user_id`), data user lain tetap tidak bisa terbaca. Itu sebabnya ID milik orang lain hasilnya `404`, bukan `403`: buat user tersebut, row-nya memang tidak ada.

Hal ini dibuktikan oleh `scripts/rls-test.sh`, bukan cuma diklaim. Di sisi lain, satu skema Zod dipakai di form dan di API, sehingga validasi client dan server selalu sama.

## Trade-off: kalau ada 1 hari lagi

- **"Tandai lunas" atomic di DB.** Sekarang PATCH membaca row dulu, lalu hanya mengisi `settled_at` kalau masih `null`. Panggilan berulang aman (idempotent) dan tombol di-disable selama request jalan. Tapi dua request yang benar-benar bersamaan masih bisa menulis timestamp dua kali dengan selisih milidetik. Solusinya: update bersyarat `where settled_at is null` atau fungsi RPC.
- **Summary dihitung di DB.** Total dan net sekarang dijumlahkan di client dari semua entry. Untuk data besar, sebaiknya pakai view/RPC `sum()` plus pagination di `GET /api/debts`.
- **Test otomatis.** E2E Playwright untuk alur signup → catat → lunas → refresh, plus test API route. Sekarang yang ada baru self-check format dan skrip RLS.
- **Polish UI.** Kursor di input jumlah lompat ke akhir saat mengedit angka di tengah, belum ada optimistic update, dan belum ada toggle tema manual (dark mode masih mengikuti sistem).

## Time spent

_(isi jujur)_
