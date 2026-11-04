# Produk — Kopdes Manager 3D

Fitur dan batas produk yang berlaku.

## Untuk siapa

Pengguna utama adalah manajer Koperasi Desa/Kelurahan Merah Putih (KDMP). Satu orang ini memegang hampir semua urusan koperasi:

- merencanakan proyek, misalnya pembukaan gerai;
- membagi tugas ke staf;
- mencatat uang masuk dan keluar;
- mengawasi barang dan gudang;
- menyiapkan rapat pengurus;
- menyusun laporan untuk pengawas.

Manajer bekerja di kantor dengan laptop dan di lapangan dengan HP. HP, tablet, dan laptop sama penting.

Aplikasi ini berhasil bila manajer tidak perlu lagi buku tulis, grup chat, dan spreadsheet terpisah untuk tugas, kas, stok, dan rapat.

## Apa yang ada

Aplikasi punya dua bagian. Keduanya memakai data yang sama.

**Ruang kerja** untuk merencanakan dan menjalankan pekerjaan:

| Halaman | Alamat | Isi |
|---|---|---|
| Beranda | `/home` | Rutin harian yang dicentang, yang perlu tindakan (terlambat, tenggat hari ini, rapat berikutnya), agenda, tambah tugas cepat, salin laporan harian |
| Tugas | `/tasks` | Daftar, papan, kalender, Gantt (`?view=timeline`) |
| Proyek | `/projects` | Proyek berjalan, detail proyek, milestone, risiko (`?tab=risks`), riwayat proyek (`?view=history`) |
| Agenda | `/agenda` | Rapat, keputusan, tindak lanjut, unduh ICS |
| Catatan | `/notes` | Kegiatan (apa yang terjadi) dan Laporan kerja (`?tab=reports`) |
| Dokumen | `/documents` | Daftar dokumen, kontrak, legalitas, tautan berkas |
| Kontak | `/contacts` | Mitra, pemasok, ekspedisi, interaksi |
| Tim | `/team` | Staf, Absensi (`?tab=attendance`), Pelatihan |

**Pencatatan** untuk buku usaha koperasi:

| Halaman | Alamat | Isi |
|---|---|---|
| Gerai | `/store` | Unit gerai, Kesiapan (`?tab=readiness`), Penjualan harian (`?tab=sales`) |
| Barang | `/goods` | Barang, Stok opname (`?tab=counts`), Pengiriman (`?tab=deliveries`), Mutasi stok, Pembelian (`?tab=purchases`) |
| Aset | `/assets` | Inventaris aset |
| Anggota | `/members` | Anggota dan Simpanan (`?tab=savings`) |
| Kas | `/cash` | Buku kas: uang masuk dan keluar |

**Lainnya:** Dunia 3D (`/world`), Pengaturan (`/settings`: profil, PIN, cadangan), Bantuan (`/help`), masuk dengan PIN (`/pin`). Alamat lama berbahasa Indonesia (misalnya `/beranda`, `/tugas`, `/dunia-koperasi`) dialihkan ke alamat baru.

### Fitur ruang kerja

- **Proyek**: nama, kode, tujuan, penanggung jawab, prioritas, tanggal mulai dan target, warna, catatan. Durasi tidak wajib. Data proyek disimpan sebagai `workstreams`; data lama tetap terbaca.
- **Catatan proyek**: judul, paragraf, daftar, checklist, kutipan. Disimpan dengan tombol simpan. HTML tidak dijalankan.
- **Tugas**: status, prioritas, penanggung jawab, tanggal mulai dan tenggat, subtugas, prasyarat, POAC, pengulangan, bukti, catatan. Bisa ditautkan ke proyek, milestone, rapat, dokumen, kontak, dan kendala.
- **Kode tugas** dibuat otomatis saat tugas baru disimpan. Kode lama tidak berubah.
- **Tampilan tugas**: daftar, papan, kalender, dan Gantt memakai data yang sama. Ada pencarian, filter, dan urutan.
- **Pengulangan**: tidak, harian, mingguan, bulanan. Tugas berikutnya dibuat saat tugas sekarang ditandai Selesai. Jam hanya catatan; belum ada pengingat.
- **Gantt**: pilih proyek, rentang, skala hari/minggu/bulan. Rentang tampil paling lama 366 hari. Geser batang untuk memindah jadwal, tarik ujung kanan untuk mengubah tenggat, lalu Simpan. Bisa pakai keyboard. Di HP tampil daftar tanggal dulu.
- **Rutin harian**: daftar rutin dengan jam dan hari aktif per rutin. Centang per hari tersimpan di database, jadi sama di HP dan laptop.
- **Agenda/rapat**: tatap muka, online, atau hybrid. Isi lokasi atau tautan, waktu WIB, durasi. Keputusan rapat bisa menjadi sumber tugas.
- **Laporan kerja**: snapshot per periode, status draf atau final. Bisa dicetak atau disalin sebagai teks.
- **Cadangan**: unduh dan pulihkan JSON dari Pengaturan.

