# Tampilan

Gaya yang berlaku sekarang (arahan pemilik 2 November 2026) mengikuti tiga acuan video: **tema gelap** mengikuti Solvik (latar warna buram, panel hampir hitam, kartu berwarna, aksi hijau limau, pil menu di atas, rel ikon di kiri), **tema terang dan isi Beranda** mengikuti Kinlo (latar aqua dan persik, aksi teal, sapaan besar, satu kartu ringkasan gelap), dan **gerak** mengikuti Crew (isi muncul berurutan dari buram, grafik tergambar, peta koperasi yang hidup). Ini bukan aturan permanen. Mengganti tampilan cukup dengan mengubah token; komponen tidak boleh berisi warna mentah.

Tampilan sebelumnya tersimpan utuh di cabang `arsip/desain-oktober` di GitHub.

## Aturan tetap

- Semua warna di blok token `src/app/globals.css`. Komponen memakai kelas token: `bg-surface`, `text-ink-2`, `bg-action`, `bg-tone`, `panel-deep`, dan seterusnya.
- **Gradasi hanya di latar halaman** (token `--ground`, keputusan pemilik 2 Nov 2026). Kartu, tombol, dan grafik tetap warna solid; isian grafik memakai warna tembus datar, bukan gradasi. Titik paling terang latar gelap dijaga agar `ink-3` tetap ≥ 4,5:1 (saat ini 4,62:1); ukur ulang bila `--ground` diubah.
- **Warna kuat hanya dua:** warna aksi (limau di tema gelap, teal di tema terang) untuk aksi dan progres, koral (`late-bar`) khusus terlambat. Nada kartu sengaja redup dan setingkat terangnya; ikon angka satu warna; status lain cukup kata atau lencana lembut. Semua panel Beranda satu warna (arahan pemilik 2 Nov 2026: hindari tabrakan warna).
- Tidak ada `!important` kecuali pengaturan `prefers-reduced-motion` dan cetak.
- Satu `h1` per halaman (`PageHeader` atau kepala detail).
- Area sentuh minimal 44 px di HP; fokus keyboard selalu terlihat; status ditandai teks, bukan warna saja.
- Hormati `prefers-reduced-motion`.
- Panel tembus tidak memakai `backdrop-filter`: warna latar sudah terlihat lewat panel, jadi HP murah tetap ringan. Blur hanya untuk bilah atas saat digulir dan lapisan di belakang laci.

## Token

| Kelompok | Token | Arti |
|---|---|---|
| Latar | `canvas`, `ground` | warna dasar dan latar buram satu lapis tetap (`body::before`) |
| Permukaan | `surface`, `surface-solid`, `surface-2`, `surface-3`, `line`, `line-strong` | panel tembus, panel padat, isian tipis di atas panel, garis. Laci, menu, palet, dan dialog otomatis padat (`--surface` ditimpa di `.sheet`, `.menu`, `.pop`, `.palette`) |
| Teks | `ink`, `ink-2`, `ink-3` | utama, kedua, keterangan (kontras ≥ 4.5:1 di atas latar dan panel) |
| Aksi | `action`, `action-hover`, `on-action` | tombol utama dan menu aktif di rel: limau di tema gelap, teal di tema terang |
| Logo | `brand`, `on-brand` | tanda Kopdes, warnanya sama dengan aksi |
| Sorotan | `accent`, `accent-ink`, `accent-strong` | tab, fokus, cincin; bawaan mengikuti tema, 5 pilihan lain (lavender, langit, mint, peach, mawar) |
| Status | `plan`, `doing`, `done`, `late`, `warn` (+ `-ink`, `-bar`), `on-bar` | isi lembut, teks, dan warna penuh. `Pill` lembut, kecuali terlambat yang penuh di tema gelap |
| Nada kartu | `tone`, `tone-ink`, `tone-bar`, `tone-line` | dipasang lewat `data-tone="rose\|peach\|sky\|lavender\|mint\|lemon\|slate"`. Hanya `tone-bar` dan `tone-ink` yang berbeda per nada; isi kartu dihitung dari `tone-bar` 11% dan warna panel, jadi kartu selalu menyatu dengan temanya |
| Kolom isian | `field`, `field-line` | latar dan garis kolom yang terlihat saat diam; saat diketik menyala warna sorotan |
| Contoh sorotan | `swatch-lime`, `swatch-lavender`, `swatch-sky`, `swatch-mint`, `swatch-peach`, `swatch-rose` | bulatan pemilih warna di Pengaturan |

