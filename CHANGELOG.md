# Changelog

Semua perubahan penting dicatat di sini, satu entri per paket kerja (terbaru di atas). Riwayat sebelum repo ini (versi pixel dan pengembangan awal 3D) ada di repo `kopdes-manager-web`.

## Warna Lavender menggantikan Merah Putih — 20 Oktober 2026

- Pemilik menilai Beranda kurang menarik dan warna merah tidak cocok. Dari empat contoh (`docs/desain/pilih-warna-beranda.html`: lavender, hijau pandan, terakota, nila) pemilik memilih Lavender.
- Token: aksen `#6A55C8` (teks putih 5,61:1), latar `#F5F3FA`, tinta ungu gelap, pastel persik (Proyek) dan air (Dunia) menggantikan talas yang kini terlalu dekat dengan aksen; mode gelap ungu malam, jambu gelap digeser ke mauve. Nama token `delima` diganti netral `aksen` (`--grafik-aksen`, `--pastel-aksen`, `.ubin-aksen`) agar tidak ikut berganti tiap palet.
- Beranda: kartu Rutin harian kini pastel dengan baris putih, hanya baris "Berikutnya" yang berisi aksen; kepala keempat kartu berubin ikon (rutin, agenda, tindakan, minggu); pita hitung mundur agenda memakai aksen. Token dan tes sumur kartu merah dilepas.
- Verifikasi: lihat entri status terbaru.

## Desain Merah Putih Lekuk: kerangka dan Beranda baru — 19 Oktober 2026

- Pemilik memilih arah "Lekuk" (kartu terpisah berikon dengan takik, pil, tombol bulat) dan palet Merah Putih yang halus setelah banyak putaran prototipe (arsip `docs/desain/`), menggantikan Taskflow biru. Ini paket 1 dari 4 (kerangka + Beranda); berikutnya Tugas dengan PIC dari Tim, Agenda + Catat hasil, lalu palet Ctrl+K dan interaksi. Sistem gaya dicatat di `DESIGN.md`.
- Token: latar putih susu `#F7F1EC`, kartu putih datar sudut 22–24 px, aksen delima `#A04656` (teks putih 5,99:1), tinta cokelat gelap, pastel jambu/kunyit/pandan/talas, status terlambat jingga bata agar beda dari merah merek; mode gelap hangat. Sisa biru lama di bayangan tombol utama, gradasi ikon `Ikon3D`, dan tirai dialog diganti token. Tes token (`token-warna`) memeriksa nilai palet dan kontras, termasuk baris di kartu delima.
- Komponen: kartu bertakik (`.bertakik` + `.takik-aksi`), kartu dan ubin ikon datar tanpa gradien/bayangan, area ketuk 44 px untuk tautan kecil di kepala kartu dan pilihan Masuk/Keluar kas.
- Kerangka: sidebar mendahulukan kerja harian (Kerja: Beranda, Hari ini, Tugas, Proyek, Linimasa; Ruang lain: Catatan, Usaha, Koperasi, Dunia; kartu Tim bertakik). Ponsel: dok pil Beranda/Tugas/Rapat/Lainnya yang memunculkan label pada yang aktif + tombol tambah bulat. URL dan tab hub tetap.
- Beranda: sapaan + ringkasan + "Salin laporan hari ini" (teks polos untuk grup WhatsApp pengurus: rutin, tugas selesai/jatuh tempo/terlambat, rapat, kegiatan; dialog cadangan bila clipboard ditolak); tambah cepat satu kalimat (`@nama` dari Tim, `#proyek`, `!prioritas`, besok/lusa/nama hari/tgl-bln) yang membuka form tugas terisi tanpa menyimpan sendiri; Rutin harian sebagai kartu delima (berikutnya, jam lewat bergaris putus, konfeti saat semua beres); Agenda hari ini (hitung mundur, linimasa, garis sekarang, Gabung, Catat hasil ke jurnal); Perlu tindakan; Minggu ini (pita Senin–Minggu, pilih hari); Pekerjaan berjalan dan usaha harian. Kalender mini, donat progres, dan panel kanan dilepas; Beranda kini memuat data Tim untuk `@nama`. Kerangka memuat Beranda mengikuti susunan baru.
- Skrip `audit:tampilan` membuka dialog rutinitas lewat tombol takik yang baru.
- Verifikasi: 461 tes / 76 berkas, typecheck, lint, `lint:ui`, dan build produksi lulus; JS awal 239 KB (batas 300 KB). `audit:tampilan` Beranda 0 temuan pada 375×812, 768×1024, 1024×768, dan 1440×900 (375 dan 1440 juga setinggi penuh); dialog Atur rutinitas terbuka dari tombol takik. Peramban demo: tambah cepat membuka form tugas terisi (PIC dari Tim, proyek, prioritas, tenggat), Salin laporan menyalin dan memberi tahu, bilah progres rutin berubah saat dicentang; mode terang diperiksa di ponsel, mode gelap di keempat ukuran. Detektor impeccable: sisa peringatan hanya animasi lebar label dok pil dan kurva pegas (sengaja). Belum: perangkat fisik, halaman selain Beranda dengan gaya baru secara menyeluruh.

