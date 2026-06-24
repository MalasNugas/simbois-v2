# Rencana Struktur Data Google Sheets — SIMBOIS BAPAS Malang

Tujuan: menyusun spreadsheet sebagai **mirror laporan** dari database SIMBOIS, agar Admin & Kepala BAPAS bisa memantau Client, Wajib Lapor, dan Pegawai PK langsung dari Google Sheets (analisis, filter, atau cetak).

Saat ini sistem sudah punya 3 tab default di edge function `sheets-sync-push`: **clients**, **monthly_reports**, **permissions**. Saya usulkan memperluas menjadi **6 tab** berikut.

---

## 1. Tab `Clients` (Data Klien)
Sumber: tabel `clients` + `profiles`
Kolom:
- No. Litmas (case_number)
- Nama Lengkap
- NIK
- Tanggal Lahir / Usia
- Alamat & Kelurahan/Kecamatan
- Pasal / Jenis Perkara
- Tanggal Mulai Bimbingan
- Masa Bimbingan (bulan)
- Status Bimbingan (aktif / selesai / dicabut)
- Status Pekerjaan
- Pegawai PK yang ditugaskan
- Status Lokasi (Di Dalam / Di Luar Wilayah)
- Tanggal Registrasi

## 2. Tab `Wajib Lapor` (Riwayat Lapor Bulanan)
Sumber: `monthly_reports`
Kolom:
- No. Litmas
- Nama Klien
- Periode (Bulan/Tahun)
- Tanggal Lapor
- Lokasi Lapor (lat, lng, alamat)
- Status Lokasi saat Lapor (Di Dalam/Luar Wilayah)
- Catatan Kegiatan
- URL Foto Selfie
- Pegawai PK Penerima
- Status Verifikasi

## 3. Tab `Izin Lapor` (Reporting Permissions)
Sumber: `reporting_permissions`
Kolom:
- No. Litmas
- Nama Klien
- Periode Izin
- Diberikan oleh (Pegawai PK)
- Tanggal Pemberian
- Tanggal Dicabut (jika ada)
- Alasan
- Status (aktif / dicabut / expired)

## 4. Tab `Pegawai PK` (Manajemen Pegawai)
Sumber: `profiles` + `user_roles` (role = pegawai)
Kolom:
- Nama Pegawai
- Email
- NIP
- Jabatan
- Jumlah Klien Aktif (count)
- Jumlah Klien Selesai
- Jumlah Laporan Bulan Ini
- Tanggal Bergabung

## 5. Tab `Rekap Bulanan` (Dashboard Ringkas)
Agregasi per bulan:
- Periode
- Total Klien Aktif
- Total Lapor Masuk
- Total Klien Belum Lapor
- Total Izin Diberikan
- Total Klien "Di Luar Wilayah"
- Total Terminasi Bulan Ini

## 6. Tab `Tracking Lokasi` (Opsional, Geofencing)
Sumber: `location_tracking`
Kolom:
- No. Litmas / Nama Klien
- Timestamp
- Lat / Lng
- Status (Di Dalam / Di Luar Wilayah)
- Akurasi GPS

---

## Yang Akan Saya Bangun

1. **Update edge function `sheets-sync-push`** — tambah 3 tab baru: `Pegawai PK`, `Rekap Bulanan`, `Tracking Lokasi` (clients/reports/permissions sudah ada, akan diperluas kolomnya sesuai daftar di atas).
2. **Update halaman Integrasi Spreadsheet** — tampilkan checklist 6 tab; admin bisa pilih tab mana yang ingin di-sync.
3. **Auto-create tab** — saat tombol "Sync Sekarang" ditekan, sistem otomatis membuat 6 tab tersebut di spreadsheet bila belum ada, lalu mengisi header + data.
4. **Format header** — baris pertama tiap tab diberi label bahasa Indonesia (sesuai daftar kolom di atas), bukan nama kolom database mentah.

## Detail Teknis (untuk referensi)
- Mapping kolom DB → label Sheets disimpan dalam helper di `supabase/functions/_shared/sheets.ts`.
- Agregasi rekap bulanan dilakukan via query SQL di edge function (bukan di Sheets), agar konsisten.
- Sinkronisasi tetap **satu arah** (Supabase → Sheets), Sheets read-only untuk laporan.

---

Setujui rencana ini, atau beri tahu kalau ada tab/kolom yang ingin ditambah, dihapus, atau diubah namanya.