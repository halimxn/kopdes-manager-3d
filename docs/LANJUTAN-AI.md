# Serah terima AI

## Lokasi kerja

- Repo `kopdes-manager-3d`, cabang utama `main`; kerjakan paket di cabang bertopik (`fitur/…`, `perbaikan/…`, `tampilan/…`, `dokumen/…`, `rapikan/…`). Aturan lengkap di [AGENTS](../AGENTS.md) dan [CONTRIBUTING](../CONTRIBUTING.md).
- Versi pixel lama ada di repo terpisah `kopdes-manager-web`; jangan diubah dari sini.
- Baca Git, [DUNIA-KOPERASI](DUNIA-KOPERASI.md), lalu [STATUS](STATUS.md).

## Keadaan aktif (20 Oktober 2026)

- Repo dibuat ulang dengan riwayat bersih; sisa pixel (PixiJS, aset gambar, skrip, pratinjau) dan prototipe 3D lama yang tidak dimuat sudah dibuang. Model data dunia ada di `src/features/dunia-3d/model/` (`world-model.ts`, `district.ts`, `schedule.ts`).
- Dunia: `/dunia-koperasi` memakai `MonitoringDashboard` (lima lokasi: Pulau, Kantor, Gerai, Gudang, Cold storage). Dok bawah Detail/Ringkasan/Daftar/Agenda (pilihan pemilik). Pratinjau `/dev/dunia-3d?contoh=1`.
- Web: gaya Lavender Lekuk (`DESIGN.md`) di `src/styles/` (`token.css` → `dasar.css` → `komponen.css` → `kerangka.css` → `halaman/*.css`); kerangka `components/layout/AppShell.tsx` + sumber menu `navigasi.ts` (`HUBS`, `MENU_KERJA`, `RUANG_LAIN`) + `TabHub.tsx`; dok ponsel `components/ui/BottomNav.tsx`; Beranda (`features/dashboard/Dashboard.tsx`, fungsi murni `beranda-bantu.ts` untuk tambah cepat/laporan/hitung mundur, `KartuPekerjaan.tsx`, `KasBanding.tsx`, `ModulUsahaHarian.tsx`, `halaman/beranda.css`); kartu bertakik `.bertakik`/`.takik-aksi` di `komponen.css`; grafik lembut `components/charts/GrafikLembut.tsx` + `halaman/grafik.css`; ikon dua nada `components/ui/Ikon3D.tsx` (token `--ikon-*`). Laci detail dan Terkait di `features/records/`. Konteks produk di `PRODUCT.md`.
- Mode demo `npm run dev:demo` (port bisa diatur `-- -p 3200`); seed `supabase/seed/SEED_DATA_CONTOH.sql` dan `HAPUS_DATA_CONTOH.sql` dijalankan pemilik.
- Paket sebelumnya (cadangan/aturan dan alur fitur) sudah digabung ke `main` lewat PR #1, CI lulus. Paket mobile sudah digabung lewat PR #2 (`7f4dc8b`), CI lulus: nominal kas, rutinitas, tombol/kartu mobile, latar PIN, dan panel dunia yang berulang. Perubahan rutinitas serta Input pilihan yang sudah ada secara lokal dimasukkan ke paket tampilan ini; perubahan lokal lainnya tetap dipertahankan. Tidak ada migrasi baru; migrasi 9 belum diverifikasi pada proyek cloud.
- Graphify opsional menurut AGENTS; aturan turunan menunjuk ke sana. CI menjalankan `lint:ui`; skill memakai rute pratinjau dan ukuran pemeriksaan yang sama.
- Browser lokal: nominal dan susunan mobile diperiksa juga pada 390/430 px; pergantian panel dunia diperiksa pada lima lokasi agar hanya satu isi panel terlihat. Bukti dan batasan pemeriksaan paket di STATUS. Paket mobile sudah di main; deploy belum diverifikasi.
- Verifikasi paket mobile: 372 tes / 59 berkas, typecheck, lint tanpa peringatan, `lint:ui`, dan build produksi lulus. Belum ada pemeriksaan perangkat fisik atau UAT cloud untuk perubahan ini.

PR halimxn/kopdes-manager-3d#3 (cabang `tampilan/pemisah-ribuan`): pemisah ribuan, Senja + Beranda grid modul, lalu fitur pengingat (`features/notifikasi`), preset laporan bulanan, anggaran proyek (`projects/ProjectBudget.tsx`), dan migrasi 10 administrasi usaha (`features/administrasi`, entitas `assets/attendance/purchase-orders/sales/savings`). 405 tes, typecheck, lint, `lint:ui`, build lulus; JS awal 246 KB.

Cabang aktif `tampilan/gaya-baru` ditumpuk di atas PR #3: setelah Kebun, Teal, Senja, Cerah, dan Taskflow, pemilik memilih gaya Lekuk; warna Merah Putih (19 Oktober) diganti Lavender (20 Oktober, `docs/desain/pilih-warna-beranda.html`). Prototipe di `docs/desain/` (acuan terakhir `prototipe-tugas-notion.html`, nav ponsel `pilih-nav-bawah.html` varian B). Paket 1 (token, kerangka, Beranda) sudah di-commit di cabang ini. Pemilik memeriksa di browser sebelum PR. Setelah PR #3 masuk, rebase cabang ini ke `main`.

## Lanjutan

1. Penilaian pemilik di mode demo; reset + seed cloud oleh pemilik.
2. Delapan fitur baru (15 Oktober 2026) sudah di kode. Modul Beranda usaha harian dan grafik panel Dunia (`dunia-3d/grafik-lokasi.tsx`) juga selesai. Sisa: pemilik menjalankan migrasi 10 setelah migrasi 9 (lihat MIGRASI-SQL); audit tampilan 360/768/1024/1440 untuk halaman baru (tanya pemilik sebelum menjalankan audit); push/PR atas permintaan pemilik.
3. Paket Lavender Lekuk berikutnya, di cabang yang sama: (2) Tugas: pemilih penanggung jawab dari Tim sudah ada (`records/PilihPenanggung.tsx`, avatar `lib/orang.ts`); sisa: tata ulang halaman Tugas ke gaya Lekuk; (3) Agenda + "Catat hasil" dengan kolom jenis kegiatan (rapat, zoom, kunjungan pemasok/sales) dan visualisasi di Beranda; (4) palet Ctrl+K, geser kartu, interaksi lain; lalu warna panel Dunia 3D (masih biru #546FFF) sebagai paket terpisah. Selektor tab di `scripts/audit-tampilan.mjs` (`.workspace-page > .tabs`) masih tidak pernah cocok sehingga keadaan `tab-*` selalu "aksi gagal".
4. Pemeriksaan perangkat fisik dan UAT cloud.
5. Periksa keadaan migrasi 1–8 pada proyek Supabase baru sebelum pemilik menerapkan migrasi 9 dan 10; jangan memakai reset/install pada database berisi data. Uji cadangan/pemulihan cloud tetap terbuka.

Jangan menambahkan render idle ke dunia. Tidak ada migrasi, deploy, atau push tanpa permintaan pemilik.
