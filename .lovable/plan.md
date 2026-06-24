# Cakupan Input — Konfirmasi & Klarifikasi

Berdasarkan jawaban Anda: **"Klien via website + via Sheet"** (Pegawai PK juga via keduanya).

## Status saat ini (sudah sesuai pilihan Anda)

| Entitas | Via Website | Via Spreadsheet Import |
|---|---|---|
| **Klien** | ✅ Form "Tambah Klien" di Dashboard Admin | ✅ Tab `Clients Import` |
| **Pegawai PK** | ✅ Form "Tambah Pegawai" di Dashboard Admin | ✅ Tab `Pegawai PK Import` |
| **Wajib Lapor** | ✅ Klien isi sendiri di halaman Wajib Lapor | ✅ Tab `Wajib Lapor Import` (opsional) |
| **Izin Lapor** | ✅ Pegawai PK beri izin di app | ❌ Tidak diimport |

→ **Tidak ada perubahan kode yang dibutuhkan.** Kedua jalur sudah aktif.

## Catatan penting

Saat ini "Klien via website" = **Admin** yang mendaftarkan Klien lewat form di Dashboard Admin. **Belum ada halaman registrasi mandiri** di mana Klien bisa daftar sendiri tanpa Admin.

## Pertanyaan lanjutan

Apakah Anda ingin saya tambahkan **halaman registrasi mandiri untuk Klien** (`/register-klien`) supaya Klien bisa daftar sendiri tanpa harus dibuatkan Admin? Form akan minta: Nama, Email, Password, No. Litmas, Telepon, Pegawai PK pilihan. Akun yang dibuat menunggu verifikasi Admin sebelum bisa lapor.

Pilih salah satu:
- **A. Cukup seperti sekarang** — Admin yang membuat akun Klien (via form atau Sheet). Tidak ada perubahan.
- **B. Tambahkan halaman Self-Register Klien** — Klien bisa daftar sendiri, Admin verifikasi.
