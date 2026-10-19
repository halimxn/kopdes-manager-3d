---
name: Kopdes Manager 3D
description: Ruang kerja harian manajer Koperasi Desa/Kelurahan Merah Putih
colors:
  delima: "#a04656"
  delima-tua: "#8e3b4a"
  delima-muda: "#f7e6e8"
  putih-susu: "#f7f1ec"
  permukaan: "#ffffff"
  permukaan-redup: "#f6f0eb"
  tinta: "#2b2326"
  tinta-judul: "#24191d"
  tinta-redup: "#6e6064"
  tinta-samar: "#7a6a6f"
  garis: "#f0e7e2"
  garis-tegas: "#e6dad4"
  status-aman: "#2d6a3e"
  status-terlambat: "#a8401f"
  status-peringatan: "#7a5208"
  pastel-jambu: "#f6e0e6"
  pastel-kunyit: "#f5e6be"
  pastel-pandan: "#d7e8d3"
  pastel-talas: "#e6e1f1"
typography:
  title:
    fontFamily: "Plus Jakarta Sans Variable, Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.25
  card-title:
    fontFamily: "Plus Jakarta Sans Variable, Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
  body:
    fontFamily: "Plus Jakarta Sans Variable, Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Plus Jakarta Sans Variable, Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
rounded:
  md: "12px"
  lg: "18px"
  card: "22px"
  xl: "24px"
  full: "999px"
spacing:
  gutter: "28px"
  gutter-ponsel: "16px"
  jarak-kartu: "20px"
  sentuh: "44px"
components:
  button-primary:
    backgroundColor: "{colors.delima}"
    textColor: "{colors.permukaan}"
    rounded: "{rounded.md}"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.delima-tua}"
  card:
    backgroundColor: "{colors.permukaan}"
    rounded: "{rounded.xl}"
    padding: "20px 22px"
  card-rutin:
    backgroundColor: "{colors.delima}"
    textColor: "{colors.permukaan}"
    rounded: "{rounded.xl}"
  takik-aksi:
    backgroundColor: "{colors.permukaan}"
    textColor: "{colors.tinta-judul}"
    rounded: "16px"
    size: "46px"
  input-tambah-cepat:
    backgroundColor: "{colors.permukaan-redup}"
    rounded: "{rounded.full}"
    height: "48px"
  menu-aktif:
    backgroundColor: "{colors.delima}"
    textColor: "{colors.permukaan}"
    rounded: "14px"
---

# Design System: Kopdes Manager 3D

## Overview

**Creative North Star: "Lekuk Merah Putih"**

Ruang kerja yang dibuka manajer koperasi setiap pagi: tenang, hangat, dan jelas apa yang harus dikerjakan. Merah putih dibawa sebagai warna yang halus, bukan bendera: latar putih susu, kartu putih datar, dan satu aksen merah delima lembut. Kepribadian datang dari bentuk, bukan dari dekorasi: kartu bersudut besar dengan takik di pojok kanan atas yang memuat satu tombol aksi, pil, dan tombol bulat.

Halaman operasional bersifat Operate: tugas dan rutin di tengah, angka cukup sebagai ringkasan kecil. Dunia Koperasi 3D punya gaya sendiri (`src/features/dunia-3d/monitoring.css`, kontrak di `docs/DUNIA-KOPERASI.md`) dan tidak diatur dokumen ini.

Ditolak pemilik: biru Taskflow, Cerah, Senja, Kebun, Teal, palet "templat AI", kartu hitam, grafik bergaya kripto yang ramai.

**Key Characteristics:**

- Satu aksen delima; warna jenuh hanya pada grafik, status, tombol utama, menu aktif, dan kartu Rutin harian.
- Kartu datar tanpa bayangan; kedalaman dari selisih nada latar dan permukaan.
- Takik Lekuk: pojok kanan atas kartu dicekung, berisi satu tombol aksi 46 px.
- Status selalu bertuliskan, tidak hanya warna.
- Mode gelap bernada hangat (cokelat kemerahan), bukan abu dingin.

## Colors

