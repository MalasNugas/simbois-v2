## Tujuan
Saat Pegawai PK membuat program baru (dan `is_open = true`), semua Klien yang sedang online akan menerima notifikasi langsung di layar (toast + bell counter bertambah secara realtime).

## Cara Kerja

1. **Trigger DB (otomatis & andal)**
   Buat trigger `AFTER INSERT` pada `public.programs`. Jika `is_open = true`, trigger akan meng-insert satu baris di `public.notifications` untuk setiap user dengan role `klien`.
   - title: "Program Baru Tersedia"
   - message: `"<nama program> telah dibuka untuk pendaftaran"`
   - type: `info`
   - user_id: setiap klien

   Trigger berjalan dengan `SECURITY DEFINER` agar bisa insert lintas user (RLS notifications hanya mengizinkan pegawai/owner insert — kita pakai definer untuk bypass).

2. **Realtime ke Klien online**
   Tabel `notifications` sudah dipakai oleh `NotificationBell.tsx` via Supabase Realtime channel (`postgres_changes` INSERT, filter `user_id=eq.<self>`). Jadi setiap klien online akan otomatis menerima notifikasi tanpa refresh — bell counter naik & item muncul di popover.
   - Pastikan `notifications` masuk publication realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;` (jika belum).

3. **Toast pop-up di layar (opsional, direkomendasikan)**
   Di `NotificationBell.tsx`, pada handler INSERT realtime, panggil `toast(payload.new.title, { description: payload.new.message })` agar muncul notifikasi "pop" di layar HP saat klien sedang membuka aplikasi.

4. **Edge case**
   - Jika program dibuat dengan `is_open = false` lalu di-update menjadi `true`, tambahkan juga trigger `AFTER UPDATE` dengan kondisi `OLD.is_open = false AND NEW.is_open = true` agar tetap mengirim notifikasi.
   - Hindari duplikasi: trigger hanya broadcast sekali per perubahan status pembukaan.

## Perubahan File

- **Migration SQL**: trigger function `notify_clients_new_program()` + trigger pada `programs` (INSERT & UPDATE) + tambah `notifications` ke publication realtime.
- **`src/components/NotificationBell.tsx`**: tambahkan `toast()` call di handler INSERT realtime untuk efek pop-up langsung.

## Catatan
- Push notification ke layar HP saat aplikasi **tertutup** (background push) memerlukan PWA + Web Push API / FCM — di luar scope ini. Rencana ini mencakup notifikasi saat klien **online / aplikasi terbuka**, sesuai permintaan ("saat Klien online").
- Jika nanti ingin push background, perlu langkah tambahan: setup PWA, service worker, dan integrasi Web Push (bisa disusulkan).
