'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { Popover } from 'radix-ui';
import { Toaster } from 'sonner';
import { LazyMotion, MotionConfig } from 'motion/react';
import { Plus, Search } from 'lucide-react';
import { ConfirmProvider } from '@/components/ui/confirm';
import { Sheet } from '@/components/ui/sheet';
import { PageIcon } from '@/components/ui/icon';
import { PopoverContent } from '@/components/ui/menu';
import { prefetchWorkspace } from '@/features/workspace/use-workspace';
import { useTheme } from '@/lib/theme';
import { LogoMark } from '@/components/ui/logo';
import { RAIL_BUTTON, Sidebar, activePage } from './sidebar';
import { TopNav } from './top-nav';
import { MobileDock } from './mobile-dock';
import dynamic from 'next/dynamic';
import { QuickActionsPanel } from './quick-actions';
import { ProfileMenu } from './profile-menu';
import { NAV_FOOTER, NAV_GROUPS, PAGES } from './nav';
import { NotificationBell } from '@/features/notifications/notification-bell';
import { ShortcutList } from './shortcuts';

const CommandPalette = dynamic(
  () => import('./command-palette').then((module) => module.CommandPalette),
  { ssr: false },
);

// Fitur animasi dimuat sesudah halaman tampil agar unduhan awal kecil.
const loadMotion = () => import('@/components/ui/motion-features').then((module) => module.default);

const typing = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));

