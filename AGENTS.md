# Panduan AI — Kopdes Manager 3D

Ruang kerja manajer KDMP dengan **Dunia Koperasi 3D** (Three.js, diorama isometrik lembut, model dibangun dari kode). Repo: `kopdes-manager-3d`, cabang utama `main`. Versi pixel lama (PixiJS) hidup di repo terpisah `kopdes-manager-web`; jangan menyunting atau menyalin kode pixel ke repo ini.

## Urutan membaca

1. Periksa Git (`git status -sb`) dan `docs/LANJUTAN-AI.md` untuk melanjutkan sesi.
2. Dunia Koperasi: `docs/DUNIA-KOPERASI.md` (satu kontrak gaya, data, dan peta kode). Keadaan dan bukti: `docs/STATUS.md`.
3. Baca dokumen lain sesuai pekerjaan: `docs/DESAIN-ANTARMUKA.md` (halaman operasional), `docs/KEGIATAN-DAN-TUGAS.md`, `docs/ARSITEKTUR.md` (koneksi data), `docs/MIGRASI-SQL.md` sebelum perubahan SQL.
4. PRD/KEPUTUSAN menyimpan batas produk, CHECKLIST menyimpan penerimaan. Tidak perlu membaca seluruh Markdown untuk setiap perubahan.
5. Abaikan `not-use/`. Graphify bersifat opsional: baca `graphify-out/` hanya bila pemilik meminta peta kode atau penelusuran Graphify; selain itu gunakan pencarian sumber langsung.

Arahan langsung pemilik terbaru mengatasi konflik. Jangan membuat kontrak gaya dunia lain. Jangan menghapus catatan pengguna atau fitur operasional untuk merapikan dokumen.

## Produk

- Ruang kerja pribadi manajer koperasi: proyek fleksibel tanpa durasi wajib, tugas, milestone, kesiapan gerai, koordinasi, dokumen, risiko, laporan kerja.
- Pencatatan terpisah dari ruang kerja: anggota, buku kas, barang, stok opname, pengiriman dan mutasi stok. Belum mencakup POS, akuntansi lengkap, simpan pinjam, atau kunci AI pengguna.
- Dunia Koperasi 3D menampilkan data yang sama (kantor bersekat, gerai, gudang, cold storage, pulau). Dunia dan web bertautan dua arah; dunia tidak menulis data sendiri.
- Identitas berasal dari profil. Jangan mengarang nama, kontak, capaian, atau data operasional. Data contoh hanya di mode demo dan seed berawalan id `c0de0000`.
- Pengalaman task/project manager terinspirasi Notion: daftar/papan/kalender/Gantt dan catatan terformat. Jangan mengklaim editor blok drag-and-drop, baseline, jalur kritis otomatis, atau kolaborasi real-time.
- Domain `workstreams` adalah proyek; pertahankan kompatibilitas data lama. Jangan memasang kembali program 90 hari.
- Bahasa Indonesia sederhana, zona waktu Asia/Jakarta.

## Kode yang mudah dirawat

- Next.js App Router, React, TypeScript strict, Tailwind, Zod, Supabase, Three.js.
- `app/`: rute tipis; `features/<domain>/`: skema, layanan, UI domain; `components/`: UI bersama; `lib/`: utilitas bersama. Kode dunia di `src/features/dunia-3d/` (model data di `dunia-3d/model/`).
- Hindari repository serbaguna, abstraksi spekulatif, `any`, dan duplikasi rumus. Satu sumber progres di `lib/progress.ts`; tanggal di `lib/date.ts`.
- Nama fungsi menjelaskan tindakan; komentar menjelaskan alasan bisnis.
- Tangani memuat, kosong, galat, dan data. Galat database tidak boleh berubah menjadi angka palsu.

## Keamanan

- Gunakan Supabase BARU; konfigurasi lama bukan izin menulis database lama.
- Sebelum migrasi cloud: jelaskan berkas SQL, dampak, dan proyek tujuan, lalu minta konfirmasi. AI tidak menjalankan SQL cloud; reset dan seed dijalankan pemilik.
- RLS aktif, akses bawaan ditolak, setiap aksi server divalidasi Zod dan sesi.
- Rahasia server tidak masuk browser, Git, atau log. Repo ini publik: periksa diff dari kunci, token, dan data pribadi sebelum commit. Jangan mengaktifkan layanan berbayar.
- PIN minimal 6 digit, hash yang sesuai, batas percobaan persisten, sesi kedaluwarsa, cookie HttpOnly/Secure/SameSite, pemeriksaan asal mutasi.
- Mode demo (`NEXT_PUBLIC_MODE_DEMO=1`) tidak pernah aktif di Vercel (`modeDemo()` memeriksa `VERCEL`).

## Multiplatform

