# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Manajer Koperasi Desa/Kelurahan Merah Putih (KDMP). Satu orang yang memegang seluruh operasional koperasi: merencanakan proyek pembukaan gerai, membagi tugas ke staf, mencatat uang masuk/keluar, mengawasi barang dan gudang, menyiapkan rapat pengurus, dan menyusun laporan untuk pengawas. Bekerja di kantor koperasi dengan laptop dan di lapangan (gudang, gerai, kunjungan petani) dengan ponsel; keduanya sama pentingnya.

## Product Purpose

Satu ruang kerja pribadi tempat manajer melihat apa yang perlu dikerjakan hari ini, mencatat apa yang terjadi, dan membuktikannya dalam laporan. Berhasil bila manajer tidak lagi memakai buku tulis, grup chat, dan spreadsheet terpisah untuk tugas, kas, stok, dan rapat.

## Positioning

Seluruh data kerja hidup di **Dunia Koperasi**: diorama kantor 3D yang membaca catatan yang sama. Truk di dok berasal dari catatan pengiriman, rak gudang dari data barang, figur staf berpindah ruang mengikuti rapat dan tugasnya. Halaman web dan dunia bertautan dua arah; aplikasi manajemen lain tidak punya kantor yang bisa dimasuki.

## Operating Context

- Rutinitas: buka Beranda/Hari ini di pagi hari, perbarui status tugas, catat transaksi kas dan mutasi stok setelah kejadian, siapkan rapat dan notulen, simpan snapshot laporan berkala.
- Ruang kantor di dunia 3D memetakan domain web: Ruang kerja (tugas, sprint), Ruang manajer (dokumen, risiko, mitra), Rapat, Gym & kegiatan, Stok & barang, Kas & anggota, Karyawan gerai, Ngopi & istirahat; plus Gerai, Gudang, Cold storage, Pulau.
- Bahasa Indonesia sederhana, zona waktu Asia/Jakarta. Data disimpan di Supabase (satu tabel JSONB per domain); mode demo lokal untuk percobaan.

## Capabilities and Constraints

- Proyek fleksibel, tugas (daftar/papan/kalender/Gantt/harian), milestone, sprint, kegiatan, rapat + ICS, dokumen, risiko/isu, mitra, tim/pelatihan, gerai/kesiapan, laporan; anggota, buku kas, barang, stok opname, pengiriman, mutasi stok.
- Buku kas hanya uang masuk/keluar tercatat — tidak pernah disebut saldo atau laba. Opname tidak mengubah stok otomatis.
- Belum ada POS, akuntansi lengkap, pinjaman anggota, kolaborasi real-time, editor blok, unggah berkas. Simpanan anggota (pokok, wajib, sukarela) tersedia sejak migrasi 10.
- Next.js 16, React 19, TypeScript strict, Tailwind 3, Three.js. Repo publik.

## Brand Commitments

- Nama produk: Kopdes Manager 3D; di dalam aplikasi: "Dunia Koperasi" untuk diorama.
- Web memakai gaya "Senja": kanvas krem hangat, kartu putih, aksi biru `#2F5BEA`, empat pastel (biru, merah muda, mentega, mint) untuk modul dan kategori, huruf Hanken Grotesk (keputusan pemilik 15 Oktober 2026; menggantikan bahasa dinding/lantai/kayu dunia). Warna pastel dipilih agar nyaman di mata. Ikon dua nada biru (`Ikon3D`).
- Tampilan seimbang di semua perangkat: grid modul dengan tinggi rata; setiap data yang tampil harus bisa ditindaklanjuti; tidak ada tombol aksi ganda.
- Bahasa UI langsung, ringkas, tanpa slogan motivasi.

## Evidence on Hand

- Data contoh mode demo: 191 catatan (`src/features/demo/data-contoh.ts`), id berawalan `c0de0000`, berlabel contoh.
- Tangkapan layar dunia dan web di `docs/gambar/`.
- Tidak ada testimoni, angka pengguna, atau mitra resmi; jangan dikarang.

## Product Principles

1. Tanpa data karangan: belum aktif atau kosong ditampilkan apa adanya, bukan nol palsu.
2. Satu sumber kebenaran: web dan dunia membaca catatan yang sama dan saling menautkan.
3. Kerja hari ini lebih dulu: yang mendesak dan terlambat selalu terlihat tanpa mencari.
4. Sama kuat di HP dan laptop.

## Accessibility & Inclusion

Area sentuh minimal 44 px, fokus keyboard terlihat, status tidak hanya dengan warna, hormati reduced-motion, mode gelap untuk web.
