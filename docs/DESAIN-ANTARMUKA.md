# Acuan desain antarmuka — 20 Oktober 2026

## Prioritas dan lingkup

Arahan 10 Oktober 2026: dunia meniru panel logistik referensi, dan **seluruh web memakai bahasa visual yang sama** dengan sidebar/rel/dock tetap. [DUNIA-KOPERASI](DUNIA-KOPERASI.md) menyimpan spesifikasi dunia.

| Permukaan | Gaya dan sumber |
|---|---|
| Dunia Koperasi `/dunia-koperasi` | Diorama lembut, kartu mengambang, menu lokasi/cuaca. `src/features/dunia-3d/monitoring.css`. |
| Halaman operasional | Gaya Lavender Lekuk: latar lavender sangat muda #F5F3FA, kartu putih datar sudut 22–24 px dengan takik berisi satu tombol aksi, pil dan tombol bulat, aksen tunggal lavender #6A55C8, tinta ungu gelap #221D2E, sidebar Kerja + Ruang lain + kartu Tim, tab hub di bawah judul, Plus Jakarta Sans; terang/gelap. Token dan komponen di [DESIGN](../DESIGN.md); sistem gaya `src/styles/` (`token.css` → `dasar.css` → `komponen.css` → `kerangka.css` → `halaman/*.css`). |

Pilihan palet lama tidak dipakai lagi: semua palet tersimpan tampil dengan tema Lavender yang sama, dan Pengaturan hanya memilih terang/gelap/sistem. Status tetap memakai warna semantik (hijau aman, kuning peringatan, merah terlambat) plus teks.

## Dunia Koperasi

Seluruh palet, komposisi kartu, scene, karakter, waktu, kendaraan dan rencana upgrade berada di [DUNIA-KOPERASI](DUNIA-KOPERASI.md). Dokumen ini tidak menyimpan salinan spesifikasi dunia. Jika ada konflik lama, ikuti kontrak dunia dan arahan pemilik terbaru.

## Halaman operasional

