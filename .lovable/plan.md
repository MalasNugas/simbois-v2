# Statistik Harian Wajib Lapor di Dashboard

Menambahkan visualisasi jumlah klien yang melakukan Wajib Lapor per hari pada Dashboard Admin dan Dashboard Pegawai PK.

## Yang akan ditampilkan

### 1. Dashboard Admin (`src/pages/dashboard/AdminDashboard.tsx`)
Kartu statistik baru "Wajib Lapor Harian" di bagian atas, berisi:
- **Lapor Hari Ini** — jumlah klien unik yang sudah lapor hari ini
- **Lapor Bulan Ini** — total laporan bulan berjalan
- **Klien Belum Lapor Bulan Ini** — total klien aktif − klien yang sudah lapor bulan ini
- **Grafik batang 30 hari terakhir** — jumlah klien lapor per hari (pakai `recharts` BarChart yang sudah ada di project)

Scope data: seluruh klien.

### 2. Dashboard Pegawai PK (`src/pages/dashboard/PegawaiDashboard.tsx`)
Kartu serupa, tapi **hanya untuk klien yang ditugaskan ke pegawai tersebut**:
- **Klien Saya Lapor Hari Ini** (dari total klien saya)
- **Lapor Bulan Ini**
- **Klien Saya Belum Lapor Bulan Ini** — daftar nama bisa di-expand
- **Grafik batang 30 hari terakhir** — lapor harian dari klien yang ditugaskan

Filter di-query: `monthly_reports` di-join ke `clients` lalu difilter `assigned_pk_id = auth.uid()`.

## Detail Teknis

- Query langsung dari tabel `monthly_reports` via Supabase client (tidak butuh edge function baru). Kolom `report_date` dipakai sebagai sumber tanggal lapor; fallback ke `created_at` jika kosong.
- Komponen baru `src/components/dashboard/DailyReportStats.tsx` — reusable, terima prop `scope: 'all' | 'mine'` agar dipakai di dua dashboard.
- Agregasi harian dilakukan di client (data 30 hari volumenya kecil) — kelompokkan per `report_date`, hitung klien unik per hari.
- Pakai `recharts` (sudah ada di project) untuk bar chart, warna mengikuti token design system (navy/gold).
- Tidak ada perubahan schema database, tidak ada migrasi.
- Tidak menambah fitur "Absensi" terpisah (sesuai memory: fitur Absensi dilarang) — semua dihitung dari data Wajib Lapor yang sudah ada.

## Yang TIDAK diubah

- Tidak menambah tabel/kolom baru.
- Tidak mengubah alur submit Wajib Lapor.
- Tidak mengubah halaman lain di luar dua dashboard + 1 komponen baru.

Setujui untuk saya implementasikan, atau beri tahu kalau ada metrik lain yang ingin ditambah/dihapus.