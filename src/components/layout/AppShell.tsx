'use client';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { BottomNav } from '@/components/ui/BottomNav';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ThemeProvider, useTheme } from '@/lib/ThemeContext';
import { api, resetAuthNavigation } from '@/lib/client';
import { navigation } from '@/features/records/catalog';
import { isProjectHistory } from '@/features/projects/project-lifecycle';
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
} from 'lucide-react';
import { Ikon3D } from '@/components/ui/Ikon3D';
import { usePreference } from '@/lib/usePreference';
import { WorkspaceSearch } from '@/features/workspace/WorkspaceSearch';
import { ArrowUpRight, Star, ChevronDown, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { IkonHalaman } from '@/components/ui/IkonHalaman';
import { ManagerActionModal } from './ManagerActionModal';
import { Modal } from '@/components/ui/Modal';
import { Notifikasi } from '@/features/notifikasi/Notifikasi';

const sections = [
  [
    'Ruang kerja',
    ['/beranda', '/dunia-koperasi', '/hari-ini', '/tugas', '/proyek', '/roadmap'],
    'blue',
  ],
  ['Kegiatan', ['/jurnal'], 'amber'],
  [
    'Buku koperasi',
    ['/keuangan', '/barang', '/stok-opname', '/pengiriman', '/anggota'],
    'emerald',
  ],
  ['Gerai & laporan', ['/gerai', '/kesiapan', '/risiko', '/laporan'], 'purple'],
  ['Koordinasi & berkas', ['/rapat', '/dokumen', '/mitra', '/tim'], 'rose'],
  ['Pengaturan & bantuan', ['/pengaturan', '/panduan'], 'blue'],
] as const;

function getNavSubtitle(href: string): string {
  const subtitles: Record<string, string> = {
    '/beranda': 'Ringkasan pekerjaan',
    '/dunia-koperasi': 'Kantor dan pulau 3D',
    '/hari-ini': 'Fokus tugas hari ini',
    '/tugas': 'Daftar, papan & kalender',
    '/proyek': 'Rencana & tugas terkait',
    '/roadmap': 'Jadwal proyek & tugas',
    '/tindak-lanjut': 'Tindak lanjut catatan',
    '/jurnal': 'Catatan kegiatan & rapat',
    '/pencatatan': 'Ringkasan pencatatan',
    '/keuangan': 'Kas masuk & keluar',
    '/barang': 'Katalog & stok buku',
    '/stok-opname': 'Hitung fisik barang',
    '/pengiriman': 'Barang masuk & keluar',
    '/anggota': 'Catatan keanggotaan',
    '/gerai': 'Unit usaha koperasi',
    '/kesiapan': 'Daftar periksa & bukti',
    '/risiko': 'Kendala & tindak lanjut',
    '/laporan': 'Rekap pekerjaan',
    '/rapat': 'Agenda & rapat online',
    '/dokumen': 'Arsip & berkas kerja',
    '/mitra': 'Mitra & kontak terkait',
    '/tim': 'Petugas & pelaksana',
    '/pengaturan': 'Profil & keamanan PIN',
    '/panduan': 'Pedoman penggunaan',
  };
  return subtitles[href] || '';
}

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
  const path = usePathname(),
    query = useSearchParams();
  const [favoriteText, setFavoriteText] = usePreference('hub-favorites', '/hari-ini|/tugas');
  const [collapsedText, setCollapsedText] = usePreference('hub-nav-collapsed', '');
  const [desktopSidebarHidden, setDesktopSidebarHidden] = usePreference(
    'hub-sidebar-desktop-collapsed',
    'false',
  );
  const favorites = favoriteText
    .split('|')
    .filter((href) => navigation.some(([url]) => url === href));
  const collapsed = collapsedText.split('|').filter(Boolean);
  const { theme, toggleTheme } = useTheme();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [menu, setMenu] = useState(false),
    [error, setError] = useState(''),
    [actionModalOpen, setActionModalOpen] = useState(false);
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
  const current = navigation.find(([href]) => href === path)?.[1] || 'Ruang kerja';
  if (path === '/dunia-koperasi') return <>{children}</>;
  return (
    <div className={`manager-shell ${desktopSidebarHidden === 'true' ? 'sidebar-collapsed' : ''}`}>
      <a className="skip" href="#main">
        Lewati navigasi
      </a>
      <header className="manager-topbar">
        <div className="topbar-left-cluster">
          <Button
            type="button"
            className="topbar-nav-menu-btn"
            aria-label="Buka menu navigasi"
            title="Menu navigasi (Ctrl+B)"
            onClick={() => {
              if (window.innerWidth >= 1024) {
                setDesktopSidebarHidden(desktopSidebarHidden === 'true' ? 'false' : 'true');
              } else {
                setMenu(!menu);
              }
            }}
          >
            {desktopSidebarHidden === 'true' ? <PanelLeftOpen size={18} /> : <Menu size={18} />}
            <span className="topbar-menu-label">Menu</span>
          </Button>
          <Link
            href="/beranda"
            className="manager-profile"
            aria-label={`Kembali ke Beranda (${name})`}
            title={`Kembali ke Beranda (${name})`}
          >
            <span className="manager-avatar-badge">{name[0] || 'M'}</span>
          </Link>
          <span className="topbar-crumb-sep" aria-hidden="true">
            /
          </span>
          <div className="manager-location-wrap">
            <span className="manager-location">{current}</span>
            <button
              type="button"
              className="topbar-fav-btn"
              aria-label={
                favorites.includes(path)
                  ? 'Hapus halaman ini dari favorit'
                  : 'Simpan halaman ini ke favorit'
              }
              title={favorites.includes(path) ? 'Hapus dari favorit' : 'Simpan ke favorit'}
              onClick={() =>
                setFavoriteText(
                  (favorites.includes(path)
                    ? favorites.filter((href) => href !== path)
                    : [...favorites, path]
                  ).join('|'),
                )
              }
            >
              <Star
                size={13}
                fill={favorites.includes(path) ? '#f59e0b' : 'none'}
                color={favorites.includes(path) ? '#f59e0b' : 'currentColor'}
              />
            </button>
          </div>
        </div>
        <div className="manager-actions">
          <Link href="/dunia-koperasi" className="topbar-world-link" aria-label="Dunia Koperasi" title="Buka Dunia Koperasi">
            <IkonHalaman href="/dunia-koperasi" size={22} />
            <span>Dunia Koperasi</span>
          </Link>
          <Button
            type="button"
            className="quick-action-hub-btn"
            onClick={() => setActionModalOpen(true)}
            title="Tambah tugas, rapat, atau catatan"
            aria-label="Tambah catatan"
          >
            <Plus size={18} />
          </Button>
          <Button
            aria-label="Cari halaman atau catatan"
            onClick={() => dialog.current?.showModal()}
          >
            <Search size={19} />
          </Button>
          <Notifikasi />

          <Button
            aria-label="Ganti tema"
            title={theme === 'dark' ? 'Beralih ke mode terang' : 'Beralih ke mode gelap'}
            onClick={toggleTheme}
          >
            {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
          </Button>
          <Button
            className="desktop-lock"
            aria-label="Kunci aplikasi"
            onClick={async () => {
              try {
                await api('auth/pin', { action: 'logout' });
                resetAuthNavigation('/pin');
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            <LockKeyhole size={18} />
          </Button>
        </div>
      </header>
      <nav className="tablet-rail" aria-label="Navigasi tablet">
        <Link
          href="/beranda"
          aria-label="Beranda"
          title="Beranda"
          className={`tablet-rail-link ${path === '/beranda' ? 'is-active' : ''}`}
        >
          <IkonHalaman href="/beranda" size={26} />
          <span className="tablet-rail-text">Beranda</span>
        </Link>
        <Link
          href="/hari-ini"
          aria-label="Hari ini"
          title="Hari ini"
          className={`tablet-rail-link ${path === '/hari-ini' ? 'is-active' : ''}`}
        >
          <IkonHalaman href="/hari-ini" size={26} />
          <span className="tablet-rail-text">Hari ini</span>
        </Link>
        <Link
          href="/tugas"
          aria-label="Tugas"
          title="Tugas"
          className={`tablet-rail-link ${path === '/tugas' ? 'is-active' : ''}`}
        >
          <IkonHalaman href="/tugas" size={26} />
          <span className="tablet-rail-text">Tugas</span>
        </Link>
        <Link
          href="/jurnal"
          aria-label="Kegiatan"
          title="Kegiatan"
          className={`tablet-rail-link ${path === '/jurnal' ? 'is-active' : ''}`}
        >
          <IkonHalaman href="/jurnal" size={26} />
          <span className="tablet-rail-text">Kegiatan</span>
        </Link>
        <Button
          type="button"
          aria-label="Buka semua halaman"
          aria-expanded={menu}
          onClick={() => setMenu(!menu)}
          className={`tablet-rail-link tablet-rail-menu-btn ${menu ? 'is-active' : ''}`}
          title="Buka menu lengkap"
        >
          <Menu size={20} />
          <span className="tablet-rail-text">Menu</span>
        </Button>
      </nav>
      <aside className={`manager-sidebar ${menu ? 'is-open' : ''}`} aria-label="Semua halaman">
        <div className="manager-sidebar-brand">
          <Link href="/beranda" className="sidebar-brand-link" onClick={() => setMenu(false)}>
            <div className="sidebar-brand-emblem">
              <Ikon3D kind="kantor" size={40} />
            </div>
            <div
              className="sidebar-brand-info"
              title={String(workspace?.organization?.[0]?.data.title || 'Koperasi')}
            >
              <strong>
                {getCoopShortName(String(workspace?.organization?.[0]?.data.title || ''))}
              </strong>
              <small>Ruang kerja manajer</small>
            </div>
          </Link>
          <div className="sidebar-brand-actions">
            <Button
              type="button"
              className="desktop-sidebar-collapse-btn"
              aria-label="Sembunyikan menu samping (Ctrl+B)"
              title="Sembunyikan menu samping (Ctrl+B)"
              onClick={() => setDesktopSidebarHidden('true')}
            >
              <PanelLeftClose size={18} />
            </Button>
            <Button
              className="close-navigation"
              aria-label="Tutup navigasi"
              onClick={() => setMenu(false)}
            >
              <X size={18} />
            </Button>
          </div>
        </div>

        <Button
          type="button"
          className="sidebar-search-trigger"
          onClick={() => {
            setMenu(false);
            dialog.current?.showModal();
          }}
        >
          <Search size={14} />
          <span>Cari di ruang kerja</span>
          <kbd>Ctrl K</kbd>
        </Button>

        <div className="manager-sidebar-nav-scroll">
          {favorites.length > 0 && (
            <section className="manager-sidebar-section sidebar-favorites-group">
              <h2 className="sidebar-section-title">
                <span>Favorit</span>
              </h2>
              <nav className="sidebar-nav-list">
                {favorites.map((href) => {
                  const label = navigation.find(([url]) => url === href)?.[1] || href;
                  const isActive = path === href;
                  return (
                    <Link
                      key={href}
                      href={href}
                      aria-label={label}
                      title={label}
                      aria-current={isActive ? 'page' : undefined}
                      className={`sidebar-nav-item ${isActive ? 'is-active' : ''}`}
                      onClick={() => setMenu(false)}
                    >
                      <span className="sidebar-item-icon">
                        <IkonHalaman href={href} size={22} />
                      </span>
                      <span className="sidebar-item-label">{label}</span>
                      <Star
                        size={11}
                        className="sidebar-item-star-badge"
                        fill="var(--tone-warn-text)"
                        color="var(--tone-warn-text)"
                      />
                    </Link>
                  );
                })}
              </nav>
            </section>
          )}
          {sections.map(([label, paths]) => (
            <section key={label} className="manager-sidebar-section">
              <h2 className="sidebar-section-title">
                <Button
                  className="sidebar-group-toggle"
                  aria-expanded={!collapsed.includes(label)}
                  onClick={() =>
                    setCollapsedText(
                      (collapsed.includes(label)
                        ? collapsed.filter((value) => value !== label)
                        : [...collapsed, label]
                      ).join('|'),
                    )
                  }
                >
                  {label}
                  <ChevronDown size={14} />
                </Button>
              </h2>
              <nav className="sidebar-nav-list" hidden={collapsed.includes(label)}>
                {paths.map((href) => {
                  const isActive = path === href;
                  return (
                    <Link
                      key={href}
                      href={href}
                      aria-label={navigation.find(([url]) => url === href)?.[1]}
                      title={navigation.find(([url]) => url === href)?.[1]}
                      aria-current={isActive ? 'page' : undefined}
                      className={`sidebar-nav-item ${isActive ? 'is-active' : ''}`}
                      onClick={() => setMenu(false)}
                    >
                      <span className="sidebar-item-icon">
                        <IkonHalaman href={href} size={22} />
                      </span>
                      <span className="sidebar-item-label">
                        {navigation.find(([url]) => url === href)?.[1]}
                      </span>
                      {isActive && <span className="sidebar-item-dot" />}
                    </Link>
                  );
                })}
              </nav>
            </section>
          ))}
          <section className="manager-sidebar-section">
            <div className="sidebar-section-head-row">
              <h2 className="sidebar-section-title">Proyek saya</h2>
              <Link
                href="/proyek"
                className="sidebar-section-add"
                onClick={() => setMenu(false)}
                title="Buka Proyek"
                aria-label="Buka proyek"
              >
                <Plus size={14} />
              </Link>
            </div>
            {workspace ? (
              <div className="sidebar-projects-list">
                {(workspace.workstreams || [])
                  .filter((p) => !isProjectHistory(p))
                  .map((p) => (
                    <Link
                      className="manager-project-link"
                      key={p.id}
                      href={`/proyek?id=${encodeURIComponent(p.id)}`}
                      onClick={() => setMenu(false)}
                    >
                      <span
                        className="project-dot"
                        style={{ backgroundColor: String(p.data.color || 'var(--brand)') }}
                      />
                      <span className="project-title">{String(p.data.title)}</span>
                    </Link>
                  ))}
              </div>
            ) : (
              <small className="sidebar-empty-note">Proyek belum dimuat.</small>
            )}
            {workspace && !workspace.workstreams?.some((p) => !isProjectHistory(p)) && (
              <small className="sidebar-empty-note">Tidak ada proyek berjalan.</small>
            )}
          </section>
        </div>

        <div className="sidebar-footer-card">
          <div className="sidebar-profile-row">
            <span className="sidebar-avatar">{name[0]}</span>
            <div className="sidebar-profile-info">
              <strong>{name}</strong>
              <small>Manajer koperasi</small>
            </div>
          </div>
        </div>
      </aside>
      {menu && (
        <Button className="manager-shade" aria-label="Tutup menu" onClick={() => setMenu(false)} />
      )}
      <main className="manager-main" id="main" tabIndex={-1}>
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
      <BottomNav path={path} calendar={query.get('view') === 'kalender'} menu={menu} onAction={() => setActionModalOpen(true)} onMenu={() => setMenu(!menu)} />

      {/* Mobile Navigation Sheet Hub (Native Mobile App Experience) */}
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
            <span className="mobile-sheet-avatar">{name[0] || 'M'}</span>
            <div className="mobile-sheet-user-info">
              <strong>{name}</strong>
              <small>
                {getCoopShortName(String(workspace?.organization?.[0]?.data.title || ''))} · Ruang
                Kerja
              </small>
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
          {sections.map(([label, paths, tone]) => (
            <div key={label} className={`mobile-nav-group tone-${tone}`}>
              <h3 className="mobile-nav-group-title">
                <span>{label}</span>
              </h3>
              <div className="mobile-nav-cards-grid">
                {paths.map((href) => {
                  const itemLabel = navigation.find(([url]) => url === href)?.[1] || href;
                  const isActive = path === href;
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`mobile-nav-card ${isActive ? 'is-active' : ''}`}
                      onClick={() => setMenu(false)}
                    >
                      <div className="mobile-nav-card-icon">
                        <IkonHalaman href={href} size={30} />
                      </div>
                      <div className="mobile-nav-card-text">
                        <span className="mobile-nav-card-title">{itemLabel}</span>
                        <small className="mobile-nav-card-desc">{getNavSubtitle(href)}</small>
                      </div>
                      {isActive && <span className="mobile-nav-card-dot" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="mobile-sheet-footer">
            <Button type="button" className="mobile-sheet-footer-btn" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
              <span>Mode {theme === 'dark' ? 'terang' : 'gelap'}</span>
            </Button>
            <Button
              type="button"
              className="mobile-sheet-footer-btn"
              onClick={async () => {
                setMenu(false);
                try {
                  await api('auth/pin', { action: 'logout' });
                  resetAuthNavigation('/pin');
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
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
