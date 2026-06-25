## Tujuan

Tetap update-only (tidak buat klien baru). Tambahkan impor kolom MASTER DATA tambahan ke field yang **sudah ada** di DB. Tidak ada perubahan schema.

## Mapping kolom MASTER DATA → DB

**profiles** (update via `user_id` klien yang sudah ada):
- `NAMA` → `full_name`
- `ALAMAT` → `address`
- `NO TELEPON` → `phone`
- `JENIS KELAMIN` → `gender` (normalisasi: L/Laki-laki → `laki-laki`, P/Perempuan → `perempuan`)
- `TEMPAT TANGGAL LAHIR` → split jadi `birth_place` + `birth_date`
  - Parse pola `"Malang, 12/05/1990"` atau `"Malang, 12-05-1990"` atau `"Malang 12 Mei 1990"`. Kalau gagal parse tanggal → simpan seluruh string ke `birth_place`, kosongkan `birth_date`.

**clients** (update via `case_number`):
- `NO. REG` → `case_number` (key pencarian)
- `PK` → `assigned_pk_id` (lookup existing — perilaku saat ini dipertahankan)
- `PENGAKHIRAN BIMBINGAN` → `guidance_end` (parse dd/mm/yyyy)
- `TANGGAL ASIMILASI` atau `TANGGAL INTEGRASI` → `guidance_start` (ambil yang terisi; kalau dua-duanya ada, prioritas ASIMILASI)
- `STATUS` → `client_status` (lowercase, ambil token pertama: `aktif` / `berakhir` / `pencabutan` / `meninggal_dunia` / `dilimpahkan`)

Kolom MASTER DATA yang **tidak dipetakan** (tidak ada field DB-nya, akan diabaikan tanpa error): `NO`, `TANGGAL INPUT`, `ASAL UPT`, `KOTA`, `TINDAK PIDANA`, `JENIS BIMBINGAN`, `NO DAN TANGGAL SK`, `LAMA PIDANA`, `STATUS SK INTEGRASI`, `KETERANGAN`.

## Perubahan kode

**`supabase/functions/sheets-sync-pull/index.ts`**

1. Perluas `HEADER_ALIASES` dengan key baru:
   ```
   address: ["alamat"]
   phone: ["no telepon", "telepon", "no telp", "hp"]
   gender: ["jenis kelamin", "jk"]
   birth_ttl: ["tempat tanggal lahir", "ttl", "tempat/tanggal lahir"]
   guidance_end: ["pengakhiran bimbingan", "tanggal pengakhiran", "pengakhiran"]
   guidance_start_asimilasi: ["tanggal asimilasi", "tgl asimilasi"]
   guidance_start_integrasi: ["tanggal integrasi", "tgl integrasi"]
   status: ["status"]
   ```
2. Resolve index tiap kolom via `pickHeaderIndex`. Yang tidak ada di sheet → di-skip (tidak error).
3. Helper baru: `parseDateID(s)` (dd/mm/yyyy, dd-mm-yyyy, yyyy-mm-dd) → ISO date / null. `parseTTL(s)` → `{place, date}`. `normGender(s)`. `normStatus(s)`.
4. Saat update klien existing, bangun:
   - `profilePatch` berisi hanya field yang nilainya non-empty di baris itu (jangan timpa data dengan string kosong).
   - `clientPatch` berisi `case_number` + field tambahan non-empty + `assigned_pk_id` (perilaku lama).
5. Pesan ringkasan tetap sama. Tambahkan info `r.headers_mapped` (object mapping nama kolom → indeks) untuk debugging di summary.
6. Tidak ada perubahan untuk row yang `case_number`-nya belum ada di DB — tetap `skipped++` dengan pesan "Klien belum ada".

**`src/pages/dashboard/IntegrasiSpreadsheet.tsx`**

- Update teks deskripsi: sebutkan kolom MASTER DATA yang ikut di-update (Nama, Alamat, Telepon, JK, TTL, Pengakhiran, Status, PK).
- Tidak ada perubahan input/field.

## Tidak ada perubahan

- Tidak ada migrasi schema.
- Tidak membuat klien baru (mode update saja).
- Aliases header lain tetap.
- RLS/policies tidak disentuh.

## Verifikasi

Setelah deploy, jalankan "Tarik dari Sheet". Untuk No. Litmas yang sudah ada di DB, cek `profiles.address/gender/birth_date/birth_place/phone` dan `clients.guidance_start/guidance_end/client_status` terisi sesuai baris MASTER DATA.