- Periksa 360, 768, 1024, 1440 px. Halaman operasional memakai navigasi bawah/rel/sidebar; Dunia Koperasi memakai bilah dan panel sendiri.
- Area sentuh minimal 44 px, fokus keyboard, label form, status memakai teks selain warna.
- Tabel/Gantt bergulir dalam kontainer atau berubah menjadi kartu di area sempit; hormati reduced-motion dan safe area.
- Tema web dan dunia satu keluarga: kanvas lavender muda, kartu putih, aksen biru `#2F5BEA`, huruf Inter. Sistem gaya web di `src/styles/` (`token.css` → `dasar.css` → `komponen.css` → `kerangka.css` → `halaman/*.css`); warna mentah hanya di `token.css`, tanpa `!important` (`npm run lint:ui`). Dunia di `src/features/dunia-3d/monitoring.css`. Warna status hanya token `--ok/--late/--warn` (alias `--pastel-*`). Mode gelap tersedia untuk web; dunia selalu terang.
- Hindari angka operasional palsu, tombol dekoratif, dan slogan. Buku kas hanya uang masuk/keluar tercatat, bukan saldo atau laba.

## Proses

1. Periksa Git dan pertahankan perubahan pengguna.
2. Implementasikan paket kerja konkret dan dapat diverifikasi.
3. Untuk perubahan kode jalankan `npm test`, `npm run typecheck`, `npm run lint`, `npm run lint:ui`, `npm run build`. Untuk dokumentasi saja, periksa diff dan tautan tanpa mengklaim tes baru. Boleh `npm test -- --maxWorkers=2`; cakupan tetap seluruh suite.
4. Periksa singkat UI yang berubah pada ukuran relevan (`npm run dev:demo` memberi data contoh tanpa Supabase).
5. Catat paket di CHANGELOG. STATUS dan LANJUTAN-AI hanya berisi keadaan terkini: timpa bagian yang berubah. Perbarui checklist yang benar-benar selesai.
6. Laporkan hasil dan batasan secara jujur; tes lama bukan bukti fitur baru selesai. Jangan menandai pemeriksaan perangkat yang belum dilakukan.

## Git

- `main` selalu lulus tes dan bisa dibangun. Kerjakan paket di cabang bertopik, lalu gabungkan lewat pull request.
- Nama cabang menjelaskan pekerjaan, bukan alat atau orang: `fitur/<topik>`, `perbaikan/<topik>`, `tampilan/<topik>`, `dokumen/<topik>`, `rapikan/<topik>`. Huruf kecil, kata dipisah tanda hubung. Jangan memakai awalan nama AI atau pribadi (mis. `codex/`, `claude/`).
- Satu cabang kerja aktif untuk semua AI (Claude, Codex, Antigravity, dll.):
  1. Sebelum mulai, jalankan `git status -sb` dan `git branch`. Bila ada cabang kerja yang belum masuk `main`, lanjutkan di cabang itu; jangan membuat cabang baru.
  2. Cabang baru hanya dibuat dari `main` terbaru yang bersih, untuk paket baru.
  3. Setelah paket masuk `main`, hapus cabangnya di lokal dan remote.
  4. Jangan meninggalkan perubahan belum di-commit di akhir sesi; commit di cabang kerja (boleh belum di-push).
- Satu paket = satu commit atau beberapa commit kecil. Pesan: judul ringkas bahasa Indonesia, baris kosong, isi yang menjelaskan alasan. Tanpa baris atribusi AI.
- Jangan force-push ke `main`, jangan menulis ulang riwayat yang sudah dibagikan. Push dan deploy hanya atas permintaan pemilik. Panduan lengkap: `CONTRIBUTING.md`.

## Skill dan peta kode untuk semua AI

- Skill proyek: `.claude/skills/` (Claude Code) dan salinannya `.agents/skills/` (Codex, Antigravity, agen lain). Ubah di `.claude/skills`, lalu jalankan `node scripts/sync-skills.mjs`; `clean-code` bersumber di `.agents/skills`. Sumber/lisensi pihak ketiga: `.claude/skills/SUMBER.md`.
- Skill utama: hemat-token, dunia-koperasi, ui-ux-kopdes, backend-kopdes, clean-code; opsional caveman, grill-me/grilling. AI tanpa dukungan skill cukup membaca SKILL.md yang relevan.
- Ubah aturan hanya di AGENTS.md. CLAUDE.md dan GEMINI.md mengimpor berkas ini (@AGENTS.md) dan hanya menambah bagian Graphify; `.cursor/rules/` dan `.agents/rules/` menunjuk ke sini.
- Hook Graphify lokal (`.claude/settings.json`, `.codex/`, `.gemini/settings.json`) berisi path komputer pemilik dan tidak di-commit.
- rtk (dipasang global oleh pemilik) meringkas keluaran shell. Bila galat terpotong, jalankan `rtk proxy <perintah>`.
- Bila pemilik meminta Graphify, gunakan `graphify query`, `graphify path`, atau `graphify explain` pada peta yang ada. Peta kode (`graphify-out/`, tidak di-commit) dibuat ulang dengan `graphify update .` (hanya kode, tanpa AI); tidak wajib diperbarui pada pekerjaan lain. Jangan memproses `docs/` dengan ekstraksi AI tanpa izin pemilik.

## Pencatatan dan rapat

- Acuan aktivasi: `docs/PENCATATAN.md`. Pemeriksaan kemampuan server menentukan apakah pencatatan aktif; jangan menyamarkan migrasi belum terpasang sebagai data nol.
- Opname menyimpan snapshot stok buku tanpa koreksi stok otomatis.
- Rapat online memakai tautan pengguna dan unduhan ICS; bukan konferensi video bawaan atau undangan otomatis.
- Bahasa UI langsung, ringkas, tanpa slogan motivasi. Pilih judul yang menjelaskan isi atau tindakan.
