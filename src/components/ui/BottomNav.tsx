import Link from 'next/link';
import { Menu, Plus } from 'lucide-react';
import { IkonHalaman } from './IkonHalaman';
import { Button } from './Button';
import { hubUntuk, type HubId } from '@/components/layout/navigasi';

export function BottomNav({ path, calendar, menu, onAction, onMenu }: {
  path: string; calendar: boolean; menu: boolean; onAction: () => void; onMenu: () => void;
}) {
  const items: { label: string; href?: string; hub?: HubId; action?: () => void; Icon?: typeof Plus }[] = [
    { label: 'Beranda', href: '/beranda', hub: 'beranda' },
    { label: 'Pekerjaan', href: '/hari-ini', hub: 'pekerjaan' },
    { label: 'Tambah', action: onAction, Icon: Plus },
    { label: 'Dunia', href: '/dunia-koperasi', hub: 'dunia' },
    { label: 'Menu', action: onMenu, Icon: Menu },
  ];
  const hubAktif = hubUntuk(path)?.id;
  return <nav className="ui-bottom-nav" aria-label="Navigasi cepat">
    {items.map(({ label, href, hub, Icon, action }) => {
      const content = <><span className="ui-bottom-icon">{href ? <IkonHalaman href={href === '/hari-ini' ? '/tugas' : href} size={24} /> : Icon && <Icon />}</span><span>{label}</span></>;
      // Perilaku lama dipertahankan: tampilan kalender tugas tidak menandai item dock aktif.
      const aktif = hub !== undefined && hub === hubAktif && !(hub === 'pekerjaan' && calendar);
      return href
        ? <Link key={label} href={href} className="ui-bottom-item" aria-label={label} aria-current={aktif ? 'page' : undefined}>{content}</Link>
        : <Button key={label} type="button" className="ui-bottom-item" onClick={action} data-action={label === 'Tambah'} aria-label={label === 'Tambah' ? 'Tambah catatan' : 'Semua halaman'} aria-expanded={label === 'Menu' ? menu : undefined}>{content}</Button>;
    })}
  </nav>;
}