### Fitur pencatatan

- **Anggota**: nama, nomor anggota unik, tanggal bergabung, kontak, alamat, status, catatan. Tidak menyimpan NIK. Anggota bisa dinonaktifkan.
- **Simpanan**: setor atau tarik simpanan pokok, wajib, sukarela per anggota. Penarikan yang membuat saldo jenis itu minus ditolak.
- **Kas**: judul, tanggal, masuk/keluar, nominal rupiah bulat, kategori, kas/rekening. Bisa ditautkan ke anggota, barang, gerai, dan bukti.
- **Barang**: kode unik, nama, gerai, satuan, rak gudang (A–F, cold storage C1–C3), stok buku, batas minimum, harga.
- **Stok opname**: pilih barang, tanggal, jumlah fisik, pemeriksa. Stok buku disalin sebagai pembanding. Selisih = fisik − buku.
- **Pengiriman**: masuk atau keluar, status dipesan → dikirim → tiba → diperiksa → selesai (atau dibatalkan), pemasok/ekspedisi dari Kontak, gerai tujuan, pintu dok D1–D4, kendaraan, sopir, rincian barang.
- **Mutasi stok**: masuk, keluar, koreksi tambah, koreksi kurang. Menyimpan mutasi langsung mengubah stok buku dan mencatat stok sebelum dan sesudah. Stok tidak boleh negatif. Mutasi tidak bisa diubah atau dihapus; salah catat diperbaiki dengan mutasi koreksi baru.
- **Pembelian**: pesanan ke pemasok, status draf → dipesan → diterima/dibatalkan, perkiraan tiba, total. Barang yang datang dicatat sebagai pengiriman masuk yang menaut pembelian.
- **Penjualan harian**: omzet dan jumlah transaksi per gerai per hari, satu catatan per gerai per hari.
- **Aset**: kategori, kondisi (baik, perlu perbaikan, rusak, dihapuskan), lokasi gerai, nilai perolehan, pemegang.
- **Absensi**: satu catatan per petugas per hari. Status terjadwal untuk hari depan, lalu hadir, terlambat, izin, sakit, cuti, alpa, atau libur, dengan jam datang dan pulang.
- **Gerai dan kesiapan**: status unit dan daftar periksa kesiapan per unit.
- Setiap buku punya pencarian, filter, ringkasan, dan ekspor CSV. Belum ada impor CSV.
- Judul absensi, penjualan, dan simpanan terisi otomatis dari petugas, gerai, atau anggota.

## Batas produk

Aplikasi ini **bukan**:

- kasir (POS);
- akuntansi lengkap: tanpa jurnal berpasangan, rekonsiliasi bank, penyusutan aset;
- layanan pinjaman anggota atau iuran otomatis;
- alat kolaborasi real-time atau multiuser;
- editor blok drag-and-drop ala Notion;
- tempat unggah berkas (dokumen hanya menyimpan tautan HTTP/HTTPS);
- pemakai kunci AI milik pengguna;
- aplikasi offline/PWA, pengirim WhatsApp atau email otomatis.

Aturan yang harus dijaga:

