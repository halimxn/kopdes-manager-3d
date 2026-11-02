# Kode dan aliran data

## Teknologi

| Bagian | Pakai |
|---|---|
| Kerangka | Next.js App Router, React, TypeScript strict |
| Tampilan | Tailwind v4 (token di `src/app/globals.css`), Radix (`radix-ui`) untuk laci/menu/dialog, Motion (`motion/react`) untuk animasi, `lucide-react` untuk ikon, `sonner` untuk toast, `cmdk` untuk palet Ctrl K. Grafik digambar sendiri dengan SVG (`components/ui/charts.tsx`), konstelasi dengan kanvas 2D |
| Data | Supabase (satu tabel `hub_records` berisi JSON), Zod untuk validasi |
| Dunia 3D | Three.js, model dibangun dari kode |
| Tes | Vitest, PGlite untuk tes database |

## Satu gaya kode

Semua kode baru mengikuti aturan ini; `npm run cek` memeriksanya.

- **Format:** Prettier (`.prettierrc.json`: kutip tunggal, koma akhir, lebar 100). `npm run format` merapikan, `npm run format:check` memeriksa (juga di CI).
- **Nama:** kode, berkas, dan folder dalam bahasa Inggris; berkas `kebab-case`. Teks di layar, komentar, dan pesan commit dalam bahasa Indonesia.
- **Komponen:** `export function NamaKomponen()` (bukan `const X = () =>`), satu komponen utama per berkas, props diketik langsung di parameter. `export default` hanya untuk berkas rute di `src/app`.
- **Gaya tampilan:** kelas Tailwind dengan token dari `globals.css`; tidak ada berkas CSS per komponen. Gabung kelas lewat `cn()`.
- **State:** state lokal React; data lewat `useWorkspace`; pilihan pengguna lewat `usePreference`; nilai dari luar React lewat `useSyncExternalStore`, bukan `setState` di dalam efek.
- **Interaksi:** Radix untuk laci, menu, dan dialog; Motion untuk animasi; `sonner` untuk toast dengan Urungkan.
- **Nilai string tetap bahasa Indonesia:** nilai yang tersimpan atau tampil di alamat (`lokasi=`, `pilih=`, kunci ruang Dunia 3D seperti `kantor`, `gerai`, `kerja`) tidak diterjemahkan agar tautan lama tetap jalan.

## Struktur folder

```
src/
  app/                    rute tipis (bahasa Inggris)
    (app)/home|tasks|projects|projects/[id]|agenda|notes|documents|contacts|
          store|goods|assets|members|cash|team|world|settings|help
    api/[entity]          baca/simpan/hapus catatan
    api/auth/pin          masuk, atur, ganti PIN, keluar
    api/backup            unduh dan pulihkan cadangan
    api/capabilities      modul mana yang sudah dimigrasi
    api/reports           laporan kerja
    pin/                  halaman masuk
  components/
    ui/                   tombol, isian, laci (sheet), konfirmasi, tab, pil, avatar, progres, ubin angka
    layout/               kerangka, pil menu atas, rel ikon, dok HP, palet Ctrl K, menu tambah cepat, nav.ts
  features/
    records/              katalog, skema Zod, layanan server, formulir otomatis, daftar umum, kartu, laci detail
    workspace/            pemuat data per halaman (use-workspace, scope)
    home/                 Beranda, rutin harian, konstelasi kerja, linimasa hari, tambah cepat, laporan harian
    tasks/                halaman tugas, papan, daftar, kalender, linimasa, laci tugas, aksi tugas
    projects/             daftar dan detail proyek
    notes/                laporan kerja
    agenda/               jenis agenda, tautan rapat, ICS
    notifications/        lonceng pengingat dan aturan "perlu perhatian"
    settings/             pengaturan dan bantuan
    world/                Dunia Koperasi 3D
    demo/                 data contoh dan SQL seed
  lib/                    tanggal, progres, status tugas, uang/CSV, tema, klien API, server (auth, db, demo)
supabase/                 migrasi, instalasi bersih, reset, seed
scripts/                  pembuat SQL, mode demo, ukur bundel
tests/                    unit, database, security
```

