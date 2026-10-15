# Dunia Koperasi — kontrak dan keadaan

Satu kontrak aktif untuk repo **kopdes-manager-3d**. Arahan terakhir pemilik 9 Oktober 2026: penanda siku biru elegan, kamera mengikuti figur pilihan, pintu lorong keluar ke pulau melayang, akses gudang di ruang Stok, kartu/menu mengikuti referensi video gudang, panorama cuaca pada jendela, seluruh model tetap 3D lembut.

Arahan 10 Oktober 2026 (menggantikan gaya kartu sebelumnya): tampilan dunia **persis referensi panel logistik WareTrack** — bilah atas putih, tiga KPI kiri atas, panel detail kanan, pelacak kiri bawah, daftar bertab kanan bawah, kontrol peta, pin biru dan label pil — dengan ikon biru mengilap satu warna dan thumbnail barang berwarna. Dunia selalu terang, aksen biru #2F5BEA. Sejak 16 Oktober 2026 kartu panel memakai palet Teal yang sama dengan web (latar lembut, kartu putih, teks biru tua, aksen dan pin teal, huruf Figtree; [DESAIN-ANTARMUKA](DESAIN-ANTARMUKA.md)), dan panel Ringkasan menampilkan grafik ringkas per lokasi (`grafik-lokasi.tsx`): tugas terbuka, tugas selesai 7 hari, kehadiran, uang keluar 7 hari, omzet gerai, barang per rak, pengiriman aktif, isi rak pendingin; dunia dan web saling bertautan dua arah.

## Gaya dan tata ruang

- Isometrik 3D lembut mengikuti referensi kamar pemilik: dinding biru lembut, lantai papan kayu dua nada, perabot membulat, bayangan lembut. Hindari garis tipis; tanpa papan nama melayang (kode/nama dicat halus di lantai, nama lengkap muncul saat kursor diarahkan).
- Kantor x −25…25: baris atas empat ruang selebar 10 — Karyawan gerai (pintu ke kawasan Gerai di dinding belakang), Kas & anggota, Ruang manajer, Gym & kegiatan; baris bawah tiga ruang selebar ±13,3 — Stok & barang (sudut kiri bawah), Rapat, Ruang kerja (terluas, enam meja); sayap Ngopi & istirahat (TV) terpisah di ujung kanan lorong. Pintu gulung bertumpuk kardus di dinding kiri ruang Stok menuju Gudang. Pintu di ujung kiri lorong keluar ke pulau.
- Pulau melayang berlapis (rumput segar, tanah hangat, batu lavender meruncing): empat bangunan lembut (Kantor, Gerai, Gudang, Cold storage), jalan krem bertepi, alun-alun air mancur, pohon bulat, bunga dan awan statis. Klik bangunan masuk lokasinya; klik tanah pulau kembali ke Kantor. Kartu lokasi dan pemilih menu menyediakan akses keyboard yang sama.
- Gerai: sepuluh unit bersekat kaca bergaya kantor (Kantor koperasi, Simpan pinjam, Klinik desa, Apotek desa, Cold storage, Pergudangan & logistik, Sembako, Gerai potensi desa 1–3) dengan perabot khas. Unit belum Aktif di halaman Gerai digambar transparan bergembok. Pintu Kantor koperasi → kantor, Logistik → gudang, Cold storage → cold storage.
- Gudang 38 × 28 (rak A–F, dok D1–D4, truk) dan Cold storage (rak C1–C3).
- Karakter chibi dari kolom staf (baju, kulit, kacamata, rambut/hijab/topi/peci, seragam per seksi). Pilih figur untuk memusatkan/mengikuti kamera; geser atau reset melepas ikutan. Empat siku biru mengapit pilihan; label pilihan berupa pil biru "nama · status". Pin biru (≤5) hanya untuk hal yang perlu perhatian (tugas lewat tenggat, rapat berlangsung, stok di bawah minimum, risiko terbuka, truk di dok, unit siap buka).
- Bilah atas: logo, pencarian (pintasan "/"), pemilih lokasi berlencana KTR/GRI/GDG/CS/PLU dengan ringkasan, tombol Tambah (pusat aksi web), jam WIB, lonceng (tugas lewat tenggat, risiko dan isu terbuka — tanpa angka bila kosong), menu profil (muat ulang, cuaca/suasana simulasi, Pengaturan, Beranda).
- Kartu: tiga KPI per lokasi (angka, cip status, keterangan); panel kanan (kepala berikon dan eyebrow biru, status, statistik 2×2 berbilah, daftar dengan ikon/thumbnail barang, aksi buat baru dan tautan halaman); pelacak bertahap dengan kartu mini; daftar bertab (Tim/Ruang/Tugas/Proyek di kantor). Kontrol peta (juga di ponsel): perbesar/perkecil 0,6–5× berlipat ±20 % per klik, putar kiri/kanan 15°–75°, tampilan awal. Layar potret membuka dengan tampilan diperbesar (ponsel ±1,5×, tablet ±1,2×).
- Responsif: ≥1280 persis referensi; 1024–1279 diperkecil; 768–1023 panel setinggi layar, pelacak + daftar bertumpuk kiri bawah; <768 bilah ringkas, KPI bergeser, detail di lembar bawah intip/setengah/penuh, geser satu jari dan cubit dua jari.
- Jendela kantor, gerai dan gudang berbingkai tebal dengan panorama langit/perbukitan, matahari/bulan, awan dan hujan. Cuaca pilihan berlabel simulasi; suasana otomatis memakai jam Asia/Jakarta, dapat dipilih Pagi/Siang/Senja/Malam. Panorama, latar dan cahaya berubah tanpa animasi idle.

