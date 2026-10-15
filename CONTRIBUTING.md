# Berkontribusi

Panduan singkat untuk manusia dan AI yang bekerja di repo ini. Aturan produk, keamanan, dan gaya ada di [AGENTS.md](AGENTS.md).

## Persiapan

```sh
npm ci
npm run dev:demo -- -p 3200   # data contoh di memori, tanpa Supabase/PIN
```

Untuk data asli, salin `.env.example` menjadi `.env.local` dan ikuti [docs/SUPABASE.md](docs/SUPABASE.md).

## Cabang

`main` selalu lulus pemeriksaan dan siap dibangun. Kerjakan setiap paket di cabang sendiri, lalu buka pull request ke `main`.

| Awalan | Untuk | Contoh |
|---|---|---|
| `fitur/` | Kemampuan baru | `fitur/impor-csv-barang` |
| `perbaikan/` | Bug atau data salah | `perbaikan/stok-minimum-gudang` |
| `tampilan/` | UI/UX tanpa perubahan perilaku data | `tampilan/kartu-mitra` |
| `dokumen/` | Dokumentasi saja | `dokumen/panduan-reset` |
| `rapikan/` | Refaktor, hapus kode mati, perkakas | `rapikan/pangkas-personal-css` |

Nama cabang menjelaskan pekerjaan: huruf kecil, kata dipisah tanda hubung, tanpa nama orang atau nama alat AI.

## Commit

- Satu paket kerja per commit (atau beberapa commit kecil yang runtut).
- Judul ringkas dalam bahasa Indonesia, baris kosong, lalu isi yang menjelaskan alasan.
- Tanpa baris atribusi AI. Jangan commit `.env*`, kunci, token, atau data pribadi; repo ini publik.

```text
Kartu mitra tanpa nomor ganda

Nomor kontak sudah tampil di baris kontak; cip kartu hanya
menampilkan informasi yang belum ada di badan kartu.
```

## Sebelum pull request

```sh
npm test
npm run typecheck
npm run lint
npm run lint:ui
npm run build
```

Periksa UI yang berubah di 360, 768, 1024, dan 1440 px. Catat paket di [CHANGELOG.md](CHANGELOG.md); perbarui [docs/STATUS.md](docs/STATUS.md) bila keadaan berubah. CI di GitHub menjalankan pemeriksaan yang sama.

## Database

Migrasi baru ditambahkan berurutan di `supabase/migrations/`, lalu SQL install/reset dibuat ulang lewat skrip di `scripts/`. SQL tidak pernah dijalankan ke cloud tanpa penjelasan berkas, dampak, dan proyek tujuan serta persetujuan pemilik. Panduan: [docs/MIGRASI-SQL.md](docs/MIGRASI-SQL.md).

## Kerja paralel

Semua AI memakai satu cabang kerja aktif: lanjutkan cabang yang belum masuk `main` (lihat `git branch`), buat cabang baru hanya dari `main` bersih, hapus cabang (lokal dan remote) setelah masuk `main`, dan commit semua perubahan sebelum sesi selesai. Aturan lengkap di `AGENTS.md` bagian Git. Bagi kepemilikan berkas; `src/styles/token.css`, `src/styles/kerangka.css`, `AppShell.tsx`, `Records.tsx`, dan `MonitoringDashboard.tsx` mudah berbenturan. Sinkronkan cabang dengan `main` terbaru sebelum menguji ulang. Jangan force-push ke `main` dan jangan menulis ulang riwayat yang sudah dibagikan.