## Menu satu sumber

`src/components/layout/nav.ts` berisi semua halaman, tab per halaman, grup menu, dok HP, dan `recordLink()` (alamat catatan untuk notifikasi, pencarian, dan dunia). Pil menu atas, rel ikon, dok, menu lengkap, dan palet Ctrl K membaca berkas ini.

Alamat lama berbahasa Indonesia (`/tugas`, `/keuangan`, `/dunia-koperasi`, …) dialihkan di `next.config.ts`. Parameter lama (`?baru=1`, `isi.<kolom>`, `?bagian=`, `?arah=`, `?barang=`, `?penanggung=`, `?ubah=1`) tetap dibaca oleh `features/records/use-record-params.ts`.

## Aliran data

1. Halaman memanggil `useWorkspace(page)`; daftar jenis catatan per halaman ada di `features/workspace/scope.ts`.
2. Klien (`lib/client.ts`) meminta halaman pertama semua jenis catatan sekaligus lewat `GET /api/batch?r=<entity>?limit=50&scope=…` (satu cek sesi, satu perjalanan jaringan); halaman berikutnya dan muat-lebih memakai `GET /api/<entity>`. Hasil disimpan per alamat 60 detik dan dibuang setiap ada perubahan. Menu (sidebar, dok HP, menu lengkap) memanggil `prefetchWorkspace` saat disentuh kursor/jari, jadi halaman tujuan biasanya tampil tanpa menunggu. Hasil per halaman juga disimpan di perangkat (`lib/device-cache.ts`, IndexedDB) bersama penanda versi dari `GET /api/version` (tanggal, jumlah catatan, waktu ubah terakhir); data hanya diminta ulang bila penanda berubah, saat tab kembali dibuka diperiksa lagi, dan cache perangkat dihapus saat aplikasi dikunci atau sesi habis.
3. Simpan: `api(entity, { id?, data })` mengirim data utuh. Server (`features/records/service.ts`) memvalidasi dengan Zod, memeriksa rujukan, lalu menyimpan. Hapus: `api(entity, { id }, 'DELETE')`.
4. Kemampuan server (`/api/capabilities`) menentukan modul yang sudah dimigrasi: pencatatan, logistik (migrasi 8), administrasi (migrasi 10), rutin (migrasi 11). Modul yang belum aktif menampilkan pesan, bukan daftar kosong.
5. Data yang sudah dimuat disiarkan lewat event `hub-workspace` agar kerangka (pencarian, profil) tidak meminta ulang.

## Formulir dan daftar umum

- Katalog kolom per jenis catatan: `features/records/catalog.ts`. Skema: `schemas.ts`.
- `fields-meta.ts` menentukan jenis isian dari nama kolom; `record-form.tsx` membangun formulir otomatis (wajib/opsional dari skema, pesan galat bahasa Indonesia, draf di sessionStorage, konfirmasi sebelum menutup).
- `records-view.tsx`: cari, saring, kartu/tabel, unduh dan impor CSV. Ringkasan angka per jenis: `entity-views.tsx`.
- Formulir dan impor CSV dimuat belakangan (`features/records/lazy.tsx`) agar Zod tidak ikut unduhan awal.

## Tugas

- Satu jalur simpan: `features/tasks/task-actions.ts` (`saveTask` mencatat riwayat; centang, pindah status, tunda, dan batalkan selalu punya Urungkan).
- Hapus tugas = status `dibatalkan`; bisa dibuka lagi dari arsip.
- Tugas berulang: saat selesai, server membuat kejadian berikutnya.

## Rutin harian

Jenis catatan `routines` (judul, jam, hari aktif 1–7, aktif) dan `routine-checks` (rutin + tanggal, satu per hari). Menghapus rutin = menonaktifkan agar riwayat centang tetap ada. Butuh migrasi 11.

## Ukuran unduhan

`npm run ukur:bundel` memeriksa JS awal halaman utama (batas 500 KB mentah). Komponen berat (formulir, laci tugas, palet, konstelasi, dunia 3D) dimuat dengan `next/dynamic`; animasi memakai `LazyMotion`.
