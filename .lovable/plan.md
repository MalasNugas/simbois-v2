# Buat Akun Admin

## Kredensial
- **Email**: `Admin@email.com`
- **Password**: `Marchell_02`
- **Nama lengkap**: `Anakmama`
- **Role**: `admin`

## Langkah eksekusi
1. Panggil edge function `create-admin` (sudah ada di project) via `supabase--curl_edge_functions` dengan payload `{ email, password, full_name }`.
2. Function akan:
   - Membuat user di `auth.users` (email auto-confirm) menggunakan Service Role Key
   - Trigger `handle_new_user` membuat row di `profiles`
   - Insert row `{ user_id, role: 'admin' }` ke `user_roles`
3. Verifikasi: query `user_roles` untuk memastikan role `admin` terpasang.
4. Laporkan ke user kredensial login & arahkan ke halaman `/login`.

## Catatan
- Tidak ada perubahan kode/skema — hanya invoke function yang sudah tersedia.
- Setelah login pertama, user disarankan ganti password.
