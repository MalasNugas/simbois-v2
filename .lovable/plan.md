## Masalah
Dashboard Admin menampilkan Rina "Belum Lapor" padahal laporannya sudah ada di database (bulan Juli 2026) dan tampil benar di Dashboard Pegawai PK.

## Penyebab
RLS pada tabel `monthly_reports` hanya mengizinkan role **pegawai** dan klien pemilik untuk SELECT. Tidak ada policy untuk role **admin**. Akibatnya query di AdminDashboard mengembalikan array kosong → semua klien terhitung "Belum Lapor". Efek sama berlaku untuk `reporting_permissions`.

## Perbaikan (1 migration, tanpa perubahan kode)
Tambah SELECT policy untuk admin di dua tabel:

- `monthly_reports`: `CREATE POLICY "Admin can view all reports" FOR SELECT USING (has_role(auth.uid(), 'admin'))`
- `reporting_permissions`: `CREATE POLICY "Admin can view all permissions" FOR SELECT USING (has_role(auth.uid(), 'admin'))` (juga tampil di dashboard admin)

Setelah migrasi, refresh Dashboard Admin — status Rina otomatis berubah menjadi "Sudah", statistik "Sudah/Belum Lapor" dan grafik 12 bulan akan akurat.
