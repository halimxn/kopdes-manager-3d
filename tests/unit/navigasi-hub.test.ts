import { expect, it } from 'vitest';
import { HUBS, KAKI_SIDEBAR, MENU_KERJA, RUANG_LAIN, hubUntuk, labelHalaman } from '@/components/layout/navigasi';
import { navigation } from '@/features/records/catalog';

it('setiap halaman katalog berada tepat di satu hub atau kaki sidebar', () => {
  const semua = [...HUBS.flatMap((hub) => hub.tabs), ...KAKI_SIDEBAR];
  expect(new Set(semua).size).toBe(semua.length);
  expect([...semua].sort()).toEqual(navigation.map(([href]) => href).sort());
});

it('enam hub dengan urutan sidebar yang disepakati', () => {
  expect(HUBS.map((hub) => hub.id)).toEqual(['beranda', 'pekerjaan', 'catatan', 'usaha', 'koperasi', 'dunia']);
});

it('menu kerja membuka Beranda dan halaman Pekerjaan langsung; hub lain menjadi Ruang lain', () => {
  expect(MENU_KERJA).toEqual(['/beranda', '/hari-ini', '/tugas', '/proyek', '/roadmap']);
  expect(RUANG_LAIN.map((hub) => hub.id)).toEqual(['catatan', 'usaha', 'koperasi', 'dunia']);
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
