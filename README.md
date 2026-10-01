# Kasbon

Catat utang piutang pribadi: siapa hutang berapa ke kamu, kamu hutang berapa ke siapa, dan tandai lunas kalau sudah dibayar.

**Demo:** _(link Vercel menyusul)_

## Daftar isi

1. [Stack dan library](#stack)
2. [Setup lokal](#setup-lokal)
3. [Approach](#approach)
4. [Trade-off](#trade-off-kalau-ada-1-hari-lagi)
5. [Time spent](#time-spent)
6. [Dokumentasi teknis](#dokumentasi-teknis): [Arsitektur](#arsitektur), [Struktur folder](#struktur-folder), [Database](#database), [Row Level Security](#row-level-security), [Auth](#auth), [API](#api), [Validasi](#validasi), [Format Rupiah dan tanggal](#format-rupiah-dan-tanggal), [Frontend](#frontend), [Pengujian](#pengujian), [Deploy](#deploy)

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

Migration yang ada, berurutan:
1. `20261001174137_create_debts.sql`: enum, tabel `debts`, index, RLS, dan 4 policy.
2. `20261002120000_harden_debts.sql`: trigger guard, grant per kolom, constraint `settled_after_created`, dan batas `amount` 10^12.

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

`scripts/rls-test.sh` bikin 2 user, lalu memastikan user B tidak bisa baca, edit, hapus, upsert, atau insert atas nama data user A. Skrip juga mengecek:
- blind `PATCH`/`DELETE` tanpa filter hanya kena row B sendiri;
- `count=exact` dan filter `user_id=eq.<A>` tidak membocorkan row A;
- request anon (POST/PATCH/DELETE) ditolak;
- `created_at` tidak bisa diubah (grant per kolom);
- `settled_at` yang di-set dua kali tetap memakai timestamp pertama (trigger).

Output-nya baris PASS/FAIL, dan skrip `exit 1` kalau ada yang gagal. Dua check terakhir (grant per kolom dan trigger) baru lolos setelah migration hardening di-push. Row tesnya dihapus lagi, tapi user tesnya tetap ada di Auth (anon key tidak bisa menghapus user).

## Approach

Keputusan yang paling saya banggakan: **otorisasi sepenuhnya dipegang database, bukan kode aplikasi.** Tabel `debts` memakai RLS yang di-*force* dengan policy `auth.uid() = user_id` untuk tiap operasi, role `anon` dicabut sama sekali, dan role `authenticated` hanya boleh menulis kolom yang memang perlu (grant per kolom). Trigger DB menjaga `updated_at` dan membuat "tandai lunas" atomic dan idempotent, sementara constraint `check` menjadi lapis validasi terakhir. API route Next.js tidak pernah memakai `service_role`: setiap request memakai anon key dan cookie sesi user, jadi bug di route (misalnya lupa filter `user_id`) tetap tidak bisa membocorkan data user lain, dan ID milik orang lain hasilnya `404`, bukan `403`. Semua itu dibuktikan oleh `scripts/rls-test.sh`, bukan cuma diklaim, dan satu skema Zod dipakai di form dan di API supaya validasi client dan server selalu sama. Detailnya ada di [Row Level Security](#row-level-security).

## Trade-off: kalau ada 1 hari lagi

- **Summary dihitung di DB.** Total dan net dijumlahkan di client dari semua entry, dan `GET /api/debts` belum punya pagination. Karena itu summary ikut kena batas default 1000 row dari PostgREST: kalau ada lebih dari 1000 catatan, angkanya tidak lengkap. Solusinya: view/RPC `sum()` plus pagination di `GET /api/debts`.
- **Test otomatis.** E2E Playwright untuk alur signup → catat → lunas → refresh, plus test API route. Sekarang yang ada baru self-check format dan skrip RLS.
- **Polish UI.** Kursor di input jumlah lompat ke akhir saat mengedit angka di tengah, belum ada optimistic update, dan belum ada toggle tema manual (dark mode masih mengikuti sistem).

## Time spent

_(isi jujur)_

---

## Dokumentasi teknis

### Arsitektur

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

### Struktur folder

```
supabase/
  config.toml
  migrations/
    20261001174137_create_debts.sql
    20261002120000_harden_debts.sql
scripts/
  check-format.mts         self-check formatRupiah & formatRelativeDate
  rls-test.sh              tes kebocoran RLS, grant per kolom, dan trigger via REST API
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
    api.ts                 jsonError, invalidInput, serverError, readJson, requireUser
    format.ts              formatRupiah, formatRelativeDate
    debts/schema.ts        skema Zod + type Debt
    supabase/
      server.ts            client untuk server (cookie httpOnly dari next/headers)
      database.ts          type Database untuk query yang ter-type
```

### Database

Migration, berurutan:
1. `supabase/migrations/20261001174137_create_debts.sql`: enum, tabel, index, RLS, dan policy.
2. `supabase/migrations/20261002120000_harden_debts.sql`: trigger guard, grant per kolom, constraint `settled_after_created`, dan batas `amount` 10^12.

#### Enum `debt_type`

| Nilai | Arti |
|---|---|
| `owed_to_me` | Orang lain hutang ke saya (saya dihutang) |
| `i_owe` | Saya hutang ke orang lain |

#### Tabel `public.debts`

| Kolom | Tipe | Aturan |
|---|---|---|
| `id` | `uuid` | PK, `default gen_random_uuid()` |
| `user_id` | `uuid` | `not null`, `default auth.uid()`, FK → `auth.users(id)` `on delete cascade` |
| `type` | `debt_type` | `not null` |
| `counterpart_name` | `text` | `not null`, panjang setelah trim 1–100 |
| `amount` | `bigint` | `not null`, `> 0` dan `≤ 10^12` (Rupiah utuh, tanpa desimal) |
| `note` | `text` | nullable, maks 200 karakter |
| `due_date` | `date` | nullable; diisi dari field "Tanggal" di form (default hari ini) |
| `settled_at` | `timestamptz` | nullable; `null` = belum lunas; constraint `settled_after_created`: `settled_at is null or settled_at >= created_at` |
| `created_at` | `timestamptz` | `not null default now()` |
| `updated_at` | `timestamptz` | `not null default now()`, diperbarui trigger `debts_guard_update` |

Catatan desain:
- **Batas `amount` 10^12** (1 triliun rupiah per entry). `Number.MAX_SAFE_INTEGER` ≈ 9 × 10^15, jadi satu nilai `bigint` aman dibaca sebagai `number` di JavaScript. Summary dijumlahkan di client, dan jumlahnya tetap presisi sampai sekitar 9000 entry yang masing-masing bernilai maksimum. Batas lama 10^15 hanya muat sekitar 9 entry sebelum jumlahnya tidak aman lagi.
- **Constraint `check` di DB** jadi lapis pertahanan terakhir. Kalaupun ada yang menembak REST API langsung tanpa lewat Zod, data tidak valid tetap ditolak.
- **Trigger `debts_guard_update`** (`BEFORE UPDATE`, plpgsql) selalu mengisi `updated_at := now()`. Untuk `settled_at`, nilai yang dikirim client cuma menentukan lunas atau tidak: kalau `null` tetap `null`, kalau terisi maka dipakai timestamp lama (`coalesce(old.settled_at, now())`). Jadi "tandai lunas" atomic dan idempotent di DB, tanpa read-then-write.
- **Fungsi trigger memakai `set search_path = ''`** supaya tidak bisa dibajak lewat `search_path`, dan hak `execute`-nya dicabut dari `public`, `anon`, dan `authenticated`. Ini juga direkomendasikan oleh Supabase database linter.
- **Index `(user_id, created_at desc)`** cocok dengan pola query utama, yaitu semua row milik user diurutkan dari yang terbaru.
- **Ambiguitas spek:** form meminta "Tanggal (default hari ini)", tapi skema hanya punya `due_date`. Field itu disimpan ke `due_date` supaya tetap mengikuti skema di spek. Di list, tanggal relatif diambil dari `due_date`, dan kalau kosong pakai `created_at`.

### Row Level Security

```sql
alter table public.debts enable row level security;
alter table public.debts force row level security;

revoke all on public.debts from anon;
revoke all on public.debts from authenticated;
grant select, delete on public.debts to authenticated;
grant insert (type, counterpart_name, amount, note, due_date) on public.debts to authenticated;
grant update (type, counterpart_name, amount, note, due_date, settled_at) on public.debts to authenticated;
```

| Policy | Operasi | Aturan |
|---|---|---|
| `debts_select_own` | SELECT | `using ((select auth.uid()) = user_id)` |
| `debts_insert_own` | INSERT | `with check ((select auth.uid()) = user_id)` |
| `debts_update_own` | UPDATE | `using (...)` **dan** `with check (...)` |
| `debts_delete_own` | DELETE | `using ((select auth.uid()) = user_id)` |

- Semua policy hanya untuk role `authenticated`. Role `anon` tidak punya grant sama sekali, jadi request tanpa login langsung ditolak dengan `permission denied`.
- **Grant per kolom** (migration kedua): `authenticated` tidak bisa menulis `id`, `user_id`, `created_at`, dan `updated_at`. Mencoba mengubah `created_at` atau `user_id` dijawab `42501`. `user_id` terisi dari `default auth.uid()`, jadi API tidak perlu mengirimnya. `INSERT ... RETURNING` dan `UPDATE ... RETURNING` tetap jalan karena `select` diberikan di level tabel.
- `with check` di UPDATE mencegah user mengubah `user_id` row miliknya menjadi milik orang lain.
- `(select auth.uid())` dibungkus `select` supaya Postgres cukup menghitungnya sekali per query, bukan per row. Ini rekomendasi performa dari Supabase.
- `force row level security` membuat RLS tetap berlaku bahkan untuk owner tabel.

#### Tes kebocoran

```bash
bash scripts/rls-test.sh
```

Skrip pindah ke root repo sendiri, mencetak baris PASS/FAIL, dan `exit 1` kalau ada yang gagal. Cakupannya (user B menyerang row user A):
- select biasa, select by id, filter `user_id=eq.<A>`, dan `HEAD` dengan `count=exact` (hanya row B);
- update dan delete row A, insert atas nama A, serta memindahkan row sendiri ke A;
- upsert (`on_conflict=id`, `merge-duplicates`) untuk menimpa row A, dengan dan tanpa `user_id` A;
- `PATCH` `created_at` row sendiri ditolak (`42501`, grant per kolom);
- `settled_at` di-set dua kali tetap memakai timestamp pertama (trigger);
- POST/PATCH/DELETE hanya dengan anon key ditolak, dan select tanpa login ditolak;
- blind `PATCH ?amount=gt.0` dan blind `DELETE ?id=not.is.null` hanya menyentuh row B;
- terakhir, row A masih utuh (`amount` dan `settled_at` tidak berubah).

Dua check (`created_at` dan trigger `settled_at`) baru lolos setelah `20261002120000_harden_debts.sql` di-push. User tes tidak bisa dihapus pakai anon key, jadi hapus manual dari dashboard Supabase.

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

### Auth

- **Signup/login:** pakai email + password lewat server action di `src/app/(auth)/actions.ts`. Input divalidasi Zod (email valid, password minimal 6 karakter), dan error Supabase diterjemahkan ke Bahasa Indonesia, misalnya `invalid_credentials` → "Email atau passwordnya salah, cek lagi ya".
- **Cookie sesi** dibuat dengan `cookieOptions: { httpOnly: true, secure: process.env.NODE_ENV === "production" }` di `src/lib/supabase/server.ts` dan `src/proxy.ts`. Semua akses Supabase terjadi di server, jadi JavaScript di browser tidak perlu membaca token. `secure` hanya aktif di production supaya `http://localhost` tetap bisa dipakai. Client browser Supabase (`client.ts`) dihapus karena tidak dipakai.
- **Logout:** server action `logout` (`signOut` lalu redirect ke `/login`), dipanggil dari form di header.
- **Proteksi halaman** ada dua lapis:
  1. `src/proxy.ts` (konvensi Next 16, pengganti `middleware.ts`) me-refresh sesi Supabase di setiap request. User yang belum login diarahkan ke `/login`, dan user yang sudah login diarahkan dari `/login` atau `/signup` ke `/`. Path `/api/*` dilewatkan karena route handler mengembalikan 401 JSON sendiri.
  2. `src/app/(app)/layout.tsx` memanggil `getClaims()` lagi di server, lalu redirect kalau tidak ada sesi.
- **`getClaims()`** dipakai sesuai rekomendasi Supabase SSR. Fungsi ini memverifikasi JWT, bukan sekadar membaca cookie seperti `getSession()`.
- **Konfirmasi email dimatikan**, jadi `signUp` langsung mengembalikan sesi. Kalau suatu saat dinyalakan, action-nya menampilkan pesan "cek email".

### API

Semua endpoint:
- Wajib login. Tanpa sesi → `401 {"error":"Kamu belum masuk, masuk dulu ya"}`.
- Validasi input dengan Zod. Input tidak valid → `400 {"error": "<pesan pertama>", "details": {<field>: [pesan...]}}`.
- Error database → `500 {"error":"Ada yang salah di server, coba lagi ya"}`. Detail aslinya hanya di-log di server, tidak dikirim ke client.
- Respons sukses berbentuk `{"data": ...}`.
- `POST` dan `PATCH` wajib `Content-Type: application/json`. Selain itu → `415 {"error":"Kirim datanya dalam format JSON ya"}`. Ini mencegah form lintas-situs (`text/plain`, `multipart`) menembak endpoint dengan cookie user. `useDebts` sudah selalu mengirim JSON.

#### `GET /api/debts`

| Query | Nilai | Default |
|---|---|---|
| `status` | `all` \| `unpaid` \| `paid` | `all` |
| `type` | `all` \| `owed_to_me` \| `i_owe` | `all` |
| `q` | cari nama (case-insensitive, maks 100 karakter, dicari sebagai teks biasa) | – |
| `sort` | `newest` \| `oldest` \| `amount_desc` \| `amount_asc` | `newest` |

`q` dipakai lewat operator `imatch` (regex case-insensitive) dengan karakter regex di-escape, jadi `*`, `%`, `_`, `(`, `\`, dan sebagainya dicari sebagai teks biasa. `ilike` tidak dipakai karena PostgREST mengubah `*` jadi wildcard `%` dan tidak ada cara meng-escape-nya.

```bash
curl "http://localhost:3000/api/debts?status=unpaid&type=owed_to_me&sort=amount_desc" \
  --cookie "<cookie sesi>"
```
```json
{ "data": [ { "id": "…", "type": "owed_to_me", "counterpart_name": "Budi", "amount": 150000,
  "note": null, "due_date": "2026-10-01", "settled_at": null, "created_at": "…", "updated_at": "…",
  "user_id": "…" } ] }
```

#### `POST /api/debts`

```json
{ "type": "owed_to_me", "counterpart_name": "Budi", "amount": 150000,
  "due_date": "2026-10-01", "note": "Patungan makan" }
```

- Sukses: `201 {"data": Debt}`.
- `user_id` tidak dikirim sama sekali: kolomnya terisi dari `default auth.uid()`, dan grant insert tidak mencakup kolom itu.
- `amount` boleh berupa angka atau string digit (`/^\d+$/` setelah trim, jadi `"1e3"` ditolak), harus bilangan bulat dari 1 sampai 10^12.
- `note` kosong disimpan sebagai `null`.

#### `PATCH /api/debts/[id]`

Body berisi field mana pun dari POST (parsial), dan/atau `settled`.

| Body | Efek |
|---|---|
| `{"settled": true}` | Kirim `settled_at` terisi; trigger DB mempertahankan timestamp pertama kalau sudah lunas |
| `{"settled": false}` | `settled_at = null` (batal lunas) |
| `{"amount": 200000}` | Update field biasa |

- **Atomic dan idempotent:** PATCH hanya satu `update ... select`, tanpa baca dulu. "Tandai lunas" yang dipanggil berulang kali, bahkan bersamaan, tetap `200` dan `settled_at` tidak berubah dari nilai pertama karena trigger `debts_guard_update`. (Sebelum migration kedua di-push, timestamp ikut tertimpa.)
- Body kosong → `400`.
- `id` bukan UUID → `400`.
- Row tidak ditemukan, atau milik user lain → `404`.

#### `DELETE /api/debts/[id]`

- Sukses: `200 {"data": {"id": "…"}}`.
- Tidak ditemukan atau milik orang lain → `404`.

#### Ringkasan status code

| Kode | Kapan |
|---|---|
| 200 | GET / PATCH / DELETE sukses |
| 201 | POST sukses |
| 400 | JSON rusak, validasi gagal, id bukan UUID, PATCH kosong |
| 401 | Belum login |
| 404 | Catatan tidak ada atau bukan milik user |
| 415 | `Content-Type` bukan `application/json` (POST/PATCH) |
| 500 | Error database |

### Validasi

`src/lib/debts/schema.ts` adalah satu-satunya sumber aturan validasi:

| Skema | Dipakai di | Isi |
|---|---|---|
| `debtInput` | Form (client) dan POST (server) | Tipe wajib; nama 1–100 setelah trim; jumlah berupa string digit atau angka bulat 1–10^12; tanggal `YYYY-MM-DD` atau kosong; catatan maks 200 |
| `updateDebt` | PATCH | `debtInput.partial()` + `settled: boolean`, tidak boleh kosong |
| `listQuery` | GET | Query param dengan default |
| `debtId` | `[id]` | UUID |

Ada tiga lapis validasi:
1. Zod di form, untuk feedback langsung per field.
2. Zod yang sama di API route.
3. Constraint `check` di Postgres.

### Format Rupiah dan tanggal

`src/lib/format.ts`:
- **`formatRupiah(n)`** memakai `Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })`, dengan non-breaking space diganti spasi biasa. Hasilnya `Rp 1.234.000`, dan untuk nilai negatif `-Rp 1.234.000`. Semua tampilan uang di app lewat fungsi ini.
- **`formatRelativeDate(date)`** memakai `Intl.RelativeTimeFormat('id-ID')`. Selisihnya dihitung per hari kalender di zona waktu lokal. `numeric: 'auto'` hanya dipakai untuk selisih -1/0/+1 hari ("kemarin", "hari ini", "besok"), selain itu `numeric: 'always'` supaya -2 hari jadi "2 hari lalu" (bukan "kemarin dulu"). Teks " yang lalu" dinormalkan jadi " lalu", jadi hasilnya "3 hari lalu", "2 minggu lalu", "3 bulan lalu", dan untuk masa depan "dalam 5 hari".
- **`formatFullDate(date)`** dipakai untuk atribut `title` di `<time>` pada item list (misalnya "15 Oktober 2026").
- Self-check: `npm run check:format`.

### Frontend

#### Dashboard

`src/components/Dashboard.tsx` memakai `useDebts()` **dua kali**:
1. **Tanpa filter**, untuk summary dan chart. Hasilnya, total tidak ikut berubah saat filter dipakai.
2. **Dengan filter** (status, tipe, sort, dan pencarian dengan debounce 300 ms) untuk list. Filter ini dikirim sebagai query param ke API.

Isi dashboard:
- **Summary:** satu kolom di HP, dua kolom mulai `sm`, tiga kolom mulai `lg`; angka `whitespace-nowrap` dan tetap muat walau 13 digit (`Rp 1.000.000.000.000`).
  - "Total dihutang ke saya" = jumlah `owed_to_me` yang belum lunas.
  - "Total saya hutang" = jumlah `i_owe` yang belum lunas.
  - "Net" = selisih keduanya: hijau kalau positif, merah kalau negatif, netral kalau 0.
- **Bar chart:** dua bar CSS (dihutang vs hutang), lengkap dengan label teks. Judulnya ada di luar elemen `role="img"` supaya terbaca screen reader.
- **List:**
  - Isinya: nama, badge tipe, jumlah, tanggal relatif, badge status, catatan, dan aksi Tandai lunas / Edit / Hapus.
  - Tombol aksi di-disable selama request jalan, sampai data terbaru (list dan summary) selesai di-refetch.
  - Tanggal relatif dirender di `<time dateTime>` dengan `title` tanggal lengkap.
  - Hapus pakai dialog konfirmasi.
- **Group per orang:** pakai `<details>` native, dikelompokkan berdasarkan nama (trim + lowercase). Menampilkan jumlah catatan dan net yang belum lunas per orang. Key React-nya adalah nama ternormalisasi, jadi `<details>` yang terbuka tetap terbuka saat urutan berubah.
- **Form catat / edit:**
  - Pakai `<dialog>` native: bottom sheet di HP, modal di tengah di desktop.
  - Divalidasi dengan `debtInput`.
  - Input jumlah memakai `inputMode="numeric"` dengan pemisah ribuan, tapi yang dikirim angka bulat.
  - Tanggal default hari ini sesuai waktu lokal.
  - Catatan punya counter `n/200`.
- **State:** skeleton (`loading.tsx` dan saat load pertama), error dengan tombol coba lagi (`error.tsx` dan error di hook), serta empty state yang dibedakan antara "belum ada data" dan "filter tidak menemukan apa-apa".

#### Refetch

`refetch()` dari `useDebts` mengembalikan Promise yang selesai setelah data baru masuk (response yang sudah usang/aborted diabaikan). Mutasi menunggu refetch list-nya sendiri, lalu Dashboard menunggu refetch data summary sebelum tombol di-enable lagi atau dialog ditutup. Selama data summary masih dimuat ulang dan list kosong, list menampilkan skeleton, jadi "Nggak ketemu" tidak sempat berkedip setelah menghapus entry terakhir.

#### Keterbatasan summary

Summary dihitung di client dari semua row hasil `GET /api/debts` tanpa filter. Belum ada pagination, dan PostgREST membatasi satu respons sampai 1000 row secara default, jadi untuk lebih dari 1000 catatan angka summary tidak lengkap. Perbaikannya: view/RPC dengan `sum()` plus pagination.

#### Design system

Token warna semantik ada di `globals.css`: `canvas`, `surface`, `ink`, `primary`, `positive`, `negative`, `warning`, dan lainnya, beserta varian dark mode lewat `prefers-color-scheme`.
- Kontras teks sudah dicek minimal 4.5:1 (WCAG AA).
- Ukuran sentuh minimal 44 px.
- Ring `:focus-visible` berlaku global.
- Transisi sekitar 150 ms, dan dimatikan kalau user memilih `prefers-reduced-motion`.
- Mobile-first: tombol "Catat baru" menempel di bawah layar HP, dan tidak ada scroll horizontal di lebar 360 px.

### Pengujian

| Cek | Perintah |
|---|---|
| Type check | `npx tsc --noEmit` |
| Lint | `npm run lint` |
| Build | `npm run build` |
| Format Rupiah & tanggal | `npm run check:format` |
| Kebocoran RLS, grant kolom, trigger | `bash scripts/rls-test.sh` |

Alur manual yang perlu dicek:
1. Signup.
2. Catat entry dari kedua tipe.
3. Cek angka summary dan warna net.
4. Tandai lunas, lalu refresh. Status harus tetap lunas karena tersimpan di DB.
5. Edit, lalu hapus.
6. Coba filter, search, sort, dan group.
7. Cek tampilan di viewport HP.
8. Logout.

### Deploy

1. Push repo ke GitHub, lalu import di Vercel.
2. Isi env `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` di Vercel → Settings → Environment Variables.
3. Di Supabase → Authentication → URL Configuration, isi **Site URL** dengan domain Vercel.
4. Pastikan kedua migration sudah di-push (`npx supabase db push`).
