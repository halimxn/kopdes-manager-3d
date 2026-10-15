# Changelog

Semua perubahan penting dicatat di sini, satu entri per paket kerja (terbaru di atas). Riwayat sebelum repo ini (versi pixel dan pengembangan awal 3D) ada di repo `kopdes-manager-web`.

## Senja dirapikan: halaman kerja lebih ringkas — 16 Oktober 2026

- Gaya Kebun dan Teal yang sempat dipasang di cabang `tampilan/gaya-baru` dibatalkan pemilik; web kembali ke Senja H lalu dirapikan berdasar inspeksi (detektor impeccable + pemeriksaan visual 1280 dan 375 px).
- Halaman daftar (Tugas, Rapat, dan halaman `Records` lain): kolom cari selalu terlihat, saringan lain dilipat di balik tombol Filter dengan angka saringan aktif. Daftar kini tampak di layar pertama.
- Tab halaman (mis. Rapat/Keputusan) pindah ke bawah judul; kartu sprint aktif pindah ke bawah bilah alat.
- Ponsel: tombol tambah selebar layar di kepala halaman dihapus (sudah ada tombol + di bilah atas dan dok); cari dan Filter satu baris.
- Tabel Buku kas: judul kolom boleh terbungkus agar kolom Aksi tidak terpotong pada 1280 px.
- Judul memakai huruf kapital di awal kalimat saja; batang penjualan gerai biru pastel (hari ini biru penuh); kerangka memuat tanpa garis tepi kiri.
- Verifikasi: 405 tes / 67 berkas, typecheck, lint, `lint:ui`, build lulus; JS awal 245 KB. Demo diperiksa pada 1280 px (Tugas, Rapat, Buku kas) dan 375 px (Tugas, Buku kas, tanpa luber samping). `audit:tampilan` belum dijalankan.

## Pengingat, laporan bulanan, anggaran proyek, administrasi usaha — 15 Oktober 2026

- Lonceng pengingat di bilah atas (semua halaman): tenggat terlambat/hari ini/besok, rapat 7 hari, dokumen akan habis, isu, tinjauan risiko, stok minimum, selisih opname. Dimuat sekali per sesi setelah halaman tampil; angka baru hilang setelah panel dibuka.
- Laporan kerja: preset 7 hari, Bulan ini, Bulan lalu (judul dan rentang terisi); cetak/simpan PDF memakai tombol Cetak yang ada.
- Anggaran proyek: kolom anggaran di proyek dan tautan proyek di buku kas; detail proyek menampilkan anggaran, uang keluar tercatat, sisa/lebih, dan persen terpakai. Tanpa migrasi.
- Migrasi 10 `20261015000010_administrasi_usaha.sql` (belum dijalankan di cloud): simpanan anggota (pokok/wajib/sukarela, setor/tarik, saldo tidak boleh minus), penjualan harian gerai, pembelian ke pemasok (pengiriman bisa menaut pembelian), inventaris aset, jadwal & absensi. Lima halaman baru dengan ringkasan angka, menu, ikon, aksi cepat "Usaha harian". Pemilik menyetujui simpanan anggota; pinjaman tetap di luar cakupan.
- Beranda: modul Penjualan gerai 7 hari dan Kehadiran hari ini (memuat rentang tanggal tepat; tersembunyi sebelum migrasi 10 aktif).
- Dunia 3D: kartu panel memakai palet Senja; panel Ringkasan mendapat grafik ringkas per lokasi (tugas terbuka, selesai 7 hari, kehadiran, uang keluar 7 hari, omzet gerai, barang per rak, pengiriman aktif, isi rak pendingin). Judul panel tidak lagi mewarisi warna mode gelap web.
- Halaman generik kini membuka formulir baru dengan `?baru=1`; label status kartu memakai label pilihan; tab halaman memakai peta label, bukan rantai kondisi.
- Verifikasi: 405 tes / 67 berkas (termasuk 4 tes PGlite migrasi 10), typecheck, lint, `lint:ui`, build lulus; JS awal 246 KB. Demo diperiksa pada lebar panel ±630 px (halaman baru, Beranda, panel dunia Kantor/Gerai/Gudang) dan 1440 px (lonceng, Beranda); audit 360/768/1024/1440 belum dijalankan.

