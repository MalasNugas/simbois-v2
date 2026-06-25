## Tujuan

Integrasi Google Sheets disederhanakan: hanya untuk **import Client** dengan kolom inti. Flow utama aplikasi (search Client → PK kasih izin → Wajib Lapor → admin pantau) sudah berjalan dan hanya diverifikasi, bukan diubah.

## Yang Diubah

### 1. Halaman `IntegrasiSpreadsheet.tsx` — disederhanakan drastis

**Hapus dari UI:**
- Section "Struktur Data (6 Tab Otomatis)" — daftar 9 tab dihapus.
- Checkbox "Pegawai PK Import" dan "Wajib Lapor Import".
- Tombol "Push Sekarang" + toggle Auto-sync (push ke sheet tidak dipakai sekarang).
- State & helper terkait push/pegawai/reports import.

**Sisakan:**
- Connector status card.
- Input URL spreadsheet + tombol **Test & Muat Tab** (tetap dipakai untuk validasi akses Editor).
- Banner pre-check akses Editor (hijau/merah) — sudah ada.
- Section **Import Client** dengan:
  - Penjelasan kolom yang dibutuhkan (3 kolom saja, lihat di bawah).
  - Tombol **Buat Template Tab "Clients Import"**.
  - Tombol **Tarik dari Sheet**.
  - Ringkasan hasil import.
- Tombol Simpan Pengaturan (tetap, untuk simpan spreadsheet_id).

### 2. Edge function `sheets-create-import-tabs/index.ts`

Hanya membuat satu tab **`Clients Import`** dengan header:

```
No. Litmas | Nama Lengkap | Pegawai PK
```

Tab `Pegawai PK Import` dan `Wajib Lapor Import` tidak lagi dibuat.

### 3. Edge function `sheets-sync-pull/index.ts`

- Selalu pakai tab `Clients Import` saja. Hapus cabang `importPegawai` dan `importReports`.
- Body request tidak perlu opsi tab — paksa hanya import Client.
- Untuk tiap baris:
  - Baca **No. Litmas**, **Nama Lengkap**, **Pegawai PK**.
  - Cari client existing by `case_number` → update `full_name` di `profiles` + `assigned_pk_id` di `clients`.
  - Bila client belum ada → skip dengan pesan error "Klien baru tidak bisa dibuat dari Sheet (butuh akun login). Tambah klien lewat dashboard admin dulu."
  - `assigned_pk_id` di-resolve dari nama Pegawai PK (case-insensitive) ke `profiles.user_id` yang punya role `pegawai`. Bila nama tidak ditemukan → tetap update kolom lain, error baris dicatat.
- Hapus pembuatan auth user, `auth.admin.listUsers`, `user_roles` insert untuk impor — tidak relevan lagi.

### 4. Verifikasi flow utama (tidak diubah, hanya dicek)

- `search_clients_public` RPC sudah return `full_name`, `case_number`, `assigned_pk_name` → `WajibLapor.tsx` sudah menampilkan ketiganya sebagai pembeda saat ada nama sama. ✅
- `PegawaiDashboard.tsx` sudah punya tombol grant/revoke izin per bulan via tabel `reporting_permissions`. ✅
- `AdminDashboard.tsx` sudah load `reporting_permissions` + laporan harian untuk monitoring. ✅

## Yang TIDAK Diubah

- Skema database, RLS, tabel `clients/profiles/user_roles/reporting_permissions/monthly_reports`.
- `submit-wajib-lapor` edge function.
- Halaman `WajibLapor.tsx`, `PegawaiDashboard.tsx`, `AdminDashboard.tsx`.
- Connector Google Sheets — tetap dipakai, hanya scope penggunaannya dikecilkan.

## Catatan untuk Anda

- Pembuatan **akun login Klien & Pegawai PK** tetap dilakukan dari dashboard Admin (bukan dari Sheet). Sheet hanya untuk update massal **No. Litmas + Nama + Pegawai PK** pada klien yang sudah ada.
- Bila nanti Anda ingin Sheet juga buat akun baru, itu fitur tambahan terpisah — kabari saja.
