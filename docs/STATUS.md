# Status

Satu-satunya catatan keadaan untuk semua AI dan manusia. Timpa bagian yang berubah; jangan menumpuk catatan sesi. Riwayat ada di Git dan [CHANGELOG](../CHANGELOG.md).

## Sekarang (2 November 2026)

- Cabang kerja: `tampilan/redesain-total`, pull request ke `main` terbuka dan **belum digabung**. `main` masih berisi desain lama.
- **Tampilan baru mengikuti tiga video acuan**: tema gelap bawaan (Solvik), tema terang dan isi Beranda (Kinlo), gerak dan konstelasi (Crew). Rincian di [TAMPILAN](TAMPILAN.md).
- **Cadangan desain sebelumnya**: cabang `arsip/desain-oktober` di GitHub. Untuk kembali ke desain itu, jangan gabungkan pull request ini; bila sudah telanjur digabung, kembalikan `main` lewat revert.
- Perbaikan bug ikut di pull request ini: Dunia 3D meminta 25 jenis catatan sedangkan batas server 20, jadi datanya kosong. Dari kode, `main` masih terkena bug ini sampai digabung; di produksi belum diperiksa.
- Pemeriksaan terakhir (2 Nov): `npm run cek:penuh` lulus (33 berkas tes / 206 tes, build, JS awal 427–497 KB dari batas 500 KB). `/tasks` tinggal 3 KB dari batas.
- Rutin harian di database (migrasi 11) dan penanda versi data (migrasi 12): lihat Langkah berikut.

## Langkah berikut

1. Pemilik meninjau tampilan di `npm run dev:demo -- -p 3200`, terutama warna teal tema terang dan sapuan ganti tema, lalu memutuskan pull request.
2. Pemilik menjalankan `supabase/upgrade/UPGRADE_KE_TERBARU.sql` sekali di Supabase (memasang migrasi 9–12 yang belum ada), lalu seed contoh bila perlu (`docs/DATABASE.md`).
3. Belum dikerjakan: uji di HP sungguhan dan basis data nyata; halaman Agenda masih tampilan daftar umum (belum kalender pekan khusus); tes perilaku UI baru belum ditulis (hanya tes logika); kepala halaman Anggota di HP masih panjang.

## Keputusan pemilik yang berlaku

Daftar lengkap ada di [PRODUK](PRODUK.md). Yang paling baru:

- 2 Nov 2026: tampilan mengikuti tiga video acuan. Gradasi hanya di latar halaman; kartu, tombol, dan grafik solid. Pil menu atas dan rel ikon. Tema gelap bawaan, semua perangkat mulai dari gelap satu kali. Tema terang memakai teal dari acuan, untuk dilihat dulu di layar (cukup ubah token `--action` dan `--brand`). Konstelasi dari data asli di Beranda, lebih lebar dari panel sebelahnya; di HP setelah tenggat dekat. Pil menu selalu membuka halaman pertama kelompok. Kartu orang ringkas di HP. Latar gelap dibuat lebih hidup. Angka ringkasan sebaris dengan judul. Perbaikan Dunia 3D ikut bersama desain baru. Rilis lewat pull request, digabung setelah pemilik setuju. Cadangan bernama `arsip/desain-oktober`.
- 25 Okt 2026: asisten AI acuan dilewati dulu (tanpa layanan berbayar).
- 23–24 Okt 2026: satu gaya kode untuk seluruh proyek, termasuk Dunia 3D (bahasa Inggris, Tailwind, token warna aplikasi); kode lama dirapikan sebelum fitur baru.
- 23 Okt 2026: semua modal formulir diganti laci/lembar bawah; Beranda mendahulukan rutin; rutin di database dengan hari aktif per rutin; warna kartu per proyek; huruf Urbanist.
- 22 Okt 2026: redesain total; kode dan alamat halaman bahasa Inggris, teks layar bahasa Indonesia sehari-hari; satu aturan untuk semua AI di AGENTS.md; skill proyek hanya `grilling`; CHANGELOG hanya perubahan besar; pemeriksaan dipercepat (`npm run cek`).

## Menjalankan pemeriksaan

```sh
npm run cek          # saat bekerja
npm run cek:penuh    # sebelum digabung ke main
npm run dev:demo -- -p 3200
```
