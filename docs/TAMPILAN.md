# Tampilan

Gaya yang berlaku sekarang (arahan pemilik 2 November 2026) mengikuti tiga acuan video: **tema gelap** mengikuti Solvik (latar warna buram, panel hampir hitam, kartu berwarna, aksi hijau limau, pil menu di atas, rel ikon di kiri), **tema terang dan isi Beranda** mengikuti Kinlo (latar aqua dan persik, aksi teal, sapaan besar, kartu ringkasan gelap), dan **gerak** mengikuti Crew (isi muncul berurutan dari buram, grafik tergambar, konstelasi yang hidup). Ini bukan aturan permanen. Mengganti tampilan cukup dengan mengubah token; komponen tidak boleh berisi warna mentah.

Tampilan sebelumnya tersimpan utuh di cabang `arsip/desain-oktober` di GitHub.

## Aturan tetap

- Semua warna di blok token `src/app/globals.css`. Komponen memakai kelas token: `bg-surface`, `text-ink-2`, `bg-action`, `bg-tone`, `bg-deep`, dan seterusnya.
- **Gradasi hanya di latar halaman** (token `--ground`, keputusan pemilik 2 Nov 2026). Kartu, tombol, dan grafik tetap warna solid; isian grafik dan cahaya titik memakai warna tembus datar, bukan gradasi. Titik paling terang latar gelap dijaga agar `ink-3` tetap ≥ 4,5:1 (saat ini 4,62:1); ukur ulang bila `--ground` diubah.
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
| Panel gelap | `deep`, `deep-2`, `on-deep`, `on-deep-2` | kartu ringkasan dan konstelasi; tetap gelap di kedua tema, isinya memakai `data-theme="dark"` |
| Teks | `ink`, `ink-2`, `ink-3` | utama, kedua, keterangan (kontras ≥ 4.5:1 di atas latar dan panel) |
| Aksi | `action`, `action-hover`, `on-action` | tombol utama dan menu aktif di rel: limau di tema gelap, teal di tema terang |
| Logo | `brand`, `on-brand` | tanda Kopdes, warnanya sama dengan aksi |
| Sorotan | `accent`, `accent-ink`, `accent-strong` | tab, fokus, cincin; bawaan mengikuti tema, 5 pilihan lain (lavender, langit, mint, peach, mawar) |
| Status | `plan`, `doing`, `done`, `late`, `warn` (+ `-ink`, `-bar`), `on-bar` | isi lembut, teks, dan warna penuh. `Pill` lembut, kecuali terlambat yang penuh di tema gelap |
| Nada kartu | `tone`, `tone-ink`, `tone-bar`, `tone-line` | dipasang lewat `data-tone="rose\|peach\|sky\|lavender\|mint\|lemon\|slate"`. Redup dan setingkat terangnya agar tidak saling bertabrakan |
| Kolom isian | `field`, `field-line` | latar dan garis kolom yang terlihat saat diam; saat diketik menyala warna sorotan |
| Contoh sorotan | `swatch-lime`, `swatch-lavender`, `swatch-sky`, `swatch-mint`, `swatch-peach`, `swatch-rose` | bulatan pemilih warna di Pengaturan |

- Tema dan sorotan: `data-theme` dan `data-accent` di `<html>`, pilihan tersimpan di `localStorage` (`kopdes-theme-v2`, `kopdes-accent-v3`), diterapkan sebelum halaman tampil. Bawaan tema gelap.
- Warna kartu tugas dan proyek mengikuti **proyek** (`lib/tones.ts`, kolom `color` proyek). Kartu catatan lain mengikuti artinya: kas masuk mint, keluar mawar; stok habis mawar, menipis peach (`features/records/card-tone.ts`).
- Huruf: Urbanist (`@fontsource-variable/urbanist`), satu token `--font-sans`. Ketebalan diturunkan satu tingkat di `@theme` (`--font-weight-semibold/bold/extrabold`) agar seluruh aplikasi ringan seperti acuan; judul halaman `font-normal`.

## Komponen

