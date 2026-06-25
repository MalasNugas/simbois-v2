## Tujuan
Tarik data klien dari tab **MASTER DATA** (bukan "Clients Import" yang kosong) tanpa harus menyalin data manual.

## Perubahan

### 1. `supabase/functions/sheets-sync-pull/index.ts`
- Ganti urutan auto-detect tab: prioritas `MASTER DATA` (exact, case-insensitive) → tab yang mengandung "master" / "klien" / "client" → tab yang diminta user → tab pertama.
- Tetap hormati `clients_tab` dari body request bila admin override dari UI.
- Perluas `HEADER_ALIASES` dengan istilah umum di sheet BAPAS:
  - `case_number`: tambah `"no register"`, `"no reg"`, `"register"`, `"litmas"`
  - `full_name`: tambah `"nama klien bimbingan"`, `"nama klien pk"`, `"nama"`
  - `pk_name`: tambah `"pk pembimbing"`, `"pembimbing"`, `"nama pk"`, `"pegawai pembimbing"`
- Jika header masih tak dikenali, error sudah informatif (menampilkan list header) — admin tinggal kirim ulang dengan `clients_tab` override.

### 2. `src/pages/dashboard/IntegrasiSpreadsheet.tsx`
- Tambah input "Tab sumber klien (opsional)" — default kosong = auto-detect MASTER DATA.
- Kirim `clients_tab` ke edge function saat klik **Tarik dari Sheet**.
- Setelah tarik, jika `headers_found` ada tapi tidak dikenali, tampilkan hint: "Salin nama kolom persis ke input Tab + minta admin tambah alias header."

## Catatan
- Tidak ada perubahan schema DB / RLS.
- Tab `Clients Import` template bisa diabaikan/dihapus user; tidak lagi jadi target default.
- Karena user belum memberi nama kolom persis di MASTER DATA, jika alias di atas masih meleset, hasilnya akan menampilkan daftar header — saya akan tambahkan alias spesifik berdasarkan output tersebut di iterasi berikut.
