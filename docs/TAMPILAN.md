# Tampilan

Gaya yang berlaku sekarang (arahan pemilik 25 Oktober 2026) mengikuti acuan video dashboard: latar batu hangat, kartu putih bersudut besar, aksen hijau sage, tombol hitam kebiruan, rel navigasi kapsul melayang, dan gerak yang mengalir. Kartu pastel per proyek (TaskTrack) tetap dipakai untuk warna proyek. Ini bukan aturan permanen. Mengganti tampilan cukup dengan mengubah token; komponen tidak boleh berisi warna mentah.

## Aturan tetap

- Semua warna di blok token `src/app/globals.css`. Komponen memakai kelas token: `bg-canvas`, `bg-surface`, `text-ink`, `text-ink-2`, `bg-accent`, `bg-action`, `bg-tone`, dan seterusnya.
- **Tanpa gradasi** di mana pun (pemilik: gradasi = AI slop). Warna solid dan lembut.
- Tidak ada `!important` kecuali pengaturan `prefers-reduced-motion` dan cetak.
- Satu `h1` per halaman (`PageHeader` atau kepala detail).
- Area sentuh minimal 44 px di HP; fokus keyboard selalu terlihat; status ditandai teks, bukan warna saja.
- Hormati `prefers-reduced-motion`.

## Token

| Kelompok | Token | Arti |
|---|---|---|
| Permukaan | `canvas`, `surface`, `surface-2`, `surface-3`, `line`, `line-strong` | latar, kartu, garis |
| Teks | `ink`, `ink-2`, `ink-3` | utama, kedua, keterangan (kontras ≥ 4.5:1) |
| Aksi | `action`, `action-hover`, `on-action` | tombol utama, menu aktif di rel, dan tombol tambah HP: hitam kebiruan di tema terang, sage tua di tema gelap |
| Logo | `brand`, `on-brand` | tanda Kopdes (ubin koral) dan titik pengingat |
| Sorotan | `accent`, `accent-ink`, `accent-strong` | tab, fokus, cincin progres; bawaan sage, 6 pilihan pengguna (sage, lavender, langit, mint, peach, mawar) |
| Status | `plan`, `doing`, `done`, `late`, `warn` (+ `-ink`) | rencana, dikerjakan, selesai, terlambat, perhatian |
| Nada kartu | `tone`, `tone-ink`, `tone-bar`, `tone-line` | dipasang lewat `data-tone="rose\|peach\|sky\|lavender\|mint\|lemon\|slate"` |
| Kolom isian | `field`, `field-line` | latar dan garis kolom yang terlihat saat diam; saat diketik menyala warna sorotan |
| Contoh sorotan | `swatch-sage`, `swatch-lavender`, `swatch-sky`, `swatch-mint`, `swatch-peach`, `swatch-rose` | bulatan pemilih warna di Pengaturan |

- Tema terang dan gelap: `data-theme` di `<html>`, pilihan tersimpan di `localStorage` (`kopdes-theme`, `kopdes-accent`), diterapkan sebelum halaman tampil.
- Warna kartu tugas dan proyek mengikuti **proyek** (`lib/tones.ts`, kolom `color` proyek). Kartu catatan lain mengikuti artinya: kas masuk mint, keluar mawar; stok habis mawar, menipis peach (`features/records/card-tone.ts`).
- Huruf: Urbanist (`@fontsource-variable/urbanist`), satu token `--font-sans`.

## Komponen

| Komponen | Berkas | Catatan |
|---|---|---|
| Laci / lembar bawah | `components/ui/sheet.tsx` | Semua formulir dan detail. Panel penuh tinggi menempel di kanan (garis sorotan di atas, tutup di kiri atas, judul besar) di tablet/laptop; dari bawah di HP. Di HP lembar bisa ditarik turun dari pegangan untuk menutup (lebih dari sepertiga atau dikibas cepat), kurang dari itu kembali ke tempat. Detail tugas memakai daftar label–nilai dan subtugas berupa kapsul |
| Kolom isian | `components/ui/field.tsx` | `Input`, `Select`, `Textarea`, `Field` (label, wajib, petunjuk, galat berikon), `SearchField` (ikon menyala, tombol hapus, Esc mengosongkan). Kolom di bilah alat memakai `TOOLBAR_CONTROL` (kartu putih). Kolom tanggal/jam berikon kalender/jam di kiri dan seluruh kolom membuka pemilih; `Select` dan `Input` menerima `icon` |
| Menu dan popover | `components/ui/menu.tsx` | `MenuContent`, `MenuItem` (`danger` untuk batalkan/hapus), `MenuSeparator`, `PopoverContent`. Satu bentuk untuk semua menu tarik-turun dan popover |
| Palet Ctrl K | `components/layout/command-palette.tsx` | Setiap hasil bertanda jenis: ubin ikon dan label di kanan. Catatan berwarna menurut kelompok menunya (Kerja lavender, Catatan langit, Usaha peach, Koperasi mint) dengan label pendek (Tugas, Proyek, Agenda…); Perintah dan Menu berubin netral. Kata yang dicari ditandai. Urutan: Hasil, Perintah, Menu, lalu Buat tugas paling bawah |
| Petunjuk tombol | `components/ui/kbd.tsx` | Satu bentuk tombol papan ketik di bilah atas, palet, Dunia 3D, dan daftar pintasan |
| Linimasa (Gantt) | `features/tasks/task-timeline.tsx` | Satu baris per proyek (tugas yang bertumpuk turun ke lajur berikut), kisi hari, kolom hari ini berbayang, garis jam sekarang, batang kapsul berisi avatar; batang terpilih berwarna penuh |
| Pengaturan | `features/settings/settings-page.tsx` | Satu halaman tanpa tab: kartu profil, tema lewat pratinjau mini, warna sorotan berupa kapsul, keamanan dan data sebagai baris berkelompok; Ganti PIN di laci. Tema dan warna sorotan hanya diatur di sini; menu profil berisi Pengaturan dan Kunci aplikasi saja |
| Konfirmasi | `components/ui/confirm.tsx` | Satu-satunya dialog di tengah, hanya untuk tindakan yang tak bisa diurungkan |
| Toast + Urungkan | `sonner` di kerangka | Hasil aksi; perubahan tugas selalu bisa diurungkan. Gaya bawaan sonner dimatikan (`unstyled`), semua kelas dari token |
| Tab bergeser | `components/ui/tabs.tsx` | Penanda aktif meluncur (Motion) |
| Ubin angka | `components/ui/stat.tsx` | Ringkasan pastel; catatan kecil menjelaskan arti angka |
| Kartu tugas | `features/tasks/task-card.tsx` | Label proyek, centang, progres bersegmen, avatar, tenggat |
| Hiasan | `components/ui/wave.tsx` | Satu-satunya hiasan kartu: lipatan timbul di kanan atas (dua bidang V lebih terang dengan bayangan lembut berwarna kartu), seperti kartu TaskTrack |
| Detail tugas | `features/tasks/task-sheet.tsx` | Sifat tugas (penanggung jawab dengan avatar, status, prioritas bendera, tenggat, proyek) berupa kolom lunak berikon; jadwal berulang berlabel Ulangi/Jam/Sampai tanggal |
| Pemilih tampilan | `components/ui/view-menu.tsx` | "Papan — Ganti tampilan ⌄" di kepala halaman Tugas |
| Logo | `components/ui/logo.tsx`, `app/icon.svg` | Ubin koral dengan atap gerai dan centang; dipakai di sidebar dan halaman PIN |
| Kepala halaman | `components/layout/page-header.tsx` | Bilah putih: judul dan ringkasan di kiri, aksi di kanan. Beranda memakai bilah tanggal (bulan, hari ini, tim) |

