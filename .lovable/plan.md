## Masalah
Tarik Sheet menampilkan `Dibuat: 0 · Di-update: 0 · Di-skip: 0` tanpa pesan error. Artinya edge function berhasil baca spreadsheet, tapi `rows` kosong. Penyebab paling mungkin:

1. Nama tab di spreadsheet tidak persis `Clients Import` (misalnya `Clients`, `clients import`, `Sheet1`, dst), sehingga batchGet mengembalikan array kosong tanpa error.
2. Header di baris 1 berbeda dari yang dicari (`No. Litmas`, `Nama Lengkap`, `Pegawai PK`).
3. Data hanya berisi 1 baris (header saja).

## Rencana Perbaikan

### 1. `supabase/functions/sheets-sync-pull/index.ts`
- **Auto-detect tab**: sebelum batchGet, panggil `GET /spreadsheets/{sid}?fields=sheets.properties.title` untuk ambil daftar tab. Pilih tab dengan urutan:
  1. Match persis `Clients Import`
  2. Match case-insensitive yang mengandung kata `client`
  3. Fallback ke tab pertama
- Range dibuat `'<tab>'!A:Z` agar selalu menangkap seluruh kolom.
- **Header normalization**: lowercase + hapus titik/spasi ekstra, supaya `no litmas`, `No. Litmas`, `NO LITMAS` semuanya cocok. Hal yang sama untuk `nama lengkap` dan `pegawai pk`.
- **Ringkasan debug**: response tambahkan `tab_used`, `rows_read`, `headers_found` agar UI bisa menampilkan info diagnostik saat hasil 0/0/0.
- Jika `rows_read === 0`, kembalikan error eksplisit: `"Tab '<tab>' kosong / hanya berisi header. Pastikan data ada mulai baris 2."`.
- Jika header inti tidak ditemukan, kembalikan error: `"Header tidak dikenali. Header ditemukan: [...]. Wajib ada: No. Litmas, Nama Lengkap, Pegawai PK."`.

### 2. `src/pages/dashboard/IntegrasiSpreadsheet.tsx`
- Pada bagian "Ringkasan Import", tampilkan juga `tab_used`, `rows_read`, dan `headers_found` jika tersedia.
- Tetap tampilkan daftar `errors` (sudah ada).

### Tidak diubah
- Skema DB, RLS, flow Wajib Lapor, dashboard admin/pegawai, fungsi `sheets-create-import-tabs` / `sheets-test-connection` / `_shared/sheets.ts`.

## Hasil yang Diharapkan
- Jika user menamai tab apa saja yang mengandung "client", import tetap jalan.
- Jika benar-benar kosong atau header salah, user dapat pesan jelas (bukan lagi 0/0/0 senyap).
- Ringkasan menampilkan tab dan jumlah baris yang terbaca untuk debugging cepat.