- **Kas** hanya uang masuk dan keluar yang tercatat. Selisihnya bukan saldo bank dan bukan laba. Saldo awal tidak diasumsikan.
- **Stok opname** tidak mengoreksi stok otomatis. Bila perlu koreksi, catat mutasi koreksi dan pilih opname terkait.
- **Pengiriman** tidak mengubah stok. Stok hanya berubah lewat mutasi.
- **Barang dan kas** tidak saling mengubah otomatis.
- **Simpanan** hanya setoran dan penarikan pokok, wajib, sukarela. Uang yang benar-benar diterima tetap dicatat di Kas.
- **Penjualan harian** bukan laba dan bukan POS.
- **Rapat online** memakai tautan yang diisi pengguna dan unduhan `.ics`. Aplikasi tidak membuat ruang Zoom/Meet, tidak mengundang peserta, tidak merekam, tidak mengirim email.
- **Gantt** tidak menggeser tugas turunan otomatis. Belum ada baseline dan jalur kritis otomatis.
- **Laporan** berisi kondisi saat snapshot dibuat. Riwayat status lama tidak disusun ulang.
- **Kontrak** di Dokumen hanya catatan. Belum ada tanda tangan digital.
- Penyuntingan memakai pola "terakhir disimpan menang". Belum ada penguncian bila dua perangkat mengubah catatan yang sama.

## Aturan kegiatan vs tugas

**Tugas** adalah pekerjaan yang harus dikerjakan. Ada penanggung jawab, tenggat, prioritas, dan status `rencana`, `proses`, `selesai`, atau `dibatalkan`. Tugas muncul di Tugas, Gantt, dan Beranda.

**Kegiatan** adalah catatan tentang apa yang sudah terjadi: kunjungan, koordinasi, pembahasan, hasil lapangan. Isinya tanggal, uraian, unit, dan tautan opsional ke tugas atau kontak. Kegiatan tidak punya status atau tenggat. Kegiatan tidak boleh tampil sebagai tugas yang belum selesai.

**Rapat** adalah acara berjadwal dengan jam. Simpan di Agenda, bukan sebagai tugas.

Contoh:

- "Kunjungi koperasi Jumat" = tugas, selama kunjungan belum dilakukan.
- Setelah kunjungan, "Bertemu pengurus, perlu daftar inventaris" = kegiatan yang menunjuk tugas kunjungan.
- "Minta daftar inventaris" = tugas lanjutan.

Dengan cara ini satu kejadian tidak tercatat tiga kali sebagai tugas aktif.

Beranda memisahkan "yang perlu dikerjakan" dari "yang sudah terjadi". Tombol "Catat kegiatan" dan "Buat tugas" terpisah, tidak digabung dalam satu formulir.

### Alur proyek dan tugas

1. Buat proyek untuk satu tujuan. Durasi tidak wajib.
2. Tambah tugas dari dalam proyek; proyek terisi otomatis. Di formulir tugas umum, pilih proyek dulu, atau pilih **Tugas mandiri (tanpa proyek)**.
3. Isi pekerjaan dan tenggat, lalu status, prioritas, penanggung jawab. Milestone, kontak, dokumen, rapat, subtugas, dan pengulangan ada di **Detail lainnya**.
4. Milestone adalah hasil yang bisa diperiksa, bukan setiap acara kecil. Milestone tugas harus dari proyek yang sama.
5. Pakai prasyarat hanya bila tugas memang menunggu tugas lain. Prasyarat melingkar ditolak.
6. Progres proyek dihitung dari tugas. Progres 100% tidak menutup proyek otomatis.
7. Tutup proyek lewat **Ubah proyek → Selesai**. Tugas tidak ikut diselesaikan otomatis.
8. Proyek selesai atau arsip pindah ke Riwayat proyek. Server menolak tugas baru di proyek tertutup. Tugas berulang di proyek tertutup tidak membuat salinan baru.

### Hubungan data

| Catatan | Terhubung ke | Aturan |
|---|---|---|
| Tugas | Proyek (`workstream_id`) | Opsional untuk tugas mandiri |
| Milestone | Proyek | Ganti proyek mengosongkan milestone |
| Dokumen, kontak, rapat, isu | Tugas | Penanda, bukan salinan data |
| Keputusan | Rapat | Tampil di proyek lewat rapat yang ditautkan tugas |
| Kas | Anggota, barang, gerai | Opsional; tidak membuat transaksi lain |
| Stok opname | Barang | Wajib |
| Pengiriman | Pembelian | Opsional |

Server memeriksa setiap rujukan sebelum menyimpan. Rujukan yang hilang ditolak. Angka ringkasan hanya mencakup data yang sudah dimuat; tombol "Muat lagi" mengambil halaman berikutnya.

### Urutan mengisi buku

