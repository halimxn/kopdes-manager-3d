# Acuan desain antarmuka — 15 Oktober 2026

## Prioritas dan lingkup

Arahan 10 Oktober 2026: dunia meniru panel logistik referensi, dan **seluruh web memakai bahasa visual yang sama** dengan sidebar/rel/dock tetap. [DUNIA-KOPERASI](DUNIA-KOPERASI.md) menyimpan spesifikasi dunia.

| Permukaan | Gaya dan sumber |
|---|---|
| Dunia Koperasi `/dunia-koperasi` | Diorama lembut, kartu mengambang, menu lokasi/cuaca. `src/features/dunia-3d/monitoring.css`. |
| Halaman operasional | Gaya Cerah: latar abu-lavender #F4F5FA, kartu putih tanpa garis, aksi biru #2F5BEA, aksen jenuh hanya pada grafik/status, Plus Jakarta Sans; terang/gelap. Sistem gaya `src/styles/` (`token.css` → `dasar.css` → `komponen.css` → `kerangka.css` → `halaman/*.css`). |

Pilihan palet lama tidak dipakai lagi: semua palet tersimpan tampil dengan tema biru yang sama, dan Pengaturan hanya memilih terang/gelap/sistem. Status tetap memakai warna semantik (hijau aman, kuning peringatan, merah terlambat) plus teks.

## Dunia Koperasi

Seluruh palet, komposisi kartu, scene, karakter, waktu, kendaraan dan rencana upgrade berada di [DUNIA-KOPERASI](DUNIA-KOPERASI.md). Dokumen ini tidak menyimpan salinan spesifikasi dunia. Jika ada konflik lama, ikuti kontrak dunia dan arahan pemilik terbaru.

## Halaman operasional

- **Gaya Cerah (16 Oktober 2026)**, dipilih pemilik lewat mockup kanvas dari referensi M.project (kerangka), Ckdulz (kalender), Seonizer (tabel/gauge), Selles Lab (grafik pembanding); menggantikan Senja:
  - Latar `#F4F5FA`, kartu putih tanpa garis (`--kartu-garis` transparan; garis hanya di mode gelap) dengan bayangan tipis, teks biru tua `#171A3A`/`#2E3250`; mode gelap biru malam.
  - Bersih dan tenang: warna jenuh hanya untuk grafik, status, dan tombol utama (± 10% layar). Ringkasan kepala halaman berupa satu baris teks, bukan deretan chip. Tanpa ubin ikon di judul kartu, tanpa kartu promosi di menu.
  - Peta aksen: biru = aksi/Tugas, ungu = Proyek, oranye = Buku koperasi, teal = Gerai/penjualan, merah muda = Rapat. Token `--pastel-*` (+ `-ink`) dan `--grafik-biru/oranye/teal/pink/ungu/redup/dasar`.
  - Huruf Plus Jakarta Sans (paket `@fontsource-variable/plus-jakarta-sans`, tanpa unduhan Google saat build), dipilih karena ramah di ponsel.
  - Bilah atas: kolom cari (Ctrl K), lonceng, tombol "Tambah" berlabel, menu profil (mode gelap/terang, Pengaturan, Kunci aplikasi). Ponsel: cari, lonceng, profil; tambah di dok.
  - Ubin ikon semi-3D (`.ubin` + `ubin-biru/ungu/oranye/teal/pink`, `ubin-kecil` untuk judul kartu) dan avatar berwarna tetap per orang (`.avatar-warna`), keduanya di `komponen.css`.
  - Menu samping putih, halaman aktif biru muda. Ruang kerja dan Kegiatan terbuka; Buku koperasi, Gerai & laporan, Koordinasi & berkas, Pengaturan dilipat dengan jumlah halaman; kelompok berisi halaman aktif selalu terbuka. Favorit kosong secara bawaan.
  - Grafik lembut (`components/charts/GrafikLembut.tsx`): SVG tanpa pustaka, garis 2–2,5 px melengkung, isi gradien memudar ke bawah, garis bantu samar, ujung bulat, muncul pelan (diam bila gerak dikurangi). Pembanding periode lalu berupa garis putus-putus dengan tooltip.
- **Beranda** (grid 12 kolom; tablet 2 kolom; ponsel 1 kolom dengan Kehadiran dan Status berdampingan): sapaan sesuai jam + tanggal + satu baris ringkasan (terlambat, jatuh tempo, rapat berikutnya, perlu perhatian → Tindak lanjut); empat kartu angka berubin (Tugas aktif, Proyek berjalan, Uang masuk + selisih bulan lalu, Agenda hari ini); Fokus hari ini (Terlambat, Hari ini, atau Berikutnya) + Agenda (rutinitas dan rapat dalam satu rel jam); Uang masuk/keluar kumulatif bulan ini vs bulan lalu (memuat kas dua bulan sendiri) + Penjualan gerai 7 hari; Kehadiran (gauge), Status tugas (donat), Proyek berjalan (batang ungu bergaris). Kegiatan terbaru ada di halaman Kegiatan; Grafik pekerjaan digantikan donat status.

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
