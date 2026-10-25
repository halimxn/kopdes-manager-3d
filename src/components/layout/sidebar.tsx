'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Fragment, useState, type FocusEvent, type PointerEvent } from 'react';
import * as motion from 'motion/react-m';
import { LogoMark } from '@/components/ui/logo';
import { PageIcon } from '@/components/ui/icon';
import { NAV_FOOTER, NAV_GROUPS, PAGES, type PageId } from './nav';
import { ProfileMenu } from './profile-menu';
import { cn } from '@/lib/utils';
import { prefetchWorkspace } from '@/features/workspace/use-workspace';

export const activePage = (pathname: string): PageId | undefined =>
  (Object.keys(PAGES) as PageId[]).find(
    (id) => pathname === `/${id}` || pathname.startsWith(`/${id}/`),
  );

type Tip = { label: string; y: number } | null;

/** Tombol ikon bulat di rel; nama menu tampil sebagai label melayang (lihat Sidebar). */
function NavLink({
  id,
  active,
  onTip,
}: {
  id: PageId;
  active: boolean;
  onTip: (tip: Tip) => void;
}) {
  const page = PAGES[id];
  const show = (event: PointerEvent<HTMLElement> | FocusEvent<HTMLElement>) => {
    // Data halaman dimuat saat kursor atau fokus tiba, sebelum diklik.
    prefetchWorkspace(id);
    const rect = event.currentTarget.getBoundingClientRect();
    onTip({ label: page.label, y: rect.top + rect.height / 2 });
  };
  return (
    <Link
      href={`/${id}`}
      aria-current={active ? 'page' : undefined}
      aria-label={page.label}
      onPointerEnter={show}
      onFocus={show}
      onPointerLeave={() => onTip(null)}
      onBlur={() => onTip(null)}
      className={cn(
        'group relative grid size-10 shrink-0 place-items-center rounded-full transition-colors duration-200',
        active ? 'text-on-action' : 'text-ink-3 hover:bg-surface-2 hover:text-ink',
      )}
    >
      {active && (
        <motion.span
          layoutId="rail-active"
          className="absolute inset-0 rounded-full bg-action shadow-[0_8px_18px_-8px_var(--action)]"
          transition={{ type: 'spring', stiffness: 460, damping: 34 }}
        />
      )}
      <PageIcon
        name={page.icon}
        className="relative size-[19px] transition-transform duration-200 group-active:scale-90"
      />
    </Link>
  );
}

/**
 * Rel navigasi tablet dan laptop: kapsul putih ramping yang melayang di kiri (acuan dashboard
 * 25 Okt 2026). Ikon berkelompok Kerja, Catatan, Usaha, Koperasi dipisah garis tipis; menu aktif
 * berupa lingkaran gelap yang meluncur. Disembunyikan di HP (navigasi bawah).
 */
export function Sidebar() {
  const active = activePage(usePathname());
  const [tip, setTip] = useState<Tip>(null);
  const link = (id: PageId) => <NavLink key={id} id={id} active={active === id} onTip={setTip} />;
  return (
    <aside className="sticky top-0 hidden h-dvh shrink-0 p-3 pr-0 md:block">
      <div className="flex h-full w-[68px] animate-[rail-in_0.6s_var(--ease-sheet)] flex-col items-center gap-2 rounded-[2rem] bg-surface py-3 shadow-card ring-1 ring-line/70">
        <Link href="/home" aria-label="Kopdes, ke Beranda" className="mb-1 shrink-0">
          <LogoMark className="size-10 rounded-[13px]" />
        </Link>
        {/* Layar pendek: ikon bergulir di dalam kapsul, logo dan profil tetap di tempat. */}
        <nav
          aria-label="Menu utama"
          onScroll={() => setTip(null)}
          className="scrollbar-none -mx-3 flex min-h-0 flex-1 flex-col items-center gap-0.5 overflow-y-auto overscroll-contain px-3 py-1"
        >
          {NAV_GROUPS.map((group, index) => (
            <Fragment key={group.label}>
              {index > 0 && <span className="my-1 h-px w-5 shrink-0 bg-line" aria-hidden="true" />}
              <span className="sr-only">{group.label}</span>
              {group.pages.map(link)}
            </Fragment>
          ))}
        </nav>
        <span className="h-px w-6 shrink-0 bg-line" aria-hidden="true" />
        <div className="flex shrink-0 flex-col items-center gap-0.5">{NAV_FOOTER.map(link)}</div>
        <ProfileMenu compact />
      </div>
      {/* Label melayang berposisi tetap: tidak terpotong oleh gulir rel, tanpa pustaka tooltip. */}
      {tip && (
        <span
          key={tip.label}
          aria-hidden="true"
          style={{ top: tip.y }}
          className="pointer-events-none fixed left-[96px] z-50 -translate-y-1/2 animate-[item-in_0.2s_var(--ease-out)] rounded-lg bg-action px-2.5 py-1 text-xs font-bold whitespace-nowrap text-on-action shadow-float"
        >
          {tip.label}
        </span>
      )}
    </aside>
  );
}