## Kerangka

- Tablet dan laptop (≥ 768 px): rel kapsul putih 68 px melayang di kiri. Ikon berkelompok (Kerja, Catatan, Usaha, Koperasi) dipisah garis tipis; menu aktif berupa lingkaran gelap yang meluncur; nama menu muncul sebagai label melayang. Dunia 3D, Pengaturan, Bantuan, dan avatar profil di bawah.
- HP (< 768 px): bilah atas ringkas + navigasi bawah melayang. Item aktif mengembang menjadi kapsul pastel berlabel yang meluncur; tombol tambah biru tua (warna aksi) di tengah membuka menu tambah cepat. Bilah bawah minggir saat menggulir ke bawah dan muncul lagi saat menggulir ke atas (`lib/use-hide-on-scroll.ts`), agar tidak menutupi isi. Saringan Tugas menjadi satu baris geser.
- Bilah atas tanpa garis: sapaan di kiri; kotak cari berbentuk pil dengan tombol bulat gelap (Ctrl K), lonceng bulat putih, dan tombol Tambah hitam di kanan. Kepala halaman (judul + ringkasan) langsung di atas latar, bukan bilah putih.
- Beranda berupa bento: empat ubin angka putih (angka menghitung naik), rutin hari ini, progres tugas setengah donat, tugas cepat, tenggat dekat, Hari ini, Perlu perhatian, dan proyek berjalan sebagai kartu dengan cincin persen.
- Halaman PIN: satu kartu di tengah. Kotak per angka yang terisi titik, cincin gembok mengikuti jumlah angka, tombol terisi bertahap; berhasil = hijau bercentang, salah = kartu bergetar dan titik rontok.

## Gerak

- Tiga kurva di `globals.css`: `--ease-out` (masuk biasa, 0,2–0,45 detik), `--ease-spring` (pegas lembut yang sedikit melewati lalu kembali: menu, popover, palet, dialog), `--ease-sheet` (laci: cepat di awal, mendarat pelan).
- Menu dan popover (`.menu`) tumbuh dari tombol pemicunya (asal gerak dari Radix); butirnya naik berurutan 25 ms.
- Palet (`.palette`) turun dengan pegas; tinggi daftar mengikuti jumlah hasil; baris naik berurutan hanya saat dibuka (saat mengetik cmdk memindah baris, animasi berulang terasa berkedip).
- Laci (`.sheet`) meluncur dari kanan (tablet/laptop) atau bawah (HP); judul lalu isinya menyusul. Ubin tambah cepat naik berurutan.
- Yang lain: kartu masuk berurutan, penanda menu/tab meluncur, centang pop, kartu berpindah kolom, konfeti kecil saat semua rutin selesai.
- Gerak berkurang (`prefers-reduced-motion`): lapisan hanya memudar 0,15 detik, animasi berurutan tanpa jeda, dan Motion ikut (`MotionConfig reducedMotion="user"`).
- Animasi dimuat lewat `LazyMotion` agar tidak memperbesar unduhan awal.

## Kata-kata di layar

Bahasa Indonesia sehari-hari, langsung, tidak terdengar terjemahan, tanpa slogan dan tanpa tanda seru berlebihan.

| Pakai | Hindari |
|---|---|
| Tambah, Simpan, Ubah, Hapus, Batal | Submit, Proceed, Konfirmasi Data Anda |
| Selesai, Dikerjakan, Rencana, Terlambat | Done, In progress, To-do |
| Tenggat, Hari ini, Besok, 3 hari lagi | Due date, Deadline |
| Urungkan | Undo, Batalkan aksi |
| Belum ada tugas. | Wah, belum ada tugas nih! |
| Data belum dapat dimuat | Terjadi kesalahan tak terduga |
