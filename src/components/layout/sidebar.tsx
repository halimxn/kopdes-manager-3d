'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type FocusEvent, type PointerEvent, type ReactNode } from 'react';
import * as motion from 'motion/react-m';
import { Moon, Sun } from 'lucide-react';
import { PageIcon } from '@/components/ui/icon';
import { useTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { prefetchWorkspace } from '@/features/workspace/use-workspace';
import { navGroupOf, NAV_FOOTER, PAGES, type PageId } from './nav';

export const activePage = (pathname: string): PageId | undefined =>
  (Object.keys(PAGES) as PageId[]).find(
    (id) => pathname === `/${id}` || pathname.startsWith(`/${id}/`),
  );

type Tip = { label: string; y: number } | null;
type TipHandlers = {
  onPointerEnter: (event: PointerEvent<HTMLElement>) => void;
  onFocus: (event: FocusEvent<HTMLElement>) => void;
  onPointerLeave: () => void;
  onBlur: () => void;
};

/** Kelas tombol bulat rel; dipakai juga oleh pemicu Tambah di kerangka. */
export const RAIL_BUTTON =
  'grid size-10 shrink-0 place-items-center rounded-full text-ink-2 transition-colors duration-200 hover:bg-surface-3 hover:text-ink active:scale-95 [&_svg]:size-[19px]';

function NavLink({ id, active, tip }: { id: PageId; active: boolean; tip: TipHandlers }) {
  const page = PAGES[id];
  return (
    <Link
      href={`/${id}`}
      aria-current={active ? 'page' : undefined}
      aria-label={page.label}
      {...tip}
      onPointerEnter={(event) => {
        // Data halaman dimuat saat kursor tiba, sebelum diklik.
        prefetchWorkspace(id);
        tip.onPointerEnter(event);
      }}
      onFocus={(event) => {
        prefetchWorkspace(id);
        tip.onFocus(event);
      }}
      className={cn(
        RAIL_BUTTON,
        'relative',
        active && 'text-on-action hover:bg-transparent hover:text-on-action',
      )}
    >
      {active && (
        <motion.span
          layoutId="rail-active"
          className="absolute inset-0 rounded-full bg-action"
          transition={{ type: 'spring', stiffness: 460, damping: 34 }}
        />
      )}
      <PageIcon name={page.icon} className="relative" />
    </Link>
  );
}

/**
 * Rel ikon tablet dan laptop: kapsul melayang di kiri berisi halaman dalam kelompok yang dipilih di
 * pil atas, lalu alat (cari, tambah), dan di bawah bantuan, pengaturan, serta tema.
 * Nama halaman tampil sebagai label melayang. Disembunyikan di HP (navigasi bawah).
 */
export function Sidebar({ tools }: { tools: (tip: TipHandlers) => ReactNode }) {
  const active = activePage(usePathname());
  const { theme, setTheme } = useTheme();
  const [tip, setTip] = useState<Tip>(null);
  const showTip =
    (label: string) => (event: PointerEvent<HTMLElement> | FocusEvent<HTMLElement>) => {
      const box = event.currentTarget.getBoundingClientRect();
      setTip({ label, y: box.top + box.height / 2 });
    };
  const handlers = (label: string): TipHandlers => ({
    onPointerEnter: showTip(label),
    onFocus: showTip(label),
    onPointerLeave: () => setTip(null),
    onBlur: () => setTip(null),
  });
  // Pengaturan dan Bantuan bukan anggota kelompok: rel tetap menampilkan halaman kerja.
  const group = navGroupOf(active);
  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  const themeLabel = nextTheme === 'dark' ? 'Tema gelap' : 'Tema terang';
  return (
    <aside className="no-print sticky top-[72px] hidden h-[calc(100dvh-72px)] w-[76px] shrink-0 pb-3 pl-3 md:block">
      <div className="flex h-full w-14 flex-col items-center gap-1 rounded-full bg-surface-2 py-2 ring-1 ring-line">
        <nav
          aria-label={`Halaman ${group.label}`}
          onScroll={() => setTip(null)}
          className="scrollbar-none flex min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto overscroll-contain"
        >
          {group.pages.map((id, index) => (
            <span
              key={id}
              className="animate-[item-in_0.32s_var(--ease-out)_backwards]"
              style={{ animationDelay: `${index * 35}ms` }}
            >
              <NavLink id={id} active={active === id} tip={handlers(PAGES[id].label)} />
            </span>
          ))}
          <span className="my-1 h-px w-5 shrink-0 bg-line" aria-hidden="true" />
          {tools(handlers('Cari atau tambah'))}
        </nav>
        <span className="my-1 h-px w-5 shrink-0 bg-line" aria-hidden="true" />
        {NAV_FOOTER.filter((id) => id !== 'world').map((id) => (
          <NavLink key={id} id={id} active={active === id} tip={handlers(PAGES[id].label)} />
        ))}
        <button
          type="button"
          aria-label={themeLabel}
          {...handlers(themeLabel)}
          onClick={(event) => setTheme(nextTheme, event.currentTarget)}
          className={RAIL_BUTTON}
        >
          {theme === 'dark' ? <Sun /> : <Moon />}
        </button>
      </div>
      {/* Label melayang berposisi tetap: tidak terpotong oleh gulir rel, tanpa pustaka tooltip. */}
      {tip && (
        <span
          key={tip.label}
          aria-hidden="true"
          style={{ top: tip.y }}
          className="pointer-events-none fixed left-[80px] z-50 -translate-y-1/2 animate-[item-in_0.2s_var(--ease-out)] rounded-full bg-surface-solid px-3 py-1.5 text-xs font-medium whitespace-nowrap text-ink shadow-float ring-1 ring-line-strong"
        >
          {tip.label}
        </span>
      )}
    </aside>
  );
}