## Gaya Senja dan Beranda grid modul — 15 Oktober 2026

- Pemilik memilih desain H · Senja setelah membandingkan 12 pratinjau (A–L). Token diganti di satu tempat: kanvas krem hangat, kartu putih, aksi biru #2F5BEA, pastel biru/merah muda/mentega/mint, status pastel bertuliskan, huruf Hanken Grotesk (paket lokal; Inter dibuang). Mode gelap ikut.
- Ornamen dunia dibuang dari web: pita lantai, nama ruang tercat, sidebar dinding, strip kayu, diorama layar PIN, serta peta `data-ruang` di AppShell.
- Beranda disusun ulang menjadi grid modul seimbang: tanggal + pil ringkasan menggantikan kartu angka; tombol tambah ganda di kepala halaman dihapus; modul Tugas, Agenda hari ini (rapat dan rutinitas dalam satu rel jam), Perlu perhatian, Proyek dengan milestone terdekat, Kas bulan berjalan per pekan (uang masuk/keluar tercatat), Kegiatan terbaru, Grafik pekerjaan. Beranda memuat milestone alih-alih anggota.
- Pelajaran: nama kelas `m-6`/`m-4` bentrok dengan utilitas margin Tailwind; dicatat di skill ui-ux-kopdes.
- Verifikasi: 377 tes / 60 berkas, typecheck, lint, `lint:ui` lulus; Beranda diperiksa di 1440, 820, 390 px dan mode gelap; Tugas, Buku kas, Hari ini, Rapat, Proyek, Pengaturan, PIN diperiksa di 1440 px.

## Halaman lebih cepat dimuat — 15 Oktober 2026

- Tiap halaman hanya mengunduh komponennya sendiri: Beranda, Hari ini, catatan, Buku koperasi, Perlu perhatian, dan formulir kini dimuat sesuai halaman (sebelumnya semua ikut di setiap halaman). Di dalam halaman catatan, tampilan Harian/Papan/Kalender/Linimasa, laci tugas, formulir, impor CSV, dan periode kerja dimuat saat dipakai. JS awal halaman operasional turun dari 546 KB menjadi 236 KB (hasil build produksi).
- Kemampuan server (`capabilities`) diminta sekali per sesi browser, tidak lagi di setiap pindah halaman, sehingga data halaman langsung diminta tanpa menunggu satu permintaan tambahan. Gagal tidak di-cache.
- Verifikasi: tes, typecheck, lint, `lint:ui`, build lulus; halaman utama dan tampilan Tugas diperiksa tampil di 1440 px. Waktu muat di Vercel belum diukur.

## Pemisah ribuan pada input angka — 13 Oktober 2026

- Nominal kas, harga, dan jumlah stok otomatis memakai titik pemisah ribuan saat diketik, ditempel, atau membuka data lama. Formulir dan draf tetap menyimpan angka tanpa titik; PIN, telepon, serta kode tetap memakai input sebelumnya.
- Kolom wajib, bilangan bulat, minimum/maksimum, stok buku read-only, dan posisi kursor tetap ditangani; Backspace pada pemisah tidak macet.
- Suite lengkap 376 tes / 60 berkas lulus; setelah menambah tes penyimpanan nominal ke API, seluruh 49 tes formulir diulang dan lulus (cakupan akhir 377 kasus). Typecheck, lint, dan build produksi lulus. Browser formulir kas diperiksa pada 360/768/1024/1440 px tanpa galat konsol. Perangkat fisik dan cloud belum diuji.

## Rapikan mobile dan panel Dunia Koperasi — 13 Oktober 2026

