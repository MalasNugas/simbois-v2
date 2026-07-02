## Masalah
Klien Rina (dan 4 klien Budi lainnya) menampilkan `Pegawai PK: -` di halaman Wajib Lapor, walau Budi bisa memberi izin dari dashboard.

## Penyebab
Akun `pegawai1@simbois.local` (Budi Santoso, S.H.) tidak punya baris di tabel `profiles`. Saat rename dari "Marchellino", baris profile ikut terhapus dan tidak dibuat ulang. Fungsi `search_clients_public` melakukan LEFT JOIN ke `profiles` untuk mengambil nama PK — hasilnya NULL → ditampilkan sebagai "-".

## Perbaikan (1 langkah, data-only)
Insert baris profile untuk user_id `f9e13bd7-6cdc-46bd-9a01-8ef772050890`:
- `full_name`: "Budi Santoso, S.H."
- `phone`: (kosong / opsional)

Tidak ada perubahan kode/skema. Setelah insert, refresh `/wajib-lapor` dan nama PK akan muncul untuk kelima klien binaan Budi.

## Pencegahan (opsional, bisa ditunda)
Tambahkan trigger `handle_new_user` sudah ada untuk auth.users, tapi profile Budi terhapus manual di luar flow signup. Untuk mencegah kejadian serupa saat rename akun, ke depan cukup UPDATE `profiles.full_name` — jangan DELETE lalu re-insert.