- **Gaya Lavender Lekuk (20 Oktober 2026)**, dipilih pemilik setelah banyak putaran prototipe (arsip di `docs/desain/`, pembanding warna `pilih-warna-beranda.html`): Merah Putih 19 Oktober dinilai tidak cocok; kini lavender lembut #6A55C8 di atas latar lavender sangat muda, pastel persik/jambu/kunyit/pandan/air, kartu datar bertakik dengan ubin ikon di kepala kartu, pil, tombol bulat, mode gelap ungu malam. Sidebar desktop mendahulukan kerja harian: kelompok Kerja (Beranda, Hari ini, Tugas, Proyek, Linimasa), lalu Ruang lain (Catatan, Usaha, Koperasi, Dunia) dan kartu Tim; rel ikon di tablet; ponsel memakai dok pil Beranda/Tugas/Rapat/Lainnya (label hanya pada yang aktif) + tombol tambah bulat. URL dan tab hub tidak berubah. Rincian token dan komponen di [DESIGN](../DESIGN.md).
- **Gaya Taskflow (16 Oktober 2026, diganti 19 Oktober)**, mengikuti referensi Figma Taskflow dan Free Task Management Dashboard: sidebar putih enam hub (Beranda, Pekerjaan, Catatan, Usaha, Koperasi, Dunia; `src/components/layout/navigasi.ts`), halaman lama menjadi tab hub (`TabHub`) dengan URL tetap, kepala halaman memuat satu-satunya `h1` + cari + lonceng + Tambah + profil, kartu bersampul warna hub (`--sampul-*`) dan ikon tanpa foto, progres bertulis persen, avatar inisial, Beranda dengan panel kanan (kalender mini + agenda) pada ≥ 1440 px. Tablet memakai sidebar ikon 72 px; ponsel memakai dok lima item (Beranda, Pekerjaan, Tambah, Dunia, Menu) dan lembar menu berisi semua hub. Spec: `docs/superpowers/specs/2026-10-16-desain-taskflow-design.md`.
- **Gaya Cerah (16 Oktober 2026, diganti)**, dipilih pemilik lewat mockup kanvas dari referensi M.project (kerangka), Ckdulz (kalender), Seonizer (tabel/gauge), Selles Lab (grafik pembanding); menggantikan Senja:
  - Latar `#F4F5FA`, kartu putih tanpa garis (`--kartu-garis` transparan; garis hanya di mode gelap) dengan bayangan tipis, teks biru tua `#171A3A`/`#2E3250`; mode gelap biru malam.
  - Bersih dan tenang: warna jenuh hanya untuk grafik, status, dan tombol utama (± 10% layar). Ringkasan kepala halaman berupa satu baris teks, bukan deretan chip. Tanpa ubin ikon di judul kartu, tanpa kartu promosi di menu.
  - Peta aksen: biru = aksi/Tugas, ungu = Proyek, oranye = Buku koperasi, teal = Gerai/penjualan, merah muda = Rapat. Token `--pastel-*` (+ `-ink`) dan `--grafik-biru/oranye/teal/pink/ungu/redup/dasar`.
  - Huruf Plus Jakarta Sans (paket `@fontsource-variable/plus-jakarta-sans`, tanpa unduhan Google saat build), dipilih karena ramah di ponsel.
  - Bilah atas: kolom cari (Ctrl K), lonceng, tombol "Tambah" berlabel, menu profil (mode gelap/terang, Pengaturan, Kunci aplikasi). Ponsel: cari, lonceng, profil; tambah di dok.
  - Ubin ikon semi-3D (`.ubin` + `ubin-biru/ungu/oranye/teal/pink`, `ubin-kecil` untuk judul kartu) dan avatar berwarna tetap per orang (`.avatar-warna`), keduanya di `komponen.css`.
  - Menu samping putih, halaman aktif biru muda. Ruang kerja dan Kegiatan terbuka; Buku koperasi, Gerai & laporan, Koordinasi & berkas, Pengaturan dilipat dengan jumlah halaman; kelompok berisi halaman aktif selalu terbuka. Favorit kosong secara bawaan.
  - Grafik lembut (`components/charts/GrafikLembut.tsx`): SVG tanpa pustaka, garis 2–2,5 px melengkung, isi gradien memudar ke bawah, garis bantu samar, ujung bulat, muncul pelan (diam bila gerak dikurangi). Pembanding periode lalu berupa garis putus-putus dengan tooltip.
- **Beranda** (19 Oktober 2026): sapaan sesuai jam WIB + tanggal + satu baris ringkasan (terlambat, jatuh tempo), pilihan proyek, tombol "Salin laporan hari ini" (teks polos untuk grup WhatsApp pengurus; dialog cadangan bila clipboard ditolak); tambah cepat satu kalimat (`@nama` dari Tim, `#proyek`, `!prioritas`, besok/lusa/nama hari/tgl-bln) yang membuka form tugas terisi, tidak menyimpan sendiri; grid dua kolom: Rutin harian (kartu pastel, baris berikutnya berwarna aksen, centang, konfeti saat beres) | Agenda hari ini (hitung mundur, linimasa, garis sekarang, Gabung, Catat hasil ke jurnal), Perlu tindakan (tugas terlambat/hari ini + pengingat dokumen, isu, risiko, stok) | Minggu ini (pita Senin–Minggu, pilih hari); lalu Pekerjaan berjalan (kartu proyek bergulir) dan usaha harian (kas, penjualan, kehadiran). Satu kolom bila area halaman < 860 px.

- **Pola tata letak (11 Oktober 2026)**: tabel = judul teks rata kiri dengan ikon/avatar di kiri, kolom selebar isi, aksi satu baris (ikon bila lebih dari dua); kartu daftar = tinggi rata per baris, aksi di dasar kartu dipisah garis tipis, informasi tidak diulang antara cip dan badan kartu; tabel Tugas/Kegiatan tampil sebagai kartu bila area halaman < 900 px (container query, bukan lebar layar, karena sidebar), dan Buku koperasi memakai tampilan kartu di layar < 1280 px. Warna hanya untuk status (lencana lembut), bukan garis aksen kartu. Satu set warna: lavender untuk aksen, pastel untuk kategori; token `--pastel-emerald/rose/amber-*` hanya untuk status selesai/terlambat/perlu perhatian; abu untuk netral. Judul halaman = ikon halaman + 22 px tebal; kode dan jam memakai angka rata (`tabular-nums`).