## Desain Taskflow: ganti total gaya dan menu enam hub — 16 Oktober 2026

- Pemilik meminta desain diganti total mengikuti Figma Taskflow dan Free Task Management Dashboard, termasuk menyusun ulang menu. Spec dan rencana di `docs/superpowers/specs/2026-10-16-desain-taskflow-design.md` dan `docs/superpowers/plans/2026-10-16-desain-taskflow.md`.
- Token baru: latar `#F5F5F7`, kartu putih sudut 16 px, aksen tunggal `#546FFF`, tinta `#141522`, judul 24/600, warna sampul per hub (`--sampul-*`) dengan padanan mode gelap; tes token memeriksa kontras teks ≥ 4.5:1 di kedua tema. Ketebalan huruf diseragamkan (≤ 700).
- Menu: sidebar hanya enam hub (Beranda, Pekerjaan, Catatan, Usaha, Koperasi, Dunia) dari satu sumber `components/layout/navigasi.ts`; halaman lama menjadi tab hub (`TabHub`) di bawah judul, URL lama tetap. Favorit, kelompok lipat, "Proyek saya", kartu Dunia di sidebar, dan rel tablet terpisah dilepas. Tablet memakai sidebar ikon 72 px; ponsel memakai dok Beranda/Pekerjaan/Tambah/Dunia/Menu dan lembar menu per hub. Sub-navigasi buku pencatatan dihapus karena sudah diganti tab hub.
- Kepala halaman memuat satu-satunya `h1` (judul halaman) + cari + lonceng + Tambah + profil berinisial; judul di isi halaman turun menjadi `h2` berukuran subjudul.
- Beranda: kartu sapaan, baris "Pekerjaan berjalan" berisi kartu proyek bersampul warna hub (progres bertulis persen, "Belum dinilai" bukan 0%), modul progres/kas/perhatian/tugas/usaha, panel kanan kalender mini (Senin awal minggu, tanggal bertanda dengan label) + agenda; panel kanan menjadi kolom ketiga pada ≥ 1440 px.
- Kartu proyek di halaman Proyek memakai sampul yang sama dengan garis atas warna proyek pengguna. Dunia 3D dan ikon berganti ke biru `#546FFF`.
- Verifikasi: tes, typecheck, lint, `lint:ui`, build lulus; JS awal 240 KB. Demo diperiksa di peramban pada 375/768/1024/1440 px; `audit:tampilan` 1440 dan 375 tanpa temuan baru. Pemeriksaan perangkat fisik belum dilakukan.

## Beranda mengikuti referensi M.project — 16 Oktober 2026

- Pemilik meminta tampilan disesuaikan dengan kumpulan referensi (M.project, Selles, Natz/Analytics, Seonizer). Beranda kini bersusun seperti M.project: baris kartu proyek berwarna (ubin semi-3D, tumpukan avatar penanggung jawab, progres bergaris warna proyek, "N hari lagi" ke milestone, jumlah tugas dan milestone) + kartu Progres keseluruhan (donat persen selesai + legenda); lalu grafik performa kas ala Selles + Agenda + Perlu perhatian (pola Message); lalu Tim hari ini (pola Team Members: bilah hadir/izin/belum + petugas), Fokus hari ini (pola Monthly Tasks: butir berbingkai berubin warna proyek + avatar), dan Penjualan gerai (batang pil ala Natz).
- Kartu angka di atas dilepas karena isinya kini tampil di kartu proyek, donat, grafik kas, dan agenda. Gauge kehadiran diganti daftar tim; komponen `Gauge` dihapus.
- Kerangka: profil di bilah atas menampilkan nama dan jabatan dengan panah menu; kartu profil di dasar menu samping diganti kartu ilustrasi 3D "Dunia Koperasi" (ikon pulau, tombol Buka dunia) seperti kartu promosi M.project.
- Ponsel: kartu proyek menjadi carousel geser; Agenda di kolom sempit memakai tata jam-di-atas-judul dan digulir di dalam kartu agar baris sejajar.
- Verifikasi: 407 tes, typecheck, lint, `lint:ui`, build lulus; JS awal 246 KB. Demo diperiksa pada 1280 dan 375 px tanpa luber samping.

