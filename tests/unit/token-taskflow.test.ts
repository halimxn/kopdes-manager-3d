import { readFileSync } from 'node:fs';
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
