# Fitur Import: Spreadsheet → Database

Pilihan **C**: bangun fitur Import (Sheet→DB) supaya data Spreadsheet bisa mengisi Dashboard. Tetap rekomendasikan input lewat aplikasi untuk operasi harian.

## Scope yang aman untuk di-import

Tidak semua tab cocok untuk di-tarik balik. Beberapa tab adalah **hasil kalkulasi** (Rekap Bulanan, Lapor Harian, Kepatuhan Klien, Kinerja Pegawai PK) — tidak perlu di-import. Tab yang bisa di-import:

| Tab Sheet | Bisa import? | Catatan |
|---|---|---|
| **Pegawai PK** | ✅ | Butuh kolom tambahan: `Email`, `Password Awal` (admin set) |
| **Clients** | ✅ | Butuh kolom tambahan: `Email`, `Password Awal`. Key upsert = `No. Litmas` |
| **Wajib Lapor** | ⚠️ Opsional | Bisa untuk seed data historis, key = `No. Litmas` + `Periode` |
| **Izin Lapor** | ❌ | Lewati — workflow real-time di app |
| **Tracking Lokasi** | ❌ | Lewati — data GPS realtime |
| Rekap/Harian/Kepatuhan/Kinerja | ❌ | Hasil kalkulasi |

## Cara kerja

1. Admin siapkan Sheet dengan minimal 2 tab: `Pegawai PK Import` dan `Clients Import` (saya buatkan template kolom yang dibutuhkan).
2. Admin klik tombol **"Tarik dari Sheet"** di halaman Integrasi Spreadsheet → pilih tab mana yang mau di-import.
3. Edge function `sheets-sync-pull` membaca tab, validasi, lalu:
   - **Pegawai PK**: panggil edge function `create-pegawai` yang sudah ada untuk tiap baris baru (skip kalau email sudah ada).
   - **Clients**: buat auth user (via Admin API) + insert ke `profiles` + `clients` dengan `case_number` sebagai key upsert. Kolom `Pegawai PK` di-resolve ke `assigned_pk_id` lewat lookup nama.
   - **Wajib Lapor** (jika dipilih): upsert ke `monthly_reports` berdasarkan `client_id + report_year + report_month`.
4. Tampilkan ringkasan: berapa baris dibuat / di-update / di-skip / error per tab.

## Template kolom Sheet (yang harus diisi admin sebelum import)

**Tab `Pegawai PK Import`**:
`Nama Pegawai | Email | Password Awal | Telepon`

**Tab `Clients Import`**:
`No. Litmas | Nama Lengkap | Email | Password Awal | Jenis Kelamin | Tempat Lahir | Tgl Lahir | Telepon | Alamat | Status Bimbingan | Status Pekerjaan | Detail Pekerjaan | Mulai Bimbingan | Akhir Bimbingan | Pegawai PK (nama)`

**Tab `Wajib Lapor Import`** (opsional):
`No. Litmas | Periode (YYYY-MM) | Tanggal Lapor | Status Pekerjaan | Status Operasional | Latitude | Longitude | Catatan`

## File yang dibuat / diubah

- **Baru** `supabase/functions/sheets-sync-pull/index.ts` — admin-only, baca tab via gateway, validasi Zod, upsert per tabel, return ringkasan.
- **Diubah** `src/pages/dashboard/IntegrasiSpreadsheet.tsx` — tambah panel "Tarik dari Sheet" dengan checkbox per tab + tombol + tampilan ringkasan hasil.
- Tidak ada perubahan schema DB. Tidak ada tabel baru.

## Keamanan & kehati-hatian

- Hanya admin (cek `has_role`) yang bisa memanggil pull.
- `Password Awal` di Sheet hanya dibaca saat create user lalu di-hash oleh Supabase Auth — admin sebaiknya hapus kolom password setelah import berhasil (akan diingatkan di UI).
- Mode upsert pakai `case_number` / `email` sebagai key — aman dijalankan berulang tanpa duplikasi.
- Sebelum eksekusi pertama, tampilkan dialog konfirmasi: "Import akan membuat akun login. Pastikan kolom Email & Password Awal sudah benar."

## Pertanyaan singkat sebelum eksekusi

1. Setuju import mencakup **Pegawai PK + Clients** saja (Wajib Lapor opsional menyusul), dengan kolom Email + Password Awal di Sheet?
2. Setuju template kolom di atas, atau ada kolom lain yang wajib?