- Selisih kas mendapat baris penuh di Beranda pada ponsel; label dan nominal tidak lagi dipaksa muat dalam kolom sempit. Ringkasan buku memisahkan label, nilai, dan keterangan; judul tugas panjang membungkus.
- Perubahan rutinitas lokal disatukan dengan perbaikan mobile: jam di atas judul, rel dengan centang, kemajuan dan penanda berikutnya menurut WIB, isian berlabel, serta tombol dialog berjajar. Input checkbox/radio memakai gaya pilihan, bukan kolom teks.
- Tombol formulir, kartu catatan, rapat, kontak, buku, dan proyek dirapikan pada ponsel; aksi penting tidak terjepit dan kontrol yang diubah mencapai 44 px. PIN mendapat latar biru, pola jendela, lantai hangat, dan ikon kantor dalam panel.
- Dunia 3D: aturan grid KPI sebelumnya menimpa `hidden`, membuat kartu ringkasan ikut muncul pada panel lain. Aturan panel tersembunyi dipertegas tanpa menghapus data, tab, atau tautan catatan.
- Browser demo: Beranda, PIN, rutinitas/dialog, buku kas, tugas/formulir, proyek, rapat, barang, risiko, dokumen, dan mitra diperiksa pada ukuran relevan 360/390/430/768/1024/1440 px. Pergantian empat panel dunia diuji pada enam ukuran di Kantor dan 360/1440 di empat lokasi lainnya; hanya satu isi panel terlihat. Konsol tanpa galat/peringatan. Perangkat fisik belum diperiksa.
- Seluruh 372 tes / 59 berkas, typecheck, lint tanpa peringatan, `lint:ui`, dan build produksi lulus. Tidak ada push, deploy, atau perubahan database cloud pada paket ini.

## Pemeriksaan alur fitur dan detail — 13 Oktober 2026

- Impor CSV tugas memakai parser yang menerima koma, kutip, dan baris baru dalam sel. Semua baris divalidasi sebelum penyimpanan; kegagalan jaringan menyebut jumlah baris yang telah tersimpan. Ditambahkan unduhan format CSV, kendali keyboard, batas ukuran berkas, dan penguncian dialog selama penyimpanan.
- Cadangan membaca tabel bertahap dengan jumlah pasti, menolak hasil tidak lengkap atau melebihi 5.000 baris per tabel. Arsip laporan dapat memuat halaman lebih lama; keadaan memuat/galat/kosong dan pemilihan dengan keyboard diperbaiki. API memvalidasi paginasi dan ID penghapusan.
- Pengaturan tidak lagi menampilkan editor umum yang ganda. Riwayat catatan dan tugas memakai pemformat waktu WIB yang sama. Demo tidak menggandakan tugas berulang saat disimpan ulang dan menerima asal localhost/127.0.0.1 pada port sendiri; aturan hosting produksi tetap berlaku.
- Pemeriksaan browser lokal mencakup halaman menu pada 360/768/1024/1440 px serta lima lokasi dunia. Simpan tugas demo berhasil; tidak ada galat konsol. Perangkat fisik, data cloud, dan performa perangkat lemah belum diuji.
- Tes: cakupan penuh 371 kasus; suite lengkap menghasilkan 369 lulus dan dua timeout. Setelah menghilangkan penanaman 5.000 baris yang tidak diperlukan serta pencarian role atas ratusan kartu, kedua berkas diulang dan seluruh 18 tes lulus. Seluruh kasus terverifikasi; batas waktu pemeriksaan penuh 20 detik, tanpa mengurangi cakupan.
- Typecheck, lint (tanpa peringatan), `lint:ui`, dan build produksi lulus. Perubahan pengguna yang sudah ada dipertahankan dan tidak dimasukkan ke commit paket ini.

## Pemulihan cadangan dan konsistensi aturan — 13 Oktober 2026