1. **Anggota**, bila perlu.
2. **Barang**, sebelum opname.
3. **Kas**, setiap ada transaksi. Tidak perlu mengisi anggota atau barang untuk transaksi umum.
4. **Stok opname**, lalu tinjau selisih dan catat mutasi koreksi bila perlu.

## Aturan data

- Tanpa data karangan. Jangan mengarang nama, kontak, capaian, atau angka operasional.
- Modul yang belum aktif ditulis "belum aktif". Data kosong ditulis kosong. Galat database tidak boleh menjadi angka nol.
- Data contoh hanya di mode demo dan seed. Semua id contoh diawali `c0de0000` dan berlabel contoh.
- Identitas koperasi dan manajer diambil dari profil di Pengaturan.
- Tanggal dan jam memakai zona Asia/Jakarta (WIB).
- Grafik hanya dipakai bila menjawab pertanyaan kerja, selalu dengan ringkasan teks. Data parsial ditandai.
- Satu sumber data: halaman web dan Dunia 3D membaca catatan yang sama.
- Tidak ada tombol hapus untuk transaksi kas, anggota, opname, dan mutasi di halaman pencatatan. Barang yang sudah punya mutasi tidak bisa dihapus.

## Keputusan pemilik

Keputusan tentang gaya tampilan lama tidak dicatat lagi. Riwayatnya ada di Git dan CHANGELOG.

- **Sejak awal (akhir Sep 2026)**: aplikasi pribadi satu manajer. Proyek fleksibel memakai `workstreams`. Tidak ada program wajib 90 hari. Catatan lama dipertahankan.
- **Sejak awal**: pakai Supabase baru. Database lama tidak disentuh. SQL cloud dijalankan pemilik setelah dampak dan tujuannya dijelaskan.
- **1 Okt 2026**: pencatatan terpisah dari ruang kerja: anggota, kas, barang, stok opname. Kas bukan akuntansi lengkap. Opname tidak mengoreksi stok otomatis. Rapat mendukung online/hybrid, tautan, durasi, dan ICS.
- **4 Okt 2026**: formulir tugas mendahulukan proyek; tugas mandiri tetap boleh. Progres 100% tidak menutup proyek. Proyek tertutup ada di Riwayat proyek.
- **5 Okt 2026**: Dunia Koperasi 3D menjadi tampilan utama data. Dunia membaca data yang sama dan tidak menulis data sendiri.
- **6 Okt 2026**: pengiriman dan mutasi stok ditambahkan (migrasi 8). Stok hanya berubah lewat mutasi.
- **10 Okt 2026**: pelatihan bertanggal hari ini dihitung sebagai kegiatan di dunia. Dunia dan web bertautan dua arah.
- **13 Okt 2026**: status draf/final laporan tetap terjaga saat cadangan dipulihkan (migrasi 9).
- **15 Okt 2026**: administrasi usaha ditambahkan (migrasi 10): simpanan, penjualan harian, pembelian, aset, absensi. Simpanan hanya setor/tarik pokok, wajib, sukarela.
- **22–23 Okt 2026**: tampilan web dirombak total.
  - Acuan rasa (pemilik, 2 Nov 2026): tiga video acuan, rinciannya di [TAMPILAN](TAMPILAN.md).
  - Gradasi hanya di latar halaman; kartu, tombol, dan grafik warna solid.
  - Huruf Figtree.
  - Warna aksi biru tua, ditambah lima aksen sorotan.
  - Rutin harian disimpan di database lewat migrasi 11, dengan hari aktif per rutin.
  - Kode dan alamat halaman memakai bahasa Inggris. Alamat lama dialihkan.
  - HP, tablet, dan laptop sama penting.
  - Dunia 3D punya gaya sendiri dan tidak ikut redesain web.

## Akses dan bahasa

- Area sentuh minimal 44 px. Fokus keyboard terlihat. Status tidak hanya ditandai warna.
- Hormati reduced-motion dan safe area. Tabel dan Gantt bergulir di dalam kotaknya atau berubah menjadi kartu di layar sempit.
- Bahasa Indonesia sehari-hari: langsung, ringkas, tidak terdengar terjemahan, tanpa slogan.
- Setiap data yang tampil bisa dibuka ke sumbernya. Tidak ada tombol hiasan.
