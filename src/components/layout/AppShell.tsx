'use client';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { BottomNav } from '@/components/ui/BottomNav';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ThemeProvider, useTheme } from '@/lib/ThemeContext';
import { api, resetAuthNavigation } from '@/lib/client';
import type { Workspace } from '@/features/workspace/useWorkspace';
import {
  Menu,
  Search,
  Plus,
  Moon,
  Sun,
  LockKeyhole,
  X,
  Sparkles,
  Settings,
  ArrowUpRight,
  ChevronDown,
  PanelLeftOpen,
} from 'lucide-react';
import { Ikon3D } from '@/components/ui/Ikon3D';
import { usePreference } from '@/lib/usePreference';
import { WorkspaceSearch } from '@/features/workspace/WorkspaceSearch';
import { IkonHalaman } from '@/components/ui/IkonHalaman';
import { ManagerActionModal } from './ManagerActionModal';
import { Modal } from '@/components/ui/Modal';
import { Notifikasi } from '@/features/notifikasi/Notifikasi';
import { HUBS, KAKI_SIDEBAR, MENU_KERJA, RUANG_LAIN, hubUntuk, labelHalaman } from './navigasi';

function getCoopShortName(title?: string): string {
  if (!title?.trim()) return 'Koperasi';
  const clean = title.trim();
  if (clean.length > 18) {
    if (/koperasi produsen/i.test(clean)) {
      return clean.replace(/koperasi produsen/i, 'Kop. Produsen').trim();
    }
    if (/koperasi/i.test(clean)) {
      return clean.replace(/koperasi/i, 'Kop.').trim();
    }
  }
  return clean;
}