- Cadangan laporan menerima ringkasan kas, status draf/final di snapshot dan kolom laporan, serta cadangan lama tanpa kolom baru. Validasi tetap ketat; status snapshot mengatasi kolom status lama yang tertinggal. API laporan menyelaraskan kedua lokasi status saat membuat, mengubah, dan finalisasi.
- Migrasi 9 menyelaraskan status laporan lama dan mempertahankan status pada pemulihan atomik. SQL install/reset dibuat ulang; migrasi belum dijalankan di cloud. Tes regresi memakai ekspor dan pemulihan API dengan PostgreSQL lokal, termasuk penolakan isi tidak sah, sesi/Origin, dan rollback yang menjaga profil serta laporan lama.
- Tombol bersama, isian, navigasi hari, aksi kartu/tabel buku, dan tombol dunia diperbesar menjadi 44 px. Tugas Harian membatasi lebar kisi dan membungkus isi kartu agar tidak terpotong di 360 px; deretan hari bergulir di dalam kontainer.
- AGENTS menjadi sumber ketentuan Graphify opsional; aturan Claude/Gemini/Cursor/agen lain menunjuk ke sana. Skill memakai rute pratinjau yang tersedia dan ukuran pemeriksaan 360/768/1024/1440, lalu disinkronkan. Peta gaya pada clean-code memakai `monitoring.css` yang aktif.
- CI menjalankan `lint:ui`; ESLint mengabaikan semua folder build `.next-*`, termasuk hasil pemeriksaan lokal.
- Verifikasi: 350 tes / 56 berkas, typecheck, lint, `lint:ui`, dan build produksi lulus. Beranda, Tugas Harian, Barang dan formulir Barang diperiksa pada 360/768/1024/1440 px; tombol dunia terukur 44 px, kartu Harian tidak terpotong, tanpa luber halaman dan tanpa galat browser. Perangkat fisik dan pemulihan cloud belum diuji.

## Rutinitas garis waktu dan audit tata letak — 12 Oktober 2026

- Rutinitas harian menjadi garis waktu: batang kemajuan bersegmen, rel jam dengan simpul yang berubah menjadi centang hijau, rutinitas berikutnya menurut jam WIB (diperbarui tiap menit) ditandai biru, jam yang sudah lewat tanpa centang ditandai kuning halus, dan baris hijau bila semua sudah dicentang. Judul ganda di dalam lipatan dihapus. Kotak centang asli tetap ada untuk papan ketik dan pembaca layar.
- Kotak centang tidak lagi tampil sebagai kolom teks selebar penuh: komponen `Input` tidak memberi gaya `ui-input` ke checkbox/radio (terlihat di rutinitas dan formulir).
- Tombol berupa `label.button` (Pilih Berkas Cadangan JSON) kini bergaya tombol.
- Tinjauan mingguan: satu baris per tugas dengan tanggal di kanan (sebelumnya tautan menumpuk). Keputusan terkait rapat: judul dan alasan di baris terpisah agar tidak saling menimpa. Titik hari ini di grafik tidak keluar dari kolom.
- Perbaikan di atas ditemukan lewat audit otomatis CDP di luar repo (375 px): setiap halaman, tampilan Tugas/Kegiatan, tab, laci, editor, dan dialog dibuka dengan semua lipatan terbuka, lalu dicek kontrol berukuran janggal, teks luber, elemen keluar layar, isi tombol meluap, dan elemen yang saling menimpa.

## Sistem gaya baru berbahasa dunia 3D — 12 Oktober 2026

Gaya web dibangun ulang dari nol karena beberapa bagian tidak serasi dan kurang berkarakter. Lapisan lama (`personal.css`, `ui.css`, `tokens.css`, `tema.css`) dihapus, bukan ditimpa.

