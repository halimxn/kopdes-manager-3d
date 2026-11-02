'use client';
import Link from 'next/link';
import { useLayoutEffect, useRef } from 'react';
import { prefetchWorkspace } from '@/features/workspace/use-workspace';
import { navGroupOf, NAV_GROUPS, PAGES, type PageId } from './nav';

const ITEMS = [
  ...NAV_GROUPS.map((group) => ({ label: group.label, page: group.pages[0] })),
  { label: PAGES.world.label, page: 'world' as PageId },
];
// Tepi depan bergerak lebih dulu dan cepat, tepi belakang menyusul: pil terasa meregang lalu menyusut.
const LEAD = '0.36s cubic-bezier(0.22, 1, 0.36, 1)';
const TRAIL = '0.56s cubic-bezier(0.65, 0, 0.35, 1)';

/** Pil menu atas (tablet dan laptop): satu butir per kelompok halaman, penanda aktif meregang saat pindah. */
export function TopNav({ active }: { active?: PageId }) {
  const nav = useRef<HTMLElement>(null);
  const pill = useRef<HTMLSpanElement>(null);
  const previous = useRef<number | null>(null);
  // Dunia 3D punya kerangka sendiri; Pengaturan dan Bantuan tidak menyalakan butir mana pun.
  const inGroup = NAV_GROUPS.some((group) => active && group.pages.includes(active));
  const index = inGroup ? ITEMS.findIndex((item) => item.label === navGroupOf(active).label) : -1;

  const place = (target: number, animate: boolean) => {
    const box = nav.current;
    const marker = pill.current;
    if (!box || !marker) return;
    const link = box.querySelectorAll('a')[target];
    if (!link) {
      marker.style.opacity = '0';
      previous.current = null;
      return;
    }
    const left = link.offsetLeft;
    const right = box.clientWidth - left - link.offsetWidth;
    const from = previous.current;
    if (from === left) return;
    marker.style.transition =
      animate && from !== null
        ? left > from
          ? `left ${TRAIL}, right ${LEAD}`
          : `left ${LEAD}, right ${TRAIL}`
        : 'none';
    marker.style.left = `${left}px`;
    marker.style.right = `${right}px`;
    marker.style.opacity = '1';
    previous.current = left;
  };

  useLayoutEffect(() => {
    place(index, true);
    // Lebar butir berubah saat huruf selesai dimuat atau jendela diubah; penanda ikut tanpa animasi.
    const observer = new ResizeObserver(() => {
      previous.current = null;
      place(index, false);
    });
    if (nav.current) observer.observe(nav.current);
    return () => observer.disconnect();
  }, [index]);

  return (
    <nav
      ref={nav}
      aria-label="Kelompok menu"
      className="relative flex h-12 items-center rounded-full bg-surface-2 p-1 ring-1 ring-line"
    >
      <span
        ref={pill}
        aria-hidden="true"
        className="absolute inset-y-1 rounded-full bg-surface-3 opacity-0 ring-1 ring-line dark:bg-surface-3 not-dark:bg-surface-solid not-dark:shadow-card"
      />
      {ITEMS.map((item, position) => (
        <Link
          key={item.label}
          href={`/${item.page}`}
          aria-current={position === index ? 'true' : undefined}
          onPointerEnter={() => prefetchWorkspace(item.page)}
          onFocus={() => prefetchWorkspace(item.page)}
          // Penanda bergerak saat diklik, tidak menunggu halaman baru selesai dimuat.
          onClick={() => place(position, true)}
          className="relative flex h-10 items-center rounded-full px-3.5 text-sm font-medium whitespace-nowrap text-ink-2 transition-colors hover:text-ink aria-[current]:text-ink lg:px-5"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
