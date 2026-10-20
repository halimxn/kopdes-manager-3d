import Link from 'next/link';
import { Menu, Plus } from 'lucide-react';
import { IkonHalaman } from './IkonHalaman';
import { hubUntuk } from '@/components/layout/navigasi';

/**
 * Nav ponsel "pil mengembang" (pilihan pemilik 19 Okt 2026): menu aktif melebar dengan label,
 * tombol tambah gelap terpisah di kanan. Hanya tampil di bawah 768 px (kerangka.css).
 */
export function BottomNav({ path, menu, onAction, onMenu }: {
  path: string; menu: boolean; onAction: () => void; onMenu: () => void;
}) {
  const hub = hubUntuk(path)?.id;
  const items = [
    { label: 'Beranda', href: '/beranda', aktif: hub === 'beranda' },
    { label: 'Tugas', href: '/tugas', aktif: hub === 'pekerjaan' },
    { label: 'Agenda', href: '/rapat', aktif: path.split(/[?#]/)[0] === '/rapat' },
  ];
  const lainnyaAktif = !items.some((item) => item.aktif);
  return (
    <nav className="ui-bottom-nav" aria-label="Navigasi cepat">
      <div className="nav-pil">
        {items.map(({ label, href, aktif }) => (
          <Link key={href} href={href} className="nav-pil-item" aria-label={label} aria-current={aktif ? 'page' : undefined}>
            <IkonHalaman href={href} size={22} />
            <span className="nav-pil-label">{label}</span>
          </Link>
        ))}
        <button
          type="button"
          className="nav-pil-item"
          onClick={onMenu}
          aria-label="Semua halaman"
          aria-expanded={menu}
          data-aktif={lainnyaAktif && !menu ? 'true' : undefined}
        >
          <Menu size={22} aria-hidden="true" />
          <span className="nav-pil-label">Lainnya</span>
        </button>
      </div>
      <button type="button" className="nav-tambah" onClick={onAction} aria-label="Tambah catatan">
        <Plus size={26} aria-hidden="true" />
      </button>
    </nav>
  );
}
