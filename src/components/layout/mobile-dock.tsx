'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as motion from 'motion/react-m';
import { LayoutGrid, Plus } from 'lucide-react';
import { PageIcon } from '@/components/ui/icon';
import { DOCK, PAGES } from './nav';
import { activePage } from './sidebar';
import { cn } from '@/lib/utils';
import { useHideOnScroll } from '@/lib/use-hide-on-scroll';
import { prefetchWorkspace } from '@/features/workspace/use-workspace';

const CAPSULE = { type: 'spring', stiffness: 460, damping: 36 } as const;

/**
 * Navigasi bawah HP: kapsul padat melayang. Item aktif mengembang menjadi kapsul berlabel yang
 * meluncur saat pindah tab; tombol tambah warna aksi di tengah. Bilah minggir saat menggulir ke
 * bawah supaya tidak menutupi isi halaman.
 */
export function MobileDock({
  onAdd,
  onMenu,
  adding,
}: {
  onAdd: () => void;
  onMenu: () => void;
  adding?: boolean;
}) {
  const pathname = usePathname();
  const hidden = useHideOnScroll();
  const active = activePage(pathname);
  const inDock = active && DOCK.includes(active);
  const items = DOCK.map((id) => ({ id, label: PAGES[id].label, icon: PAGES[id].icon }));
  const renderItem = (
    id: string,
    label: string,
    icon: React.ReactNode,
    isActive: boolean,
    href?: string,
  ) => {
    const content = (
      <>
        {isActive && (
          <motion.span
            layoutId="dock-capsule"
            transition={CAPSULE}
            className="absolute inset-0 rounded-full bg-surface-3"
          />
        )}
        <span className="relative flex items-center gap-1.5">
          {icon}
          {isActive && (
            <motion.span
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-[13px] font-medium"
            >
              {label}
            </motion.span>
          )}
        </span>
      </>
    );
    const className = cn(
      'relative flex h-12 min-w-12 items-center justify-center rounded-full px-3.5 transition-colors',
      isActive ? 'text-ink' : 'text-ink-2',
    );
    return href ? (
      <Link
        key={id}
        href={href}
        aria-current={isActive ? 'page' : undefined}
        aria-label={label}
        className={className}
        onTouchStart={() => prefetchWorkspace(id)}
        onPointerEnter={() => prefetchWorkspace(id)}
      >
        {content}
      </Link>
    ) : (
      <button key={id} type="button" onClick={onMenu} aria-label={label} className={className}>
        {content}
      </button>
    );
  };
  return (
    <nav
      aria-label="Navigasi utama"
      data-hidden={hidden || undefined}
      className="no-print fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 mx-auto flex h-[68px] max-w-[26rem] items-center justify-between rounded-full bg-surface-solid px-2 shadow-float ring-1 ring-line-strong transition-transform duration-300 ease-[var(--ease-out)] data-[hidden]:translate-y-[calc(100%+2rem)] md:hidden"
    >
      {items
        .slice(0, 2)
        .map((item) =>
          renderItem(
            item.id,
            item.label,
            <PageIcon name={item.icon} className="size-[22px]" />,
            active === item.id,
            `/${item.id}`,
          ),
        )}
      <button
        type="button"
        onClick={onAdd}
        aria-label="Tambah catatan"
        aria-expanded={adding}
        className="grid size-[52px] shrink-0 place-items-center rounded-full bg-action text-on-action transition hover:bg-action-hover active:scale-95"
      >
        <Plus
          className={cn('size-6 transition-transform duration-300', adding && 'rotate-45')}
          strokeWidth={2.6}
        />
      </button>
      {items
        .slice(2)
        .map((item) =>
          renderItem(
            item.id,
            item.label,
            <PageIcon name={item.icon} className="size-[22px]" />,
            active === item.id,
            `/${item.id}`,
          ),
        )}
      {renderItem(
        'menu',
        'Menu',
        <LayoutGrid className="size-[22px]" />,
        Boolean(active && !inDock),
      )}
    </nav>
  );
}
