'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Popover } from 'radix-ui';
import { Toaster } from 'sonner';
import { LazyMotion, MotionConfig } from 'motion/react';
import { Plus, Search } from 'lucide-react';
import { ConfirmProvider } from '@/components/ui/confirm';
import { Sheet } from '@/components/ui/sheet';
import { PageIcon } from '@/components/ui/icon';
import { PopoverContent } from '@/components/ui/menu';
import { prefetchWorkspace } from '@/features/workspace/use-workspace';
import { Kbd } from '@/components/ui/kbd';
import { useTheme } from '@/lib/theme';
import { Sidebar, activePage } from './sidebar';
import { MobileDock } from './mobile-dock';
import dynamic from 'next/dynamic';
import { QuickActionsPanel } from './quick-actions';
import { ProfileMenu } from './profile-menu';
import { NAV_FOOTER, NAV_GROUPS, PAGES } from './nav';
import { NotificationBell } from '@/features/notifications/notification-bell';
import { ShortcutList } from './shortcuts';
import { Greeting } from './greeting';

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
              'flex w-(--width) items-center gap-3 rounded-2xl bg-action py-2.5 pr-2.5 pl-4 font-sans text-sm font-semibold text-on-action shadow-float data-[expanded=false]:data-[front=false]:*:opacity-0',
            icon: 'flex shrink-0 [&_svg]:size-[18px]',
            content: 'flex min-w-0 flex-1 flex-col gap-0.5 py-1',
            title: 'leading-snug',
            description: 'font-medium text-on-action/80',
            actionButton:
              'h-9 shrink-0 cursor-pointer rounded-xl bg-on-action/15 px-3.5 text-[13px] font-bold text-on-action outline-none transition-colors hover:bg-on-action/25 focus-visible:ring-2 focus-visible:ring-on-action/60',
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
          <div className="flex min-h-dvh">
            <Suspense fallback={<div className="hidden w-[80px] md:block" />}>
              <Sidebar />
            </Suspense>
            <div className="flex min-w-0 flex-1 flex-col">
              <header className="sticky top-0 z-30 flex items-center gap-3 bg-canvas/85 px-4 py-3 backdrop-blur-md md:px-6 md:py-4">
                <div className="md:hidden">
                  <ProfileMenu />
                </div>
                <Greeting className="flex min-w-0 flex-1" />
                <button
                  type="button"
                  onClick={() => setPalette(true)}
                  className="group hidden h-11 min-w-0 items-center gap-2 rounded-full bg-surface pr-1.5 pl-4 text-sm font-semibold text-ink-3 shadow-card ring-1 ring-line/70 transition hover:text-ink-2 hover:ring-line-strong md:flex md:w-[min(26rem,36vw)]"
                  aria-label="Cari atau buka (Ctrl K)"
                >
                  <span className="truncate">Cari tugas, catatan, atau menu…</span>
                  <span
                    className="ml-auto flex shrink-0 items-center gap-1 max-lg:hidden"
                    aria-hidden="true"
                  >
                    <Kbd>Ctrl</Kbd>
                    <Kbd>K</Kbd>
                  </span>
                  {/* Tombol bulat gelap seperti kotak cari acuan. */}
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-action text-on-action transition-transform duration-200 group-hover:scale-105">
                    <Search className="size-4" />
                  </span>
                </button>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 [&>button]:shadow-card [&>button]:ring-1 [&>button]:ring-line/70">
                    <button
                      type="button"
                      onClick={() => setPalette(true)}
                      aria-label="Cari"
                      className="grid size-10 place-items-center rounded-full bg-surface text-ink transition hover:bg-surface-2 md:hidden"
                    >
                      <Search className="size-5" />
                    </button>
                    <NotificationBell />
                    <Popover.Root open={quick} onOpenChange={setQuick}>
                      <Popover.Trigger className="hidden h-11 items-center gap-1.5 rounded-full bg-action pr-4 pl-3 text-sm font-bold text-on-action shadow-[0_10px_20px_-10px_var(--action)] transition hover:bg-action-hover active:scale-[0.97] md:inline-flex">
                        <Plus className="size-[18px]" strokeWidth={2.6} />
                        Tambah
                      </Popover.Trigger>
                      <PopoverContent align="end" className="w-[min(36rem,calc(100vw-2rem))] p-4">
                        <QuickActionsPanel onPick={() => setQuick(false)} />
                      </PopoverContent>
                    </Popover.Root>
                  </div>
                </div>
              </header>
              <main id="main" className="flex-1 px-4 pt-2 pb-32 md:px-6 md:pt-2 md:pb-10">
                {children}
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
                        className="flex flex-col items-center gap-2 rounded-2xl bg-surface-2 px-2 py-4 text-center text-[13px] font-bold text-ink-2 transition active:scale-[0.96] aria-[current=page]:bg-accent aria-[current=page]:text-accent-ink"
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
