
# Rencana Refactor SIMBOIS — Fokus Wajib Lapor Bulanan

## 1. Pembersihan Fitur Lama

**Dihapus total (UI + tabel + storage):**
- Semua fitur Surat: `termination_reports`, bucket `termination-files`, halaman & PDF terkait (Termination Workflow PDF, Guidance Report PDF, surat rekomendasi/keterangan).
- Program & pendaftaran: `programs`, `program_registrations`, bucket `program-files`, trigger `notify_clients_new_program`, komponen pembuatan/daftar program.
- Chat: `chat_messages`, `ChatWidget.tsx`, `PegawaiChatList.tsx`.
- Notifikasi program (toast realtime program di `NotificationBell`).
- Halaman Onboarding lama dirombak jadi panduan singkat 3 role baru.

**Dipertahankan:**
- `clients`, `profiles`, `user_roles`, `monthly_reports`, `notifications`, `location_tracking`.
- Auth Admin & Pegawai PK (Email/Password + Google).
- Geofencing Malang sebagai info, tapi **tidak memblokir absen** (lokasi hanya dicatat).

## 2. Struktur Database Baru

**Tabel baru `reporting_permissions`** (izin wajib lapor bulanan):
- `client_id`, `pegawai_id` (pemberi izin), `period_year`, `period_month`, `granted_at`, `revoked_at`, `note`.
- Unique `(client_id, period_year, period_month)`.
- RLS: Pegawai PK hanya bisa CRUD untuk client binaannya; Admin full; `anon` boleh `SELECT` baris yg masih aktif (untuk validasi sebelum absen).

**Tambahan kolom `monthly_reports`:**
- `selfie_url` (foto selfie wajib saat absen), `lat`, `lng`, `permission_id` (FK ke izin), `submitted_via` = `public_form`.
- Unique `(client_id, period_year, period_month)` agar 1× per bulan.

**Bucket storage baru:** `wajib-lapor-selfies` (public read, insert anon dibatasi via signed policy).

**RLS publik untuk absen tanpa login:**
- `anon` boleh `SELECT` minimal field `clients` (id, nama, no_litmas, pegawai_id) untuk fitur search.
- `anon` boleh `INSERT` ke `monthly_reports` **hanya jika** ada `reporting_permissions` aktif untuk client+bulan berjalan (dicek via `SECURITY DEFINER` function `can_submit_report(client_id)`).
- Upload selfie ke bucket via signed URL dari Edge Function `submit-wajib-lapor` (lebih aman daripada anon insert langsung).

## 3. Alur Client (Tanpa Login)

Route publik `/wajib-lapor`:
1. Search nama client (debounced, hit RPC `search_clients_public`).
2. Pilih client → tampil kartu: nama, no. litmas, status izin bulan ini.
3. Jika **belum diizinkan** → pesan: *"Anda belum mendapatkan izin wajib lapor untuk bulan ini. Silakan hubungi Pegawai PK/Pembimbing Anda."* Form disabled.
4. Jika **sudah** → tombol "Mulai Absen":
   - Minta izin kamera → ambil selfie (canvas capture dari `<video>` `getUserMedia`).
   - Minta izin geolocation (jika ditolak tetap lanjut, lat/lng = null).
   - Form: keterangan singkat, status pekerjaan/operasional bulan ini.
   - Submit → Edge Function `submit-wajib-lapor` (upload selfie → insert `monthly_reports` → tandai izin "used").
5. Halaman sukses + opsi download bukti.

Status berubah jadi **"Sudah Wajib Lapor"** (terlihat di dashboard Admin/Pegawai).

## 4. Alur Pegawai PK

- Dashboard: jumlah binaan, sudah/belum lapor bulan ini, daftar yg butuh izin, riwayat izin diberikan, grafik kepatuhan 6 bulan terakhir.
- Halaman "Client Binaan": tabel client + kolom **Izin Bulan Ini** dengan tombol:
  - `Berikan Izin` → insert `reporting_permissions` bulan berjalan.
  - `Cabut Izin` → set `revoked_at` (selama belum dipakai absen).
- Halaman "Riwayat Wajib Lapor" per client (lihat selfie, lokasi di map, timestamp).

## 5. Alur Admin

