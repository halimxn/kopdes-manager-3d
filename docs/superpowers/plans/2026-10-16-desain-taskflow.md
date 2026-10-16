# Desain Taskflow — Rencana Implementasi

> **Untuk agen pelaksana:** WAJIB memakai superpowers:subagent-driven-development (disarankan) atau superpowers:executing-plans untuk mengerjakan rencana ini tugas demi tugas. Langkah memakai kotak centang (`- [ ]`).

**Tujuan:** Mengganti total gaya web Kopdes menjadi dashboard ala Taskflow (aksen `#546FFF`) dan menyusun ulang menu menjadi 6 hub bertab tanpa mengubah rute, data, atau fitur.

**Arsitektur:** Satu sumber navigasi baru (`src/components/layout/navigasi.ts`) menjadi dasar sidebar, rel tablet, navigasi bawah, lembar menu ponsel, dan komponen `TabHub`. Hub bukan rute baru: setiap hub menaut ke tab pertamanya, dan tab adalah rute `/[slug]` yang sudah ada. Gaya diganti lewat token (`token.css`) lalu berkas kerangka/komponen/halaman, mengikuti rantai `token → dasar → komponen → kerangka → halaman/*`.

**Teknologi:** Next.js App Router, React 19, TypeScript strict, CSS biasa + stylelint, Vitest + Testing Library (jsdom), lucide-react.

**Spec:** `docs/superpowers/specs/2026-10-16-desain-taskflow-design.md`

## Batasan Global

- Aksen tunggal `#546FFF`, hover `#3D58F0`, lembut `#EEF1FF`; teks `#141522`, sekunder `#54577A`, redup `#8E92BC`; latar `#FAFAFA`/`#F5F5F7`; sudut kartu 16 px.
- Huruf Plus Jakarta Sans; judul 24/600, subjudul 16/600, isi 14/500, label 12/500.
- Warna mentah hanya di `src/styles/token.css`; tanpa `!important` (`npm run lint:ui`).
- Status hanya token `--ok/--late/--warn` dan selalu bertuliskan teks.
- Tanpa foto atau angka palsu: avatar memakai inisial dari profil, sampul kartu memakai blok warna + ikon.
- Ukuran yang wajib diperiksa: 360, 768, 1024, 1440 px; terang & gelap; area sentuh ≥ 44 px; fokus keyboard terlihat; hormati `prefers-reduced-motion`.
- Semua URL lama (`/anggota`, `/tugas?view=kalender`, `/riwayat-proyek`, `/tindak-lanjut`, …) tetap bekerja.
- JS awal halaman ≤ 300 KB (`npm run ukur:bundel`). Dunia 3D hanya berganti warna aksen.
- Commit berbahasa Indonesia tanpa baris atribusi AI, di cabang `tampilan/gaya-baru`. Tanpa push.

## Penyesuaian spec terhadap kode nyata

Spec menyebut `/kalender`, yang ternyata tidak ada (kalender adalah tampilan `/tugas?view=kalender`). Spec juga belum menempatkan beberapa halaman yang ada. Pemetaan final:

| Hub | Tab (urutan) |
|---|---|
| Beranda | `/beranda` |
| Pekerjaan | `/hari-ini`, `/tugas`, `/proyek`, `/roadmap` |
| Catatan | `/jurnal`, `/rapat`, `/dokumen`, `/risiko`, `/laporan`, `/mitra` |
| Usaha | `/gerai`, `/kesiapan`, `/penjualan`, `/pembelian`, `/barang`, `/stok-opname`, `/pengiriman`, `/aset` |
| Koperasi | `/pencatatan`, `/anggota`, `/keuangan`, `/simpanan`, `/tim`, `/absensi` |
| Dunia | `/dunia-koperasi` |

`/pengaturan` dan `/panduan` berada di kaki sidebar, tidak di dalam hub. Navigasi bawah ponsel berisi Beranda, Pekerjaan, Tambah, Dunia, dan Menu. Menu membuka lembar berisi keenam hub beserta tabnya. Susunan ini mempertahankan lima item dan aksi Tambah/Menu dari dock yang sekarang.

## Fokus Tinjauan

1. **Halaman tanpa hub** (`/pengaturan`, `/panduan`, slug lama yang dialihkan): kepala halaman tetap tampil, TabHub tidak muncul, dan tidak ada galat. Diuji di Tugas 1 dan 2.
2. **Query string di URL** (`/tugas?view=kalender`, `/proyek?id=x`): hub dan tab aktif tetap dikenali. Diuji di Tugas 1.
3. **Mode gelap**: setiap token baru punya padanan gelap dengan kontras teks ≥ 4.5:1. Diuji di Tugas 0 (tes token) dan audit tampilan.
4. **Profil kosong** (belum ada nama manajer atau organisasi): avatar menampilkan "M" dan nama "Manajer", tanpa nama karangan. Diuji di Tugas 2.
5. **Lebar 360 px dengan 8 tab (Usaha)**: tab bergulir mendatar di dalam kontainernya dan halaman tidak ikut melebar. Diuji di Tugas 2 (CSS) dan audit 360.

---

### Tugas 0: Token dan primitif gaya Taskflow

**Berkas:**
- Ubah: `src/styles/token.css` (seluruh blok `:root` dan `:root.dark`)
- Ubah: `src/styles/dasar.css`, `src/styles/komponen.css` (`.ui-card`, tombol, `.ui-progress`, `.tabs`, avatar)
- Ubah: `src/components/ui/Progress.tsx` (menampilkan angka %)
- Uji: `tests/unit/token-taskflow.test.ts` (baru)

**Antarmuka:**
- Menghasilkan token baru yang dipakai tugas berikutnya: `--brand`, `--brand-hover`, `--brand-soft`, `--ink-heading`, `--ink`, `--ink-muted`, `--canvas`, `--surface`, `--r-card` (16px), `--sidebar-w` (240px), `--rail-w` (72px), `--panel-kanan-w` (320px), `--sampul-pekerjaan`, `--sampul-catatan`, `--sampul-usaha`, `--sampul-koperasi`, `--sampul-dunia`, beserta pasangan `-ink`-nya.
- `Progress` mendapat prop opsional `tampilkanAngka?: boolean`.

- [ ] **Langkah 1: Tulis tes token yang gagal**

