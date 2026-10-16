# Status produk

Keadaan terkini saja; timpa bagian yang berubah. Log per paket di [CHANGELOG](../CHANGELOG.md).

## Halaman operasional

Nominal kas, harga, dan jumlah stok memakai titik pemisah ribuan saat input; formulir/draf menyimpan angka mentah. Tes mencakup validasi, kursor, Backspace, read-only, dan penyimpanan nominal ke API. Browser formulir kas diperiksa pada 360/768/1024/1440 px; perangkat fisik dan cloud belum diuji.

Proyek fleksibel; tugas daftar/papan/kalender/Gantt/harian; milestone, subtugas, dependensi, pengulangan; catatan terformat; kegiatan; rapat dengan tautan pengguna dan unduhan ICS; dokumen; risiko dan isu; tim dan pelatihan; mitra; laporan snapshot dengan preset 7 hari/bulan ini/bulan lalu dan cetak/simpan PDF; profil/PIN/cadangan; anggota, buku kas, barang, stok opname, pengiriman, mutasi stok. Riwayat proyek di `/proyek?tab=riwayat`; anggaran proyek dibandingkan dengan uang keluar buku kas yang ditautkan ke proyek. Lonceng pengingat di bilah atas (tenggat, rapat 7 hari, dokumen, isu, risiko, stok minimum, selisih opname, tenggat besok).

Migrasi 10 (belum dijalankan di cloud): simpanan anggota, penjualan harian gerai, pembelian ke pemasok, inventaris aset, jadwal & absensi; masing-masing halaman dengan ringkasan angka. Sebelum migrasi terpasang halaman menampilkan "belum aktif". Diperiksa di mode demo pada lebar panel ±630 px (simpan penjualan berhasil); ukuran 360/768/1024/1440 belum diaudit untuk halaman ini.

Belum tersedia: editor blok bebas, kolaborasi real-time, PWA/offline, unggah berkas, baseline/jalur kritis, penjadwalan otomatis dependensi, POS, akuntansi lengkap, pinjaman anggota, penyusutan aset. Kas hanya uang masuk/keluar tercatat; opname tidak mengubah stok otomatis.

Tampilan: gaya Cerah di `src/styles/` (latar abu-lavender, kartu putih tanpa garis, Plus Jakarta Sans, aksen jenuh hanya grafik/status, menu samping ringkas, satu tombol tambah, dok ponsel mengambang), Beranda grid 12 kolom dengan grafik lembut (fokus hari ini, agenda, kas bulan ini vs bulan lalu, penjualan, kehadiran, status tugas, proyek; diperiksa di demo 1280 dan 375 px, terang dan gelap, 16 Oktober); halaman lain baru ikut token, halaman daftar dengan kolom cari + Filter terlipat dan tab di bawah judul (16 Oktober, diperiksa 1280 dan 375 px), laci detail Detail/Terkait/Riwayat dengan saran langkah berikut, judul halaman seragam berikon, warna status token `--ok/--late/--warn` (alias `--pastel-*`), mode gelap. Semua halaman menu diperiksa di 375/768/1024/1440 px tanpa luber samping (pemeriksaan ponsel/tablet terakhir 12 Oktober lewat emulasi perangkat: aksi kartu satu baris, pilihan tampilan bergeser, angka ringkasan berupa baris); tabel lebar berubah menjadi kartu di area sempit (Buku koperasi di layar < 1280 px, Tugas/Kegiatan bila area halaman < 900 px).

## Dunia Koperasi 3D

Kontrak aktif: [DUNIA-KOPERASI](DUNIA-KOPERASI.md). Lima lokasi dalam satu kanvas — Pulau melayang, Kantor (delapan ruang), Gerai (sepuluh unit; unit belum aktif transparan bergembok), Gudang, Cold storage. Tampilan panel logistik (bilah atas, tiga KPI, panel kanan, pelacak, daftar bertab, pin perhatian, label pil, putar kamera, lembar bawah ponsel). Tautan dua arah dengan web, aksi buat baru dari panel ruang, lonceng tugas/risiko/isu. Kartu panel bergaya Senja; panel Ringkasan berisi KPI dan grafik ringkas per lokasi (tugas, kehadiran, kas keluar 7 hari, omzet gerai, rak, pengiriman, rak pendingin).

Figur chibi (maks. 12, rupa dari kolom staf) ditempatkan dari rapat, kegiatan, pelatihan, status tugas, seksi, dan unit gerai; manajer selalu tampil. Visualisasi, bukan kehadiran. Render hanya saat perubahan atau selama figur/kamera bergerak. Panorama jendela mengikuti cuaca simulasi dan fase WIB.

## Mode demo dan data contoh

`npm run dev:demo`: semua halaman dan dunia memakai 191 catatan contoh dari memori, tanpa Supabase/PIN; tidak aktif di Vercel. `supabase/seed/SEED_DATA_CONTOH.sql` dan `HAPUS_DATA_CONTOH.sql` siap dijalankan pemilik setelah reset; belum dijalankan di cloud.

## Cloud

