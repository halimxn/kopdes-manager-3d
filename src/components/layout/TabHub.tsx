'use client';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { hubUntuk, labelHalaman } from './navigasi';

/** Tab di bawah judul halaman: menautkan halaman-halaman lama yang sekarang satu hub. */
export function TabHub({ path }: { path: string }) {
  const daftar = useRef<HTMLElement>(null);
  const hub = hubUntuk(path);
  const aktif = path.split(/[?#]/)[0];
  // Hub Usaha punya delapan tab; di ponsel tab aktif bisa berada di luar layar.
  useEffect(() => {
    daftar.current
      ?.querySelector('[aria-current="page"]')
      ?.scrollIntoView?.({ block: 'nearest', inline: 'center' });
  }, [aktif]);
  if (!hub || hub.tabs.length < 2) return null;
  return (
    <nav ref={daftar} className="tab-hub" aria-label={`Bagian ${hub.label}`}>
      {hub.tabs.map((href) => (
        <Link key={href} href={href} aria-current={href === aktif ? 'page' : undefined}>
          {labelHalaman(href)}
        </Link>
      ))}
    </nav>
  );
}