Putih susu hangat dengan satu aksen merah delima lembut dan empat pastel pendamping. Sumber tunggal: `src/styles/token.css` (terang di `:root`, gelap di `:root.dark`); warna mentah di luar berkas itu ditolak `npm run lint:ui`.

### Primary

- **Merah delima** (`--brand`, `--brand-isi`, #a04656): tombol utama, menu aktif, hari terpilih, kartu Rutin harian. Teks putih di atasnya 5,99:1.
- **Delima tua** (`--brand-hover`, `--brand-ink`, #8e3b4a): hover tombol, teks tautan dan label aksen di atas latar terang.
- **Delima muda** (`--brand-soft`, #f7e6e8): latar lembut hover dan cip "Hari ini".

### Neutral

- **Putih susu** (`--canvas`, #f7f1ec): latar halaman dan warna yang mengisi takik.
- **Permukaan** (`--surface`, #ffffff) dan **permukaan redup** (`--surface-3`, #f6f0eb): kartu dan isian.
- **Tinta** (`--ink` #2b2326, `--ink-heading` #24191d, `--ink-muted` #6e6064, `--ink-subtle` #7a6a6f): cokelat gelap, bukan hitam murni. Semua lolos 4,5:1 di atas permukaan dan latar.

### Status dan pastel

- Status: aman `--ok` #2d6a3e, terlambat `--late` #a8401f (jingga bata, sengaja beda dari merah merek), peringatan `--warn` #7a5208, masing-masing dengan `-bg` dan `-line`.
- Pastel (`--pastel-*` + `-ink`): delima = Tugas, jambu = Rapat, kunyit = Buku koperasi, pandan = Gerai, talas = Proyek/Dunia. Seri grafik `--grafik-*` mengikuti peta yang sama.

### Named Rules

**Aturan satu aksen.** Delima hanya untuk tindakan utama dan penanda terpilih. Kategori memakai pastel, status memakai token status.

**Aturan teks putih.** Teks putih hanya di atas `--brand-isi` (atau `--brand-isi-hover`), tidak pernah di atas `--brand`/`--brand-hover` (dijaga tes `token-warna`). Baris di dalam kartu delima digelapkan (`--sumur-delima`), tidak diputihkan, agar teks putih tetap ≥ 4,5:1 di kedua tema.

## Typography

**Font:** Plus Jakarta Sans Variable (paket lokal `@fontsource-variable`, tanpa unduhan saat build), cadangan system-ui.

- **Judul halaman** (24 px/600): satu-satunya `h1`, di kepala kerangka.
- **Judul kartu** (16–17 px/600): `h2` di isi halaman.
- **Isi** (14 px/400, tinggi baris 1,5); baris ringkas 14,5 px/600 untuk judul tugas.
- **Label** (12–13 px/600–700): jam, jumlah, cip tanggal; angka memakai `tabular-nums`.

Tanpa label kecil di atas judul (eyebrow). Bobot maksimal 700.

## Layout

- Kerangka: sidebar 248 px di desktop (rel ikon 76 px di tablet ≤ 1023 px), kepala halaman, isi maksimal 1240 px dengan gutter 28 px (16 px di ponsel).
- Sidebar dua kelompok kartu: **Kerja** (Beranda, Hari ini, Tugas, Proyek, Linimasa) dan **Ruang lain** (Catatan, Usaha, Koperasi, Dunia), lalu kartu Tim bertakik. Sumber: `src/components/layout/navigasi.ts`. Halaman lain tetap tab hub di bawah judul.
- Ponsel (≤ 767 px): dok pil mengambang (Beranda, Tugas, Rapat, Lainnya; label hanya pada yang aktif) dan tombol tambah bulat terpisah; safe area dihormati.
- Beranda: kepala sapaan → tambah cepat → grid dua kolom (Rutin | Agenda, Perlu tindakan | Minggu ini; 1fr : 1,2fr, tinggi rata per baris) → Pekerjaan berjalan → Usaha harian. Grid menjadi satu kolom bila area halaman < 860 px (container query `halaman`).
- Diperiksa pada 360, 768, 1024, 1440 px; tanpa gulir samping halaman.

## Elevation & Depth

Datar. Kartu, ubin ikon, dan tombol utama tanpa bayangan; lapisan dibedakan oleh nada (`--canvas` di bawah, `--surface` di atas, `--surface-3` untuk isian). Bayangan hangat tipis hanya untuk yang mengambang: dok ponsel (`--shadow-dock`), menu tarik-turun, dialog, dan hover kartu proyek (`--shadow-md`). Mode gelap memakai garis kartu (`--kartu-garis`) karena selisih nada lebih kecil.

## Shapes

- Sudut: kartu 22–24 px (`--r-card`, `--r-xl`), baris dan tombol 12–18 px, pil `--r-full`.
- **Takik Lekuk** (`.bertakik` + `.takik-aksi` di `komponen.css`): pojok kanan atas kartu dicekung 54 px dengan lengkung 18 px, dicat warna latar di belakang kartu (`--takik-latar`, bawaan `--canvas`). Karena itu kartu bertakik harus datar dan duduk langsung di atas latar itu; konten tidak boleh masuk ke area takik (beri jarak atas, misalnya ringkasan sebelum pita minggu).
- Kolom cari, tambah cepat, pilihan proyek, dan tombol sekunder di kepala berbentuk pil.

## Components

- **Tombol utama:** isi delima, teks putih, sudut 12 px, tinggi 44 px, tanpa bayangan; hover delima tua.
- **Kartu modul** (`.modul`): putih, sudut 24 px, padding 20/22 px (16 px di ponsel), judul `h2` 17 px.
- **Kartu Rutin harian:** delima penuh, teks putih, bilah progres putih, baris sumur gelap 52 px; baris "Berikutnya" putih dengan teks tinta. Centang terakhir memicu konfeti singkat (mati bila gerak dikurangi). Rutin bukan tenggat: jam yang lewat ditandai lingkaran putus-putus, bukan merah.
- **Agenda:** hitung mundur ke rapat berikutnya (pita jambu, titik berdenyut), linimasa jam kiri dan isi jambu kanan, garis "sekarang" jingga bata, pil Gabung/Catat hasil.
- **Baris ringkas** (`.beranda-baris`): cip tanggal pil (terlambat, hari ini, rapat), judul + keterangan, avatar inisial berwarna tetap per nama.
- **Pita minggu:** tujuh tombol hari ≥ 44 px; titik penuh = tugas, cincin = rapat; hari terpilih delima.
- **Isian:** sudut 12 px, garis tegas; fokus berupa cincin delima `--focus-ring`. Tambah cepat memakai pil 48 px di atas permukaan redup.
- **Menu aktif sidebar:** isi delima, teks putih; ikon halaman dua nada delima (`Ikon3D`, token `--ikon-garis-a/b`, `--ikon-isi`).

## Do's and Don'ts

### Do:

- **Do** memakai token dari `token.css` untuk setiap warna; tambah token baru di sana bila perlu, lengkap dengan padanan mode gelap.
- **Do** menuliskan status sebagai teks (Lewat 2 hari, Hari ini, sedang berlangsung), bukan hanya warna.
- **Do** menjaga area sentuh ≥ 44 px (pakai `::after` transparan bila pil visualnya lebih kecil) dan menghormati `prefers-reduced-motion`.
- **Do** memberi setiap data di Beranda tindak lanjut: tautan ke tugas, rapat, atau form terisi.

### Don't:

- **Don't** memakai biru Taskflow #546FFF di halaman web, kartu hitam, atau gradien ungu-biru ala templat.
- **Don't** menaruh garis warna di sisi kiri kartu atau baris (lebih dari 1 px), ubin ikon bergradien, atau label kecil di atas judul.
- **Don't** meletakkan teks putih di atas `--brand`/`--brand-hover` atau di atas baris yang diputihkan di kartu delima.
- **Don't** memberi bayangan pada kartu bertakik; takik akan terlihat sebagai tambalan.
- **Don't** menampilkan angka contoh atau nol palsu ketika data belum dimuat atau fitur belum aktif.
