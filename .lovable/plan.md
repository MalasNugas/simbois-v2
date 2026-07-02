## Peta Tracking Lokasi Wajib Lapor di Dashboard Pegawai PK

### Konteks
- Gating izin Pegawai PK → Klien untuk wajib lapor **sudah aktif** (halaman `/wajib-lapor` menampilkan "Belum Diizinkan" bila belum diberi izin, dan tombol absen tidak muncul). Tidak ada perubahan yang perlu.
- Yang ditambahkan: **peta interaktif** di Dashboard Pegawai PK berisi titik lokasi klien binaan saat wajib lapor.

### Yang akan dibuat
1. **Install Leaflet**
   - `leaflet` + `react-leaflet` + `@types/leaflet`.
   - CSS Leaflet di-import di `src/main.tsx`.

2. **Komponen baru** `src/components/dashboard/ReportsMap.tsx`
   - Map center default: Malang (-7.98, 112.63), zoom 10.
   - Tile: OpenStreetMap (gratis, tanpa API key).
   - Marker: satu per laporan dengan `lat`/`lng` tidak null.
   - Popup marker: nama klien, No. Litmas, tanggal lapor, status pekerjaan, thumbnail selfie (via signed URL yang sudah ada di edge function `get-selfie-url`).
   - Auto-fit bounds ke semua marker bila ada data.

3. **Tab "Peta Lokasi"** di `PegawaiDashboard.tsx`
   - Tab baru di samping tab existing.
   - Filter bulan (dropdown bulan + tahun) — default bulan berjalan.
   - Query: `monthly_reports` untuk `client_id` dalam daftar binaan PK, `report_year/report_month` = filter, `lat`/`lng` NOT NULL. Join nama klien dari state `clients` yang sudah dimuat.
   - Menampilkan hitungan (misal "8 titik lokasi") + tombol reset filter.

### Detail teknis
- Kolom lokasi sudah tersedia (`monthly_reports.lat`, `lng`). Tidak perlu perubahan skema.
- Ikon marker default Leaflet perlu diperbaiki (bug bundler klasik): set `L.Icon.Default.mergeOptions` dengan URL dari `leaflet/dist/images/*` melalui import `?url` Vite.
- Signed URL selfie di popup diambil via edge function `get-selfie-url` yang sudah ada; cache per URL supaya tidak bolak-balik minta.
- Tinggi peta: `h-[500px]` responsif; peta di-wrap dengan `key={monthFilter}` agar fit-bounds re-run saat filter berubah.

### Yang tidak diubah
- Halaman `/wajib-lapor`, edge functions, skema DB, Dashboard Admin.
