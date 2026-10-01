# Dokumentasi Teknis Kasbon

## Daftar isi

1. [Arsitektur](#arsitektur)
2. [Struktur folder](#struktur-folder)
3. [Database](#database)
4. [Row Level Security](#row-level-security)
5. [Auth](#auth)
6. [API](#api)
7. [Validasi](#validasi)
8. [Format Rupiah dan tanggal](#format-rupiah-dan-tanggal)
9. [Frontend](#frontend)
10. [Pengujian](#pengujian)
11. [Deploy](#deploy)

## Arsitektur

```
Browser ── fetch /api/debts ──▶ Route Handler (Next.js)
   │                               │  createClient() + cookie sesi user
   │                               ▼
   │                         Supabase PostgREST ──▶ Postgres (RLS: auth.uid() = user_id)
   │
   └── request halaman ──▶ src/proxy.ts (refresh sesi, redirect kalau belum login)
                              └──▶ (app)/layout.tsx (cek klaim lagi di server)
```

- Semua akses data lewat Supabase dengan **anon key + JWT user**. `service_role` tidak dipakai di mana pun, sehingga RLS selalu berlaku.
- Data dashboard diambil client lewat API route `/api/debts`, bukan langsung ke Supabase dari browser. Dengan begitu kontrak API di spek benar-benar dipakai oleh app.
- Tidak ada data hardcode. Semua angka berasal dari tabel `debts`.

## Struktur folder

```
supabase/
  config.toml
  migrations/20261001174137_create_debts.sql
scripts/
  check-format.mts         self-check formatRupiah & formatRelativeDate
  rls-test.sh              tes kebocoran RLS via REST API
src/
  proxy.ts                 guard + refresh sesi (pengganti middleware di Next 16)
  app/
    layout.tsx             <html lang="id">, font, metadata
    globals.css            design tokens (@theme), kelas .btn/.field/.sheet/.skeleton
    (auth)/
      actions.ts           server actions: login, signup, logout
      AuthForm.tsx         form login/signup (useActionState)
      login/page.tsx
      signup/page.tsx
    (app)/
      layout.tsx           cek login di server + header
      page.tsx             dashboard
      loading.tsx          skeleton
      error.tsx            error boundary + tombol coba lagi
    api/debts/
      route.ts             GET, POST
      [id]/route.ts        PATCH, DELETE
  components/              AppHeader, Dashboard, SummaryCards, BalanceChart, DebtFilters,
                           DebtList, DebtItem, DebtGroupList, DebtFormDialog, ConfirmDelete,
                           Modal, EmptyState, ErrorState, Skeleton, Toast
  hooks/useDebts.ts        fetch + mutasi ke /api/debts
  lib/
    api.ts                 jsonError, invalidInput, serverError, requireUser
    format.ts              formatRupiah, formatRelativeDate
    debts/schema.ts        skema Zod + type Debt
    supabase/
      server.ts            client untuk server (cookie dari next/headers)
      client.ts            client untuk browser
      database.ts          type Database untuk query yang ter-type
```

## Database

Migration: `supabase/migrations/20261001174137_create_debts.sql`

### Enum `debt_type`

| Nilai | Arti |
|---|---|
| `owed_to_me` | Orang lain hutang ke saya (saya dihutang) |
| `i_owe` | Saya hutang ke orang lain |

### Tabel `public.debts`

| Kolom | Tipe | Aturan |
|---|---|---|
| `id` | `uuid` | PK, `default gen_random_uuid()` |
| `user_id` | `uuid` | `not null`, `default auth.uid()`, FK → `auth.users(id)` `on delete cascade` |
| `type` | `debt_type` | `not null` |
| `counterpart_name` | `text` | `not null`, panjang setelah trim 1–100 |
| `amount` | `bigint` | `not null`, `> 0` dan `≤ 10^15` (Rupiah utuh, tanpa desimal) |
| `note` | `text` | nullable, maks 200 karakter |
| `due_date` | `date` | nullable; diisi dari field "Tanggal" di form (default hari ini) |
| `settled_at` | `timestamptz` | nullable; `null` = belum lunas |
| `created_at` | `timestamptz` | `not null default now()` |
| `updated_at` | `timestamptz` | `not null default now()`, diperbarui trigger `set_updated_at` |

Catatan desain:
- **Batas `amount` 10^15** dipilih karena masih di bawah `Number.MAX_SAFE_INTEGER` (≈ 9 × 10^15). Dengan begitu nilai `bigint` aman dibaca sebagai `number` di JavaScript tanpa kehilangan presisi.
- **Constraint `check` di DB** jadi lapis pertahanan terakhir. Kalaupun ada yang menembak REST API langsung tanpa lewat Zod, data tidak valid tetap ditolak.
- **Fungsi trigger memakai `set search_path = ''`** supaya tidak bisa dibajak lewat `search_path`. Ini juga direkomendasikan oleh Supabase database linter.
- **Index `(user_id, created_at desc)`** cocok dengan pola query utama, yaitu semua row milik user diurutkan dari yang terbaru.
- **Ambiguitas spek:** form meminta "Tanggal (default hari ini)", tapi skema hanya punya `due_date`. Field itu disimpan ke `due_date` supaya tetap mengikuti skema di spek. Di list, tanggal relatif diambil dari `due_date`, dan kalau kosong pakai `created_at`.

## Row Level Security

```sql
alter table public.debts enable row level security;
alter table public.debts force row level security;

revoke all on public.debts from anon;
grant select, insert, update, delete on public.debts to authenticated;
```

| Policy | Operasi | Aturan |
|---|---|---|
| `debts_select_own` | SELECT | `using ((select auth.uid()) = user_id)` |
| `debts_insert_own` | INSERT | `with check ((select auth.uid()) = user_id)` |
| `debts_update_own` | UPDATE | `using (...)` **dan** `with check (...)` |
| `debts_delete_own` | DELETE | `using ((select auth.uid()) = user_id)` |

- Semua policy hanya untuk role `authenticated`. Role `anon` tidak punya grant sama sekali, jadi request tanpa login langsung ditolak dengan `permission denied`.
- `with check` di UPDATE mencegah user mengubah `user_id` row miliknya menjadi milik orang lain.
- `(select auth.uid())` dibungkus `select` supaya Postgres cukup menghitungnya sekali per query, bukan per row. Ini rekomendasi performa dari Supabase.
- `force row level security` membuat RLS tetap berlaku bahkan untuk owner tabel.

### Tes kebocoran

```bash
bash scripts/rls-test.sh
```

Contoh hasil:

```
PASS  B select semua cuma lihat row sendiri
PASS  B select row A
PASS  B update row A
PASS  B delete row A
PASS  B insert atas nama A
PASS  B pindahkan row sendiri ke A
PASS  anon tanpa login
PASS  row A tetap utuh
```

Contoh manual pakai curl, dengan token milik user B:

```bash
curl "$SUPABASE_URL/rest/v1/debts?select=*" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_B"
# → hanya row milik B

curl -X PATCH "$SUPABASE_URL/rest/v1/debts?id=eq.<id-milik-A>" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_B" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d '{"amount":1}'
# → [] (tidak ada row yang berubah)
```

## Auth

- **Signup/login:** pakai email + password lewat server action di `src/app/(auth)/actions.ts`. Input divalidasi Zod (email valid, password minimal 6 karakter), dan error Supabase diterjemahkan ke Bahasa Indonesia, misalnya `invalid_credentials` → "Email atau passwordnya salah, cek lagi ya".
- **Logout:** server action `logout` (`signOut` lalu redirect ke `/login`), dipanggil dari form di header.
- **Proteksi halaman** ada dua lapis:
  1. `src/proxy.ts` (konvensi Next 16, pengganti `middleware.ts`) me-refresh sesi Supabase di setiap request. User yang belum login diarahkan ke `/login`, dan user yang sudah login diarahkan dari `/login` atau `/signup` ke `/`. Path `/api/*` dilewatkan karena route handler mengembalikan 401 JSON sendiri.
  2. `src/app/(app)/layout.tsx` memanggil `getClaims()` lagi di server, lalu redirect kalau tidak ada sesi.
- **`getClaims()`** dipakai sesuai rekomendasi Supabase SSR. Fungsi ini memverifikasi JWT, bukan sekadar membaca cookie seperti `getSession()`.
- **Konfirmasi email dimatikan**, jadi `signUp` langsung mengembalikan sesi. Kalau suatu saat dinyalakan, action-nya menampilkan pesan "cek email".

## API

Semua endpoint:
- Wajib login. Tanpa sesi → `401 {"error":"Kamu belum masuk, masuk dulu ya"}`.
- Validasi input dengan Zod. Input tidak valid → `400 {"error": "<pesan pertama>", "details": {<field>: [pesan...]}}`.
- Error database → `500 {"error":"Ada yang salah di server, coba lagi ya"}`. Detail aslinya hanya di-log di server, tidak dikirim ke client.
- Respons sukses berbentuk `{"data": ...}`.

### `GET /api/debts`

| Query | Nilai | Default |
|---|---|---|
| `status` | `all` \| `unpaid` \| `paid` | `all` |
| `type` | `all` \| `owed_to_me` \| `i_owe` | `all` |
| `q` | cari nama (case-insensitive, maks 100 karakter) | – |
| `sort` | `newest` \| `oldest` \| `amount_desc` \| `amount_asc` | `newest` |

`q` di-escape (`\`, `%`, `_`) sebelum dipakai di `ilike`, sehingga karakter wildcard dicari sebagai teks biasa.

```bash
curl "http://localhost:3000/api/debts?status=unpaid&type=owed_to_me&sort=amount_desc" \
  --cookie "<cookie sesi>"
```
```json
{ "data": [ { "id": "…", "type": "owed_to_me", "counterpart_name": "Budi", "amount": 150000,
  "note": null, "due_date": "2026-10-01", "settled_at": null, "created_at": "…", "updated_at": "…",
  "user_id": "…" } ] }
```

### `POST /api/debts`

```json
{ "type": "owed_to_me", "counterpart_name": "Budi", "amount": 150000,
  "due_date": "2026-10-01", "note": "Patungan makan" }
```

- Sukses: `201 {"data": Debt}`.
- `user_id` selalu diambil dari sesi, bukan dari body.
- `amount` boleh berupa angka atau string angka, tapi harus bilangan bulat > 0.
- `note` kosong disimpan sebagai `null`.

### `PATCH /api/debts/[id]`

Body berisi field mana pun dari POST (parsial), dan/atau `settled`.

| Body | Efek |
|---|---|
| `{"settled": true}` | Isi `settled_at = now()` **hanya kalau masih null** |
| `{"settled": false}` | `settled_at = null` (batal lunas) |
| `{"amount": 200000}` | Update field biasa |

- **Idempotent:** "tandai lunas" yang dipanggil berulang kali tetap `200`, dan `settled_at` tidak berubah dari nilai pertama.
- Body kosong → `400`.
- `id` bukan UUID → `400`.
- Row tidak ditemukan, atau milik user lain → `404`.

### `DELETE /api/debts/[id]`

- Sukses: `200 {"data": {"id": "…"}}`.
- Tidak ditemukan atau milik orang lain → `404`.

### Ringkasan status code

| Kode | Kapan |
|---|---|
| 200 | GET / PATCH / DELETE sukses |
| 201 | POST sukses |
| 400 | JSON rusak, validasi gagal, id bukan UUID, PATCH kosong |
| 401 | Belum login |
| 404 | Catatan tidak ada atau bukan milik user |
| 500 | Error database |

## Validasi

`src/lib/debts/schema.ts` adalah satu-satunya sumber aturan validasi:

| Skema | Dipakai di | Isi |
|---|---|---|
| `debtInput` | Form (client) dan POST (server) | Tipe wajib; nama 1–100 setelah trim; jumlah bulat 1–10^15; tanggal `YYYY-MM-DD` atau kosong; catatan maks 200 |
| `updateDebt` | PATCH | `debtInput.partial()` + `settled: boolean`, tidak boleh kosong |
| `listQuery` | GET | Query param dengan default |
| `debtId` | `[id]` | UUID |

Ada tiga lapis validasi:
1. Zod di form, untuk feedback langsung per field.
2. Zod yang sama di API route.
3. Constraint `check` di Postgres.

## Format Rupiah dan tanggal

`src/lib/format.ts`:
- **`formatRupiah(n)`** memakai `Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })`, dengan non-breaking space diganti spasi biasa. Hasilnya `Rp 1.234.000`, dan untuk nilai negatif `-Rp 1.234.000`. Semua tampilan uang di app lewat fungsi ini.
- **`formatRelativeDate(date)`** memakai `Intl.RelativeTimeFormat('id-ID', { numeric: 'auto' })`. Selisihnya dihitung per hari kalender di zona waktu lokal, sehingga hasilnya "hari ini", "kemarin", "3 hari yang lalu", "besok", lalu minggu/bulan/tahun untuk jarak yang lebih jauh.
- Self-check: `npm run check:format`.

## Frontend

### Dashboard

`src/components/Dashboard.tsx` memakai `useDebts()` **dua kali**:
1. **Tanpa filter**, untuk summary dan chart. Hasilnya, total tidak ikut berubah saat filter dipakai.
2. **Dengan filter** (status, tipe, sort, dan pencarian dengan debounce 300 ms) untuk list. Filter ini dikirim sebagai query param ke API.

Isi dashboard:
- **Summary:**
  - "Total dihutang ke saya" = jumlah `owed_to_me` yang belum lunas.
  - "Total saya hutang" = jumlah `i_owe` yang belum lunas.
  - "Net" = selisih keduanya: hijau kalau positif, merah kalau negatif, netral kalau 0.
- **Bar chart:** dua bar CSS (dihutang vs hutang), lengkap dengan label teks.
- **List:**
  - Isinya: nama, badge tipe, jumlah, tanggal relatif, badge status, catatan, dan aksi Tandai lunas / Edit / Hapus.
  - Tombol aksi di-disable selama request jalan.
  - Hapus pakai dialog konfirmasi.
- **Group per orang:** pakai `<details>` native, dikelompokkan berdasarkan nama (trim + lowercase). Menampilkan jumlah catatan dan net yang belum lunas per orang.
- **Form catat / edit:**
  - Pakai `<dialog>` native: bottom sheet di HP, modal di tengah di desktop.
  - Divalidasi dengan `debtInput`.
  - Input jumlah memakai `inputMode="numeric"` dengan pemisah ribuan, tapi yang dikirim angka bulat.
  - Tanggal default hari ini sesuai waktu lokal.
  - Catatan punya counter `n/200`.
- **State:** skeleton (`loading.tsx` dan saat load pertama), error dengan tombol coba lagi (`error.tsx` dan error di hook), serta empty state yang dibedakan antara "belum ada data" dan "filter tidak menemukan apa-apa".

### Design system

Token warna semantik ada di `globals.css`: `canvas`, `surface`, `ink`, `primary`, `positive`, `negative`, `warning`, dan lainnya, beserta varian dark mode lewat `prefers-color-scheme`.
- Kontras teks sudah dicek minimal 4.5:1 (WCAG AA).
- Ukuran sentuh minimal 44 px.
- Ring `:focus-visible` berlaku global.
- Transisi sekitar 150 ms, dan dimatikan kalau user memilih `prefers-reduced-motion`.
- Mobile-first: tombol "Catat baru" menempel di bawah layar HP, dan tidak ada scroll horizontal di lebar 360 px.

## Pengujian

| Cek | Perintah |
|---|---|
| Type check | `npx tsc --noEmit` |
| Lint | `npm run lint` |
| Build | `npm run build` |
| Format Rupiah & tanggal | `npm run check:format` |
| Kebocoran RLS | `bash scripts/rls-test.sh` |

Alur manual yang perlu dicek:
1. Signup.
2. Catat entry dari kedua tipe.
3. Cek angka summary dan warna net.
4. Tandai lunas, lalu refresh. Status harus tetap lunas karena tersimpan di DB.
5. Edit, lalu hapus.
6. Coba filter, search, sort, dan group.
7. Cek tampilan di viewport HP.
8. Logout.

## Deploy

1. Push repo ke GitHub, lalu import di Vercel.
2. Isi env `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` di Vercel → Settings → Environment Variables.
3. Di Supabase → Authentication → URL Configuration, isi **Site URL** dengan domain Vercel.
4. Pastikan migration sudah di-push (`npx supabase db push`).
