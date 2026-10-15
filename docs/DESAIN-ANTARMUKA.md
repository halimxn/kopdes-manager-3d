# Acuan desain antarmuka — 15 Oktober 2026

## Prioritas dan lingkup

Arahan 10 Oktober 2026: dunia meniru panel logistik referensi, dan **seluruh web memakai bahasa visual yang sama** dengan sidebar/rel/dock tetap. [DUNIA-KOPERASI](DUNIA-KOPERASI.md) menyimpan spesifikasi dunia.

| Permukaan | Gaya dan sumber |
|---|---|
| Dunia Koperasi `/dunia-koperasi` | Diorama lembut, kartu mengambang, menu lokasi/cuaca. `src/features/dunia-3d/monitoring.css`. |
| Halaman operasional | Gaya Kebun: kanvas #F4F5F0, kartu putih bergaris tipis, menu samping hijau tua #0F2A24, sorotan limau #C5E86C, Manrope; terang/gelap. Sistem gaya `src/styles/` (`token.css` → `dasar.css` → `komponen.css` → `kerangka.css` → `halaman/*.css`). |

Pilihan palet lama tidak dipakai lagi: semua palet tersimpan tampil dengan tema biru yang sama, dan Pengaturan hanya memilih terang/gelap/sistem. Status tetap memakai warna semantik (hijau aman, kuning peringatan, merah terlambat) plus teks.

## Dunia Koperasi

Seluruh palet, komposisi kartu, scene, karakter, waktu, kendaraan dan rencana upgrade berada di [DUNIA-KOPERASI](DUNIA-KOPERASI.md). Dokumen ini tidak menyimpan salinan spesifikasi dunia. Jika ada konflik lama, ikuti kontrak dunia dan arahan pemilik terbaru.

## Halaman operasional

- **Gaya Kebun (16 Oktober 2026)**, dipilih pemilik dari kanvas desain (Senja, Rapi, Bersih, Mint, Lembut, Teduh, Kebun):
  - Kanvas `#F4F5F0`, kartu putih garis `#E3E7DF`, bayangan sangat tipis; teks hijau tua `#13201C`; mode gelap hijau malam `#0E1513` dengan aksi limau.
  - Menu samping hijau tua `#0F2A24` berlabel (sekitar 30 halaman tetap terbaca namanya); halaman aktif berupa pil limau `#C5E86C`. Token `--sisi-*` dan `--limau*`.
  - Tombol utama hijau tua berteks limau (`--brand` + `--brand-text`); tautan hijau `--brand-ink`. Nama token lama (`--brand-*`, `--pastel-*`) dipertahankan agar semua halaman ikut.
  - Huruf Manrope (paket `@fontsource-variable/manrope`, tanpa unduhan Google saat build), angka `tabular-nums`.
  - Ikon `Ikon3D` hijau dari token `--ikon-awal/--ikon-akhir/--ikon-isi` (terang di menu samping gelap).
  - Satu tombol "+ Tambah" di bilah atas (dan + di dok ponsel); kepala halaman tidak mengulang tombol tambah.
- **Anatomi modul** (`.modul` di `komponen.css`): kartu putih bergaris tipis, kepala = judul tebal + tautan hijau di kanan, isi, aksi di dasar. Tanpa ikon pastel di kepala.
- **Beranda**: tanggal + pil ringkasan (terlambat, jatuh tempo hari ini, rapat berikutnya); pita jam 07–18 (rutinitas bisa dicentang dan rapat dalam satu garis waktu, penanda sekarang; di area < 640 px menjadi daftar); antrean kerja dikelompokkan Terlambat/Hari ini/Besok/Berikutnya (saringan Terlambat/Selesai dan grafik tetap menampilkan daftar datar); kolom samping kas bulan berjalan (panel gelap, uang masuk/keluar tercatat, bukan saldo), perlu perhatian, kegiatan terbaru; linimasa proyek 2 minggu ke belakang sampai 8 minggu ke depan dengan milestone berikutnya; penjualan gerai, kehadiran (migrasi 10) dan grafik pekerjaan.