Target Supabase baru milik pemilik. Migrasi 8 (pengiriman/mutasi stok) sudah dijalankan pemilik. Migrasi 9 (status laporan dan pemulihan cadangan) dan 10 (administrasi usaha) siap di repo, belum dijalankan di cloud; lihat [MIGRASI-SQL](MIGRASI-SQL.md). PIN/simpan setelah reset, indeks paginasi migrasi 6, relasi dokumen migrasi 7, dan smoke test produksi belum dikonfirmasi. AI tidak menjalankan SQL cloud; pemilik menjalankan migrasi setelah tujuan dan dampaknya dikonfirmasi.

## Pemeriksaan terakhir — 13 Oktober 2026

- Paket mobile memperbaiki nominal kas, rutinitas dan dialognya, tombol kartu/formulir, latar PIN, serta ringkasan dunia yang tetap terlihat karena aturan `hidden` ditimpa grid KPI.
- Browser demo: Beranda/PIN/buku kas/tugas/proyek/rapat/barang/dokumen/mitra diperiksa pada 360/390/430/768/1024/1440; rutinitas dan dialog tugas diperiksa pada ponsel, PIN terang/gelap. Risiko memakai gulir horizontal di dalam matriks. Nominal kas utuh dan tidak keluar dari kartu; susunan tombol rapat, kontak, dan buku diperiksa. Bukan pemeriksaan perangkat fisik.
- Dunia: empat panel diperiksa pada enam ukuran di Kantor dan 360/1440 di Gerai/Gudang/Cold storage/Pulau; 56 pergantian panel menunjukkan tepat satu isi yang terlihat, tanpa luber halaman. Konsol browser tanpa galat/peringatan.
- Audit alur fitur memperbaiki impor CSV, kelengkapan cadangan, arsip laporan lama, waktu riwayat WIB, pengaturan ganda, dan demo (pengulangan tugas serta Origin port lokal). Tidak ada migrasi baru.
- Tes paket mobile: seluruh 372 kasus / 59 berkas lulus (`--maxWorkers=2 --testTimeout=20000`), termasuk rutinitas berikutnya menurut WIB dan centang yang tersimpan. Typecheck, lint tanpa peringatan, `lint:ui`, dan build produksi lulus.
- Browser demo: halaman menu pada 360/768/1024/1440 px tanpa luber halaman; simpan tugas berhasil. Dunia membuka Kantor/Gerai/Gudang/Cold storage/Pulau dan panel ringkasan; Gudang diperiksa pada empat ukuran. Konsol tanpa galat/peringatan. Ini pemeriksaan alur utama dan tampilan, bukan jaminan seluruh kombinasi data/tindakan.
- Regresi cadangan memeriksa ekspor–pulihkan laporan melalui API dan PGlite, kompatibilitas cadangan lama, status yang tertinggal, validasi/sesi/Origin, dan rollback yang menjaga data lama. CI menjalankan `lint:ui`.
- Pemeriksaan tambahan viewport 360/768/1024/1440 px: Beranda, Tugas Harian, Barang dan formulir Barang. Kontrol bersama, navigasi hari, serta tombol dunia pada tabel/kartu terukur 44 px; isi kartu Harian muat di 360 px dan deretan hari bergulir di dalam kontainer. Tanpa luber halaman; konsol browser tanpa galat/peringatan. Tema gelap diperiksa pada halaman tersebut; Beranda juga diperiksa terang. Bukan pemeriksaan perangkat fisik.
- Tangkapan emulasi perangkat (CDP) 1440×900: Beranda, Hari ini, Tugas, Linimasa, Proyek, Kegiatan, Rapat, Dokumen, Risiko, Gerai, Mitra, Tim, Pengiriman, Kesiapan, Buku kas, Stok opname, Laporan, Panduan, Pengaturan, layar PIN, laci tugas, editor, 404. 375×812: Beranda, Hari ini, Tugas, Gerai, Mitra, Pengiriman, Stok opname, Barang, Laporan, Panduan, Pengaturan. Gelap: Beranda, Proyek, Linimasa, Mitra. Tanpa luber samping; tombol < 36 px di ponsel diperbesar pada layar sentuh.
- Tablet 768×1024: Beranda, Tugas, Proyek, Buku kas, Gerai, Pengaturan; 1024×768: Beranda, Tugas, Linimasa, Barang. Kartu rapat Beranda tidak lagi memanjang dan angka uang di Catatan koperasi tidak luber.
- Belum: perangkat fisik, UAT data cloud.

## Git

Repo `kopdes-manager-3d`, cabang utama `main`, riwayat dimulai bersih 11 Oktober 2026. Dua paket audit digabung lewat PR #1 (`c3b01a9`); paket mobile dan panel dunia lewat PR #2 (`7f4dc8b`), CI lulus. Paket input angka aktif di `tampilan/pemisah-ribuan`, belum di-push. Perubahan lokal pengguna tetap dipertahankan. Cabang fitur bertopik (lihat [CONTRIBUTING](../CONTRIBUTING.md)); commit tanpa atribusi AI; push dan deploy hanya bila pemilik meminta.
