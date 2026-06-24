# Fix Import: Auto-create Template Tab + Pesan Error Lebih Jelas

## Penyebab error

Error `400: Unable to parse range: 'Pegawai PK Import'` artinya **tab tersebut belum ada** di spreadsheet Anda. Sistem berusaha membaca tab yang belum dibuat.

Saat ini saya hanya menampilkan instruksi kolom di UI, tapi tidak membuat tab-nya. User harus buat manual — itu yang menyebabkan error.

## Solusi

**Tambah tombol "Buat Template Tab"** di panel Import. Saat diklik:
- Auto-create 3 tab di spreadsheet: `Pegawai PK Import`, `Clients Import`, `Wajib Lapor Import` (kalau belum ada).
- Isi baris pertama dengan header kolom yang benar.
- User tinggal isi data di Google Sheets, lalu klik "Tarik dari Sheet".

Juga **perbaiki pesan error** di edge function `sheets-sync-pull`: kalau tab tidak ditemukan (400), tampilkan pesan ramah: *"Tab 'X' belum ada. Klik 'Buat Template Tab' dulu."*

## File yang diubah

- **Baru** `supabase/functions/sheets-create-import-tabs/index.ts` — admin-only, panggil `batchUpdate` untuk addSheet + tulis headers via `values:update`. Idempoten (skip kalau tab sudah ada).
- **Diubah** `supabase/functions/sheets-sync-pull/index.ts` — deteksi error 400 "Unable to parse range" dan ganti dengan pesan "Tab belum ada".
- **Diubah** `src/pages/dashboard/IntegrasiSpreadsheet.tsx` — tambah tombol "Buat Template Tab" di samping tombol "Tarik dari Sheet".

## Tidak diubah
- Skema DB, RLS, atau tabel lain.