- Struktur baru `src/styles/`: `token.css` (warna, dinding, lantai, kayu, status, radius, bayangan, gerak; terang/gelap) → `dasar.css` → `komponen.css` → `kerangka.css` → `halaman/*.css` (satu berkas per kelompok halaman).
- Bahasa dunia: menu samping berupa dinding biru-lavender dengan item aktif sebagai kartu putih; setiap kelompok menu punya lantai sendiri (`data-ruang` di `<main>`) dengan pita papan isometrik dan nama ruang tercat samar; aksen kayu untuk rapat, layar PIN, laporan, hari ini, dan milestone.
- Ringkasan angka berupa pil ganda "angka · label"; dok ponsel mengambang; dialog menjadi lembar bawah di ponsel; laci detail di kanan.
- Beranda: baris label kecil di atas judul dihapus, tanggal menjadi cip.
- Beranda tablet: kartu rapat setinggi isinya; angka Catatan koperasi maksimal dua kolom dan satu kolom di kolom sempit agar nilai uang tidak luber.
- Cincin progres Beranda tidak lagi terpotong dan busurnya mulai dari atas.
- Beranda lebih lega: jarak antara judul dan tanggal, antar-baris kartu angka, dan antar-grafik di lipatan Grafik pekerjaan; batang mingguan kini terisi (sebelumnya kosong karena gaya tombol dasar) dan sama tinggi termasuk hari ini; pil Rutinitas menempel ke judul; lipatan tertutup tidak menyisakan ruang kosong.
- Dialog Cari di ruang kerja: ikon di dalam kolom, pilihan jenis satu baris yang bisa digeser, judul kelompok dengan jumlah berupa pil, hasil berupa baris 44 px.
- Tugas: tombol Rencana/Selesai di Papan sejajar dengan ikon centang hijau; bulatan centang Harian bundar 24 px dengan area ketuk 44 px; jumlah tugas di strip minggu berupa pil status yang tidak terpotong; menu Lainnya selalu di kanan sehingga tidak keluar layar.
- Dialog Tambah: label kecil di atas judul dihapus, kepala dan tombol tutup tetap terlihat saat digulir. Laci tugas: bilah aksi tidak lagi naik melewati tepi atas.
- Halaman 404 di dalam kerangka tampil sebagai kartu biasa tanpa diorama layar masuk, tanpa `<main>` bersarang; judul bilah atas untuk rute tak dikenal menjadi "Ruang kerja", bukan "Beranda".
- Sentuh: chip filter, pilihan tampilan, judul kartu buku, dan tombol WhatsApp/Telepon setinggi 44 px pada layar sentuh.
- Perkakas: `npm run lint:ui` kini memeriksa `src/styles` (warna hex hanya di token, tanpa `!important` kecuali reduced-motion dan cetak); dependensi huruf Plus Jakarta Sans yang tidak dipakai dibuang. `PRODUCT.md` mencatat konteks produk untuk pekerjaan desain.
- Verifikasi: 340 tes / 54 berkas, typecheck, lint, lint:ui, build lulus; tangkapan CDP desktop, tablet, ponsel, dan mode gelap (rincian di STATUS).

## Tampilan ponsel dan tablet — 12 Oktober 2026

- Dunia Koperasi: tombol zoom dan putar kini tampil di ponsel; rentang zoom 0,6–5× (sebelumnya 0,7–2,4×) dengan langkah berlipat; layar potret membuka dengan denah diperbesar (ponsel ±1,5×, tablet ±1,2×).
- Beranda ponsel: filter proyek selebar penuh, Catat kegiatan dan Buat tugas berdampingan; angka minus tidak terlipat.
- Pilihan tampilan Tugas/Kegiatan satu baris yang bisa digeser di ponsel dan tablet (sebelumnya kisi bertumpuk tiga baris). Kartu tugas: sel selebar isi, penanggung jawab sebaris dengan Selesai.
- Kartu catatan: Opsi lainnya menjadi tombol "⋯" di ponsel sehingga aksi muat satu baris.
- Buku koperasi ponsel: angka ringkasan berupa baris label–angka (nilai panjang seperti estimasi persediaan tidak terpotong); kartu kas/barang lebih padat dengan aksi satu baris, Beli dan Opname menjadi tombol ikon berlabel.
- Linimasa ponsel: daftar rata kiri tanpa bingkai per baris.
- Verifikasi: 340 tes / 54 berkas, typecheck, lint, build lulus; tangkapan emulasi perangkat (CDP) 375×812 untuk 22 halaman dan 768×1024 untuk halaman utama, tanpa luber samping.

