## Pre-check akses Editor sebelum tombol "Buat Template Tab" & "Tarik dari Sheet" aktif

### Masalah
Connector Google saat ini hanya punya akses Viewer/Commenter ke spreadsheet target, sehingga `batchUpdate` (membuat tab) dan `values.update` (menulis header / pull yang butuh tulis) gagal dengan **403 PERMISSION_DENIED**. User baru tahu setelah klik tombol dan menunggu error.

### Solusi
Tambahkan probe akses ringan saat user klik **Test Koneksi**. Jika akun connector bukan Editor, tombol aksi tulis di-disable dan ditampilkan instruksi share sebagai Editor.

### Perubahan

**1. Edge function baru: `supabase/functions/sheets-check-access/index.ts`**
- Admin-only, input: `{ spreadsheet_id }`.
- Cara cek (tanpa mengubah data): panggil `spreadsheets/{id}?fields=spreadsheetId,properties.title` lalu `spreadsheets:batchUpdate` dengan body kosong `{ requests: [] }`.
  - Google membalas 200 jika punya akses tulis, 403 jika hanya read.
- Return: `{ can_write: boolean, reason?: string, connector_email?: string }`.
  - Untuk `connector_email`, coba ambil dari `oauth2/v2/userinfo` via gateway (best-effort, boleh kosong).

**2. Update `supabase/functions/sheets-test-connection/index.ts`**
- Setelah berhasil ambil metadata, panggil probe write yang sama (`batchUpdate` body kosong) dan kembalikan `can_write` di response.

**3. Update `src/pages/dashboard/IntegrasiSpreadsheet.tsx`**
- State baru: `canWrite: boolean | null`, `connectorEmail: string | null`.
- `handleTest()` simpan `can_write` dari response.
- Disable tombol **Buat Template Tab**, **Tarik dari Sheet**, dan **Push ke Sheet** saat `canWrite === false`.
- Tampilkan banner peringatan merah di panel ketika `canWrite === false`:
  > "Akun connector Google belum punya akses **Editor** ke spreadsheet ini. Buka spreadsheet → Share → tambahkan email connector sebagai **Editor**, lalu klik **Test Koneksi** lagi."
  > (Jika `connectorEmail` tersedia, tampilkan emailnya + tombol copy.)
- Banner hijau singkat saat `canWrite === true`.

### Yang TIDAK berubah
- Tidak ada perubahan DB / RLS / tabel.
- Logic push/pull/template tetap sama; hanya gating UI + probe.
- Tetap pertahankan error handling 403 di edge function existing sebagai jaring pengaman.