- Tema dan sorotan: `data-theme` dan `data-accent` di `<html>`, pilihan tersimpan di `localStorage` (`kopdes-theme-v2`, `kopdes-accent-v3`), diterapkan sebelum halaman tampil. Bawaan tema gelap.
- Permukaan kartu netral. Warna proyek (`lib/tones.ts`, kolom `color` proyek) dan warna arti catatan (kas masuk mint, keluar mawar; stok habis mawar, menipis peach, `features/records/card-tone.ts`) hanya tampil sebagai titik kecil, batang progres, dan cincin.
- Penempatan kartu: tinggi kartu sama dalam satu baris, isi panjang bergulir di dalam kartu (kartu tidak meregang), sela antarkartu seragam, dan tidak ada dua bilah tab bertumpuk.
- Huruf: Urbanist (`@fontsource-variable/urbanist`), satu token `--font-sans`. Ketebalan diturunkan satu tingkat di `@theme` (`--font-weight-semibold/bold/extrabold`) agar seluruh aplikasi ringan seperti acuan; judul halaman `font-normal`.

## Komponen

| Komponen | Berkas | Catatan |
|---|---|---|
| Pil menu atas | `components/layout/top-nav.tsx` | Satu butir per kelompok (Kerja, Catatan, Usaha, Koperasi) ditambah Dunia 3D. Penanda meregang: tepi depan 0,36 detik, tepi belakang 0,56 detik; bergerak saat diklik tanpa menunggu halaman baru |
| Rel ikon | `components/layout/sidebar.tsx` | Kapsul di kiri: halaman dalam kelompok aktif, tombol Tambah, lalu Pengaturan, Bantuan, dan tema. Menu aktif lingkaran warna aksi yang meluncur; nama muncul sebagai label melayang |
| Kepala halaman | `components/layout/page-header.tsx` | Judul besar ringan, angka berikon bulat sebaris (`sections`), aksi di kanan. HP dan tablet: angka di baris sendiri. Di halaman catatan kepala dibangun `RecordsView` karena angkanya mengikuti saringan; panel di bawahnya lewat `details` (`entity-views.tsx`) |
| Angka ringkasan | `components/ui/stat.tsx` | `StatTile` langsung di atas latar: ikon satu warna dalam lingkaran (koral bila nada `rose`), angka menghitung naik, label. Tanpa ubin |
| Grafik | `components/ui/charts.tsx` | `AreaChart` (mengisi tinggi induk, warna dari `data-tone`), `BarChart` (batang berdampingan), `StackBar` (satu baris bertumpuk). Digambar sesuai piksel asli |
| Peta koperasi | `features/home/coop-map.tsx`, `coop-map-data.ts` | Panel utama Beranda. Satu angka besar (jumlah yang perlu ditangani, mengikuti saringan dan bidang terpilih), delapan baris bidang dengan letak tetap, dan daftar yang bisa langsung ditindak (centang, tunda, opname, beli stok). Tiap baris bidang: ikon, nama, jumlah mendesak atau satu fakta nyata, batang (koral mendesak, warna aksi lainnya), angka; centang bila aman, "Belum aktif" bila modul belum dimigrasi. Memilih bidang membuka rincian: angka, daftarnya, Tambah, Buka, dan Dunia 3D. Kolom tugas cepat ada di atas daftar. Aturan "perlu ditangani" hanya dari `getFollowUps`, sama dengan lonceng. Dimuat belakangan |
| Panel kerja | `components/ui/sheet.tsx` | Semua formulir dan detail. Tablet/laptop: panel melayang berjarak dari tepi, halaman di belakangnya bergeser memberi ruang, tombol tutup di kanan atas, aksi di bilah kapsul bawah. HP: lembar bawah yang bisa ditarik turun. Formulir langsung fokus ke kolom judul (kecuali di HP) |
| Isi formulir | `features/records/record-form.tsx`, `.form-hero`, `.form-group` | Judul dan nominal besar tanpa bingkai di atas; kolom lain berupa baris berkelompok, label kiri dan isian tanpa bingkai. Pilihan pendek berupa kapsul tersegmen. HP: label di atas isian |
| Detail tugas | `features/tasks/task-sheet.tsx` | Dua kolom di layar lebar: isi kerja di kiri, sifat dan jadwal di kanan. HP: sifat tugas lebih dulu |
| Kolom isian | `components/ui/field.tsx` | `Input`, `Select`, `Textarea`, `Field`, `SearchField`. Kolom di bilah alat memakai `TOOLBAR_CONTROL` (pil tipis di atas latar) |
| Menu dan popover | `components/ui/menu.tsx` | Satu bentuk untuk semua menu tarik-turun dan popover |
| Palet Ctrl K | `components/layout/command-palette.tsx` | Setiap hasil bertanda jenis, kata yang dicari ditandai |
| Petunjuk tombol | `components/ui/kbd.tsx` | Satu bentuk tombol papan ketik |
| Linimasa (Gantt) | `features/tasks/task-timeline.tsx` | Satu baris per proyek, batang kapsul berisi avatar |
| Pengaturan | `features/settings/settings-page.tsx` | Satu halaman: kartu profil, tema lewat pratinjau mini, warna sorotan, keamanan, data |
| Konfirmasi | `components/ui/confirm.tsx` | Satu-satunya dialog di tengah, hanya untuk tindakan yang tak bisa diurungkan: ikon bulat, judul, dua tombol sama lebar |
| Toast + Urungkan | `sonner` di kerangka | Hasil aksi; gaya bawaan dimatikan, semua kelas dari token |
| Pemilih tampilan | `components/ui/view-menu.tsx` | Satu kapsul di bilah alat Tugas (Daftar, Papan, Kalender, Linimasa) |
| Tab | `components/ui/tabs.tsx` | Kapsul tersegmen, penanda meluncur |
| Kartu tugas | `features/tasks/task-card.tsx` | Kartu netral dengan titik warna proyek: tenggat dan tombol bulat di atas, judul, nama proyek, progres, avatar di bawah |
| Kartu catatan | `features/records/record-card.tsx` | Kartu netral dengan titik warna menurut arti: status dan tanggal, judul, fakta penting, tautan cepat, orang. Anggota, Kontak, dan Tim memakai kartu orang: avatar besar, nama, dua fakta, tombol WhatsApp dan telepon bila ada nomor. Di HP kartu orang menjadi baris ringkas |
| Logo | `components/ui/logo.tsx`, `app/icon.svg` | Ubin warna aksi dengan atap gerai dan centang |