- **Pola tata letak (11 Oktober 2026)**: tabel = judul teks rata kiri dengan ikon/avatar di kiri, kolom selebar isi, aksi satu baris (ikon bila lebih dari dua); kartu daftar = tinggi rata per baris, aksi di dasar kartu dipisah garis tipis, informasi tidak diulang antara cip dan badan kartu; tabel Tugas/Kegiatan tampil sebagai kartu bila area halaman < 900 px (container query, bukan lebar layar, karena sidebar), dan Buku koperasi memakai tampilan kartu di layar < 1280 px. Warna hanya untuk status (lencana lembut), bukan garis aksen kartu. Satu set warna: biru tema untuk aksen dan kategori; token `--pastel-emerald/rose/amber-*` hanya untuk status selesai/terlambat/perlu perhatian; abu untuk netral. Judul halaman = ikon halaman + 22 px tebal; kode dan jam memakai angka rata (`tabular-nums`).

- **Laci detail** (`records/RecordDrawer.tsx`) untuk semua catatan selain tugas: Detail · Terkait · Riwayat, tombol Ubah dan Lihat di dunia, saran langkah berikut. Desktop panel kanan, ponsel lembar bawah. `?record=` membuka laci, `?ubah=1` langsung form. Laci tugas memuat bagian Terkait yang sama.
- **Kepala daftar**: ikon halaman, judul, ringkasan angka per status. **Kartu catatan**: cip info kunci per jenis (`ringkasan()`), avatar staf, pil status, aksi kecil berjajar.
- **Saran** hanya membuka form terisi (`?baru=1&isi.<kolom>=…`); tidak ada penulisan otomatis.
- Menu: Perlu perhatian menjadi bagian Beranda (`#perhatian`); Ringkasan buku tetap tab Buku koperasi, tidak di menu samping.

- Ikon halaman biru kilap dalam ubin biru muda (`IkonHalaman`) di menu samping, rel, menu ponsel, dock; halaman aktif bercincin biru. Kartu statistik, keadaan kosong dan pusat aksi memakai ikon yang sama; barang memakai thumbnail berwarna.
- Dialog muat di layar dan bergulir di dalam; di ponsel menjadi lembar bawah selebar layar. Catatan unit, staf, barang, pengiriman, tugas dan rapat punya tombol "Lihat di dunia".
- Menu memakai bahasa Indonesia langsung dan kapitalisasi kalimat; judul/deskripsi panjang membungkus. Dunia tersedia di bilah atas dan dock ponsel; Tambah membuka pilihan pencatatan yang sama di semua ukuran.
- Ikon 3D adalah SVG dari kode, tanpa memuat WebGL.
- Token di `src/styles/token.css` adalah sumber warna; urutan impor ada di `src/app/layout.tsx`. `npm run lint:ui` menolak warna hex dan `!important` di luar token, pengaman reduced-motion, dan lembar cetak.
- Beranda mengutamakan tindakan: setiap modul berisi data yang bisa ditindaklanjuti.
- Riwayat proyek adalah tab `/proyek?tab=riwayat`; alias `/riwayat-proyek` mengalihkan ke tab, tanpa menu riwayat sidebar terpisah.
- Judul lebih utama dari kode; metadata dan aksi terpisah, label panjang membungkus. Tidak ada capaian tiruan, slogan atau tim palsu.
- DateInput/DateField dan Select bersama; kalender ke bawah dalam batas panel, menu dapat menggulir. Form ponsel satu kolom.
- Status berupa teks selain warna. Memuat/kosong/galat harus berbeda; galat tidak menjadi angka nol.
- Perlu Perhatian memakai permukaan netral dan rincian bertautan sumber.

## Akses dan bukti

Target sentuh 44 px, label aksesibel, fokus keyboard, reduced-motion, safe area, dan scroll tabel/Gantt dalam kontainer. Dunia menyediakan kontrol HTML dan daftar lokasi sebagai alternatif model WebGL.

Periksa 360/768/1024/1440 px. Catat screenshot, interaksi dan state yang benar-benar diuji di STATUS. Build/tes DOM tidak membuktikan kesamaan visual dengan video, WebGL semua perangkat atau penerimaan pemilik. QA-ANOTASI, QA-TATA-LETAK dan QA-POPUP adalah bukti historis halaman operasional, bukan arahan yang mengalahkan dokumen ini.

`/dev/ruang-kerja` menyediakan pratinjau menu, kartu dan form dengan isi contoh lokal. Hanya development; tidak membuka sesi atau menulis data.
