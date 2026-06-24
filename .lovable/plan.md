# Evaluasi Data Spreadsheet vs Tujuan Website

## Tujuan inti website
1. Memudahkan **Klien** absen / Wajib Lapor jarak jauh (tanpa harus ke kantor).
2. Memudahkan **Pegawai PK** memantau klien yang ditugaskan.
3. Memudahkan **Admin** mengawasi seluruh proses & kepatuhan.

## Data yang sudah ada (6 tab) — sudah baik untuk:
| Tab | Mendukung tujuan? |
|---|---|
| Clients | ✅ Master data klien + assignment Pegawai PK |
| Wajib Lapor | ✅ Bukti absen bulanan (lokasi, selfie, status) |
| Izin Lapor | ✅ Audit dispensasi |
| Pegawai PK | ✅ Beban kerja per pegawai |
| Rekap Bulanan | ✅ Statistik agregat 12 bulan |
| Tracking Lokasi | ✅ Riwayat GPS realtime |

## Yang masih kurang untuk tujuan website

Saat ini spreadsheet **belum mencerminkan aktivitas harian** (padahal tujuan utama = absen harian) dan **belum memberi gambaran kepatuhan per klien / per Pegawai PK** secara langsung. Saya usulkan menambah **4 tab** + memperkaya **2 tab** existing.

### Tab baru yang diusulkan

**7. `Lapor Harian` (30 hari terakhir)**
Sejalan dengan widget dashboard baru. Header:
`Tanggal | Total Lapor | Klien Unik Lapor | Lapor Di Luar Wilayah | % Kepatuhan Harian`

**8. `Kepatuhan Klien` (bulan berjalan)**
Untuk Pegawai PK & Admin melihat siapa yang belum absen. Header:
`No. Litmas | Nama Klien | Pegawai PK | Status Bimbingan | Lapor Bulan Ini? | Tanggal Lapor Terakhir | Hari Sejak Lapor Terakhir | Punya Izin Aktif?`

**9. `Kinerja Pegawai PK` (bulan berjalan)**
Memperluas tab Pegawai PK dengan KPI kepatuhan. Header:
`Nama Pegawai | Jumlah Klien Aktif | Klien Sudah Lapor | Klien Belum Lapor | % Kepatuhan | Klien Lapor Di Luar Wilayah`

**10. `Log Aktivitas` (opsional, 500 baris terbaru)**
Untuk audit. Header:
`Waktu | Aktor | Peran | Aksi | Target | Detail`
*(Catatan: butuh tabel `activity_logs` jika belum ada — saya tandai sebagai opsional, tanyakan dulu sebelum eksekusi.)*

### Perkaya tab existing

**Wajib Lapor** — tambahkan kolom:
- `Pegawai PK` (siapa pembina klien saat lapor) — memudahkan filter per pegawai langsung dari Sheet.
- `Hari Terlambat` (selisih hari dari awal bulan, untuk analisis kepatuhan).

**Pegawai PK** — tambahkan kolom:
- `Email` (kontak)
- `Klien Belum Lapor Bulan Ini` (angka, langsung actionable)

## Hal yang TIDAK perlu ditambahkan
- Tab "Absensi" terpisah → dilarang oleh memory project (forbidden feature). Cukup pakai data Wajib Lapor.
- Kolom "Nama Coach" / "Rujukan Disnaker" di tab baru → forbidden / sudah ada.

## Implementasi teknis

File yang diubah: hanya `supabase/functions/sheets-sync-push/index.ts`
- Tambah 3 `TabSpec` baru (Lapor Harian, Kepatuhan Klien, Kinerja Pegawai PK) — semua dihitung in-memory dari data yang sudah di-fetch (tidak perlu query baru).
- Tambah 2 kolom di `reportsTab` dan 2 kolom di `pegawaiTab`.
- Update `ensureTabs` call untuk mendaftarkan tab baru (auto-create).
- Tidak ada perubahan schema DB, tidak ada migration, tidak ada perubahan UI selain mungkin update deskripsi checklist di `IntegrasiSpreadsheet.tsx`.

## Pertanyaan sebelum eksekusi
1. Setuju menambah **3 tab** (Lapor Harian, Kepatuhan Klien, Kinerja Pegawai PK) + perkaya 2 tab existing?
2. Apakah **Log Aktivitas (tab 10)** diperlukan? Ini perlu tabel baru `activity_logs` — bisa skip dulu.
