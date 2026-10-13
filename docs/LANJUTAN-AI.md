# Serah terima AI

## Lokasi kerja

- Repo `kopdes-manager-3d`, cabang utama `main`; kerjakan paket di cabang bertopik (`fitur/…`, `perbaikan/…`, `tampilan/…`, `dokumen/…`, `rapikan/…`). Aturan lengkap di [AGENTS](../AGENTS.md) dan [CONTRIBUTING](../CONTRIBUTING.md).
- Versi pixel lama ada di repo terpisah `kopdes-manager-web`; jangan diubah dari sini.
- Baca Git, [DUNIA-KOPERASI](DUNIA-KOPERASI.md), lalu [STATUS](STATUS.md).

## Keadaan aktif (13 Oktober 2026)

- Repo dibuat ulang dengan riwayat bersih; sisa pixel (PixiJS, aset gambar, skrip, pratinjau) dan prototipe 3D lama yang tidak dimuat sudah dibuang. Model data dunia ada di `src/features/dunia-3d/model/` (`world-model.ts`, `district.ts`, `schedule.ts`).
- Dunia: `/dunia-koperasi` memakai `MonitoringDashboard` (lima lokasi: Pulau, Kantor, Gerai, Gudang, Cold storage). Dok bawah Detail/Ringkasan/Daftar/Agenda (pilihan pemilik). Pratinjau `/dev/dunia-3d?contoh=1`.
- Web: sistem gaya baru bahasa dunia 3D di `src/styles/` (`token.css` → `dasar.css` → `komponen.css` → `kerangka.css` → `halaman/*.css`); lantai per ruang lewat `data-ruang` di `AppShell.tsx`; ikon dua nada `components/ui/Ikon3D.tsx`. Laci detail dan Terkait di `features/records/`. Konteks produk desain di `PRODUCT.md`.
- Mode demo `npm run dev:demo` (port bisa diatur `-- -p 3200`); seed `supabase/seed/SEED_DATA_CONTOH.sql` dan `HAPUS_DATA_CONTOH.sql` dijalankan pemilik.
- Paket sebelumnya (cadangan/aturan dan alur fitur) sudah digabung ke `main` lewat PR #1, CI lulus. Paket mobile sudah digabung lewat PR #2 (`7f4dc8b`), CI lulus: nominal kas, rutinitas, tombol/kartu mobile, latar PIN, dan panel dunia yang berulang. Perubahan rutinitas serta Input pilihan yang sudah ada secara lokal dimasukkan ke paket tampilan ini; perubahan lokal lainnya tetap dipertahankan. Tidak ada migrasi baru; migrasi 9 belum diverifikasi pada proyek cloud.
- Graphify opsional menurut AGENTS; aturan turunan menunjuk ke sana. CI menjalankan `lint:ui`; skill memakai rute pratinjau dan ukuran pemeriksaan yang sama.
- Browser lokal: nominal dan susunan mobile diperiksa juga pada 390/430 px; pergantian panel dunia diperiksa pada lima lokasi agar hanya satu isi panel terlihat. Bukti dan batasan pemeriksaan paket di STATUS. Paket mobile sudah di main; deploy belum diverifikasi.
- Verifikasi paket mobile: 372 tes / 59 berkas, typecheck, lint tanpa peringatan, `lint:ui`, dan build produksi lulus. Belum ada pemeriksaan perangkat fisik atau UAT cloud untuk perubahan ini.

Paket aktif `tampilan/pemisah-ribuan`: nominal kas, harga, jumlah stok dengan titik ribuan; nilai formulir/draf tetap mentah. Suite lengkap 376 tes lulus, lalu 49 tes formulir lulus termasuk kasus API tambahan (cakupan akhir 377). Typecheck, lint, dan build produksi lulus. Browser formulir kas 360/768/1024/1440 px diperiksa; paket belum di-push/deploy.

## Lanjutan

1. Penilaian pemilik di mode demo; reset + seed cloud oleh pemilik.
2. Penilaian pemilik atas sistem gaya baru (sudah di `main` sejak 12 Oktober 2026); laporkan bagian yang belum serasi per halaman.
3. Pemeriksaan perangkat fisik dan UAT cloud.
4. Periksa keadaan migrasi 1–8 pada proyek Supabase baru sebelum pemilik menerapkan migrasi 9; jangan memakai reset/install pada database berisi data. Uji cadangan/pemulihan cloud tetap terbuka.

Jangan menambahkan render idle ke dunia. Tidak ada migrasi, deploy, atau push tanpa permintaan pemilik.