- Dashboard global: total client, total pegawai, sudah/belum lapor bulan ini, grafik bulanan (bar 12 bulan), tabel statistik per Pegawai PK (binaan vs lapor), aktivitas terbaru.
- CRUD Client & Pegawai PK (Pegawai dibuat via Edge Function `create-pegawai` mirip `create-admin`).
- Halaman "Monitoring Belum Lapor" dengan filter bulan + tombol "Kirim Reminder" (insert ke `notifications` pegawai terkait).
- Export PDF (`jspdf` + autotable, landscape) & Excel (`xlsx` skill) untuk laporan bulanan & per-pegawai.

## 6. Sinkronisasi Google Spreadsheet (2 Arah)

Lovable Cloud (Supabase) tetap **sumber kebenaran**; Google Sheets jadi *mirror master data* dua arah via connector `google_sheets`.

**Yang disinkronkan:**
- Sheet `Clients` (read+write), `Pegawai` (read+write), `WajibLapor` (write only — append), `Izin` (write only — append).

**Mekanisme:**
- **DB → Sheet (push):** trigger Postgres (`AFTER INSERT/UPDATE`) memanggil Edge Function `sync-to-sheet` via `pg_net`; function append/update baris berdasarkan `id`.
- **Sheet → DB (pull):** Edge Function terjadwal `sync-from-sheet` (cron `pg_cron` tiap 5 menit) baca range `Clients!A2:Z`, `Pegawai!A2:Z`, upsert ke DB berdasarkan kolom `id`.
- Konflik: timestamp `updated_at` terbaru menang (last-write-wins).
- Setup awal: Admin tempel Spreadsheet ID di halaman **Pengaturan → Integrasi Spreadsheet**, sistem auto-create sheet & header.

**Catatan teknis:** Google Sheets API punya kuota (60 req/menit per user) — sync di-batch, bukan per-baris realtime. Untuk volume besar Supabase tetap dipakai sebagai DB live; Spreadsheet untuk view/edit master oleh staf.

## 7. Navbar & Routing Baru

- `/` (Landing), `/wajib-lapor` (publik), `/login`, `/dashboard` (Admin/Pegawai), `/clients`, `/pegawai` (admin), `/permissions` (pegawai), `/reports`, `/monitoring`, `/settings/spreadsheet` (admin).
- Hapus link: Program, Chat, Surat, Onboarding lama.

## 8. Detail Teknis

- **Edge Functions baru:** `submit-wajib-lapor`, `create-pegawai`, `sync-to-sheet`, `sync-from-sheet`, `monthly-permission-reset` (cron 1 hari ke-1 tiap bulan — tidak perlu hapus baris, cukup query by bulan; cron hanya untuk reminder).
- **Cron pg_cron:** sync sheet tiap 5 menit, reminder belum-lapor tiap tgl 25.
- **Security:** RLS ketat, `has_role()` reused, `can_submit_report()` SECURITY DEFINER. Anon hanya akses RPC search + Edge Function submit (bukan tabel mentah).
- **Frontend stack:** tetap React + Tailwind + shadcn, navy/gold glassmorphism dipertahankan, Framer Motion tetap.
- **Migrasi data lama:** dump `termination_reports`, `programs`, `chat_messages` ke CSV `/mnt/documents/archive/` lalu drop tabel.

## 9. Urutan Implementasi

1. Migrasi DB: drop tabel lama, buat `reporting_permissions`, alter `monthly_reports`, RLS, RPC.
2. Edge Function `submit-wajib-lapor` + bucket selfie.
3. Halaman publik `/wajib-lapor` (search → izin check → kamera → submit).
4. Dashboard & halaman Pegawai PK (izin bulanan).
5. Dashboard & halaman Admin (CRUD pegawai, monitoring, export).
6. Pembersihan UI: hapus komponen Program/Chat/Surat, update Navbar.
7. Integrasi Google Sheets (connect connector, halaman settings, Edge Functions sync, cron).
8. Update Manual Book PDF sesuai fitur baru.

## 10. Yang Tidak Termasuk

- Push notification background (PWA/FCM).
- Verifikasi wajah AI dari selfie (hanya simpan foto, tidak ada face-match otomatis).
- Sinkron realtime ke Spreadsheet (delay s/d 5 menit normal).
