# Catatan perubahan

Hanya perubahan besar (fitur, fase, migrasi). Entri baru di atas. Format dan aturan ada di [AGENTS.md](AGENTS.md).

## Tampilan baru mengikuti tiga video acuan — 2 November 2026

- Alasan: arahan pemilik untuk menulis ulang seluruh desain mengikuti tiga video: acuan desain (Solvik), konsep dashboard (Kinlo), dan konsep animasi (Crew). Desain sebelumnya disimpan di cabang `arsip/desain-oktober`.
- Perubahan:
  - Tema gelap menjadi bawaan: latar warna buram, panel hampir hitam, kartu warna redup per proyek, aksi hijau limau. Warna kuat hanya dua: limau untuk aksi dan progres, koral khusus terlambat (arahan pemilik: hindari tabrakan warna). Tema terang mengikuti Kinlo: latar aqua dan persik, aksi teal. Semua perangkat mulai dari tema gelap satu kali, lalu bebas mengganti. Gradasi hanya di latar halaman.
  - Kerangka baru: pil kelompok menu di atas yang meregang saat pindah, rel ikon halaman di kiri, tombol tema di rel dengan sapuan melingkar.
  - Beranda: sapaan besar dengan angka berikon, peta koperasi dari data asli, kartu progres gelap, grafik tugas selesai per minggu. Peta berupa denah tetap: koperasi di pusat dan delapan petak bidang (tugas, agenda, gerai, barang, kas, anggota, tim, dokumen) dengan jumlah yang perlu ditangani; memilih petak membuka angka dan daftarnya, dan tindakan bisa langsung dari daftar (centang, tunda, opname, beli stok). Lonceng ikut mengenali kesiapan gerai, pengiriman, absensi, dan pelatihan wajib. Di HP urutannya rutin, tenggat, peta.
  - Angka ringkasan sebaris dengan judul halaman; kartu tugas dan catatan baru; kartu orang di Anggota, Kontak, dan Tim (baris ringkas di HP); grafik uang masuk dan keluar per bulan di Kas.
  - Panel kerja ditulis ulang: panel melayang dengan halaman yang bergeser, formulir dengan judul dan nominal besar serta baris berkelompok, detail tugas dua kolom, dialog konfirmasi baru. Susunan halaman catatan disamakan: tab di kiri, Tambah di kanan.
  - Halaman lain ditulis ulang, bukan hanya diganti warna: daftar tugas menjadi satu tabel berkolom dengan kelompok yang bisa dilipat; kalender dengan panel hari; linimasa; menu tambah, palet cari, dan lonceng; Pengaturan, Bantuan, dan PIN dengan papan angka.
  - Penempatan kartu dirancang ulang (arahan pemilik: rapi dan bersih): tinggi kartu sama dalam satu baris, kartu netral dengan titik warna, satu bilah tab di Proyek, pencarian dan saringan sebaris. Beranda mendahulukan pekerjaan: rutin dan peta, tenggat, hari ini, baru angka tinjauan. Label rel tidak lagi tertutup isi halaman.
  - Gerak: isi halaman muncul berurutan dari buram, garis dan batang grafik tergambar, angka menghitung naik.
  - Perbaikan bug lama: Dunia 3D kosong datanya karena meminta 25 jenis catatan, sedangkan batas server 20.
- Verifikasi: `npm run cek:penuh` lulus (34 berkas / 210 tes, build, JS awal 427–484 KB dari batas 500 KB). Lewat mode demo dan peramban tanpa antarmuka: 375, 768, 1024, 1440 px, tema gelap dan terang, tanpa luapan samping; pil menu meregang, tema tersimpan, bidang peta dipilih, saringan, centang dan Urungkan dari daftar peta, Esc, baris membuka laci, tautan `?task=` membuka laci, gerak berkurang tanpa galat. Kontras teks keterangan 4,62:1 di bagian latar paling terang. Susunan kartu putaran terakhir diperiksa lewat tangkapan layar (Beranda, Proyek, Dokumen, Tim, papan tugas) di 375, 768, dan 1440 px: tanpa luapan samping dan tanpa kartu yang tidak rata dalam satu baris; tema terang hanya di 1440 px. Label rel dilihat di atas isi halaman saat kursor di atas ikon. Satu tinjauan akhir independen dijalankan sebelum penulisan ulang terakhir; hasil sesudahnya belum ditinjau ulang oleh peninjau itu.
- Belum: sapuan tema baru terlihat dari satu bingkai tangkapan, perlu dilihat pemilik di peramban. Belum diuji di HP sungguhan dan belum di basis data nyata (Supabase), hanya mode demo. Tes perilaku UI baru belum ditulis, hanya tes logika. JS awal `/tasks` tinggal 5 KB dari batas. Beranda kini memuat 21 jenis catatan agar peta lengkap; waktu muatnya belum diukur di koneksi HP. Di HP, kepala halaman Anggota masih panjang (kartu mulai sekitar 640 px). Panel Dunia 3D baru mengikuti latar dan token, strukturnya belum ditulis ulang.