export function AppShell({ children }: { children: React.ReactNode }) {
  useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [palette, setPalette] = useState(false);
  const [quick, setQuick] = useState(false);
  const [quickSheet, setQuickSheet] = useState(false);
  const [menu, setMenu] = useState(false);
  const [help, setHelp] = useState(false);
  const page = activePage(pathname);
  const header = useRef<HTMLElement>(null);

  // Bilah atas menyatu dengan latar saat di puncak halaman dan berkabut hanya bila ada isi di bawahnya.
  useEffect(() => {
    const onScroll = () => header.current?.toggleAttribute('data-scrolled', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [pathname]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPalette((open) => !open);
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey || typing(event.target)) return;
      if (document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"]'))
        return;
      if (event.key === '/') {
        event.preventDefault();
        setPalette(true);
      } else if (event.key.toLowerCase() === 'n') {
        event.preventDefault();
        router.push('/tasks?new=1');
      } else if (event.key === '?') {
        event.preventDefault();
        setHelp(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router]);

  const overlays = (
    <>
      {palette && <CommandPalette open={palette} onOpenChange={setPalette} />}
      <Toaster
        position="bottom-center"
        offset={88}
        mobileOffset={96}
        toastOptions={{
          // Tanpa gaya bawaan sonner agar semua warna dari token, tanpa !important.
          unstyled: true,
          classNames: {
            // Toast di belakang tumpukan menyembunyikan isinya, seperti gaya bawaan sonner.
            toast:
              'flex w-(--width) items-center gap-3 rounded-[1.5rem] bg-surface-solid py-2 pr-2 pl-5 font-sans text-sm font-medium text-ink shadow-float ring-1 ring-line-strong data-[expanded=false]:data-[front=false]:*:opacity-0',
            icon: 'flex shrink-0 [&_svg]:size-[18px]',
            content: 'flex min-w-0 flex-1 flex-col gap-0.5 py-1',
            title: 'leading-snug',
            description: 'font-medium text-ink-2',
            actionButton:
              'h-9 shrink-0 cursor-pointer rounded-full bg-action px-4 text-[13px] font-semibold text-on-action outline-none transition-colors hover:bg-action-hover focus-visible:ring-2 focus-visible:ring-accent-strong',
          },
        }}
      />
    </>
  );
  // Dunia 3D memakai layar penuh dengan bilahnya sendiri.
  if (pathname.startsWith('/world'))
    return (
      <LazyMotion features={loadMotion}>
        <MotionConfig reducedMotion="user">
          <ConfirmProvider>
            {children}
            {overlays}
          </ConfirmProvider>
        </MotionConfig>
      </LazyMotion>
    );
  return (
    <LazyMotion features={loadMotion}>
      {/* Gerak berkurang di perangkat: Motion hanya memudar, tanpa geser dan pegas. */}
      <MotionConfig reducedMotion="user">
        <ConfirmProvider>
          {/* Bergeser sedikit saat panel kerja terbuka (.shell di globals.css). */}
          <div className="shell">
            <header
              ref={header}
              className="no-print sticky top-0 z-30 flex h-16 items-center gap-2 px-4 transition-[background-color,backdrop-filter] duration-300 data-[scrolled]:bg-canvas/70 data-[scrolled]:backdrop-blur-xl md:grid md:h-[72px] md:grid-cols-[1fr_auto_1fr] md:pr-6 md:pl-[88px]"
            >
              <Link
                href="/home"
                aria-label="Kopdes, ke Beranda"
                className="flex min-w-0 flex-1 items-center gap-2.5 md:flex-none"
              >
                <LogoMark className="size-10 rounded-[13px]" />
                <span className="text-[19px] font-medium tracking-tight text-ink max-lg:hidden md:max-lg:hidden">
                  Kopdes
                </span>
              </Link>
              <Suspense fallback={<div className="h-12" />}>
                <div className="hidden md:block">
                  <TopNav active={page} />
                </div>
              </Suspense>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPalette(true)}
                  aria-label="Cari (Ctrl K)"
                  className="grid size-11 place-items-center rounded-full bg-surface-2 text-ink ring-1 ring-line transition hover:bg-surface-3"
                >
                  <Search className="size-5" />
                </button>
                <NotificationBell />
                <ProfileMenu />
              </div>
            </header>
            <div className="mx-auto flex w-full max-w-[1720px]">
              <Suspense fallback={<div className="hidden w-[76px] md:block" />}>
                <Sidebar
                  tools={(tip) => (
                    <Popover.Root open={quick} onOpenChange={setQuick}>
                      <Popover.Trigger {...tip} aria-label="Tambah" className={RAIL_BUTTON}>
                        <Plus strokeWidth={2.4} />
                      </Popover.Trigger>
                      <PopoverContent
                        side="right"
                        align="start"
                        className="w-[min(40rem,calc(100vw-6rem))] p-3"
                      >
                        <QuickActionsPanel onPick={() => setQuick(false)} />
                      </PopoverContent>
                    </Popover.Root>
                  )}
                />
              </Suspense>
              <main
                id="main"
                className="min-w-0 flex-1 px-4 pt-2 pb-32 md:pt-1 md:pr-6 md:pb-10 md:pl-1"
              >
                {/* Dipasang ulang tiap pindah halaman: bagian baru muncul berurutan dari buram (.page-enter). */}
                <div key={pathname} className="page-enter">
                  {children}
                </div>
              </main>
            </div>
          </div>
          <MobileDock
            onAdd={() => setQuickSheet(true)}
            onMenu={() => setMenu(true)}
            adding={quickSheet}
          />
          <Sheet
            open={quickSheet}
            onOpenChange={setQuickSheet}
            title="Tambah catatan"
            description="Pilih yang ingin dicatat"
          >
            <QuickActionsPanel onPick={() => setQuickSheet(false)} />
          </Sheet>
          <Sheet open={menu} onOpenChange={setMenu} title="Semua menu">
            <nav aria-label="Semua halaman" className="flex flex-col gap-5">
              {[...NAV_GROUPS, { label: 'Lainnya', pages: NAV_FOOTER }].map((group) => (
                <section key={group.label}>
                  <h3 className="mb-2 text-xs font-bold tracking-wide text-ink-3 uppercase">
                    {group.label}
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {group.pages.map((id) => (
                      <Link
                        key={id}
                        href={`/${id}`}
                        onClick={() => setMenu(false)}
                        onTouchStart={() => prefetchWorkspace(id)}
                        aria-current={page === id ? 'page' : undefined}
                        className="flex flex-col items-center gap-2 rounded-[1.25rem] bg-surface-2 px-2 py-4 text-center text-[13px] font-medium text-ink-2 ring-1 ring-line transition active:scale-[0.96] aria-[current=page]:bg-action aria-[current=page]:text-on-action"
                      >
                        <PageIcon name={PAGES[id].icon} className="size-6" />
                        {PAGES[id].label}
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </nav>
          </Sheet>
          <Sheet open={help} onOpenChange={setHelp} title="Pintasan papan ketik">
            <ShortcutList />
          </Sheet>
          {overlays}
        </ConfirmProvider>
      </MotionConfig>
    </LazyMotion>
  );
}
