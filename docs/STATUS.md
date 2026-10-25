# Status

Satu-satunya catatan keadaan untuk semua AI dan manusia. Timpa bagian yang berubah; jangan menumpuk catatan sesi. Riwayat ada di Git dan [CHANGELOG](../CHANGELOG.md).

## Sekarang (24 Oktober 2026)

- Cabang kerja: `tampilan/redesain-total` (belum digabung ke `main`, belum di-push).
- **Redesain total selesai dibangun di aplikasi**: semua halaman memakai tampilan baru (acuan TaskTrack, pastel tanpa gradasi, Urbanist, aksi biru tua, 5 warna sorotan, terang/gelap). Kode dan alamat halaman berbahasa Inggris; alamat lama dialihkan.
- Beranda: rutin hari ini → tenggat dekat → ringkasan tugas → linimasa hari ini + perlu perhatian + proyek berjalan.
- Rutin harian pindah ke database (**migrasi 11**, `supabase/migrations/20261023000011_rutin_harian.sql`). Sebelum dijalankan, Beranda menampilkan pesan migrasi; rutin lama di peramban bisa dipindahkan dengan satu tombol setelah migrasi aktif.
- **Satu gaya kode untuk seluruh proyek**, termasuk Dunia 3D: nama kode, berkas, tes, dan skrip berbahasa Inggris; Dunia 3D memakai kelas Tailwind dan token warna aplikasi (ikut tema gelap), `monitoring.css` dihapus. Nilai string yang tersimpan atau tampil di alamat (`lokasi=`, `pilih=`, kunci ruang) sengaja tetap bahasa Indonesia.
- Audit kode selesai dan semua temuan diperbaiki: tombol muat ulang selalu ke server, aturan lewat tenggat dan jam WIB masing-masing satu fungsi, sisa kode dunia lama dan dependensi yang tidak dipakai dihapus.
- Pemeriksaan terakhir (24 Okt): `npm run cek:penuh` lulus (31 berkas tes / 198 tes, build, JS awal halaman utama 409–496 KB dari batas 500 KB). Tes ruang Dunia 3D bisa melewati batas 5 detik bila mesin sedang sibuk; lulus saat diulang.
- Mode demo diperiksa di peramban: Beranda, Tugas, dan Dunia 3D (lebar 375, 768/900, 1200, 1440, tema gelap).
- **Poles tampilan menyeluruh** (24 Okt): kolom isian terlihat jelas dan menyala saat diketik; palet Ctrl K dan pencarian Dunia 3D menandai jenis setiap hasil (Tugas, Proyek, Agenda, Menu, Perintah) dan menyorot kata yang dicari; semua menu dan popover memakai satu komponen (`components/ui/menu.tsx`) dengan gerak pegas; laci di HP bisa ditarik turun untuk menutup; sidebar dan rel tablet muat tanpa terpotong; toast tanpa `!important`; gerak berkurang dihormati. Kolom di laci tugas dan formulir (tanggal, jam, penanggung jawab, referensi) berikon dan rapi; tombol aksi panel Dunia 3D selebar panel. Atur rutin harian berupa daftar ringkas (jam, nama, ringkasan hari: Setiap hari/Hari tertentu); laporan harian tersalin dengan judul tebal, ringkasan angka, dan daftar bernomor; tema hanya diatur di Pengaturan. Data halaman disimpan di perangkat (IndexedDB) dan hanya diminta ulang bila penanda versi server (`/api/version`) berubah; dihapus saat aplikasi dikunci. Rincian di [TAMPILAN](TAMPILAN.md).

- **Tampilan baru mengikuti acuan video (25 Okt)**: latar batu hangat, aksen sage, tombol hitam kebiruan, rel navigasi kapsul, cari berbentuk pil, Beranda bento, halaman PIN bergaya kartu verifikasi kode. Asisten AI acuan sengaja tidak dibuat (layanan berbayar).

## Langkah berikut

1. Pemilik meninjau tampilan di `npm run dev:demo -- -p 3200` (HP, tablet, laptop) dan memberi koreksi.
2. Pemilik menjalankan `supabase/upgrade/UPGRADE_KE_TERBARU.sql` sekali di Supabase (memasang migrasi 9–12 yang belum ada), lalu seed contoh bila perlu (`docs/DATABASE.md`). Migrasi 12 hanya indeks untuk pemeriksa versi data; tanpa itu aplikasi tetap jalan.
3. Setelah disetujui: `npm run cek:penuh`, push cabang, buka pull request ke `main`.
4. Belum dikerjakan: halaman Agenda masih tampilan daftar umum (belum kalender pekan khusus); tes perilaku UI baru belum ditulis (hanya tes logika).

## Keputusan pemilik yang berlaku

Daftar lengkap ada di [PRODUK](PRODUK.md). Yang paling baru:

- 25 Okt 2026: tampilan mengikuti acuan video dashboard (warna acuan: batu hangat, sage, tombol hitam kebiruan); perombakan kerangka + Beranda + halaman PIN; asisten AI dilewati dulu (tanpa layanan berbayar).
- 23–24 Okt 2026: satu gaya kode untuk seluruh proyek, termasuk Dunia 3D (bahasa Inggris, Tailwind, token warna aplikasi); kode lama dirapikan sebelum fitur baru.
- 23 Okt 2026: acuan tampilan TaskTrack; warna kartu per proyek; hiasan lengkung halus; navigasi bawah HP putih dengan kapsul pastel; semua modal formulir diganti laci/lembar bawah; Beranda mendahulukan rutin; rutin di database dengan hari aktif per rutin; aksi biru tua; huruf Urbanist; langsung dibangun di aplikasi (prototipe HTML dihapus).
- 23 Okt 2026: tanpa gradasi di mana pun.
- 22 Okt 2026: redesain total; kode dan alamat halaman bahasa Inggris, teks layar bahasa Indonesia sehari-hari; satu aturan untuk semua AI di AGENTS.md; skill proyek hanya `grilling`; CHANGELOG hanya perubahan besar; pemeriksaan dipercepat (`npm run cek`).

## Menjalankan pemeriksaan

```sh
npm run cek          # saat bekerja
npm run cek:penuh    # sebelum digabung ke main
npm run dev:demo -- -p 3200
```
