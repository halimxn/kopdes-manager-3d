---
name: dunia-koperasi
description: Wajib dipakai saat menyentuh src/features/dunia-3d atau halaman /dunia-koperasi — Three.js, ruang kantor, gerai, gudang, cold storage, pulau, figur chibi, kamera/zoom/putar, pin, panel monitoring, tautan dunia-web, performa render, atau keluhan dunia lambat/kosong/salah data.
---

# Dunia Koperasi 3D

Kontrak gaya, data, dan peta kode: `docs/DUNIA-KOPERASI.md`. Model dibangun dari kode (diorama isometrik lembut); tanpa aset gambar.

## Peta berkas
- `MonitoringDashboard.tsx`: lokasi, KPI, panel detail per ruang, pelacak, daftar bertab, dok bawah, lonceng, tautan masuk (`tautan.ts`).
- `MonitoringStage.tsx` + `monitoring-scene.ts`: kamera, cahaya, putar 15°–75°, pin HTML, siku pilihan, penanda ruang SVG, raycast, geser/cubit, disposal GPU.
- Ruang dan objek: `monitoring-room.ts`, `bidang.ts` (kantor), `gerai.ts`, `gerai-room.ts`, `warehouse-room.ts`, `pulau.ts`, `suasana.ts`, `karakter.ts`, `tulisan.ts`.
- Data murni: `monitor-data.ts`, `character-plan.ts`; model di `model/world-model.ts` (adapter workspace), `model/district.ts` (unit ke bangunan), `model/schedule.ts` (jadwal figur, pencocokan nama).
- Gaya: `monitoring.css` (kelas `mt-*`, terisolasi; dasar tombol memakai `:where(.mt-root)` agar warna kelas menang). Ikon: `src/components/ui/Ikon3D.tsx`.

## Aturan
- Data asli saja; simulasi berlabel; belum aktif/galat ≠ nol (tampilkan —); tanpa nama atau angka karangan.
- Dunia tidak menulis data; aksi membuka formulir web (`?baru=1&isi.<kolom>=`).
- Render hanya saat perubahan atau selama figur/kamera bergerak; tanpa loop idle. Reduced-motion: langsung di tempat.
- Three.js hanya dimuat di halaman dunia (`MonitoringDashboard` lewat `next/dynamic` di `WorkspacePage`); jangan mengimpor modul dunia dari halaman operasional (cek `npm run ukur:bundel`).
- Pin (≤5) hanya untuk hal yang perlu perhatian. Dunia selalu terang, kartu bergaya Teal (latar lembut, kartu putih, teks biru tua), aksen teal `--mt-blue` (nama lama, nilai teal), pin teal, huruf Figtree (`--font-sans`). Warna judul di panel dikunci ke `--mt-ink` agar tidak mewarisi mode gelap web.
- Panel Ringkasan: KPI + grafik ringkas per lokasi di `grafik-lokasi.tsx` (batang CSS murni, tanpa pustaka grafik).

## Verifikasi
- Pemeriksaan mengikuti `AGENTS.md`; `/dev/dunia-3d?contoh=1` atau `npm run dev:demo` di 360/768/1024/1440 px; klik ruang, figur, zoom, putar.
- Catat paket di CHANGELOG; perbarui DUNIA-KOPERASI/STATUS hanya bila keadaan atau aturan berubah.