function ShellFrame({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [shortcutHelp, setShortcutHelp] = useState(false);
  const path = usePathname();
  const [desktopSidebarHidden, setDesktopSidebarHidden] = usePreference(
    'hub-sidebar-desktop-collapsed',
    'false',
  );
  const { theme, toggleTheme } = useTheme();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [menu, setMenu] = useState(false),
    [error, setError] = useState(''),
    [actionModalOpen, setActionModalOpen] = useState(false);
  // Di ≥1024 px tombol kepala menciutkan sidebar; di bawahnya membuka lembar menu.
  const [layarLebar, setLayarLebar] = useState(false);
  useEffect(() => {
    const periksa = () => setLayarLebar(window.innerWidth >= 1024);
    periksa();
    window.addEventListener('resize', periksa);
    return () => window.removeEventListener('resize', periksa);
  }, []);
  const dialog = useRef<HTMLDialogElement>(null);
  const mobileSheet = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!menu) return;
    const sheet = mobileSheet.current;
    if (!sheet) return;
    const previous = document.activeElement;
    const controls = () => [...sheet.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), [tabindex="0"]')]
      .filter(node => node.getClientRects().length > 0);
    controls()[0]?.focus();
    const containFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const nodes = controls(), first = nodes[0], last = nodes.at(-1);
      if (!first || !last) return;
      const outside = !sheet.contains(document.activeElement);
      if (outside || (event.shiftKey ? document.activeElement === first : document.activeElement === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    };
    document.addEventListener('keydown', containFocus);
    return () => {
      document.removeEventListener('keydown', containFocus);
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, [menu]);

  useEffect(() => {
    const receive = (event: Event) => setWorkspace((event as CustomEvent<Workspace | null>).detail);
    const key = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        dialog.current?.showModal();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b') {
        const target = event.target as HTMLElement | null;
        if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
        event.preventDefault();
        const currentHidden = localStorage.getItem('hub-sidebar-desktop-collapsed') === 'true';
        setDesktopSidebarHidden(currentHidden ? 'false' : 'true');
      }
      if (event.key === 'Escape') {
        setMenu(false);
        document.querySelectorAll('details[open]').forEach((el) => el.removeAttribute('open'));
      }
      const target = event.target instanceof Element ? event.target : null;
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey ||
        target?.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="listbox"]') ||
        document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]')) return;
      if (event.key.toLowerCase() === 'n') { event.preventDefault(); window.dispatchEvent(new CustomEvent('hub-task', { detail: {} })); }
      if (event.key.toLowerCase() === 't') { event.preventDefault(); router.push('/hari-ini'); }
      if (event.key === '?') { event.preventDefault(); setShortcutHelp(true); }
    };
    const clickOutside = (event: MouseEvent) => {
      document.querySelectorAll('details[open]').forEach((el) => {
        if (!el.contains(event.target as Node)) {
          el.removeAttribute('open');
        }
      });
    };
    window.addEventListener('hub-workspace', receive);
    window.addEventListener('keydown', key);
    document.addEventListener('click', clickOutside);
    return () => {
      window.removeEventListener('hub-workspace', receive);
      window.removeEventListener('keydown', key);
      document.removeEventListener('click', clickOutside);
    };
  }, [setDesktopSidebarHidden, router]);
  const name = String(workspace?.organization?.[0]?.data.manager || 'Manajer');
  const coop = getCoopShortName(String(workspace?.organization?.[0]?.data.title || ''));
  const hubAktif = hubUntuk(path);
  const label = labelHalaman(path);
  const judul = label === path ? 'Ruang kerja' : label;
  const lockApp = async () => {
    setMenu(false);
    try {
      await api('auth/pin', { action: 'logout' });
      resetAuthNavigation('/pin');
    } catch (e) {
      setError((e as Error).message);
    }
  };
  if (path === '/dunia-koperasi') return <>{children}</>;
  return (
    <div className={`manager-shell ${desktopSidebarHidden === 'true' ? 'sidebar-collapsed' : ''}`}>
      <a className="skip" href="#main">
        Lewati navigasi
      </a>
      {/* Sidebar Lekuk: kerja harian dibuka langsung, hub lain di "Ruang lain" dengan tab di halamannya. */}
      <aside className="shell-sidebar" aria-label="Navigasi samping">
        <Link href="/beranda" className="shell-merek" title={coop} aria-label={`${coop}, buka Beranda`}>
          <Ikon3D kind="kantor" size={32} />
          <strong>{coop}</strong>
        </Link>
        <nav className="shell-hub" aria-label="Menu utama">
          <div className="shell-kelompok">
            <p className="shell-kelompok-judul">Kerja</p>
            {MENU_KERJA.map((href) => (
              <Link
                key={href}
                href={href}
                aria-label={labelHalaman(href)}
                title={labelHalaman(href)}
                aria-current={path === href ? 'page' : undefined}
              >
                <IkonHalaman href={href} size={22} />
                <span className="shell-hub-label">{labelHalaman(href)}</span>
              </Link>
            ))}
          </div>
          <div className="shell-kelompok">
            <p className="shell-kelompok-judul">Ruang lain</p>
            {RUANG_LAIN.map((hub) => (
              <Link
                key={hub.id}
                href={hub.tabs[0]}
                aria-label={hub.label}
                title={hub.label}
                aria-current={hubAktif?.id === hub.id ? 'page' : undefined}
              >
                <IkonHalaman href={hub.ikon} size={22} />
                <span className="shell-hub-label">{hub.label}</span>
              </Link>
            ))}
          </div>
        </nav>
        {/* Tim adalah sumber daftar penanggung jawab tugas; satu klik ke halaman Tim. */}
        <section className="shell-tim bertakik" aria-labelledby="shell-tim-judul">
          <strong id="shell-tim-judul">Tim</strong>
          <p>Daftar staf untuk penanggung jawab tugas.</p>
          <Link href="/tim" className="takik-aksi" aria-label="Kelola tim" title="Kelola tim">
            <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
        </section>
        <nav className="shell-kaki" aria-label="Pengaturan dan bantuan">
          {KAKI_SIDEBAR.map((href) => (
            <Link
              key={href}
              href={href}
              aria-label={labelHalaman(href)}
              title={labelHalaman(href)}
              aria-current={path === href ? 'page' : undefined}
            >
              <IkonHalaman href={href} size={20} />
              <span className="shell-hub-label">{labelHalaman(href)}</span>
            </Link>
          ))}
        </nav>
      </aside>
      <header className="shell-kepala">
        <div className="shell-judul">
          <Button
            type="button"
            className="topbar-nav-menu-btn"
            aria-label={
              layarLebar
                ? desktopSidebarHidden === 'true'
                  ? 'Tampilkan sidebar navigasi'
                  : 'Ciutkan sidebar navigasi'
                : 'Buka menu navigasi'
            }
            aria-expanded={layarLebar ? desktopSidebarHidden !== 'true' : menu}
            title="Menu navigasi (Ctrl+B)"
            onClick={() => {
              if (layarLebar) {
                setDesktopSidebarHidden(desktopSidebarHidden === 'true' ? 'false' : 'true');
              } else {
                setMenu(!menu);
              }
            }}
          >
            {desktopSidebarHidden === 'true' ? <PanelLeftOpen size={18} /> : <Menu size={18} />}
          </Button>
          <div>
            <h1>{judul}</h1>
          </div>
        </div>
        <div className="manager-actions">
          <button
            type="button"
            className="topbar-cari"
            aria-label="Cari halaman atau catatan"
            onClick={() => dialog.current?.showModal()}
          >
            <Search size={17} aria-hidden="true" />
            <span>Cari…</span>
            <kbd>Ctrl K</kbd>
          </button>
          <Notifikasi />
          <Button
            type="button"
            className="quick-action-hub-btn"
            onClick={() => setActionModalOpen(true)}
            title="Tambah tugas, rapat, atau catatan"
            aria-label="Tambah catatan"
          >
            <Plus size={18} />
            <span className="topbar-tambah-label">Tambah</span>
          </Button>
          {/* Tema, pengaturan, dan kunci dikumpulkan di menu profil agar bilah atas tidak ramai. */}
          <details className="topbar-profil">
            <summary aria-label={`Menu profil ${name}`} title={name}>
              <span className="avatar-inisial">{name[0] || 'M'}</span>
              <span className="topbar-profil-nama">
                <strong>{name}</strong>
                <small>Manajer koperasi</small>
              </span>
              <ChevronDown size={16} className="topbar-profil-panah" aria-hidden="true" />
            </summary>
            <div className="topbar-profil-menu">
              <strong>{name}</strong>
              <button type="button" onClick={toggleTheme} aria-label="Ganti tema">
                {theme === 'dark' ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
                {theme === 'dark' ? 'Mode terang' : 'Mode gelap'}
              </button>
              <Link href="/pengaturan">
                <Settings size={17} aria-hidden="true" />
                Pengaturan
              </Link>
              <button type="button" aria-label="Kunci aplikasi" onClick={lockApp}>
                <LockKeyhole size={17} aria-hidden="true" />
                Kunci aplikasi
              </button>
            </div>
          </details>
        </div>
      </header>
      <main className="shell-utama manager-main" id="main" tabIndex={-1}>
        {error && (
          <p role="alert" className="notice error">
            {error}
          </p>
        )}
        {children}
      </main>
      {shortcutHelp && <Modal className="shortcut-help-dialog" onDismiss={() => setShortcutHelp(false)} aria-labelledby="shortcut-title">
        <h2 id="shortcut-title">Pintasan keyboard</h2>
        <p><kbd>N</kbd> Buat tugas · <kbd>T</kbd> Hari ini · <kbd>?</kbd> Bantuan</p>
        <p><kbd>Ctrl/⌘ K</kbd> Cari · <kbd>Ctrl/⌘ B</kbd> Menu samping · <kbd>Esc</kbd> Tutup</p>
        <Button type="button" onClick={() => setShortcutHelp(false)}>Tutup bantuan</Button>
      </Modal>}
      <BottomNav path={path} menu={menu} onAction={() => setActionModalOpen(true)} onMenu={() => setMenu(!menu)} />

      {/* Lembar menu ponsel/tablet: semua hub beserta tabnya */}
      <div
        className={`mobile-sheet-backdrop ${menu ? 'is-open' : ''}`}
        onClick={() => setMenu(false)}
        aria-hidden={!menu}
      />
      <aside
        ref={mobileSheet}
        className={`mobile-app-sheet ${menu ? 'is-open' : ''}`}
        inert={!menu}
        aria-hidden={!menu}
        role="dialog"
        aria-modal={menu ? true : undefined}
        aria-label="Menu navigasi ruang kerja"
      >
        <div
          className="mobile-sheet-drag-handle"
          onClick={() => setMenu(false)}
          aria-label="Tutup menu navigasi"
        >
          <span className="mobile-sheet-pill" />
        </div>

        <div className="mobile-sheet-header">
          <div className="mobile-sheet-profile">
            <span className="avatar-inisial">{name[0] || 'M'}</span>
            <div className="mobile-sheet-user-info">
              <strong>{name}</strong>
              <small>{coop}</small>
            </div>
          </div>
          <div className="mobile-sheet-header-actions">
            <Button
              type="button"
              className="mobile-sheet-action-icon-btn"
              onClick={() => {
                setMenu(false);
                dialog.current?.showModal();
              }}
              title="Cari cepat (⌘K)"
              aria-label="Cari cepat"
            >
              <Search size={18} />
            </Button>
            <Button
              type="button"
              className="mobile-sheet-action-icon-btn"
              onClick={() => setMenu(false)}
              title="Tutup menu"
              aria-label="Tutup menu"
            >
              <X size={18} />
            </Button>
          </div>
        </div>

        <div className="mobile-sheet-scrollable">
          {HUBS.map((hub) => (
            <section key={hub.id} className="mobile-nav-group">
              <h3 className="mobile-nav-group-title">{hub.label}</h3>
              <div className="mobile-nav-cards-grid">
                {hub.tabs.map((href) => (
                  <Link
                    key={href}
                    href={href}
                    className={`mobile-nav-card ${path === href ? 'is-active' : ''}`}
                    aria-current={path === href ? 'page' : undefined}
                    onClick={() => setMenu(false)}
                  >
                    <IkonHalaman href={href} size={26} />
                    <span className="mobile-nav-card-title">{labelHalaman(href)}</span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
          <section className="mobile-nav-group">
            <div className="mobile-nav-cards-grid">
              {KAKI_SIDEBAR.map((href) => (
                <Link
                  key={href}
                  href={href}
                  className={`mobile-nav-card ${path === href ? 'is-active' : ''}`}
                  aria-current={path === href ? 'page' : undefined}
                  onClick={() => setMenu(false)}
                >
                  <IkonHalaman href={href} size={26} />
                  <span className="mobile-nav-card-title">{labelHalaman(href)}</span>
                </Link>
              ))}
            </div>
          </section>

          <div className="mobile-sheet-footer">
            <Button type="button" className="mobile-sheet-footer-btn" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
              <span>Mode {theme === 'dark' ? 'terang' : 'gelap'}</span>
            </Button>
            <Button type="button" className="mobile-sheet-footer-btn" onClick={lockApp}>
              <LockKeyhole size={17} />
              <span>Kunci PIN</span>
            </Button>
          </div>
        </div>
      </aside>

      <ManagerActionModal open={actionModalOpen} onClose={() => setActionModalOpen(false)} />
      <dialog
        ref={dialog}
        className="command-dialog"
        aria-labelledby="search-heading"
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current?.close();
        }}
      >
        <div className="section-head">
          <h2 id="search-heading">Cari di ruang kerja</h2>
          <Button aria-label="Tutup pencarian" onClick={() => dialog.current?.close()}>
            <X size={18} />
          </Button>
        </div>
        <div className="command-quick-actions-bar">
          <Button
            type="button"
            className="command-open-hub-btn"
            onClick={() => {
              dialog.current?.close();
              setActionModalOpen(true);
            }}
          >
            <Sparkles size={14} />
            <span>Tambah tugas, rapat, atau catatan</span>
            <ArrowUpRight size={14} />
          </Button>
        </div>
        <WorkspaceSearch
          workspace={workspace}
          onNavigate={() => {
            dialog.current?.close();
            setMenu(false);
          }}
        />
      </dialog>
    </div>
  );
}
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ShellFrame>{children}</ShellFrame>
    </ThemeProvider>
  );
}
