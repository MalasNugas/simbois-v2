## Diagnosis

Saya cek isi spreadsheet langsung:

- Tab **`MASTER DATA`** (yang sedang dipakai) → header di baris 3, **0 baris data**. Itu sebabnya hasil 0/0/0.
- Tab **`MASTERDATA`** → header di baris 1, **berisi data klien LP MALANG/PASURUAN**. Ini yang akan dipakai.

Contoh header MASTERDATA:
`NO | TANGGAL INPUT | NO REG | UPT | NAMA LENGKAP | TEMPAT TANGGAL LAHIR | JENIS KELAMIN | ALAMAT | KOTA KAB | NO TELEPON | PEKERJAAN | TINDAK PIDANA | TGL ASIMILASI | TGL INTEGRASI | JENIS BIMBINGAN | NO TANGGAL SK | LAMA PIDANA | TGL PENGAKHIRAN | ALIH STATUS KE | PK | STATUS SK | STATUS BIMBINGAN | STATUS KLIEN | ... | KETERANGAN`

Sebagian besar alias sudah cocok (NO REG, NAMA LENGKAP, TEMPAT TANGGAL LAHIR, JENIS KELAMIN, ALAMAT, NO TELEPON, TGL ASIMILASI, TGL INTEGRASI, TGL PENGAKHIRAN, PK). Tapi ada 2 masalah:

1. **STATUS** ambigu — ada 3 kolom: `STATUS SK`, `STATUS BIMBINGAN`, `STATUS KLIEN`. Alias saat ini (`"status"`) akan match `STATUS SK` lebih dulu (kolom pertama yang mengandung kata "status") dan menyimpan nilai `ADA`/`TIDAK ADA` ke `client_status`, padahal yang benar **`STATUS KLIEN`** (nilai: AKTIF/BERAKHIR/dll).
2. **NO TELEPON** kadang berisi karakter tab di depan (`"\t081347..."`) — sudah di-`trim()` jadi aman, tapi worth disebut.

## Yang akan dilakukan

### 1. `supabase/functions/sheets-sync-pull/index.ts`
- Ubah alias `status` jadi lebih spesifik & ber-prioritas:
  ```ts
  status: ["status klien", "status bimbingan", "status"]
  ```
  Karena `pickHeaderIndex` mengiterasi alias berurutan dengan `indexOf` exact match dulu, `STATUS KLIEN` akan dipilih sebelum jatuh ke partial-match `STATUS SK`.
- Tambah alias `case_number`: `"no reg"` sudah ada ✓. Tambah `"no registrasi"` untuk variasi.
- Tidak menyentuh logika lain — mode tetap "hanya update klien yang sudah ada + impor field tambahan".

### 2. `src/pages/dashboard/IntegrasiSpreadsheet.tsx`
- Ubah placeholder/contoh pada input **Tab Klien** dari `MASTER DATA` menjadi `MASTERDATA` (atau tambah catatan singkat: "tab yang berisi data klien aktual").

### 3. Aksi user (setelah deploy)
- Buka halaman **Integrasi Spreadsheet**.
- Ubah field **Tab Klien** dari `MASTER DATA` → **`MASTERDATA`**.
- Klik **Simpan**, lalu **Tarik dari Sheet**.

## Yang TIDAK diubah
- Tidak ada migrasi DB, tidak ada RLS, tidak ada pembuatan klien baru (tetap skip jika `NO REG` belum ada di DB — user pilih opsi ini sebelumnya).
- Tidak menyentuh `_shared/sheets.ts`, tabel, atau function lain.
