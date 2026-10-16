import { navigation } from '@/features/records/catalog';

export type HubId = 'beranda' | 'pekerjaan' | 'catatan' | 'usaha' | 'koperasi' | 'dunia';
export type Hub = { id: HubId; label: string; ikon: string; tabs: readonly string[] };

// Menu dipadatkan menjadi enam hub (keputusan pemilik 16 Okt 2026); tab = rute lama agar tautan tetap sah.
export const HUBS: readonly Hub[] = [
  { id: 'beranda', label: 'Beranda', ikon: '/beranda', tabs: ['/beranda'] },
  { id: 'pekerjaan', label: 'Pekerjaan', ikon: '/tugas', tabs: ['/hari-ini', '/tugas', '/proyek', '/roadmap'] },
  { id: 'catatan', label: 'Catatan', ikon: '/rapat', tabs: ['/jurnal', '/rapat', '/dokumen', '/risiko', '/laporan', '/mitra'] },
  {
    id: 'usaha',
    label: 'Usaha',
    ikon: '/gerai',
    tabs: ['/gerai', '/kesiapan', '/penjualan', '/pembelian', '/barang', '/stok-opname', '/pengiriman', '/aset'],
  },
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