## Data dan interaksi

Dok bawah hanya menampilkan isi panel yang dipilih (Detail, Ringkasan, Daftar, atau Agenda). Kartu ringkasan tidak tampil bersama isi panel lain; keadaan tab dan tautan catatan tetap dipertahankan.

Domain tambahan (10 Oktober 2026): pelatihan bertanggal hari ini = kegiatan (figur ke Gym, panel Pelatihan hari ini); Ruang kerja menampilkan sprint aktif dan milestone terdekat; Ruang manajer menampilkan Mitra dan interaksi terakhir; panel rak menampilkan riwayat mutasi/opname; tab Mutasi di gudang dan cold storage.

`/dunia-koperasi` membaca workspace lewat pemuat workspace bersama (semua halaman, lingkup semua catatan) termasuk anggota, buku kas, risiko, dan isu. Penempatan figur: rapat berlangsung yang mencantumkan nama → Rapat; jurnal hari ini terhubung ke tugas → Gym; manajer (nama di Pengaturan, selalu tampil) → Ruang manajer; tugas proses → ruang seksinya (layanan anggota/administrasi & keuangan → Kas & anggota; gudang & logistik → Stok & barang; usaha & gerai → Karyawan gerai; lainnya → Ruang kerja); staf dengan kolom Unit pada unit yang Aktif → unit itu di Gerai; tugas belum dikerjakan → Ruang kerja; selain itu → Ngopi & istirahat. Figur berjalan lewat titik bebas perabot, pintu ruang, dan lorong; staf gerai berdiri di belakang meja unitnya.

Tautan web → dunia: `/dunia-koperasi?unit=|orang=|barang=|kirim=|tugas=|rapat=<id>` atau `?lokasi=&pilih=` membuka lokasi dan objek yang tepat (`tautan.ts`); tombol "Lihat di dunia" ada di kartu catatan dan tabel Barang. Dunia → web: semua baris bertautan ke catatan aslinya, panel ruang punya aksi buat baru (`?baru=1`), tombol Tambah membuka pusat aksi yang sama dengan web. Dunia juga memuat proyek (tab Proyek dengan progres tugas) dan daftar periksa Kesiapan (persentase butir wajib per unit gerai).

