## Tujuan
Hapus semua tulisan/konten yang mengarah ke Lovable dari file yang dilihat pengguna/publik.

## Perubahan

### 1. `index.html`
- `meta description` → "SIMBOIS — Sistem Informasi Monitoring dan Bimbingan Online Integrasi Sosial, Bapas Kelas I Malang."
- `meta author` → "Bapas Kelas I Malang"
- `og:description` → sama dengan description
- Hapus `og:image`, `twitter:image`, dan `twitter:site` (mengandung URL/handle Lovable). Sesuai aturan, og:image dibiarkan di-handle hosting.

### 2. `README.md`
Tulis ulang jadi README khusus SIMBOIS (deskripsi singkat proyek, tech stack, cara run lokal `npm i` + `npm run dev`). Tanpa menyebut Lovable sama sekali.

### 3. `public/robots.txt`
Cek & bersihkan bila ada baris menyebut Lovable.

## Tidak diubah (file sistem/build, bukan konten yang mengarah ke Lovable dari sisi user)
- `vite.config.ts` & `package.json` → `lovable-tagger` adalah plugin build internal yang wajib ada agar editor tetap berfungsi. Menghapusnya akan merusak integrasi editor. Tetap dipertahankan.
- `playwright.config.ts`, `playwright-fixture.ts` → file test internal, tidak tampil ke user.
- `bun.lock`, `tsconfig.node.tsbuildinfo` → lockfile/build cache, auto-generated.

Jika Anda ingin `lovable-tagger` juga dihapus dari `vite.config.ts` + `package.json` (dengan risiko editor preview tidak lagi menandai komponen), konfirmasikan.
