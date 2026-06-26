# Dokumentasi SIMBOIS — PDF

Buat satu file PDF berbahasa Indonesia yang menjelaskan website SIMBOIS BAPAS Kelas I Malang secara menyeluruh, disimpan di `/mnt/documents/SIMBOIS-Dokumentasi.pdf` dan dikirim ke user via `<presentation-artifact>`.

## Isi dokumen

1. **Cover** — Judul "SIMBOIS — Sistem Monitoring Bimbingan & Wajib Lapor", subjudul BAPAS Kelas I Malang, tanggal, logo IMIPAS (jika tersedia di `src/assets`).
2. **Ringkasan Eksekutif** — Tujuan sistem, masalah yang diselesaikan, ringkasan fitur utama.
3. **Arsitektur & Teknologi** — React + Vite + Tailwind + shadcn-ui, Lovable Cloud (Supabase) untuk DB/Auth/Storage/Edge Functions, integrasi Google Sheets.
4. **Peran Pengguna**
   - Admin: login, dashboard penuh, manage Client & Pegawai PK, monitoring, export, integrasi Spreadsheet.
   - Pegawai PK: login, lihat binaan, beri/cabut izin wajib lapor bulanan.
   - Client: tanpa login, akses `/wajib-lapor`, cari nama, ambil selfie + GPS, submit.
5. **Alur Utama (Flow)**
   - Alur Wajib Lapor Client (search → validasi izin → form + selfie + GPS → submit → status "Sudah Wajib Lapor").
   - Alur Pemberian Izin oleh PK (awal bulan otomatis "Belum Diizinkan" → tombol "Berikan Izin").
   - Alur Monitoring Admin (statistik harian/bulanan, grafik 30 hari, export).
6. **Modul & Halaman**
   - `/` Landing, `/login`, `/wajib-lapor`, `/dashboard/admin`, `/dashboard/pegawai`, `/admin/integrasi-spreadsheet`.
7. **Struktur Database** — tabel `clients`, `profiles`, `user_roles`, `monthly_reports`, `reporting_permissions`, `location_tracking`, `sheet_integration_settings` (deskripsi fungsi tiap tabel, tanpa SQL panjang).
8. **Integrasi Google Spreadsheet** — Tujuan, tab `MASTERDATA`, kolom yang dimapping (NO REG → No. Litmas, NAMA LENGKAP, PK, STATUS KLIEN, dll), tombol Test/Push/Pull, perilaku auto-create klien.
9. **Keamanan** — RLS di semua tabel publik, role disimpan terpisah di `user_roles`, fungsi `has_role` security definer, bucket selfie privat dengan signed URL.
10. **Geofencing** — Bounding box Malang (Lat -8.6/-7.55, Lng 112.15/113.5), auto-flag "Di Luar Wilayah".
11. **Panduan Cepat** — Langkah ringkas untuk Admin, PK, dan Client.
12. **Roadmap / Catatan** — Fitur yang dihapus (surat, chat, absensi lama) dan alasannya.

## Teknis pembuatan

- Gunakan Python + `reportlab` (Platypus) untuk layout multi-halaman dengan heading, paragraf, tabel, dan callout.
- Palet warna sesuai brand SIMBOIS: navy `#0B1E3F` + gold `#C9A24B`, body abu gelap, latar putih.
- Tipografi: Helvetica-Bold untuk judul, Helvetica untuk body; ukuran sesuai panduan PDF skill.
- Halaman A4, margin 2cm, header tipis "SIMBOIS — BAPAS Kelas I Malang" + nomor halaman di footer.
- Embed logo dari `src/assets/logo.svg` (convert ke PNG via Pillow/cairosvg) bila memungkinkan; jika gagal, lewati tanpa error.
- Tidak menyertakan password admin atau secret apa pun.

## Quality Assurance

- Render PDF → `pdftoppm -jpeg -r 150` → inspeksi setiap halaman: overflow teks, tabel terpotong, kontras, margin, urutan.
- Perbaiki dan re-render hingga bersih, lalu ringkas temuan QA dalam pesan akhir.

## Deliverable

- `/mnt/documents/SIMBOIS-Dokumentasi.pdf`
- Tag `<presentation-artifact path="SIMBOIS-Dokumentasi.pdf" mime_type="application/pdf"></presentation-artifact>` di pesan akhir.
