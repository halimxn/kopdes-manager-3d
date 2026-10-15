---
name: ui-ux-kopdes
description: Wajib dipakai setiap kali mengubah tampilan web Kopdes — CSS di src/styles, komponen src/components/ui, halaman/tampilan/laci/dialog/formulir di src/features, warna, jarak, ikon, ponsel/tablet, mode gelap, atau laporan pemilik "tidak rapi", "mepet", "tidak serasi", "terpotong". Berisi aturan gaya, jebakan CSS yang sudah pernah terjadi, dan alat periksa (lint:ui, audit:tampilan).
---

# UI/UX Kopdes

Sumber gaya: `docs/DESAIN-ANTARMUKA.md`. Konteks produk: `PRODUCT.md`. Untuk keputusan desain baru boleh memakai skill global `impeccable` / `ui-ux-pro-max`; aturan di bawah tetap menang.

## Peta
- `src/styles/token.css` (satu-satunya tempat warna mentah, terang/gelap) → `dasar.css` → `komponen.css` → `kerangka.css` (rel ikon + panel, bilah atas, dok ponsel) → `halaman/*.css` (satu berkas per kelompok halaman).
- Komponen bersama: `src/components/ui` (`Button`, `Input`, `Select`, `DateField`, `Modal`, `EmptyState`, `Ikon3D`).
- Dunia 3D punya gaya sendiri: `src/features/dunia-3d/monitoring.css` (lihat skill dunia-koperasi).

## Bahasa visual
- Gaya Teal (task manager Dribbble): latar `--canvas` lembut, kartu putih besar membulat tanpa garis, rel ikon pil + panel kelompok (`RelNavigasi.tsx`), aksi teal `--brand` berteks `--brand-text`, tautan `--brand-ink`, pastel `--pastel-biru/pink/mentega/mint` (+ `-ink`) dan isi grafik `--grafik-*`, huruf Figtree, angka `tabular-nums`. Satu tombol tambah di bilah atas.
- Setiap halaman punya infografis ringkas yang bisa ditindaklanjuti (`Cincin`, batang pil, donut, bilah bertumpuk) dengan teks nilai atau `aria-label`.
- Kartu memakai `.modul` (kepala judul + tautan kanan). Setiap data bisa ditindaklanjuti. Ikon `Ikon3D` ikut tema lewat `--ikon-awal/--ikon-akhir/--ikon-isi`; di latar gelap timpa ketiganya pada wadah.
- Status hanya `--ok/--late/--warn` (+ `-bg`, `-line`); status selalu bertuliskan, bukan warna saja.
- Judul halaman: ikon `Ikon3D` + judul tebal; tanpa label kecil di atas judul (eyebrow).
- Tabel → kartu di area sempit (container query `halaman`, < 900 px). Aksi kartu satu baris di dasar kartu.
- Laci detail: kanan di desktop, lembar bawah di ponsel. Dialog: lembar bawah di ponsel.

## Jebakan yang sudah pernah terjadi (periksa setiap kali)
1. `svg` dibuat `display:block` oleh preflight Tailwind: ikon di dalam `<span>`/`<label>` biasa yang juga berisi teks turun ke baris sendiri. Wadah ikon+teks harus `display:inline-flex; align-items:center; gap`.
2. `.ui-btn` memusatkan isi (`align-items/justify-content: center`, `min-height: 40px`, bayangan). Tombol yang berisi grid/kolom (batang grafik, judul tugas, kolom linimasa) wajib menimpa `align-items`, `justify-content`, `min-height`, `padding`, `box-shadow` dengan selektor `.ui-btn.namakelas`.
3. Selektor tombol dasar hanya `.ui-btn, a.button, button.button, label.button`; elemen lain berkelas `button` tidak bergaya.
4. `Input` memberi `ui-check` (bukan `ui-input`) untuk checkbox/radio; jangan memberi kelas kolom teks pada kotak centang.
5. `<details>` tertutup tetap punya slot isi: wadah grid dengan `gap` menyisakan ruang kosong → `details:not([open]) { gap: 0 }`.
6. Elemen sticky di dialog bergulir: `top: 0` dan latar `--surface`, jangan `top` negatif (tombol menabrak sudut melengkung).
7. Kelas di TSX tanpa aturan CSS = sisa gaya lama. Saat menyentuh komponen, cari kelasnya di `src/styles` (`grep -rn "\.namakelas" src/styles`).
8. Identitas (nama koperasi, orang) tidak boleh ditulis tetap di kode atau contoh isian; ambil dari profil.
9. Jangan menamai kelas seperti utilitas Tailwind (`m-4`, `p-2`, `flex`, `grid`, `w-full`, …): Tailwind ikut menghasilkan gaya margin/padding untuknya. Pakai nama Indonesia (`lebar-separuh`, `lebar-sepertiga`).

## Wajib
- Area sentuh ≥ 44 px (boleh visual kecil + `::after` transparan), fokus terlihat, label form, reduced-motion, safe area.
- Memuat/kosong/galat/belum aktif dibedakan; tanpa angka palsu; buku kas hanya uang masuk/keluar.
- Tanpa `!important` dan tanpa hex di luar `token.css` (dijaga `npm run lint:ui`).

## Verifikasi tampilan
1. `npm run lint:ui`.
2. `npm run dev:demo -- -p 3200`, lalu `npm run audit:tampilan -- 375 812` (juga `768 1024` dan `1440 900`; argumen ketiga menyaring nama keadaan, mis. `editor`). Laporan + tangkapan di `<tmp>/kopdes-audit/<lebar>/`. Temuan SVG internal, teks `sr-only`, dan area ketuk `::after` adalah positif palsu.
3. Lihat tangkapan keadaan yang diubah — audit geometri tidak menangkap gaya yang hilang (mis. tombol tanpa gaya).
4. Laporkan ukuran yang benar-benar diperiksa; jangan menandai perangkat fisik bila belum.