## Gaya Cerah: kerangka baru dan Beranda lebih hidup — 16 Oktober 2026

- Pemilik menilai paket 1 "kurang menarik": bilah atas dan menu masih gaya lama, Beranda terlalu polos, tidak ada kartu angka, grafik kurang menonjol. Dipilih warna tingkat tengah dan rombakan kerangka + Beranda.
- Bilah atas: kolom cari (Ctrl K), lonceng, tombol "Tambah" berlabel, menu profil berisi mode gelap/terang, Pengaturan, dan Kunci aplikasi. Tautan Dunia Koperasi dan avatar kiri dilepas dari bilah atas (Dunia tetap di menu samping dan dok ponsel).
- Menu samping putih dengan halaman aktif biru muda, butir 44 px.
- Beranda: sapaan sesuai jam WIB, empat kartu angka berubin ikon semi-3D (Tugas aktif, Proyek berjalan + rata-rata progres, Uang masuk bulan ini + selisih dari bulan lalu, Agenda hari ini), ubin ikon di judul setiap kartu, avatar berwarna tetap per orang di Fokus hari ini, grafik lebih tegas (garis 3 px, isi gradien lebih pekat, batang puncak penjualan penuh). Data kas dimuat sekali untuk kartu angka dan grafik.
- Verifikasi: 407 tes, typecheck, lint, `lint:ui`, build lulus; JS awal 246 KB. Demo diperiksa pada 1280 dan 375 px (tanpa luber samping).

## Gaya Cerah paket 1: token, huruf, menu ringkas, Beranda grafik lembut — 16 Oktober 2026

- Pemilik menilai Senja yang dirapikan "masih sama", lalu memilih arah baru lewat mockup kanvas dari referensi M.project, Ckdulz, Seonizer, dan Selles Lab, dengan permintaan "clean, rapi, tanpa banyak yang mengganggu" dan grafik yang lembut.
- Token baru: latar abu-lavender `#F4F5FA`, kartu putih tanpa garis berbayangan tipis (garis hanya di mode gelap), teks biru tua, warna status dan pastel diselaraskan, token grafik `--grafik-*`. Huruf Plus Jakarta Sans (paket lokal) menggantikan Hanken Grotesk karena lebih ramah di ponsel. Mode gelap biru malam. Panel Dunia 3D ikut palet lewat `monitoring.css`.
- Menu samping ringkas: hanya Ruang kerja dan Kegiatan terbuka; kelompok lain dilipat dengan jumlah halaman, kelompok berisi halaman aktif selalu terbuka; Favorit kosong secara bawaan. Diperbaiki: kelompok yang dilipat sebelumnya tetap tampil karena `display: grid` mengalahkan atribut `hidden`.
- Beranda disusun ulang (grid 12 kolom): satu baris ringkasan teks, Fokus hari ini (Terlambat/Hari ini/Berikutnya), Agenda, Uang masuk/keluar kumulatif bulan ini dibanding bulan lalu (memuat kas dua bulan sendiri, berhalaman; hanya uang tercatat), Penjualan gerai 7 hari (batang bergradien, puncak berlabel), Kehadiran (gauge), Status tugas (donat), Proyek berjalan. Perlu perhatian menjadi tautan ke Tindak lanjut; Kegiatan terbaru tetap di halaman Kegiatan; Grafik pekerjaan digantikan donat status.
- Komponen grafik baru `components/charts/GrafikLembut.tsx` (SVG tanpa pustaka); `DashboardCharts.tsx` dan gaya lamanya dihapus karena tidak dipakai lagi.
- Verifikasi: 407 tes / 68 berkas (termasuk tes kas kumulatif dan batas sumbu), typecheck, lint, `lint:ui`, build lulus; JS awal 246 KB. Demo diperiksa pada 1280 px dan 375 px (terang dan gelap); Tugas dan Buku kas tanpa luber samping pada 375 px. `audit:tampilan` belum dijalankan; halaman lain baru ikut token.

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