```ts
// tests/unit/token-taskflow.test.ts
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

const css = readFileSync('src/styles/token.css', 'utf8');
const blok = (pemilih: string) => css.split(pemilih + ' {')[1]?.split('\n}')[0] ?? '';
const nilai = (isi: string, nama: string) => isi.match(new RegExp(`${nama}:\\s*(#[0-9a-fA-F]{6})`))?.[1]?.toLowerCase();

function luminans(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const kontras = (a: string, b: string) => {
  const [x, y] = [luminans(a), luminans(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

it('aksen dan tinta mengikuti spec Taskflow', () => {
  const terang = blok(':root');
  expect(nilai(terang, '--brand')).toBe('#546fff');
  expect(nilai(terang, '--brand-hover')).toBe('#3d58f0');
  expect(nilai(terang, '--brand-soft')).toBe('#eef1ff');
  expect(nilai(terang, '--ink-heading')).toBe('#141522');
  expect(nilai(terang, '--ink-muted')).toBe('#54577a');
  expect(terang).toMatch(/--r-card:\s*16px/);
});

it('teks utama terbaca di kedua tema', () => {
  for (const pemilih of [':root', ':root.dark']) {
    const isi = blok(pemilih);
    const permukaan = nilai(isi, '--surface')!;
    expect(kontras(nilai(isi, '--ink-heading')!, permukaan)).toBeGreaterThanOrEqual(4.5);
    expect(kontras(nilai(isi, '--ink-muted')!, permukaan)).toBeGreaterThanOrEqual(4.5);
  }
});

it('setiap warna sampul hub punya padanan mode gelap', () => {
  for (const hub of ['pekerjaan', 'catatan', 'usaha', 'koperasi', 'dunia']) {
    expect(blok(':root')).toContain(`--sampul-${hub}:`);
    expect(blok(':root.dark')).toContain(`--sampul-${hub}:`);
  }
});
```

- [ ] **Langkah 2: Jalankan dan pastikan gagal**

Jalankan: `npm test -- tests/unit/token-taskflow.test.ts`
Hasil yang diharapkan: GAGAL (`--brand` masih `#2f5bea`).

- [ ] **Langkah 3: Tulis ulang `token.css`**

Ganti komentar kepala menjadi "Token sistem gaya Kopdes — Taskflow (keputusan pemilik 16 Oktober 2026)". Pertahankan nama token yang sudah ada (komponen lama memakainya) dan ubah nilainya. Nilai baru di `:root`:

```css
  --canvas: #f5f5f7;  --canvas-deep: #ededf1;
  --surface: #ffffff; --surface-2: #fafafa; --surface-3: #f5f5f7;
  --ink: #141522; --ink-heading: #141522; --ink-muted: #54577a; --ink-subtle: #8e92bc;
  --line: #f0f0f5; --line-strong: #e4e5ee;
  --brand: #546fff; --brand-hover: #3d58f0; --brand-press: #2f48d6;
  --brand-soft: #eef1ff; --brand-soft-2: #e1e6ff; --brand-soft-border: #c8d1ff;
  --brand-ink: #3d58f0; --brand-bright: #8a9bff;
  --focus-ring: 0 0 0 3px rgba(84, 111, 255, 0.3);
  --fs-title: 24px; --fs-h2: 16px; --fs-h3: 16px; --fs-body: 14px; --fs-meta: 12px; --fs-cap: 12px;
  --r-card: 16px; --r-lg: 16px; --r-md: 10px;
  --shadow: 0 1px 2px rgba(20, 21, 34, 0.03), 0 6px 20px -12px rgba(20, 21, 34, 0.08);
  --sidebar-w: 240px; --rail-w: 72px; --panel-kanan-w: 320px; --topbar-h: 72px;
  --sampul-pekerjaan: #eef1ff; --sampul-pekerjaan-ink: #3d58f0;
  --sampul-catatan: #fdecf3;   --sampul-catatan-ink: #c21f5e;
  --sampul-usaha: #e3f7f4;     --sampul-usaha-ink: #0b7a70;
  --sampul-koperasi: #fff2e0;  --sampul-koperasi-ink: #a3560a;
  --sampul-dunia: #efeaff;     --sampul-dunia-ink: #5b2fd6;
  --grafik-biru: #546fff;
```

Ganti juga `--ink-muted` di mode terang menjadi `#54577a` (kontras di atas putih 7.0:1). `--ink-subtle` `#8e92bc` hanya untuk ikon dan placeholder, tidak untuk teks inti. Nilai di `:root.dark`:

```css
  --canvas: #0f1018; --surface: #171826; --surface-2: #1c1d2d; --surface-3: #232436;
  --ink: #e8e9f3; --ink-heading: #ffffff; --ink-muted: #a9acc8; --ink-subtle: #7f83a6;
  --brand: #7d90ff; --brand-hover: #95a5ff; --brand-soft: #22284f; --brand-ink: #b3beff;
  --focus-ring: 0 0 0 3px rgba(125, 144, 255, 0.4);
  --sampul-pekerjaan: #22284f; --sampul-pekerjaan-ink: #b3beff;
  --sampul-catatan: #3a1d2b;   --sampul-catatan-ink: #f2a6c4;
  --sampul-usaha: #12312d;     --sampul-usaha-ink: #84dccf;
  --sampul-koperasi: #3a2a12;  --sampul-koperasi-ink: #f6c27a;
  --sampul-dunia: #2a2147;     --sampul-dunia-ink: #c3b0ff;
  --grafik-biru: #7d90ff;
```

Pada `@media (max-width: 767px)`, nilai `--fs-title: 20px` dan `--topbar-h: 60px`.

- [ ] **Langkah 4: Perbarui primitif di `komponen.css` dan `dasar.css`**

- `.ui-card`, `.card`, `.modul`: `border-radius: var(--r-card); background: var(--surface); box-shadow: var(--shadow); border: 1px solid var(--kartu-garis); padding: 20px;`
- Tombol utama: `background: var(--brand); color: var(--on-brand); border-radius: 10px; min-height: var(--touch); font-weight: 600;`. Hover memakai `var(--brand-hover)`.
- `.ui-progress`: tinggi 6 px, jalur `var(--brand-soft)`, isi `var(--brand)`, sudut penuh. `.ui-progress-baris` adalah grid `1fr auto` untuk label "Progres" dan angka.
- `.tabs` dan `.tab-hub`: garis bawah 1 px `var(--line)`. Tab aktif mendapat garis bawah 2 px `var(--brand)` dan teks `var(--ink-heading)`.
- `.avatar-inisial`: lingkaran 36 px, `background: var(--brand-soft); color: var(--brand-ink); font-weight: 600;`.
- `dasar.css`: `h1 { font-size: var(--fs-title); font-weight: 600; }`, `body { background: var(--canvas); color: var(--ink); font-weight: 500; }`.

- [ ] **Langkah 5: Tambahkan angka % pada `Progress`**

```tsx
export function Progress({ value, label, tampilkanAngka = false }: { value: number | null; label: string; tampilkanAngka?: boolean }) {
  const { ref, entered } = useMotionEntry<HTMLDivElement>();
  const percentage = value === null ? 0 : Math.min(100, Math.max(0, value));
  const bar = (
    <div ref={ref} className="ui-progress" role="progressbar" aria-label={label}
      aria-valuemin={0} aria-valuemax={100}
      aria-valuenow={value === null ? undefined : percentage}
      aria-valuetext={value === null ? 'Belum dinilai' : `${value}%`}>
      <span style={{ transform: `scaleX(${entered ? percentage / 100 : 0})` }} />
    </div>
  );
  if (!tampilkanAngka) return bar;
  return (
    <div className="ui-progress-baris">
      <span className="ui-progress-label">{label}</span>
      <span className="ui-progress-angka">{value === null ? 'Belum dinilai' : `${percentage}%`}</span>
      {bar}
    </div>
  );
}
```

- [ ] **Langkah 6: Jalankan tes dan pemeriksa gaya**

Jalankan: `npm test -- tests/unit/token-taskflow.test.ts tests/unit/progress.test.ts && npm run lint:ui`
Hasil yang diharapkan: LULUS, stylelint tanpa galat.

- [ ] **Langkah 7: Pemeriksaan penuh lalu commit**

Jalankan: `npm test -- --maxWorkers=2 && npm run typecheck && npm run lint && npm run build`

```bash
git add src/styles/token.css src/styles/dasar.css src/styles/komponen.css src/components/ui/Progress.tsx tests/unit/token-taskflow.test.ts
git commit -m "Pasang token dan primitif gaya Taskflow

Aksen #546FFF, tinta gelap, kartu 16 px, dan warna sampul per hub
dengan padanan mode gelap yang lolos kontras 4.5:1."
```

---

### Tugas 1: Sumber navigasi hub tunggal

**Berkas:**
- Buat: `src/components/layout/navigasi.ts`
- Uji: `tests/unit/navigasi-hub.test.ts` (baru)

**Antarmuka:**
- Memakai: `navigation` dari `src/features/records/catalog.ts` (label halaman).
- Menghasilkan:
  - `type HubId = 'beranda' | 'pekerjaan' | 'catatan' | 'usaha' | 'koperasi' | 'dunia'`
  - `type Hub = { id: HubId; label: string; ikon: string /* href ikon IkonHalaman */; tabs: readonly string[] }`
  - `const HUBS: readonly Hub[]`
  - `const KAKI_SIDEBAR: readonly string[]` (`['/pengaturan', '/panduan']`)
  - `function hubUntuk(path: string): Hub | undefined`: mengabaikan query dan hash.
  - `function labelHalaman(href: string): string`: label dari `navigation`, dengan cadangan `href`.

- [ ] **Langkah 1: Tulis tes yang gagal**

```ts
// tests/unit/navigasi-hub.test.ts
import { expect, it } from 'vitest';
import { HUBS, KAKI_SIDEBAR, hubUntuk, labelHalaman } from '@/components/layout/navigasi';
import { navigation } from '@/features/records/catalog';

it('setiap halaman katalog berada tepat di satu hub atau kaki sidebar', () => {
  const semua = [...HUBS.flatMap((hub) => hub.tabs), ...KAKI_SIDEBAR];
  expect(new Set(semua).size).toBe(semua.length);
  expect([...semua].sort()).toEqual(navigation.map(([href]) => href).sort());
});

it('enam hub dengan urutan sidebar yang disepakati', () => {
  expect(HUBS.map((hub) => hub.id)).toEqual(['beranda', 'pekerjaan', 'catatan', 'usaha', 'koperasi', 'dunia']);
});

it('hub dikenali walau URL membawa query atau hash', () => {
  expect(hubUntuk('/tugas?view=kalender')?.id).toBe('pekerjaan');
  expect(hubUntuk('/proyek?id=abc#x')?.id).toBe('pekerjaan');
  expect(hubUntuk('/stok-opname')?.id).toBe('usaha');
  expect(hubUntuk('/keuangan')?.id).toBe('koperasi');
});

it('halaman di luar hub tidak memunculkan hub', () => {
  expect(hubUntuk('/pengaturan')).toBeUndefined();
  expect(hubUntuk('/tidak-ada')).toBeUndefined();
});

it('label halaman diambil dari katalog', () => {
  expect(labelHalaman('/keuangan')).toBe('Buku kas');
  expect(labelHalaman('/asing')).toBe('/asing');
});
```

- [ ] **Langkah 2: Jalankan dan pastikan gagal**

Jalankan: `npm test -- tests/unit/navigasi-hub.test.ts`
Hasil yang diharapkan: GAGAL dengan "Failed to resolve import '@/components/layout/navigasi'".

- [ ] **Langkah 3: Implementasi**

```ts
// src/components/layout/navigasi.ts
import { navigation } from '@/features/records/catalog';

export type HubId = 'beranda' | 'pekerjaan' | 'catatan' | 'usaha' | 'koperasi' | 'dunia';
export type Hub = { id: HubId; label: string; ikon: string; tabs: readonly string[] };

// Menu dipadatkan menjadi enam hub (keputusan pemilik 16 Okt 2026); tab = rute lama agar tautan tetap sah.
export const HUBS: readonly Hub[] = [
  { id: 'beranda', label: 'Beranda', ikon: '/beranda', tabs: ['/beranda'] },
  { id: 'pekerjaan', label: 'Pekerjaan', ikon: '/tugas', tabs: ['/hari-ini', '/tugas', '/proyek', '/roadmap'] },
  { id: 'catatan', label: 'Catatan', ikon: '/rapat', tabs: ['/jurnal', '/rapat', '/dokumen', '/risiko', '/laporan', '/mitra'] },
  { id: 'usaha', label: 'Usaha', ikon: '/gerai', tabs: ['/gerai', '/kesiapan', '/penjualan', '/pembelian', '/barang', '/stok-opname', '/pengiriman', '/aset'] },
  { id: 'koperasi', label: 'Koperasi', ikon: '/anggota', tabs: ['/pencatatan', '/anggota', '/keuangan', '/simpanan', '/tim', '/absensi'] },
  { id: 'dunia', label: 'Dunia', ikon: '/dunia-koperasi', tabs: ['/dunia-koperasi'] },
];

export const KAKI_SIDEBAR: readonly string[] = ['/pengaturan', '/panduan'];

export function hubUntuk(path: string): Hub | undefined {
  const bersih = path.split(/[?#]/)[0];
  return HUBS.find((hub) => hub.tabs.includes(bersih));
}

export function labelHalaman(href: string): string {
  return navigation.find(([url]) => url === href)?.[1] ?? href;
}
```

- [ ] **Langkah 4: Jalankan dan pastikan lulus**

Jalankan: `npm test -- tests/unit/navigasi-hub.test.ts`
Hasil yang diharapkan: LULUS (5 tes).

- [ ] **Langkah 5: Commit**

```bash
git add src/components/layout/navigasi.ts tests/unit/navigasi-hub.test.ts
git commit -m "Tambah sumber navigasi enam hub

Satu daftar hub dan tab untuk sidebar, rel, navigasi bawah, dan tab
halaman, sehingga menu tidak lagi diulang di beberapa berkas."
```

---

### Tugas 2: Kerangka baru (sidebar, rel, kepala, navigasi bawah, TabHub)

**Berkas:**
- Buat: `src/components/layout/TabHub.tsx`
- Ubah: `src/components/layout/AppShell.tsx`. Hapus `sections`, `getNavSubtitle`, favorit, kelompok lipat, dan daftar "Proyek saya". Ganti dengan sidebar 6 hub, kaki sidebar, kepala halaman, dan lembar menu ponsel berbasis `HUBS`.
- Ubah: `src/components/ui/BottomNav.tsx` (Beranda, Pekerjaan, Tambah, Dunia, Menu, dengan status aktif berbasis hub)
- Ubah: `src/features/workspace/WorkspacePage.tsx` (pasang `<TabHub path={'/' + slug} />` paling atas di `.workspace-page`)
- Ubah: `src/styles/kerangka.css` (tulis ulang)
- Uji: ubah `tests/ui/astra-controls.test.tsx` dan `tests/ui/workspace-state.test.tsx`; buat `tests/ui/kerangka-hub.test.tsx`

**Antarmuka:**
- Memakai: `HUBS`, `KAKI_SIDEBAR`, `hubUntuk`, `labelHalaman` (Tugas 1); `IkonHalaman`; token Tugas 0.
- Menghasilkan: `TabHub({ path }: { path: string }): JSX.Element | null`, yang hanya dirender bila hub punya lebih dari satu tab. Kelas CSS `.shell-sidebar`, `.shell-kepala`, `.shell-utama`, `.tab-hub`, `.panel-kanan` dipakai Tugas 3.

- [ ] **Langkah 1: Tulis tes yang gagal**

```tsx
// tests/ui/kerangka-hub.test.tsx
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { TabHub } from '@/components/layout/TabHub';
import { AppShell } from '@/components/layout/AppShell';

const nav = vi.hoisted(() => ({ path: '/tugas' }));
vi.mock('next/navigation', () => ({
  usePathname: () => nav.path,
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
vi.mock('@/lib/client', () => ({ api: vi.fn(), resetAuthNavigation: vi.fn() }));
afterEach(cleanup);

it('TabHub menampilkan tab hub dan menandai halaman aktif', () => {
  render(<TabHub path="/tugas" />);
  const daftar = screen.getByRole('navigation', { name: 'Bagian Pekerjaan' });
  expect(within(daftar).getAllByRole('link').map((a) => a.getAttribute('href')))
    .toEqual(['/hari-ini', '/tugas', '/proyek', '/roadmap']);
  expect(within(daftar).getByRole('link', { name: 'Tugas' }).getAttribute('aria-current')).toBe('page');
});

it('TabHub tidak dirender untuk hub satu tab atau halaman tanpa hub', () => {
  const { container } = render(<><TabHub path="/beranda" /><TabHub path="/pengaturan" /></>);
  expect(container.innerHTML).toBe('');
});

it('sidebar berisi enam hub dan hub aktif mengikuti tab yang dibuka', () => {
  nav.path = '/stok-opname';
  render(<AppShell><p>Isi</p></AppShell>);
  const sidebar = screen.getByRole('navigation', { name: 'Menu utama' });
  const tautan = within(sidebar).getAllByRole('link');
  expect(tautan.map((a) => a.textContent)).toEqual(['Beranda', 'Pekerjaan', 'Catatan', 'Usaha', 'Koperasi', 'Dunia']);
  expect(within(sidebar).getByRole('link', { name: 'Usaha' }).getAttribute('aria-current')).toBe('page');
  expect(within(sidebar).getByRole('link', { name: 'Usaha' }).getAttribute('href')).toBe('/gerai');
});

it('profil kosong menampilkan inisial M tanpa nama karangan', () => {
  nav.path = '/beranda';
  render(<AppShell><p>Isi</p></AppShell>);
  expect(screen.getByLabelText('Menu profil Manajer').textContent).toContain('M');
});
```

Ubah tes dock di `tests/ui/astra-controls.test.tsx`: tautan aktif untuk path `/tugas` sekarang bernama `Pekerjaan` dan mengarah ke `/hari-ini`.

```tsx
it('dock memiliki lima item dan aksi/menu dapat dioperasikan', () => {
  const action = vi.fn(), menu = vi.fn();
  render(<BottomNav path="/tugas" calendar={false} menu={true} onAction={action} onMenu={menu} />);
  expect(screen.getByRole('navigation').children).toHaveLength(5);
  expect(screen.getByRole('link', { name: 'Pekerjaan' }).getAttribute('aria-current')).toBe('page');
  expect(screen.getByRole('link', { name: 'Dunia' }).getAttribute('href')).toBe('/dunia-koperasi');
  fireEvent.click(screen.getByRole('button', { name: 'Tambah catatan' }));
  fireEvent.click(screen.getByRole('button', { name: 'Semua halaman' }));
  expect(action).toHaveBeenCalledOnce();
  expect(menu).toHaveBeenCalledOnce();
});
```

Di `tests/ui/workspace-state.test.tsx`, ganti pemilih `.sidebar-nav-item` menjadi `.shell-sidebar a`. Pernyataan `sidebar-collapsed` dan lembar ponsel yang `inert` tetap dipertahankan.

- [ ] **Langkah 2: Jalankan dan pastikan gagal**

Jalankan: `npm test -- tests/ui/kerangka-hub.test.tsx tests/ui/astra-controls.test.tsx tests/ui/workspace-state.test.tsx`
Hasil yang diharapkan: GAGAL (`TabHub` belum ada, sidebar lama belum diganti).

- [ ] **Langkah 3: Buat `TabHub.tsx`**

```tsx
'use client';
import Link from 'next/link';
import { hubUntuk, labelHalaman } from './navigasi';

/** Tab di bawah judul halaman: menautkan halaman-halaman lama yang sekarang satu hub. */
export function TabHub({ path }: { path: string }) {
  const hub = hubUntuk(path);
  if (!hub || hub.tabs.length < 2) return null;
  const aktif = path.split(/[?#]/)[0];
  return (
    <nav className="tab-hub" aria-label={`Bagian ${hub.label}`}>
      {hub.tabs.map((href) => (
        <Link key={href} href={href} aria-current={href === aktif ? 'page' : undefined}>
          {labelHalaman(href)}
        </Link>
      ))}
    </nav>
  );
}
```

- [ ] **Langkah 4: Tulis ulang render `AppShell`**

Pertahankan logika yang sudah ada: pintasan keyboard, dialog pencarian, `ManagerActionModal`, `Notifikasi`, menu profil (tema, pengaturan, kunci), penjebak fokus lembar ponsel, `desktopSidebarHidden` dengan Ctrl+B, dan pengecualian `/dunia-koperasi`. Hapus `sections`, `getNavSubtitle`, `favorites`, `collapsed`, blok "Proyek saya", dan kartu Dunia di dasar sidebar. Struktur barunya:

```tsx
const hubAktif = hubUntuk(path);
const judul = labelHalaman(path) === path ? 'Ruang kerja' : labelHalaman(path);
// ...
<div className={`manager-shell ${desktopSidebarHidden === 'true' ? 'sidebar-collapsed' : ''}`}>
  <a className="skip" href="#main">Lewati navigasi</a>
  <aside className="shell-sidebar">
    <Link href="/beranda" className="shell-merek">
      <Ikon3D kind="kantor" size={32} />
      <strong>{getCoopShortName(String(workspace?.organization?.[0]?.data.title || ''))}</strong>
    </Link>
    <nav aria-label="Menu utama">
      {HUBS.map((hub) => (
        <Link key={hub.id} href={hub.tabs[0]} aria-label={hub.label} title={hub.label}
          aria-current={hubAktif?.id === hub.id ? 'page' : undefined}>
          <IkonHalaman href={hub.ikon} size={22} />
          <span>{hub.label}</span>
        </Link>
      ))}
    </nav>
    <nav className="shell-kaki" aria-label="Pengaturan dan bantuan">
      {KAKI_SIDEBAR.map((href) => (
        <Link key={href} href={href} aria-current={path === href ? 'page' : undefined}>
          <IkonHalaman href={href} size={20} /><span>{labelHalaman(href)}</span>
        </Link>
      ))}
    </nav>
  </aside>
  <header className="shell-kepala">
    {/* tombol menu "Buka menu navigasi" tetap (perilaku 1024 px tidak berubah) */}
    <div className="shell-judul">
      <h1>{judul}</h1>
      {path === '/beranda' && <p>Halo, {name}</p>}
    </div>
    {/* topbar-cari, Notifikasi, tombol Tambah, details.topbar-profil seperti sekarang;
        summary memakai <span className="avatar-inisial">{name[0] || 'M'}</span> */}
  </header>
  <main className="shell-utama manager-main" id="main" tabIndex={-1}>{/* galat + children */}</main>
  {/* shortcutHelp, BottomNav, lembar ponsel, ManagerActionModal, dialog pencarian tetap */}
</div>
```

Lembar ponsel (`.mobile-app-sheet`) berisi satu kelompok per hub: judul hub, lalu kisi tautan tab. Kelompok dibuat dari `HUBS.map` dan `hub.tabs.map`, ditambah `KAKI_SIDEBAR` di kakinya. Halaman Beranda dan Dunia tampil sebagai satu tautan. Rel tablet tidak lagi menjadi elemen terpisah: pada 768–1023 px, `.shell-sidebar` diciutkan menjadi 72 px (ikon saja, label `sr-only`).

`h1` di kepala halaman menggantikan judul ganda. Bila halaman fitur sudah merender `h1` sendiri, ubah `h1` di fitur itu menjadi `h2` saat tugas hub masing-masing dikerjakan (Tugas 4–7), lalu catat temuannya di sana.

- [ ] **Langkah 5: Perbarui `BottomNav.tsx`**

```tsx
import { hubUntuk } from '@/components/layout/navigasi';
// ...
const items = [
  { label: 'Beranda', href: '/beranda', hub: 'beranda' },
  { label: 'Pekerjaan', href: '/hari-ini', hub: 'pekerjaan' },
  { label: 'Tambah', action: onAction, Icon: Plus },
  { label: 'Dunia', href: '/dunia-koperasi', hub: 'dunia' },
  { label: 'Menu', action: onMenu, Icon: Menu },
];
const hubAktif = hubUntuk(path)?.id;
// aria-current={hub && hub === hubAktif && !(hub === 'pekerjaan' && calendar) ? 'page' : undefined}
```

- [ ] **Langkah 6: Pasang TabHub di `WorkspacePage.tsx`**

Tepat di dalam `<div className={`workspace-page page-${slug}`}>`, sebelum blok `slug === 'tugas'`:

```tsx
<TabHub path={`/${slug}`} />
```

- [ ] **Langkah 7: Tulis ulang `kerangka.css`**

Tata letak grid `manager-shell`:
- ≥1024 px: `grid-template-columns: var(--sidebar-w) 1fr; grid-template-rows: var(--topbar-h) 1fr;`. Sidebar `position: sticky; top: 0; height: 100dvh; background: var(--surface);` dengan padding 24 px 16 px. Tautan hub tinggi 48 px dan sudut 10 px. Hub aktif memakai `background: var(--brand-soft); color: var(--brand-ink); font-weight: 600;`. Kelas `.sidebar-collapsed` mengubah kolom menjadi `var(--rail-w)`.
- 768–1023 px: kolom `var(--rail-w) 1fr`, label hub `sr-only`, ikon di tengah.
- <768 px: sidebar `display: none`, `ui-bottom-nav` tampil, `shell-utama` mendapat `padding-bottom: calc(var(--dock-h) + env(safe-area-inset-bottom))`.
- `.shell-kepala`: flex dengan `justify-content: space-between`, padding `0 var(--gutter)`, latar `var(--canvas)`. Pada <768 px pencarian hanya berupa ikon.
- `.tab-hub`: flex dengan `gap: 24px; overflow-x: auto; scrollbar-width: none; margin-bottom: 20px; border-bottom: 1px solid var(--line);`. Tautan memakai `min-height: var(--touch); display: inline-flex; align-items: center; white-space: nowrap; color: var(--ink-muted);`. Tautan `[aria-current="page"]` mendapat `color: var(--ink-heading); box-shadow: inset 0 -2px 0 var(--brand);`.
- `.panel-kanan` (dipakai Tugas 3): pada ≥1440 px menjadi kolom ketiga `var(--panel-kanan-w)`. Di bawah lebar itu panel turun ke bawah konten.
- Hapus selektor lama yang tidak dipakai lagi (`.tablet-rail*`, `.sidebar-favorites-group`, `.sidebar-group-toggle`, `.sidebar-dunia-kartu`, `.manager-project-link`). Periksa dengan `grep -rn "<selektor>" src` sebelum menghapus.

- [ ] **Langkah 8: Jalankan tes**

Jalankan: `npm test -- tests/ui/kerangka-hub.test.tsx tests/ui/astra-controls.test.tsx tests/ui/workspace-state.test.tsx && npm run lint:ui`
Hasil yang diharapkan: LULUS.

- [ ] **Langkah 9: Pemeriksaan penuh dan audit tampilan**

Jalankan: `npm test -- --maxWorkers=2 && npm run typecheck && npm run lint && npm run build && npm run ukur:bundel`
Dengan `npm run dev:demo -- -p 3200` berjalan, jalankan `npm run audit:tampilan -- 360 780`, `768 1024`, `1024 768`, dan `1440 900`. Buka `/stok-opname` pada 360 px dan pastikan tab Usaha bergulir di dalam bilahnya, tanpa gulir mendatar pada halaman.

- [ ] **Langkah 10: Commit**

```bash
git add src/components/layout src/components/ui/BottomNav.tsx src/features/workspace/WorkspacePage.tsx src/styles/kerangka.css tests/ui
git commit -m "Ganti kerangka menjadi sidebar enam hub ala Taskflow

Menu samping hanya memuat hub; halaman lama tampil sebagai tab di bawah
judul sehingga URL lama tetap berlaku. Favorit dan kelompok lipat dilepas."
```

---

### Tugas 3: Beranda baru

**Berkas:**
- Ubah: `src/features/dashboard/Dashboard.tsx` (susunan dan kelas; perhitungan tetap)
- Buat: `src/features/dashboard/KartuPekerjaan.tsx`
- Buat: `src/features/dashboard/KalenderMini.tsx`
- Ubah: `src/styles/halaman/beranda.css` (tulis ulang)
- Uji: `tests/ui/beranda-taskflow.test.tsx` (baru); jalankan juga `tests/ui/redesign.test.tsx` dan `tests/ui/workspace-redesign.test.tsx`, lalu sesuaikan pemilih yang berubah tanpa melemahkan pernyataan data.

**Antarmuka:**
- Memakai: `Progress` dengan `tampilkanAngka` (Tugas 0), token `--sampul-*`, `.panel-kanan` (Tugas 2), `GrafikLembut` (`src/components/charts/GrafikLembut.tsx`), fungsi progres dari `src/lib/progress.ts`, dan tanggal dari `src/lib/date.ts`. Fungsi yang tepat ditentukan dengan membaca berkasnya; jangan membuat rumus baru.
- Menghasilkan:
  - `KartuPekerjaan({ judul, hub, href, progres, tenggat, keterangan }: { judul: string; hub: 'pekerjaan' | 'catatan' | 'usaha' | 'koperasi'; href: string; progres: number | null; tenggat?: string; keterangan?: string })`
  - `KalenderMini({ tanggal, tandai }: { tanggal: Date; tandai: string[] /* yyyy-mm-dd */ })`

- [ ] **Langkah 1: Tulis tes yang gagal**

```tsx
// tests/ui/beranda-taskflow.test.tsx
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { KartuPekerjaan } from '@/features/dashboard/KartuPekerjaan';
import { KalenderMini } from '@/features/dashboard/KalenderMini';
afterEach(cleanup);

it('kartu pekerjaan menampilkan judul, progres bertulis, dan tautan', () => {
  render(<KartuPekerjaan judul="Siapkan rak gerai" hub="usaha" href="/tugas?task=1" progres={40} tenggat="20 Okt" />);
  expect(screen.getByRole('link', { name: /Siapkan rak gerai/ }).getAttribute('href')).toBe('/tugas?task=1');
  expect(screen.getByText('40%')).toBeTruthy();
  expect(screen.getByText(/20 Okt/)).toBeTruthy();
});

it('kartu tanpa progres menulis "Belum dinilai", bukan 0%', () => {
  render(<KartuPekerjaan judul="Rapat pengurus" hub="catatan" href="/rapat" progres={null} />);
  expect(screen.getByText('Belum dinilai')).toBeTruthy();
  expect(screen.queryByText('0%')).toBeNull();
});

it('kalender mini menandai tanggal berkegiatan dengan teks yang dapat dibaca', () => {
  render(<KalenderMini tanggal={new Date('2026-10-16T08:00:00+07:00')} tandai={['2026-10-20']} />);
  expect(screen.getByRole('table', { name: 'Oktober 2026' })).toBeTruthy();
  expect(screen.getByLabelText('20 Oktober, ada kegiatan')).toBeTruthy();
  expect(screen.getByLabelText('16 Oktober, hari ini')).toBeTruthy();
});
```

- [ ] **Langkah 2: Jalankan dan pastikan gagal**

Jalankan: `npm test -- tests/ui/beranda-taskflow.test.tsx`
Hasil yang diharapkan: GAGAL (modul belum ada).

- [ ] **Langkah 3: Implementasikan `KartuPekerjaan.tsx`**

```tsx
import Link from 'next/link';
import { Progress } from '@/components/ui/Progress';
import { IkonHalaman } from '@/components/ui/IkonHalaman';

const IKON = { pekerjaan: '/tugas', catatan: '/rapat', usaha: '/gerai', koperasi: '/anggota' } as const;

/** Kartu ala Taskflow: sampul warna hub + ikon, karena tidak ada foto asli yang boleh dipakai. */
export function KartuPekerjaan({ judul, hub, href, progres, tenggat, keterangan }: {
  judul: string; hub: keyof typeof IKON; href: string; progres: number | null; tenggat?: string; keterangan?: string;
}) {
  return (
    <Link href={href} className={`kartu-pekerjaan sampul-${hub}`}>
      <span className="kartu-pekerjaan-sampul" aria-hidden="true"><IkonHalaman href={IKON[hub]} size={36} /></span>
      <strong>{judul}</strong>
      {keterangan && <small>{keterangan}</small>}
      <Progress value={progres} label="Progres" tampilkanAngka />
      {tenggat && <small className="kartu-pekerjaan-tenggat">Tenggat {tenggat}</small>}
    </Link>
  );
}
```

- [ ] **Langkah 4: Implementasikan `KalenderMini.tsx`**

```tsx
const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const HARI = ['Sen','Sel','Rab','Kam','Jum','Sab','Min'];

/** Kalender bulan berjalan; tanggal bertanda = ada tugas/rapat (status dinyatakan lewat label, bukan warna saja). */
export function KalenderMini({ tanggal, tandai }: { tanggal: Date; tandai: string[] }) {
  const tahun = tanggal.getFullYear(), bulan = tanggal.getMonth();
  const geser = (new Date(tahun, bulan, 1).getDay() + 6) % 7;
  const jumlah = new Date(tahun, bulan + 1, 0).getDate();
  const sel: (number | null)[] = [...Array(geser).fill(null), ...Array.from({ length: jumlah }, (_, i) => i + 1)];
  while (sel.length % 7) sel.push(null);
  const kunci = (d: number) => `${tahun}-${String(bulan + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return (
    <table className="kalender-mini" aria-label={`${BULAN[bulan]} ${tahun}`}>
      <thead><tr>{HARI.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
      <tbody>
        {Array.from({ length: sel.length / 7 }, (_, r) => (
          <tr key={r}>
            {sel.slice(r * 7, r * 7 + 7).map((d, i) => {
              if (!d) return <td key={i} />;
              const hariIni = d === tanggal.getDate();
              const ada = tandai.includes(kunci(d));
              const label = `${d} ${BULAN[bulan]}${hariIni ? ', hari ini' : ada ? ', ada kegiatan' : ''}`;
              return <td key={i} aria-label={label} data-hari-ini={hariIni || undefined} data-ada={ada || undefined}>{d}</td>;
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

Catatan: `tanggal` harus diturunkan dari `src/lib/date.ts` (zona Asia/Jakarta) oleh pemanggil. Komponen ini tidak membaca jam sendiri.

- [ ] **Langkah 5: Jalankan dan pastikan lulus**

Jalankan: `npm test -- tests/ui/beranda-taskflow.test.tsx`
Hasil yang diharapkan: LULUS (3 tes).

- [ ] **Langkah 6: Susun ulang `Dashboard.tsx`**

Urutan baru, memakai data dan perhitungan yang sudah ada di berkas:
1. `.beranda-sapaan`: kartu sapaan "Halo, {nama}", dengan satu kalimat ringkasan teks dari hitungan yang sudah ada (tugas aktif, terlambat, rapat hari ini).
2. `.beranda-berjalan`: judul "Pekerjaan berjalan" dan baris gulir mendatar berisi maksimal 6 `KartuPekerjaan` untuk proyek dan tugas aktif. Progres diambil dari `lib/progress.ts`. Bila kosong, tampilkan `EmptyState` yang sudah ada dengan aksi "Tambah tugas".
3. `.beranda-grafik`: grafik aktivitas mingguan yang sudah ada (`GrafikLembut`).
4. Modul lain yang sudah ada (perhatian `#perhatian`, `ModulUsahaHarian`, `KasBanding`) dipertahankan dalam kartu `.modul` di bawahnya.
5. `<aside className="panel-kanan">`: `KalenderMini`, dengan tanggal bertanda dari tenggat tugas dan tanggal rapat, lalu daftar "Hari ini" yang memakai tugas/rapat hari ini dari hitungan yang sudah ada.

Status memuat, kosong, dan galat tetap ditangani seperti sekarang. Jangan menampilkan angka 0 bila data gagal dimuat.

- [ ] **Langkah 7: Tulis ulang `beranda.css`**

- `.beranda` adalah grid `1fr` dan menjadi `1fr var(--panel-kanan-w)` pada ≥1440 px.
- `.beranda-berjalan` adalah baris dengan `display: grid; grid-auto-flow: column; grid-auto-columns: minmax(260px, 1fr); overflow-x: auto; gap: 20px; scroll-snap-type: x mandatory;`.
- `.kartu-pekerjaan` adalah kartu 16 px dengan padding 16 px dan grid baris. `.kartu-pekerjaan-sampul` setinggi 112 px, bersudut 12 px, dengan latar `var(--sampul-<hub>)` dan ikon di tengah. Kelas `.sampul-usaha .kartu-pekerjaan-sampul { background: var(--sampul-usaha); }` dan seterusnya untuk keempat hub. Fokus memakai `outline` dengan `var(--focus-ring)`.
- `.kalender-mini` memakai `td` berukuran 36 px. `[data-hari-ini]` berlatar `var(--brand)` dengan teks `var(--on-brand)`. `[data-ada]` diberi titik `::after` 4 px `var(--brand)`.
- `@media (prefers-reduced-motion: reduce)` mematikan `scroll-behavior` halus.

- [ ] **Langkah 8: Pemeriksaan penuh, audit, dan commit**

Jalankan: `npm test -- --maxWorkers=2 && npm run typecheck && npm run lint && npm run lint:ui && npm run build && npm run ukur:bundel`
Jalankan juga audit `/beranda` pada 360/768/1024/1440, terang dan gelap.

```bash
git add src/features/dashboard src/styles/halaman/beranda.css tests/ui
git commit -m "Susun Beranda ala Taskflow

Kartu sapaan, kartu pekerjaan bersampul warna hub, grafik mingguan, dan
panel kanan berisi kalender mini serta agenda hari ini dari data nyata."
```

---

### Tugas 4: Hub Pekerjaan (Hari ini, Tugas, Proyek, Linimasa)

**Berkas:**
- Ubah: `src/styles/halaman/tugas.css`, `proyek.css`, `hariini.css`
- Ubah bila perlu: `src/features/tasks/*`, `src/features/projects/Projects.tsx`, `src/features/dashboard/TodayView.tsx`. Hanya ubah kelas dan penurunan `h1` → `h2`; logika tidak disentuh.
- Uji: tes yang ada (`task-flow`, `board-move`, `calendar`, `project-*`, `timeline-today`, `task-*`) harus tetap lulus.

**Antarmuka:**
- Memakai: token Tugas 0, `.tab-hub` dari Tugas 2, dan `KartuPekerjaan` dari Tugas 3 untuk daftar proyek.

- [ ] **Langkah 1:** Jalankan `grep -n "<h1" src/features/tasks src/features/projects src/features/dashboard/TodayView.tsx -r`. Ubah setiap `h1` halaman menjadi `h2`, karena kepala kerangka sudah memuat `h1`. Lalu perbarui tes yang mencari `getByRole('heading', { level: 1 })` pada komponen itu supaya mencari level 2.
- [ ] **Langkah 2:** Daftar proyek di `Projects.tsx` sekarang memakai `KartuPekerjaan` (`hub="pekerjaan"`, `progres` dari `lib/progress.ts`, `href` = `/proyek?id=<id>`). Warna proyek pengguna (`data.color`) tampil sebagai garis 4 px di atas sampul lewat gaya inline `--warna-proyek`.
- [ ] **Langkah 3:** Papan tugas: kolom bersudut 16 px dengan latar `var(--surface-2)`, kartu tugas putih, dan judul kolom 14/600 beserta jumlah. Kalender dan Gantt: garis `var(--line)` dan batang `var(--brand)`. Kontainernya bergulir sendiri, seperti aturan yang berlaku sekarang.
- [ ] **Langkah 4:** Jalankan `npm test -- --maxWorkers=2 && npm run typecheck && npm run lint && npm run lint:ui && npm run build`, lalu audit `/hari-ini`, `/tugas`, `/tugas?view=papan`, `/tugas?view=kalender`, `/proyek`, dan `/roadmap` pada 360 dan 1440 px.
- [ ] **Langkah 5:** Commit dengan pesan `Terapkan gaya Taskflow pada hub Pekerjaan`, disertai isi yang menjelaskan judul `h2` dan kartu proyek bersampul.

### Tugas 5: Hub Catatan (Kegiatan, Rapat, Dokumen, Risiko, Laporan, Mitra)

**Berkas:** `src/styles/halaman/catatan.css`, `laporan.css`, `laci.css`. Bila ada, ubah juga `h1` di `src/features/meetings`, `src/features/journal`, `src/features/reports`, dan `src/features/records/Records.tsx`.

- [ ] **Langkah 1:** Lakukan pencarian dan penurunan `h1` → `h2` seperti Tugas 4 Langkah 1 di folder-folder tersebut. Perbarui tes terkait (`kegiatan`, `meeting-actions`, `operations`).
- [ ] **Langkah 2:** Daftar catatan memakai kartu 16 px dengan latar `var(--surface)`. Ikon kategori berada di ubin `var(--sampul-catatan)`. Tab bagian dalam (`.tabs`, misalnya Rapat/Keputusan) memakai gaya garis bawah dari Tugas 0, sehingga tidak bertumpuk visual dengan `.tab-hub`. `.tabs` diberi ukuran 13 px dan jarak 16 px, lebih kecil dari `.tab-hub`.
- [ ] **Langkah 3:** Laci dan editor (`laci.css`) memakai panel putih bersudut 16 px di sisi kiri dan bayangan `var(--shadow-lg)`. Tombol simpan memakai tombol utama dari Tugas 0.
- [ ] **Langkah 4:** Jalankan pemeriksaan penuh seperti Tugas 4 Langkah 4. Audit `/jurnal`, `/rapat`, `/rapat?bagian=decisions`, `/dokumen`, `/risiko`, `/laporan`, dan `/mitra` pada 360 dan 1440 px.
- [ ] **Langkah 5:** Commit `Terapkan gaya Taskflow pada hub Catatan`.

### Tugas 6: Hub Usaha (Gerai, Kesiapan, Penjualan, Pembelian, Barang, Opname, Pengiriman, Aset)

**Berkas:** `src/styles/halaman/buku.css`, `umum.css`. Bila ada, ubah juga `h1` di `src/features/operations/Operations.tsx` dan `src/features/records`.

- [ ] **Langkah 1:** Lakukan penurunan `h1` → `h2` seperti Tugas 4 Langkah 1. Perbarui tes `operations`, `operations-mobile`, dan `readiness-card` bila menunjuk level judul.
- [ ] **Langkah 2:** Tabel memakai kepala 12/600 berwarna `var(--ink-muted)`, baris setinggi 52 px, dan garis `var(--line)`. Di bawah 768 px tabel menjadi kartu, mengikuti perilaku yang sudah ada. Ikon kartu gerai dan barang berada di ubin `var(--sampul-usaha)`.
- [ ] **Langkah 3:** Pada 360 px, delapan tab Usaha harus bergulir di dalam `.tab-hub`. Periksa `document.documentElement.scrollWidth === innerWidth` lewat audit.
- [ ] **Langkah 4:** Jalankan pemeriksaan penuh, lalu audit kedelapan rute pada 360 dan 1440 px.
- [ ] **Langkah 5:** Commit `Terapkan gaya Taskflow pada hub Usaha`.

### Tugas 7: Hub Koperasi (Ringkasan buku, Anggota, Buku kas, Simpanan, Tim, Absensi) dan Pengaturan

**Berkas:** `src/styles/halaman/buku.css`, `pengaturan.css`, `src/features/dashboard/KasBanding.tsx` (kelas saja), `src/features/workspace/ManagerGuide.tsx` (kartu panduan).

- [ ] **Langkah 1:** Lakukan penurunan `h1` → `h2` seperti Tugas 4 Langkah 1 di halaman-halaman ini. Perbarui `settings-profile.test.tsx` dan `staff-look.test.tsx` bila perlu.
- [ ] **Langkah 2:** Ringkasan buku kas tetap ditulis sebagai "uang masuk/keluar tercatat", bukan saldo atau laba. Angka memakai 20/600 dengan label teks. Ikon berada di ubin `var(--sampul-koperasi)`.
- [ ] **Langkah 3:** Daftar tim memakai `avatar-inisial` dari Tugas 0 dengan inisial nama staf yang tercatat, tanpa foto.
- [ ] **Langkah 4:** Jalankan pemeriksaan penuh, lalu audit `/pencatatan`, `/anggota`, `/keuangan`, `/simpanan`, `/tim`, `/absensi`, `/pengaturan`, dan `/panduan` pada 360 dan 1440 px, terang dan gelap.
- [ ] **Langkah 5:** Commit `Terapkan gaya Taskflow pada hub Koperasi dan Pengaturan`.

### Tugas 8: Dunia, sisa gaya lama, dan dokumen

**Berkas:**
- Ubah: `src/features/dunia-3d/monitoring.css` (`--mt-blue: #546fff`), `src/features/dunia-3d/monitoring-scene.ts` (`fill="#2f5bea"` → `#546fff`, `#1d3a9e` → `#2f48d6`), dan komentar di `monitor-cards.tsx`.
- Ubah: `AGENTS.md` (paragraf gaya "Cerah" diganti "Taskflow" beserta nilai Batasan Global dan aturan hub), `docs/DESAIN-ANTARMUKA.md`, `docs/STATUS.md`, `docs/LANJUTAN-AI.md`, `CHANGELOG.md`.
- Ubah: memori `gaya-kebun-dipilih.md` menjadi gaya Taskflow, dipilih 16 Okt 2026.
- Uji: `tests/ui/monitoring-dashboard.test.tsx` dan `tests/unit/model-dunia.test.ts` harus tetap lulus.

- [ ] **Langkah 1:** Jalankan `grep -rniE "#2f5bea|2f5bea|Cerah" src docs AGENTS.md`. Ganti setiap kemunculan yang merujuk aksen atau gaya aktif. Catatan riwayat di CHANGELOG tidak diubah.
- [ ] **Langkah 2:** Jalankan `grep -rn "sidebar-nav-item\|tablet-rail\|getNavSubtitle\|hub-favorites\|hub-nav-collapsed" src tests`. Hasilnya harus kosong; hapus sisa yang masih ada.
- [ ] **Langkah 3:** Lakukan pemeriksaan penuh: `npm test -- --maxWorkers=2 && npm run typecheck && npm run lint && npm run lint:ui && npm run build && npm run ukur:bundel`. Lalu audit `/dunia-koperasi` pada 360 dan 1440 px.
- [ ] **Langkah 4:** Perbarui dokumen. STATUS dan LANJUTAN-AI menimpa bagian gaya dengan keadaan terkini. CHANGELOG mendapat satu entri paket "Desain Taskflow" yang merangkum Tugas 0–8.
- [ ] **Langkah 5:** Commit `Selaraskan Dunia dan dokumen dengan gaya Taskflow`.

---

## Verifikasi akhir cabang

1. Pemeriksaan penuh lulus: `npm test`, `npm run typecheck`, `npm run lint`, `npm run lint:ui`, `npm run build`, dan `npm run ukur:bundel` (≤ 300 KB).
2. Dengan `npm run dev:demo -- -p 3200` berjalan, `npm run audit:tampilan` lulus pada 360×780, 768×1024, 1024×768, dan 1440×900.
3. Pemeriksaan manual di peramban: setiap hub dapat dibuka dari sidebar, rel, dan lembar ponsel. Setiap URL lama membuka tab yang benar dengan hub aktif yang benar. Tab bisa dijangkau keyboard dengan fokus terlihat. Mode gelap terbaca.
4. Diff diperiksa dari rahasia, token, dan data pribadi sebelum PR. Push hanya atas permintaan pemilik.
