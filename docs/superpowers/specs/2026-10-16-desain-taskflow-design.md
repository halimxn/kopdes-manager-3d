# Rancangan desain baru "Taskflow" — Kopdes Manager web

## Konteks
Pemilik ingin mengganti total tampilan web (gaya Cerah sekarang) dengan konsep dashboard ala Figma
Taskflow & Free Task Management Dashboard, sekaligus menyusun ulang menu agar rapi. Fitur, data,
rute, dan Dunia 3D tidak berubah fungsinya. Keputusan pemilik (16 Okt 2026):
- Cakupan: gaya + kerangka + susun ulang menu.
- Menu: 6 hub bertab.
- Warna utama: biru Taskflow `#546FFF`.
- Kartu: sampul blok warna + ikon kategori, tanpa foto.

## Bahasa visual
- Latar `#FAFAFA`/`#F5F5F7`, kartu putih sudut 16 px, bayangan sangat tipis, tanpa garis tebal.
- Aksen tunggal `#546FFF` (hover `#3D58F0`, lembut `#EEF1FF`); teks `#141522`, sekunder `#54577A`, redup `#8E92BC`.
- Status tetap token `--ok/--late/--warn`; warna kategori hub hanya untuk sampul kartu & ikon.
- Huruf Plus Jakarta Sans; judul 24/600, subjudul 16/600, isi 14/500, label 12/500.
- Bilah progres tipis biru dengan angka % (sumber `lib/progress.ts`), avatar inisial dari profil (tanpa foto palsu).
- Mode gelap: padanan token di `token.css`. Dunia 3D: ganti `#2F5BEA` → `#546FFF` di `monitoring.css` saja.

## Kerangka
- Desktop ≥1024: sidebar putih 240 px (logo, 6 hub, Pengaturan & Keluar di bawah); kepala halaman
  berisi judul + sapaan, pencarian, lonceng, avatar; konten + panel kanan 320 px (kalender mini, tugas hari ini) pada ≥1440.
- 768–1023: sidebar ikon (rel 72 px), panel kanan masuk ke bawah konten.
- <768: navigasi bawah 5 (Beranda, Pekerjaan, Usaha, Koperasi, Dunia); Catatan via Pekerjaan/menu Lainnya; tombol tambah mengambang membuka `ManagerActionModal`.

## Hub & tab (URL lama tetap; hub = halaman induk dengan tab yang menautkan rute yang ada)
| Hub | Tab (rute lama) |
|---|---|
| Beranda | `/beranda` |
| Pekerjaan | `/tugas`, `/proyek`, `/kalender`, `/kesiapan` |
| Catatan | `/rapat`, `/jurnal`, `/dokumen`, `/risiko`, `/laporan` |
| Usaha | `/gerai`, `/penjualan`, `/pembelian`, `/barang`, `/stok-opname`, `/aset` |
| Koperasi | `/anggota`, `/keuangan`, `/simpanan`, `/tim`, `/absensi` |
| Dunia | `/dunia-koperasi` |
Satu sumber daftar navigasi baru (mis. `src/components/layout/navigasi.ts`) dipakai sidebar, rel, navigasi bawah, dan tab hub — menggantikan daftar ganda di `BottomNav.tsx` dkk.

## Beranda
Kartu sapaan + ringkasan teks hari ini; baris "Tugas berjalan" (kartu sampul, progres, tenggat);
grafik aktivitas mingguan (`GrafikLembut`); kolom kanan: kalender mini + tugas/rapat hari ini.
Semua angka dari data nyata; kosong/galat ditangani.

## Paket kerja (cabang `tampilan/gaya-baru`, satu commit per paket)
1. Token & dasar: tulis ulang `src/styles/token.css`, sesuaikan `dasar.css`, `komponen.css` (kartu, tombol, progres, avatar, tab).
2. Kerangka & navigasi: sumber navigasi tunggal, sidebar/rel/nav bawah, kepala halaman, komponen `TabHub`; `kerangka.css`.
3. Beranda baru (`src/features/dashboard/*`, `halaman/beranda.css`).
4. Hub Pekerjaan (daftar/papan/kalender/Gantt diberi kartu Taskflow).
5. Hub Catatan. 6. Hub Usaha. 7. Hub Koperasi.
8. Dunia: warna aksen & huruf; dokumen (AGENTS.md bagian gaya, `docs/DESAIN-ANTARMUKA.md`, STATUS, LANJUTAN-AI, CHANGELOG, memori gaya).

## Verifikasi tiap paket
`npm test`, `npm run typecheck`, `npm run lint`, `npm run lint:ui`, `npm run build`, `npm run ukur:bundel` (≤300 KB);
`npm run dev:demo -- -p 3200` lalu `npm run audit:tampilan -- <lebar> <tinggi>` pada 360, 768, 1024, 1440, terang & gelap;
cek fokus keyboard, area sentuh 44 px, tautan lama (`/anggota`, dst.) tetap terbuka di hub yang benar.

## Langkah berikut
Setelah rencana disetujui: simpan spec ke `docs/superpowers/specs/2026-10-16-desain-taskflow-design.md`,
commit, lalu buat rencana implementasi rinci (writing-plans) per paket.