## Redesain total ala TaskTrack dan rutin harian di database — 23 Oktober 2026

- Alasan: arahan pemilik untuk merombak seluruh tampilan tanpa terikat desain lama, dengan fitur dipertahankan, acuan TaskTrack (pastel, tanpa gradasi), dan tatanan proyek serta aturan AI yang seragam.
- Perubahan:
  - Seluruh tampilan dibangun ulang (Tailwind v4, Radix, Motion; huruf Urbanist; aksi biru tua; 5 warna sorotan; tema terang/gelap). Kartu tugas dan proyek berwarna per proyek, progres bersegmen, avatar bertumpuk.
  - Kerangka baru: sidebar laptop, rel ikon tablet, navigasi bawah HP dengan kapsul yang meluncur dan tombol tambah di tengah; palet Ctrl K; lonceng pengingat; menu tambah cepat.
  - Semua modal formulir diganti laci kanan / lembar bawah; formulir dibangun otomatis dari katalog dengan pesan galat bahasa Indonesia dan draf yang tidak hilang.
  - Beranda: rutin hari ini paling atas, tenggat dekat (kartu bisa digeser), ringkasan tugas, linimasa hari ini, perlu perhatian, proyek berjalan, salin laporan harian.
  - Tugas: daftar (geser di HP: kanan selesai, kiri tunda), papan seret-lepas (mouse dan sentuh-tahan), kalender bulan/pekan, linimasa Gantt dengan tinjauan sebelum simpan, pilih banyak, tampilan tersimpan, periode kerja, pintasan J/K/X; setiap perubahan bisa diurungkan.
  - Proyek: kartu proyek, halaman detail (tugas, milestone, anggaran vs kas, catatan proyek, catatan terkait).
  - Rutin harian tersimpan di database dengan hari aktif per rutin (migrasi 11), sinkron HP ↔ laptop.
  - Kode dan alamat halaman berbahasa Inggris; alamat dan parameter lama tetap dialihkan.
  - Dokumen diringkas menjadi README, AGENTS, STATUS, PRODUK, KODE, TAMPILAN, DATABASE, DUNIA-3D; skill proyek hanya `grilling`; pemeriksaan cepat `npm run cek`.
- Verifikasi: typecheck dan lint bersih; 30 berkas tes / 206 tes lulus; `next build` lulus; JS awal halaman utama 402–477 KB (batas baru 500 KB); mode demo dicoba di peramban (centang rutin, seret kartu papan).
- Belum: tinjauan pemilik di perangkat nyata; migrasi 11 belum dijalankan di Supabase; nama dalam kode Dunia 3D dan database demo masih bahasa Indonesia; tes perilaku UI baru belum ada.

## Sebelum redesain total — 11 sampai 22 Oktober 2026

- Rilis awal repo 3D (11 Okt): ruang kerja manajer dan Dunia Koperasi 3D yang membaca data yang sama.
- Fitur yang dibangun dan dipertahankan: tugas (daftar, papan, kalender, Gantt, harian), proyek, milestone, periode kerja, rapat dengan ICS, kegiatan, dokumen, risiko dan kendala, mitra, tim dan pelatihan, gerai dan kesiapan, laporan kerja, buku kas, anggota, barang, stok opname, pengiriman dan mutasi stok (migrasi 8), aset, absensi, pembelian, penjualan harian, simpanan anggota (migrasi 10), cadangan dan pemulihan data.
- Beberapa gaya tampilan dicoba lalu ditinggalkan (Lantai Dunia, Lavender Lekuk, Workbench, Indigo Studio, ClickUp/Monday). Rinciannya ada di riwayat Git.