| Komponen | Berkas | Catatan |
|---|---|---|
| Pil menu atas | `components/layout/top-nav.tsx` | Satu butir per kelompok (Kerja, Catatan, Usaha, Koperasi) ditambah Dunia 3D. Penanda meregang: tepi depan 0,36 detik, tepi belakang 0,56 detik; bergerak saat diklik tanpa menunggu halaman baru |
| Rel ikon | `components/layout/sidebar.tsx` | Kapsul di kiri: halaman dalam kelompok aktif, tombol Tambah, lalu Pengaturan, Bantuan, dan tema. Menu aktif lingkaran warna aksi yang meluncur; nama muncul sebagai label melayang |
| Kepala halaman | `components/layout/page-header.tsx` | Judul besar ringan, angka berikon bulat sebaris (`sections`), aksi di kanan. HP dan tablet: angka di baris sendiri. Di halaman catatan kepala dibangun `RecordsView` karena angkanya mengikuti saringan; panel di bawahnya lewat `details` (`entity-views.tsx`) |
| Angka ringkasan | `components/ui/stat.tsx` | `StatTile` langsung di atas latar: ikon satu warna dalam lingkaran (koral bila nada `rose`), angka menghitung naik, label. Tanpa ubin |
| Grafik | `components/ui/charts.tsx` | `AreaChart` (mengisi tinggi induk, warna dari `data-tone`), `BarChart` (batang berdampingan), `StackBar` (satu baris bertumpuk). Digambar sesuai piksel asli |
| Konstelasi kerja | `features/home/constellation.tsx`, `constellation-data.ts` | Kanvas 2D perspektif: proyek jadi gugus, tugas jadi titik (maks. 7 gugus, 14 titik per gugus, yang mendesak didahulukan). Berputar pelan, digeser untuk memutar, klik membuka tugas atau proyek, saringan Semua/Terlambat/Hari ini. Label digambar paling akhir dan menghindari tabrakan; area sentuh 44 px di perangkat sentuh. Selesai 30 hari terakhir tampil redup; yang terlambat berdenyut koral. Berhenti menggambar saat tidak terlihat. Dimuat belakangan |
| Laci / lembar bawah | `components/ui/sheet.tsx` | Semua formulir dan detail. Panel penuh tinggi di kanan (tablet/laptop), dari bawah di HP dan bisa ditarik turun untuk menutup |
| Kolom isian | `components/ui/field.tsx` | `Input`, `Select`, `Textarea`, `Field`, `SearchField`. Kolom di bilah alat memakai `TOOLBAR_CONTROL` (pil tipis di atas latar) |
| Menu dan popover | `components/ui/menu.tsx` | Satu bentuk untuk semua menu tarik-turun dan popover |
| Palet Ctrl K | `components/layout/command-palette.tsx` | Setiap hasil bertanda jenis, kata yang dicari ditandai |
| Petunjuk tombol | `components/ui/kbd.tsx` | Satu bentuk tombol papan ketik |
| Linimasa (Gantt) | `features/tasks/task-timeline.tsx` | Satu baris per proyek, batang kapsul berisi avatar |
| Pengaturan | `features/settings/settings-page.tsx` | Satu halaman: kartu profil, tema lewat pratinjau mini, warna sorotan, keamanan, data |
| Konfirmasi | `components/ui/confirm.tsx` | Satu-satunya dialog di tengah, hanya untuk tindakan yang tak bisa diurungkan |
| Toast + Urungkan | `sonner` di kerangka | Hasil aksi; gaya bawaan dimatikan, semua kelas dari token |
| Pemilih tampilan | `components/ui/view-menu.tsx` | Satu kapsul di bilah alat Tugas (Daftar, Papan, Kalender, Linimasa) |
| Tab | `components/ui/tabs.tsx` | Kapsul tersegmen, penanda meluncur |
| Kartu tugas | `features/tasks/task-card.tsx` | Kartu warna proyek: tenggat dan tombol bulat di atas, judul, nama proyek, progres, avatar di bawah |
| Kartu catatan | `features/records/record-card.tsx` | Kartu warna menurut arti, tautan cepat di dalam kartu. Anggota, Kontak, dan Tim memakai kartu orang: avatar besar, nama, dua fakta, tombol WhatsApp dan telepon bila ada nomor. Di HP kartu orang menjadi baris ringkas |
| Logo | `components/ui/logo.tsx`, `app/icon.svg` | Ubin warna aksi dengan atap gerai dan centang |

## Kerangka

- Tablet dan laptop (≥ 768 px): bilah atas (logo, pil menu di tengah, cari, lonceng, profil) dan rel ikon di kiri. Bilah atas tanpa latar di puncak halaman, berkabut saat digulir.
- HP (< 768 px): bilah atas ringkas + navigasi bawah melayang. Item aktif mengembang menjadi kapsul berlabel; tombol tambah warna aksi di tengah. Bilah bawah minggir saat menggulir ke bawah (`lib/use-hide-on-scroll.ts`). Semua halaman ada di menu lengkap.
- Beranda (urut baca): sapaan dan angka → tugas cepat → rutin hari ini, konstelasi (paling lebar), progres tugas → tugas selesai per minggu, tenggat dekat (empat kartu dan tautan semua) → hari ini, perlu perhatian, proyek berjalan. Di HP: rutin → tenggat → konstelasi → progres → grafik → hari ini.
- Kas: angka ringkasan, grafik uang masuk dan keluar per bulan, lalu daftar. Tidak pernah disebut saldo atau laba.
- Halaman PIN: satu kartu di tengah di atas latar buram. Kotak per angka yang terisi titik, tombol terisi bertahap.
- Dunia 3D punya bilahnya sendiri dan membaca token yang sama.

## Gerak

- Pindah halaman: latar diam, bagian baru muncul berurutan dari buram (`.page-enter`, jeda 70 ms). Blur hanya di tablet dan laptop karena mahal di HP.
- Grafik: garis tergambar dari kiri (`.chart-line`), batang tumbuh dari dasar berurutan (`.chart-bar`), bilah bertumpuk memanjang, cincin terisi, angka menghitung naik.
- Pil menu meregang dan bergerak saat diklik; klik selalu membuka halaman pertama kelompok. Penanda rel dan tab meluncur.
- Ganti tema: sapuan melingkar 0,48 detik dari tombolnya (View Transitions, `lib/theme.ts`). Peramban tanpa fitur itu langsung berganti.
- Kurva di `globals.css`: `--ease-out` (masuk biasa), `--ease-spring` (menu, popover, palet, dialog), `--ease-sheet` (laci).
- Menu tumbuh dari tombol pemicunya; butirnya naik berurutan 25 ms. Palet turun dengan pegas; baris berurutan hanya saat dibuka. Laci meluncur, judul lalu isinya menyusul.
- Gerak berkurang (`prefers-reduced-motion`): lapisan hanya memudar, animasi tanpa jeda, Motion ikut (`MotionConfig reducedMotion="user"`), konstelasi diam tetapi tetap bisa diputar, tema langsung berganti.
- Animasi dimuat lewat `LazyMotion`, konstelasi dan laci tugas lewat `next/dynamic` agar tidak memperbesar unduhan awal.

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
