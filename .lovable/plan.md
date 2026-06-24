# Integrasi Google Sheets — Wajib Lapor

Tujuan: hubungkan akun Google Sheets workspace ke project, lalu sediakan halaman admin untuk mengatur spreadsheet target dan mapping kolom untuk sinkronisasi data wajib-lapor.

Spreadsheet referensi:
`https://docs.google.com/spreadsheets/d/1f7qGIdHOoHsNdZxz-eCoMMWC_QbQw2s5tcI9rfQSNCA` (gid 634536840)

## 1. Aktifkan Connector Google Sheets

- Panggil tool koneksi standar `google_sheets` agar tersedia variabel:
  - `LOVABLE_API_KEY` (sudah ada)
  - `GOOGLE_SHEETS_API_KEY` (otomatis setelah link)
- Semua panggilan Google Sheets dilakukan via Edge Function (server) melalui gateway `https://connector-gateway.lovable.dev/google_sheets/v4/...` — tidak ada kredensial di browser.
- Catatan: connector mengakses akun Google milik admin (workspace owner), bukan tiap klien. Cocok untuk satu spreadsheet master.

## 2. Skema DB Baru

Tabel `sheet_integration_settings` (singleton, hanya admin):

```text
id uuid pk
spreadsheet_id text not null
spreadsheet_url text
clients_sheet_name text default 'Clients'
reports_sheet_name text default 'WajibLapor'
permissions_sheet_name text default 'Permissions'
column_mapping jsonb  -- { clients: {full_name:'B', case_number:'C', ...}, reports: {...} }
auto_sync boolean default false
last_sync_at timestamptz
last_sync_status text
created_at, updated_at
```

RLS: SELECT/INSERT/UPDATE hanya untuk role `admin`. Service role full.

## 3. Edge Functions

Semua memakai gateway + verifikasi role admin (cek JWT → `user_roles`).

- `sheets-list-tabs` — GET metadata spreadsheet → kembalikan daftar nama sheet/tab + header baris 1 (untuk dropdown mapping di UI).
- `sheets-test-connection` — verifikasi spreadsheet bisa diakses & ringkasan tab.
- `sheets-sync-push` — push `clients`, `monthly_reports`, `reporting_permissions` ke tab sesuai mapping (clear range → batchUpdate).
- `sheets-sync-pull` (opsional, dasar) — baca tab Clients untuk update field non-sensitif (mis. catatan). Default off.

Semua function: CORS, validasi Zod, cek role admin, log error.

## 4. Halaman UI Baru

Rute: `/admin/integrasi-spreadsheet` (hanya admin). Tambah link di sidebar/menu Admin: "Pengaturan → Integrasi Spreadsheet".

Bagian halaman:

1. **Status Koneksi** — badge "Connector Terhubung / Belum", tombol Test Connection.
2. **Spreadsheet Target** — input `spreadsheet_url` (auto-extract ID), tombol Simpan + Verifikasi.
3. **Pemilihan Tab** — 3 dropdown (Clients / WajibLapor / Permissions) diisi dari `sheets-list-tabs`.
4. **Mapping Kolom** — tabel: kolom DB (kiri) → header sheet (kanan, dropdown dari header tab). Disimpan ke `column_mapping`.
5. **Sinkronisasi** — toggle Auto-sync, tombol "Push Sekarang" dan "Pull Sekarang", tampilkan `last_sync_at` + status.
6. **Bantuan** — instruksi singkat: spreadsheet harus dishare ke akun Google connector (read/write).

## 5. Yang TIDAK Dikerjakan di Plan Ini

- Cron 2-arah otomatis (akan ditambahkan setelah mapping stabil).
- Sinkronisasi realtime via trigger `pg_net`.
- Push notifikasi.

## Urutan Eksekusi

1. Jalankan tool connect `google_sheets` (user pilih/auth koneksi).
2. Migrasi DB: tabel `sheet_integration_settings` + RLS + GRANT.
3. Buat 4 edge functions.
4. Buat halaman `IntegrasiSpreadsheet.tsx` + route + link menu admin.
5. Test: simpan spreadsheet ID di atas → tarik daftar tab → mapping → Push Sekarang.

## Pertanyaan untuk Anda

- Spreadsheet di atas akan dishare ke akun Google connector (Editor)? Wajib agar push berhasil.
- Apakah cukup **push 1-arah dulu** (DB → Sheet), atau langsung butuh pull juga di iterasi ini?
