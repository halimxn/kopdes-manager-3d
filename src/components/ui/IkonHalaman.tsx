import { Ikon3D, type Ikon3DKind } from './Ikon3D';

/** Ikon timbul per halaman; nama ikon senada dengan ruang di Dunia Koperasi. */
export const IKON_HALAMAN: Record<string, Ikon3DKind> = {
  '/beranda': 'rumah',
  '/dunia-koperasi': 'pulau',
  '/hari-ini': 'matahari',
  '/tugas': 'papan',
  '/tindak-lanjut': 'peringatan',
  '/proyek': 'folder',
  '/roadmap': 'bendera',
  '/jurnal': 'dumbel',
  '/pencatatan': 'buku',
  '/keuangan': 'dompet',
  '/barang': 'kotak',
  '/stok-opname': 'rak',
  '/pengiriman': 'truk',
  '/anggota': 'kartu',
  '/simpanan': 'gembok',
  '/penjualan': 'lonceng',
  '/pembelian': 'gudang',
  '/aset': 'meja',
  '/absensi': 'jam',
  '/gerai': 'toko',
  '/kesiapan': 'cek',
  '/risiko': 'perisai',
  '/laporan': 'grafik',
  '/rapat': 'kalender',
  '/dokumen': 'dokumen',
  '/mitra': 'jabat',
  '/tim': 'tim',
  '/pengaturan': 'gerigi',
  '/panduan': 'tanya',
};

/** Ikon halaman di dalam ubin biru muda (menu samping, rel, kartu menu ponsel). */
export function IkonHalaman({ href, size = 24 }: { href: string; size?: number }) {
  return (
    <span className="ikon-halaman" style={{ ['--ikon' as string]: `${size}px` }}>
      <Ikon3D kind={IKON_HALAMAN[href.split('?')[0]] ?? 'folder'} size={size} rapat />
    </span>
  );
}
