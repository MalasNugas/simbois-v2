# Rencana: Bersihkan Spreadsheet + Data Demo

## 1. Hapus Integrasi Spreadsheet
- Hapus halaman `src/pages/dashboard/IntegrasiSpreadsheet.tsx`.
- Hapus route `/admin/integrasi-spreadsheet` di `src/App.tsx`.
- Hapus tombol "Integrasi Spreadsheet" di header `AdminDashboard.tsx`.
- Hapus Edge Functions: `sheets-list-tabs`, `sheets-test-connection`, `sheets-sync-push`, `sheets-sync-pull`, `sheets-create-import-tabs`, dan `_shared/sheets.ts`.
- Hapus tabel `sheet_integration_settings` (migration DROP TABLE).
- Catatan: connector Google Sheets di workspace tidak diputus otomatis — bisa dilepas manual dari Connectors kalau mau.

## 2. Bersihkan Data Lama
- Kosongkan tabel `monthly_reports`, `reporting_permissions`, `location_tracking`, `clients`, lalu hapus `profiles`/`user_roles`/`auth.users` untuk semua akun non-admin.
- Akun admin (`Admin@email.com`) tetap.

## 3. Seed Data Demo
Buat via Edge Function baru `seed-demo-data` (admin only) yang memakai Service Role Key untuk `auth.admin.createUser`, lalu insert profil/role/klien. Dipicu sekali dari tombol "Isi Data Demo" di dashboard admin (atau langsung dieksekusi sekali oleh saya via curl).

**2 Pegawai PK** (password `Demo_2026`):
| Nama | Email |
|---|---|
| Budi Santoso, S.H. | budi.pk@simbois.local |
| Siti Rahmawati, S.Psi. | siti.pk@simbois.local |

**10 Klien** (5 per Pegawai PK, tanpa login):

| No. Litmas | Nama | PK | Status |
|---|---|---|---|
| 001/BKD/PB/2026 | Ahmad Fauzi | Budi | AKTIF |
| 002/BKD/PB/2026 | Rina Kartika | Budi | AKTIF |
| 003/BKD/CB/2026 | Joko Prasetyo | Budi | AKTIF |
| 004/BKD/PB/2026 | Dewi Anggraini | Budi | AKTIF |
| 005/BKD/AS/2026 | Hendra Wijaya | Budi | AKTIF |
| 006/BKD/PB/2026 | Sri Wahyuni | Siti | AKTIF |
| 007/BKD/CB/2026 | Bagus Nugroho | Siti | AKTIF |
| 008/BKD/PB/2026 | Lestari Putri | Siti | AKTIF |
| 009/BKD/AS/2026 | Rudi Hartono | Siti | AKTIF |
| 010/BKD/PB/2026 | Maya Sari | Siti | AKTIF |

Tiap klien diisi: alamat (Malang/Batu), no. telepon, JK, TTL, tgl mulai bimbingan, tgl berakhir.

**Contoh aktivitas demo (bulan berjalan):**
- 4 klien sudah diberi izin wajib lapor oleh PK-nya, 2 di antaranya sudah submit lapor (agar statistik "Sudah/Belum Lapor" dan grafik langsung terlihat).
- Sisanya "Belum Diizinkan" untuk demo tombol "Berikan Izin".

## Urutan Eksekusi
1. Migration: drop `sheet_integration_settings` + purge data non-admin.
2. Hapus file frontend + edge functions Sheets.
3. Buat edge function `seed-demo-data` & panggil sekali.
4. Verifikasi: login admin → dashboard menampilkan 10 klien, 2 PK, dan statistik terisi.
