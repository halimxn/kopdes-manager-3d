'use client';
// Rel ikon pil di kiri (tablet dan desktop). Ikon kelompok membuka panel berisi nama halaman, sehingga
// sekitar 30 halaman tetap mudah dicari tanpa menu samping panjang. Ponsel memakai dok bawah + lembar menu.
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  Boxes,
  CircleHelp,
  House,
  ListChecks,
  LockKeyhole,
  Settings,
  Star,
  Store,
  UsersRound,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react';
import { navigation } from '@/features/records/catalog';
import { IkonHalaman } from '@/components/ui/IkonHalaman';
import type { Item } from '@/features/records/schemas';

type Grup = { id: string; label: string; Icon: LucideIcon; href?: string; halaman?: readonly string[] };

const GRUP_UTAMA: Grup[] = [
  { id: 'beranda', label: 'Beranda', Icon: House, href: '/beranda' },
  { id: 'kerja', label: 'Ruang kerja', Icon: ListChecks, halaman: ['/hari-ini', '/tugas', '/proyek', '/roadmap', '/jurnal'] },
  {
    id: 'buku',
    label: 'Buku koperasi',
    Icon: Wallet,
    halaman: ['/keuangan', '/penjualan', '/pembelian', '/barang', '/stok-opname', '/pengiriman', '/anggota', '/simpanan', '/aset'],
  },
  { id: 'gerai', label: 'Gerai & laporan', Icon: Store, halaman: ['/gerai', '/kesiapan', '/risiko', '/laporan'] },
  { id: 'koordinasi', label: 'Koordinasi & berkas', Icon: UsersRound, halaman: ['/rapat', '/dokumen', '/mitra', '/tim', '/absensi'] },
  { id: 'dunia', label: 'Dunia Koperasi', Icon: Boxes, href: '/dunia-koperasi' },
];

const namaHalaman = (href: string) => navigation.find(([url]) => url === href)?.[1] || href;

export function RelNavigasi({
  path,
  favorit,
  proyek,
  subjudul,
  onKunci,
}: {
  path: string;
  favorit: string[];
  proyek: Item[] | null;
  subjudul: (href: string) => string;
  onKunci: () => void;
}) {
  const [buka, setBuka] = useState<string | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const rel = useRef<HTMLElement>(null);
  const grup: Grup[] = [...GRUP_UTAMA, { id: 'favorit', label: 'Favorit', Icon: Star, halaman: favorit }];
  const aktif = grup.find((g) => g.href === path || g.halaman?.includes(path))?.id;
  const grupBuka = grup.find((g) => g.id === buka);

  // Panel tertutup saat tautan dipilih, klik di luar, atau Escape (fokus kembali ke ikon).
  useEffect(() => {
    if (!buka) return;
    const luar = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!panel.current?.contains(target) && !rel.current?.contains(target)) setBuka(null);
    };
    const tombol = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      rel.current?.querySelector<HTMLElement>(`[data-grup="${buka}"]`)?.focus();
      setBuka(null);
    };
    document.addEventListener('pointerdown', luar);
    document.addEventListener('keydown', tombol);
    panel.current?.querySelector<HTMLElement>('a')?.focus();
    return () => {
      document.removeEventListener('pointerdown', luar);
      document.removeEventListener('keydown', tombol);
    };
  }, [buka]);

  const ikon = (g: Grup) => {
    const kelas = `rel-ikon${aktif === g.id ? ' is-aktif' : ''}${buka === g.id ? ' is-buka' : ''}`;
    return g.href ? (
      <Link
        key={g.id}
        href={g.href}
        className={kelas}
        aria-label={g.label}
        title={g.label}
        aria-current={path === g.href ? 'page' : undefined}
        onClick={() => setBuka(null)}
      >
        <g.Icon size={20} strokeWidth={1.9} aria-hidden="true" />
      </Link>
    ) : (
      <button
        key={g.id}
        type="button"
        className={kelas}
        data-grup={g.id}
        aria-label={g.label}
        title={g.label}
        aria-expanded={buka === g.id}
        aria-controls="rel-panel"
        onClick={() => setBuka(buka === g.id ? null : g.id)}
      >
        <g.Icon size={20} strokeWidth={1.9} aria-hidden="true" />
      </button>
    );
  };

  return (
    <>
      <nav className="rel" aria-label="Navigasi utama" ref={rel}>
        <Link href="/beranda" className="rel-logo" aria-label="Kopdes Manager, ke Beranda" title="Beranda">
          <IkonHalaman href="/beranda" size={24} />
        </Link>
        <div className="rel-pil">{grup.map(ikon)}</div>
        <div className="rel-pil">
          {ikon({ id: 'pengaturan', label: 'Pengaturan', Icon: Settings, href: '/pengaturan' })}
          {ikon({ id: 'panduan', label: 'Panduan', Icon: CircleHelp, href: '/panduan' })}
          <button type="button" className="rel-ikon" aria-label="Kunci aplikasi" title="Kunci aplikasi" onClick={onKunci}>
            <LockKeyhole size={19} strokeWidth={1.9} aria-hidden="true" />
          </button>
        </div>
      </nav>
      {grupBuka && (
        <div id="rel-panel" className="rel-panel" ref={panel} role="dialog" aria-label={grupBuka.label}>
          <div className="rel-panel-kepala">
            <h2>{grupBuka.label}</h2>
            <button type="button" className="rel-panel-tutup" aria-label="Tutup panel" onClick={() => setBuka(null)}>
              <X size={16} aria-hidden="true" />
            </button>
          </div>
          {grupBuka.halaman?.length ? (
            <nav className="rel-panel-daftar" aria-label={grupBuka.label}>
              {grupBuka.halaman.map((href) => (
                <Link
                  key={href}
                  href={href}
                  aria-label={namaHalaman(href)}
                  aria-current={path === href ? 'page' : undefined}
                  className="rel-panel-item"
                  onClick={() => setBuka(null)}
                >
                  <IkonHalaman href={href} size={26} />
                  <span>
                    <strong>{namaHalaman(href)}</strong>
                    <small>{subjudul(href)}</small>
                  </span>
                </Link>
              ))}
            </nav>
          ) : (
            <p className="rel-panel-kosong">Belum ada favorit. Tandai halaman dengan bintang di bilah atas.</p>
          )}
          {grupBuka.id === 'kerja' && (
            <div className="rel-panel-proyek">
              <h3>Proyek berjalan</h3>
              {proyek === null ? (
                <small>Proyek belum dimuat.</small>
              ) : proyek.length ? (
                proyek.map((p) => (
                  <Link key={p.id} href={`/proyek?id=${encodeURIComponent(p.id)}`} onClick={() => setBuka(null)}>
                    <span className="project-dot" style={{ backgroundColor: String(p.data.color || 'var(--brand)') }} />
                    <span className="project-title">{String(p.data.title)}</span>
                  </Link>
                ))
              ) : (
                <small>Tidak ada proyek berjalan.</small>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
