# Pencatatan anggota, kas, barang, dan opname

## Aktivasi database

Berkas: `supabase/migrations/20261001000002_operations.sql`.
Proyek tujuan: **<project-ref>**, Supabase baru Kopdes Management Web.

Migrasi ini:
- Memperluas jenis catatan pada tabel `hub_records` untuk anggota, transaksi kas, barang, dan stok opname. Tetap enam tabel fisik.
- Menambahkan nomor anggota dan kode barang yang unik, pemeriksaan nominal/jumlah, serta relasi opname ke barang.
- Menambahkan fungsi pemeriksaan aktivasi yang hanya dapat dipanggil server.
- Mempertahankan data lama, PIN, sesi, dan RLS. Tidak menghapus tabel atau catatan.

Migrasi ini sebelumnya dikonfirmasi dijalankan pemilik dan kemampuan pencatatan pernah diperiksa secara lokal. Jangan menjalankan ulang berdasarkan panduan ini; periksa keadaan proyek sesuai [MIGRASI-SQL](MIGRASI-SQL.md). Untuk lingkungan baru, jelaskan SQL dan minta persetujuan sebelum mengikuti langkah berikut:
1. Unduh cadangan JSON dari Pengaturan dan simpan di tempat pribadi.
2. Buka proyek **<project-ref>** di Supabase, lalu SQL Editor → New query.
3. Salin seluruh isi berkas migrasi di atas dan jalankan **sekali**. Jangan jalankan ulang migrasi pertama.
4. Pastikan transaksi selesai tanpa error. Jika gagal, transaksi dibatalkan; jangan menghapus constraint secara manual.
5. Muat ulang aplikasi. Keterangan “Pencatatan belum diaktifkan” akan hilang setelah fungsi baru tersedia pada API Supabase.
6. Catat satu data nyata, buka ulang halaman, dan periksa data tersimpan. Jangan kirim data pribadi atau kunci database melalui chat.

Migrasi diuji dengan PostgreSQL lokal. Konfirmasi pemasangan sebelumnya tidak menggantikan uji simpan setelah reset; lihat [STATUS](STATUS.md) untuk batas bukti cloud.

## Pemakaian

- **Anggota**: nama, nomor anggota unik, tanggal bergabung, kontak, alamat, status, catatan. Tidak menyimpan NIK.
- **Buku kas**: catat uang masuk/keluar, nominal rupiah bulat, tanggal, kategori, kas/rekening, gerai, nomor bukti dan tautan berkas. Ringkasan mengikuti filter; selisih transaksi bukan saldo rekening, laba, atau laporan akuntansi lengkap. Saldo awal tidak diasumsikan.
- **Barang**: kode unik, nama, gerai, satuan, rak gudang (A–F, untuk Dunia Koperasi), stok buku dan batas minimum. Stok berupa unit bulat. Kode unik lintas gerai; gunakan kode berbeda per penempatan jika barang sama berada di beberapa gerai.
- **Stok opname**: dari Barang pilih **Hitung stok**, atau tambah opname dan pilih barang. Stok buku disalin sebagai pembanding; isi hasil hitung fisik dan petugas. Selisih = fisik − buku. Penyimpanan opname tidak memperbarui stok barang otomatis. Koreksi barang dilakukan terpisah agar catatan pemeriksaan tidak berubah.
- Filter, pencarian, ubah catatan, dan CSV tersedia per buku. Angka ringkasan hanya ditampilkan jika modul aktif dan data berhasil dimuat.
- Backup JSON dan pemulihan mencakup domain baru. CSV hanya ekspor; tidak ada impor CSV. Anggota dapat dinonaktifkan; tidak ada tombol hapus transaksi/anggota/opname pada halaman pencatatan.

## Pengiriman dan mutasi stok (migrasi 8)

- **Pengiriman** (`/pengiriman`): arah masuk/keluar, status dipesan → dikirim → tiba → diperiksa → selesai (atau dibatalkan), suplier/ekspedisi dari Mitra & kontak (kategori Suplier/Ekspedisi), gerai tujuan, tanggal rencana/tiba, pintu dok D1–D4, kendaraan/sopir dan rincian barang. Mengubah status pengiriman tidak mengubah stok.
- **Mutasi stok**: satu baris per barang — masuk, keluar, koreksi tambah, koreksi kurang — dengan jumlah bulat positif, tautan opsional ke pengiriman, gerai, atau stok opname. Menyimpan mutasi langsung mengubah stok buku barang dalam satu transaksi dan mencatat stok sebelum/sesudah. Stok tidak boleh menjadi negatif.
- Mutasi tidak dapat diubah atau dihapus. Kesalahan diperbaiki dengan mutasi koreksi baru agar jejak stok tetap utuh. Barang yang sudah punya mutasi tidak dapat dihapus.
- Hasil opname tetap tidak mengubah stok otomatis; bila perlu koreksi, catat mutasi "koreksi" dan pilih opname terkait.

## Administrasi usaha (migrasi 10)

- **Simpanan anggota** (`/simpanan`): setor atau tarik simpanan pokok, wajib, sukarela per anggota. Penarikan yang membuat saldo jenis itu minus ditolak database. Ringkasan menampilkan saldo per jenis dari catatan yang dimuat. Uang yang benar-benar diterima tetap dicatat di Buku kas.
- **Penjualan harian** (`/penjualan`): omzet dan jumlah transaksi per gerai per hari (satu catatan per gerai per hari). Bukan laba dan bukan POS.
- **Pembelian** (`/pembelian`): pesanan ke pemasok (Mitra & kontak), status draf → dipesan → diterima/dibatalkan, perkiraan tiba, total. Barang yang datang dicatat sebagai pengiriman masuk yang menaut pembelian; stok tetap berubah hanya lewat mutasi.
- **Inventaris aset** (`/aset`): kategori, kondisi (baik, perlu perbaikan, rusak, dihapuskan), lokasi gerai, nilai perolehan, pemegang. Tanpa penyusutan.
- **Jadwal & absensi** (`/absensi`): satu catatan per petugas per hari; status terjadwal untuk jadwal ke depan, lalu hadir/terlambat/izin/sakit/cuti/alpa/libur dengan jam datang dan pulang.
- Judul absensi, penjualan, dan simpanan diisi otomatis dari petugas, gerai, atau anggota.

## Rapat online

Pilih jenis tatap muka, online, atau hybrid. Isi lokasi/tautan pertemuan, waktu WIB dan durasi. Tombol Bergabung membuka layanan yang Anda pilih. **Unduh agenda (.ics)** dapat diimpor ke aplikasi kalender. Aplikasi tidak membuat ruang Zoom/Meet, mengundang peserta, merekam video, atau mengirim email otomatis.

## Batas saat ini

Belum ada pinjaman anggota, iuran otomatis, penyusutan aset, jurnal akuntansi berpasangan, rekonsiliasi bank, pergerakan stok otomatis, transaksi POS, multiuser atau sinkronisasi kalender dua arah. Penyuntingan catatan memakai pola terakhir disimpan; belum ada penguncian untuk perubahan bersamaan dari beberapa perangkat.