Panel per ruang: Ruang kerja (tugas, saring terlambat), Ruang manajer (dokumen, risiko), Rapat (rapat hari ini, keputusan), Gym (jurnal), Stok & barang (barang, stok minimum, pengiriman aktif, tombol ke gudang), Karyawan gerai (ringkasan gerai, tombol naik), Kas & anggota (uang masuk/keluar tercatat, anggota — bukan saldo atau laba), Ngopi & istirahat (anggota tanpa tugas/kegiatan). Gerai: status unit, staf, stok di unit, tahap kesiapan rencana → aktif. Dashboard tidak menulis data; angka tidak tersedia menjadi —.

## Performa

- Geometri statis digabung per ruang/objek; kaca satu mesh transparan. Figur digabung per sendi (kaki, badan+kepala, lengan): ±6 panggilan gambar per figur. Tulisan lantai memakai tekstur kanvas kecil.
- Render hanya saat resize, pemilihan, zoom/geser, perubahan data/suasana, atau selama figur/kamera bergerak; tidak ada loop idle. Reduced-motion: figur dan kamera langsung di tempat. Shadow map diperbarui saat lokasi/suasana berganti.
- DPR dibatasi 1,5; shadow map 1024; tanpa pascaproses. Gudang dibangun ulang hanya bila data rak/truk berubah.
- Sumber GPU dibersihkan saat unmount. Gagal WebGL menampilkan pesan/coba lagi; seluruh data tetap di kartu.

## Peta kode

| Berkas | Isi |
|---|---|
| `src/features/dunia-3d/MonitoringDashboard.tsx` | Lokasi, KPI, panel detail, pelacak, daftar bertab, pencarian, keadaan data. |
| `monitor-cards.tsx`, `monitoring.css` | Kartu generik (KPI, panel, pil, stepper, tab, pemilih lokasi, lembar bawah) dan gaya `mt-*` terisolasi. |
| `tautan.ts` | Parameter tautan web → lokasi dan objek terpilih di dunia. |
| `monitor-data.ts`, `character-plan.ts` | Turunan data murni: baris/angka per ruang, dok, rincian pengiriman, pencarian, rencana figur. |
| `MonitoringStage.tsx` | Jembatan React, lazy load WebGL, kontrol peta, label pilihan, fallback. |
| `monitoring-room.ts`, `bidang.ts` | Kantor tujuh ruang, sekat kaca, tempat figur + titik lewat, pintu gudang, tulisan lantai. |
| `gerai.ts`, `gerai-room.ts`, `gerai-cards.tsx` | Data status unit gerai, model kawasan gerai, kartu gerai. |
| `karakter.ts`, `tulisan.ts` | Karakter chibi dari kolom staf, tulisan cat lantai. |
| `src/components/ui/Ikon3D.tsx`, `IkonHalaman.tsx` | Ikon biru kilap (34 jenis) dan thumbnail barang (13 jenis) untuk dunia dan web; katalog `/dev/ikon`. |
| `warehouse-room.ts` | Gudang dan cold storage dari data rak/pengiriman. |
| `pulau.ts`, `suasana.ts` | Peta pulau melayang, panorama jendela dan fase waktu Jakarta. |
| `monitoring-scene.ts` | Kamera, cahaya, lokasi, figur berjalan (`jalur`/`maju`), pin, raycast, geser/zoom, disposal. |
| `model/world-model.ts`, `model/district.ts`, `model/schedule.ts` | Adapter workspace → model dunia, unit ke bangunan, jadwal figur dan pencocokan nama. |
| `src/features/workspace/WorkspacePage.tsx` | Menghubungkan rute dunia dengan monitoring. |

`/dev/dunia-3d` kosong; `?contoh=1` memakai fixture lokal berlabel. Development saja. Fitur operasional tidak diganti.

## Batas

Belum ada sinkronisasi real-time atau kehadiran; perpindahan figur hanya mengikuti catatan saat dimuat. Data terbaru diambil lewat Muat ulang di menu profil. Mode demo lokal: `npm run dev:demo`. Penerimaan visual pemilik, perangkat fisik, dan UAT cloud belum diklaim.