## Kerangka

- Susunan halaman catatan selalu sama: judul dan angka, lalu tab di kiri dengan tombol aksi dan Tambah di kanan, lalu pencarian dan saringan sebaris, panel rincian, dan daftar. Halaman Proyek memakai satu bilah tab: Berjalan, Riwayat & arsip, Risiko, Kendala.
- Tablet dan laptop (≥ 768 px): bilah atas (logo, pil menu di tengah, cari, lonceng, profil) dan rel ikon di kiri. Bilah atas tanpa latar di puncak halaman, berkabut saat digulir.
- HP (< 768 px): bilah atas ringkas + navigasi bawah melayang. Item aktif mengembang menjadi kapsul berlabel; tombol tambah warna aksi di tengah. Bilah bawah minggir saat menggulir ke bawah (`lib/use-hide-on-scroll.ts`). Semua halaman ada di menu lengkap.
- Beranda mengikuti susunan acuan: satu panel utama dan satu kartu ringkasan. Urut baca: sapaan dan tiga angka berikon → Peta koperasi (panel utama) dan Rutin hari ini (kartu ringkasan `panel-deep`) sama tinggi → hari ini dan tenggat berikutnya → tinjauan (progres tugas, tugas selesai per minggu, proyek berjalan dalam satu panel berkolom). Di HP dan tablet rutin didahulukan: rutin → peta → hari ini → tenggat → tinjauan.
- Aturan Beranda (arahan pemilik 3 Nov 2026: bersih, simpel, tetap informatif): satu fakta tampil sekali. Yang terlambat dan jatuh hari ini ada di daftar peta, tenggat berikutnya hanya yang akan datang, tugas di panel hari ini hanya untuk hari lain. Di dalam panel dipakai baris polos, bukan kartu di dalam kartu. Warna kuat tetap hanya aksi dan koral.
- Kas: angka ringkasan, grafik uang masuk dan keluar per bulan, lalu daftar. Tidak pernah disebut saldo atau laba.
- Halaman PIN: tanpa kartu, langsung di atas latar buram: logo, judul, titik per angka, papan angka 3×4. Di perangkat sentuh keyboard bawaan tidak ikut muncul.
- Dunia 3D punya bilahnya sendiri dan membaca token yang sama.

## Gerak

- Pindah halaman: latar diam, bagian baru muncul berurutan dari buram (`.page-enter`, jeda 70 ms). Blur hanya di tablet dan laptop karena mahal di HP.
- Grafik: garis tergambar dari kiri (`.chart-line`), batang tumbuh dari dasar berurutan (`.chart-bar`), bilah bertumpuk memanjang, cincin terisi, angka menghitung naik.
- Pil menu meregang dan bergerak saat diklik; klik selalu membuka halaman pertama kelompok. Penanda rel dan tab meluncur.
- Ganti tema: sapuan melingkar 0,48 detik dari tombolnya (View Transitions, `lib/theme.ts`). Peramban tanpa fitur itu langsung berganti.
- Kurva di `globals.css`: `--ease-out` (masuk biasa), `--ease-spring` (menu, popover, palet, dialog), `--ease-sheet` (laci).
- Menu tumbuh dari tombol pemicunya; butirnya naik berurutan 25 ms. Palet turun dengan pegas; baris berurutan hanya saat dibuka. Panel kerja muncul dari buram sambil meluncur dan halaman bergeser (tablet/laptop) atau naik dari bawah (HP); judul lalu isinya menyusul.
- Gerak berkurang (`prefers-reduced-motion`): lapisan hanya memudar, animasi tanpa jeda, Motion ikut (`MotionConfig reducedMotion="user"`), tema langsung berganti.
- Animasi dimuat lewat `LazyMotion`, peta koperasi dan laci tugas lewat `next/dynamic` agar tidak memperbesar unduhan awal.

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