- **Laci detail** (`records/RecordDrawer.tsx`) untuk semua catatan selain tugas: Detail · Terkait · Riwayat, tombol Ubah dan Lihat di dunia, saran langkah berikut. Desktop panel kanan, ponsel lembar bawah. `?record=` membuka laci, `?ubah=1` langsung form. Laci tugas memuat bagian Terkait yang sama.
- **Kepala daftar**: ikon halaman, judul, ringkasan angka per status. **Kartu catatan**: cip info kunci per jenis (`ringkasan()`), avatar staf, pil status, aksi kecil berjajar.
- **Saran** hanya membuka form terisi (`?baru=1&isi.<kolom>=…`); tidak ada penulisan otomatis.
- Menu: Perlu tindakan (dulu Perlu perhatian) menjadi bagian Beranda (`#perhatian`); Ringkasan buku tetap tab Buku koperasi, tidak di menu samping.

- Ikon halaman dua nada lavender (`IkonHalaman`, `Ikon3D`, token `--ikon-*`) di menu samping, rel, menu ponsel, dok; menu aktif berisi lavender. Kartu statistik, keadaan kosong dan pusat aksi memakai ikon yang sama; barang memakai thumbnail berwarna.
- Dialog muat di layar dan bergulir di dalam; di ponsel menjadi lembar bawah selebar layar. Catatan unit, staf, barang, pengiriman, tugas dan rapat punya tombol "Lihat di dunia".
- Menu memakai bahasa Indonesia langsung dan kapitalisasi kalimat; judul/deskripsi panjang membungkus. Dunia tersedia di bilah atas dan dock ponsel; Tambah membuka pilihan pencatatan yang sama di semua ukuran.
- Ikon 3D adalah SVG dari kode, tanpa memuat WebGL.
- Token di `src/styles/token.css` adalah sumber warna; urutan impor ada di `src/app/layout.tsx`. `npm run lint:ui` menolak warna hex dan `!important` di luar token, pengaman reduced-motion, dan lembar cetak.
- Beranda mengutamakan tindakan: setiap modul berisi data yang bisa ditindaklanjuti.
- Riwayat proyek adalah tab `/proyek?tab=riwayat`; alias `/riwayat-proyek` mengalihkan ke tab, tanpa menu riwayat sidebar terpisah.
- Judul lebih utama dari kode; metadata dan aksi terpisah, label panjang membungkus. Tidak ada capaian tiruan, slogan atau tim palsu.
- DateInput/DateField dan Select bersama; kalender ke bawah dalam batas panel, menu dapat menggulir. Form ponsel satu kolom.
- Status berupa teks selain warna. Memuat/kosong/galat harus berbeda; galat tidak menjadi angka nol.
- Perlu tindakan memakai permukaan netral dan rincian bertautan sumber.

## Akses dan bukti

Target sentuh 44 px, label aksesibel, fokus keyboard, reduced-motion, safe area, dan scroll tabel/Gantt dalam kontainer. Dunia menyediakan kontrol HTML dan daftar lokasi sebagai alternatif model WebGL.

Periksa 360/768/1024/1440 px. Catat screenshot, interaksi dan state yang benar-benar diuji di STATUS. Build/tes DOM tidak membuktikan kesamaan visual dengan video, WebGL semua perangkat atau penerimaan pemilik. QA-ANOTASI, QA-TATA-LETAK dan QA-POPUP adalah bukti historis halaman operasional, bukan arahan yang mengalahkan dokumen ini.

`/dev/ruang-kerja` menyediakan pratinjau menu, kartu dan form dengan isi contoh lokal. Hanya development; tidak membuka sesi atau menulis data.
