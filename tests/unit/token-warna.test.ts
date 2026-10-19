import { readdirSync, readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

const css = readFileSync('src/styles/token.css', 'utf8');
const blok = (pemilih: string) => css.split(pemilih + ' {')[1]?.split('\n}')[0] ?? '';
const nilai = (isi: string, nama: string) =>
  isi.match(new RegExp(`${nama}:\\s*(#[0-9a-fA-F]{6})`))?.[1]?.toLowerCase();

function luminans(hex: string) {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const kontras = (a: string, b: string) => {
  const [x, y] = [luminans(a), luminans(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

it('aksen dan tinta mengikuti palet Merah Putih halus', () => {
  const terang = blok(':root');
  expect(nilai(terang, '--brand')).toBe('#a04656');
  expect(nilai(terang, '--brand-hover')).toBe('#8e3b4a');
  expect(nilai(terang, '--brand-soft')).toBe('#f7e6e8');
  expect(nilai(terang, '--canvas')).toBe('#f7f1ec');
  expect(nilai(terang, '--ink-heading')).toBe('#24191d');
  expect(nilai(terang, '--ink-muted')).toBe('#6e6064');
  expect(terang).toMatch(/--r-card:\s*22px/);
});

it('teks utama terbaca di kedua tema', () => {
  for (const pemilih of [':root', ':root.dark']) {
    const isi = blok(pemilih);
    const permukaan = nilai(isi, '--surface')!;
    expect(kontras(nilai(isi, '--ink-heading')!, permukaan)).toBeGreaterThanOrEqual(4.5);
    expect(kontras(nilai(isi, '--ink-muted')!, permukaan)).toBeGreaterThanOrEqual(4.5);
  }
});

it('teks redup dan teks putih di atas isian delima tetap terbaca di kedua tema', () => {
  const terang = blok(':root');
  for (const pemilih of [':root', ':root.dark']) {
    const isi = blok(pemilih);
    // Mode gelap mewarisi token yang tidak ditimpanya.
    const t = (nama: string) => nilai(isi, nama) ?? nilai(terang, nama)!;
    expect(kontras(t('--ink-subtle'), t('--surface'))).toBeGreaterThanOrEqual(4.5);
    expect(kontras(t('--ink-subtle'), t('--canvas'))).toBeGreaterThanOrEqual(4.5);
    const putih = isi.match(/--on-brand:\s*(#[0-9a-f]{3,6})/i)?.[1] ?? terang.match(/--on-brand:\s*(#[0-9a-f]{3,6})/i)![1];
    const penuh = putih.length === 4 ? '#' + [...putih.slice(1)].map((c) => c + c).join('') : putih;
    expect(kontras(penuh, t('--brand-isi'))).toBeGreaterThanOrEqual(4.5);
    expect(kontras(penuh, t('--brand-isi-hover'))).toBeGreaterThanOrEqual(4.5);
  }
});

it('teks putih di sumur baris kartu Rutin (delima + --sumur-delima) tetap terbaca di kedua tema', () => {
  const terang = blok(':root');
  const [r, g, b, a] = terang.match(/--sumur-delima:\s*rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/)!.slice(1).map(Number);
  for (const pemilih of [':root', ':root.dark']) {
    const isi = nilai(blok(pemilih), '--brand-isi') ?? nilai(terang, '--brand-isi')!;
    const campur = [1, 3, 5]
      .map((i, n) => Math.round(parseInt(isi.slice(i, i + 2), 16) * (1 - a) + [r, g, b][n] * a))
      .map((c) => c.toString(16).padStart(2, '0'));
    expect(kontras('#ffffff', '#' + campur.join(''))).toBeGreaterThanOrEqual(4.5);
  }
});

it('teks putih (--on-brand) tidak pernah diletakkan di atas --brand atau --brand-hover', () => {
  const berkas = [
    'src/styles/dasar.css',
    'src/styles/komponen.css',
    'src/styles/kerangka.css',
    ...readdirSync('src/styles/halaman').map((nama) => `src/styles/halaman/${nama}`),
  ];
  const pelanggaran: string[] = [];
  for (const jalur of berkas) {
    const isiBerkas = readFileSync(jalur, 'utf8');
    for (const [, pemilih, isi] of isiBerkas.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const teksPutih = /(?:^|[;\s])(?:color|--btn-fg):\s*var\(--on-brand\)/.test(isi);
      const isianLemah = /(?:background|--btn-bg)[^;]*var\(--brand(?:-hover|-bright)?\)/.test(isi);
      if (teksPutih && isianLemah) pelanggaran.push(`${jalur}: ${pemilih.trim().split('\n').pop()}`);
    }
  }
  expect(pelanggaran).toEqual([]);
});

it('setiap warna sampul hub punya padanan mode gelap', () => {
  for (const hub of ['pekerjaan', 'catatan', 'usaha', 'koperasi', 'dunia']) {
    expect(blok(':root')).toContain(`--sampul-${hub}:`);
    expect(blok(':root.dark')).toContain(`--sampul-${hub}:`);
  }
});
