# Aturan AI — Kopdes Manager

Satu-satunya berkas aturan untuk semua AI (Claude, Codex, Antigravity, Gemini, Cursor, OpenCode). Berkas lain (`CLAUDE.md`, `GEMINI.md`, `.cursor/rules`, `.agents/rules`) hanya menunjuk ke sini. Ubah aturan hanya di berkas ini.

Ruang kerja manajer koperasi desa (KDMP): tugas, proyek, agenda, catatan, dan pencatatan usaha, ditambah Dunia Koperasi 3D yang membaca data yang sama. Repo publik, cabang utama `main`.

## Mulai kerja

1. `git status -sb` dan `git branch`. Ada cabang kerja yang belum masuk `main`? Lanjutkan di sana. Jangan buang perubahan pengguna yang belum di-commit.
2. Baca [docs/STATUS.md](docs/STATUS.md): keadaan sekarang, langkah berikut, keputusan pemilik terbaru.
3. Baca dokumen lain hanya bila perlu:

| Pekerjaan | Baca |
|---|---|
| Fitur dan batas produk | [docs/PRODUK.md](docs/PRODUK.md) |
| Struktur kode dan aliran data | [docs/KODE.md](docs/KODE.md) |
| Tampilan, warna, animasi, kata-kata | [docs/TAMPILAN.md](docs/TAMPILAN.md) |
| Supabase, migrasi, reset, data contoh | [docs/DATABASE.md](docs/DATABASE.md) |
| Dunia Koperasi 3D | [docs/DUNIA-3D.md](docs/DUNIA-3D.md) |

Arahan pemilik yang terbaru menang bila ada yang bertentangan.

## Produk (ringkas)

- Fitur dipertahankan; tampilan boleh diubah kapan saja lewat token tema. Gaya yang berlaku sekarang bukan aturan permanen.
- Jangan mengarang nama, kontak, angka, atau capaian. Data contoh hanya di mode demo dan seed ber-id awalan `c0de0000`.
- Buku kas = uang masuk/keluar yang tercatat, bukan saldo atau laba. Opname tidak mengoreksi stok otomatis.
- Galat dan modul yang belum dimigrasi ditampilkan apa adanya, tidak pernah menjadi angka nol.
- Bahasa Indonesia sehari-hari, zona waktu Asia/Jakarta. HP, tablet, dan laptop sama penting.

## Kode

- Next.js (App Router) + React + TypeScript strict + Tailwind v4 + Radix (`radix-ui`) + Motion + Zod + Supabase + Three.js.
- Nama folder, berkas, dan kode dalam bahasa Inggris (berkas `kebab-case`). Alamat halaman bahasa Inggris (`/tasks`). Teks di layar, komentar, dokumen, dan pesan commit dalam bahasa Indonesia.
- `src/app` rute tipis; `src/features/<domain>` logika dan UI domain; `src/components` UI bersama; `src/lib` utilitas. Lihat [docs/KODE.md](docs/KODE.md).
- Perubahan terkecil yang lengkap. Tidak ada abstraksi "untuk nanti", tidak ada `any`, tidak ada rumus ganda (progres di `lib/progress.ts`, tanggal di `lib/date.ts`, status tugas dan lewat tenggat di `lib/task-status.ts`, pencocokan nama di `lib/people.ts`).
- Komentar menjelaskan alasan bisnis, bukan isi kode.
- Warna mentah hanya di token `src/app/globals.css`. Gradasi hanya di latar halaman (token `--ground`); kartu, tombol, dan grafik warna solid. Komponen memakai kelas token (`bg-surface`, `text-ink-2`, `bg-tone`).

## Keamanan

- RLS aktif, akses bawaan ditolak, setiap aksi server divalidasi Zod dan sesi.
- AI tidak menjalankan SQL di cloud. Migrasi ditulis sebagai berkas baru di `supabase/migrations`; pemilik yang menjalankan setelah dijelaskan berkas, dampak, dan proyek tujuannya.
- Rahasia tidak masuk browser, Git, atau log. Periksa diff dari kunci, token, dan data pribadi sebelum commit.
- PIN minimal 6 digit; mode demo (`NEXT_PUBLIC_MODE_DEMO=1`) tidak pernah aktif di Vercel.
- Jangan mengaktifkan layanan berbayar. Push dan deploy hanya atas permintaan pemilik.

## Memeriksa

- Saat bekerja: `npm run cek` (tipe, lint, tes yang terkait berkas berubah).
- Sebelum menggabung ke `main`: `npm run cek:penuh` (tipe, lint, semua tes, build, ukuran JS awal ≤ 500 KB).
- Perubahan tampilan: jalankan `npm run dev:demo -- -p 3200`, buka halaman yang diubah di lebar 375, 768, dan 1440 px (satu kali tema gelap), lalu lihat hasilnya. Hanya halaman yang diubah.
- Setelah build, kembalikan `next-env.d.ts` bila berubah.
- Laporkan apa adanya: tes lama bukan bukti fitur baru jalan; yang belum diperiksa disebut belum.

## Mencatat (sama untuk semua AI)

- [docs/STATUS.md](docs/STATUS.md): satu-satunya catatan keadaan. Bagian Sekarang, Langkah berikut, dan Keputusan pemilik. Timpa bagian yang berubah, jangan menumpuk catatan sesi.
- [CHANGELOG.md](CHANGELOG.md): hanya perubahan besar (fitur, fase, migrasi), entri baru di atas dengan format:
  ```
  ## <ringkasan> — <tanggal>
  - Alasan: kenapa dibuat (arahan pemilik atau masalah).
  - Perubahan: yang dirasakan pengguna.
  - Verifikasi: tes, build, dan pemeriksaan yang benar-benar dijalankan.
  - Belum: yang belum diperiksa atau masih tersisa.
  ```
  Audit kecil, perbaikan gaya, dan coba-coba tidak dicatat di CHANGELOG.

## Git

- `main` selalu lulus pemeriksaan dan bisa dibangun. Kerjakan di cabang bertopik lalu gabung lewat pull request.
- Nama cabang: `fitur/…`, `perbaikan/…`, `tampilan/…`, `dokumen/…`, `rapikan/…` (huruf kecil, tanda hubung). Tanpa nama AI atau orang.
- Satu cabang kerja aktif untuk semua AI; cabang baru hanya dari `main` terbaru yang bersih. Hapus cabang setelah masuk `main`.
- Pesan commit `jenis: ringkasan bahasa indonesia` (huruf kecil, tanpa titik), baris kosong, lalu alasan. Jenis: `feat`, `fix`, `style`, `refactor`, `docs`, `test`, `chore`. Tanpa baris atribusi AI.
- Jangan force-push ke `main` atau menulis ulang riwayat bersama. Jangan tinggalkan perubahan belum di-commit di akhir sesi.

## Skill

- Skill bersama di `.agents/skills/` (salinan untuk Claude di `.claude/skills/`): saat ini hanya `grilling`. Sumber dan lisensi: [.agents/skills/SUMBER.md](.agents/skills/SUMBER.md). Jangan menambah skill buatan sendiri tanpa persetujuan pemilik; pengetahuan proyek ditulis di dokumen.
- Skill global pemilik: `ponytail` (semua AI), serta `impeccable`, `ui-styling`, `superpowers` (Claude). AI tanpa skill itu cukup mengikuti dokumen.
- `rtk` meringkas keluaran shell; bila keluaran terpotong, jalankan `rtk proxy <perintah>`.
- Graphify opsional: hanya bila pemilik meminta peta kode. `graphify-out/` tidak di-commit; jangan memproses `docs/` dengan ekstraksi AI tanpa izin.
