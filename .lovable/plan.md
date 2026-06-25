## Masalah

Tab `MASTER DATA` terbaca tapi `headers_found: []` — artinya baris pertama kosong (kemungkinan judul yang di-merge atau baris blank di atas header asli). Kode saat ini selalu menganggap `values[0]` sebagai header, jadi semua data ditolak.

## Solusi

**`supabase/functions/sheets-sync-pull/index.ts`** — auto-detect baris header, bukan asumsi baris 1.

1. Ambil range lebih luas (`A1:Z50`) lalu pindai 15 baris pertama. Untuk tiap baris, hitung `pickHeaderIndex` terhadap alias `case_number` dan `full_name`. Baris pertama yang mengenali **keduanya** dipakai sebagai header; baris di bawahnya jadi data.
2. Jika tidak ada baris yang cocok, kembalikan pesan error yang menampilkan **3 baris teratas yang non-kosong** (bukan `[]` kosong) supaya admin tahu apa yang benar-benar ada di sheet.
3. Tambah opsi override manual: kalau body request berisi `header_row` (1-indexed), pakai itu langsung tanpa auto-detect.
4. `rows_read` dihitung dari `values.length - (headerRowIndex + 1)`.

**`src/pages/dashboard/IntegrasiSpreadsheet.tsx`** — tambah input opsional "Baris header (kosongkan = auto)" di sebelah "Tab sumber klien", kirim sebagai `header_row` ke edge function. Default tetap auto-detect.

Tidak ada perubahan DB, RLS, atau tabel lain. Header alias yang sudah ada tetap dipakai.