## Rilis awal repo 3D — 11 Oktober 2026

Repo `kopdes-manager-3d` dimulai bersih dari keadaan berikut.

### Dunia Koperasi 3D

- Diorama Three.js yang dibangun dari kode: Pulau melayang, Kantor delapan ruang, Gerai sepuluh unit, Gudang (rak A–F, dok D1–D4, truk), dan Cold storage (rak C1–C3).
- Tampilan panel logistik: bilah atas dengan pemilih lokasi dan pencarian, tiga KPI, panel detail per ruang, pelacak, daftar bertab, dok Detail/Ringkasan/Daftar/Agenda, pin perhatian, kontrol peta (perbesar, putar 15°–75°, tampilan awal), lembar bawah di ponsel.
- Figur chibi dari catatan Tim yang ditempatkan menurut rapat, kegiatan, pelatihan, tugas, seksi, dan unit gerai; kamera mengikuti figur pilihan dengan siku biru.
- Panel ruang memuat tugas, sprint dan milestone, dokumen, risiko, mitra, rapat dan keputusan, kegiatan dan pelatihan, barang, stok minimum, mutasi dan opname, uang masuk/keluar, anggota.
- Tautan dua arah dengan web (`?unit=`, `?orang=`, `?barang=`, `?kirim=`, `?tugas=`, `?rapat=`, `?lokasi=&pilih=`); aksi buat baru membuka formulir web.
- Render berhenti saat diam; panorama jendela mengikuti cuaca simulasi dan fase WIB.

### Halaman operasional

- Proyek, tugas (daftar, papan, harian, kalender, Gantt), milestone, sprint, kegiatan, rapat dengan ICS, dokumen, risiko dan isu, mitra, tim dan pelatihan, gerai dan kesiapan, laporan snapshot.
- Buku koperasi: anggota, buku kas (uang masuk/keluar tercatat), barang, stok opname, pengiriman, dan mutasi stok.
- Laci detail Detail/Terkait/Riwayat untuk semua catatan; Terkait dua arah dari kolom rujukan dan nama Tim; saran langkah berikut membuka formulir terisi tanpa menulis data.
- Beranda bento, judul halaman seragam berikon, tabel dan kartu rapi, tabel lebar menjadi kartu di area sempit, mode gelap.
- Tema biru senada dunia (`src/app/tema.css`), ikon dua nada, warna status token `--pastel-*`.

### Perkakas dan keamanan

- Mode demo `npm run dev:demo`: 191 catatan contoh di memori tanpa Supabase/PIN, tidak pernah aktif di Vercel.
- SQL install, reset, dan seed data contoh dibuat dari skrip; migrasi berurutan di `supabase/migrations/`.
- PIN ber-hash scrypt, sesi kedaluwarsa, cookie HttpOnly/SameSite, pemeriksaan asal mutasi, RLS.
- CI GitHub Actions: lint, typecheck, tes, build.

### Dirapikan saat pemisahan repo

- Sisa versi pixel dibuang: mesin PixiJS, aset gambar (`art-src`, `public/dunia`), skrip dan pratinjau pixel, dependensi `pixi.js`, serta prototipe 3D lama yang tidak dimuat. Model data dunia dipindah ke `src/features/dunia-3d/model/`.
- ID proyek Supabase diganti penanda `<project-ref>` di dokumen dan SQL karena repo publik.
- Aturan Git baru: cabang bertopik (`fitur/`, `perbaikan/`, `tampilan/`, `dokumen/`, `rapikan/`), tanpa awalan nama alat atau orang.
- Verifikasi: 340 tes / 54 berkas, typecheck, lint, build lulus; build juga lulus tanpa variabel rahasia.
