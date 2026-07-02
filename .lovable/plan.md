## Buat Akun Pegawai PK Baru

Akan dibuat 1 akun Pegawai PK melalui Edge Function `create-pegawai` yang sudah ada (dipanggil sekali via curl dengan token admin).

**Detail akun:**
- Nama: Marchellino
- Email: `pegawai1@simbois.local`
- Password: `Marchell_02`
- Role: `pegawai`

**Langkah eksekusi:**
1. Login sebagai admin (`Admin@email.com`) via API untuk dapat access token.
2. Panggil edge function `create-pegawai` dengan payload di atas.
3. Verifikasi akun muncul via query `user_roles` + `profiles`.

**Hasil:** Akun langsung bisa login di `/login` dan muncul di daftar Pegawai PK pada dashboard admin, siap ditugaskan sebagai pembimbing klien.