import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { TabHub } from '@/components/layout/TabHub';
import { AppShell } from '@/components/layout/AppShell';

const nav = vi.hoisted(() => ({ path: '/tugas' }));
vi.mock('next/navigation', () => ({
  usePathname: () => nav.path,
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
vi.mock('@/lib/client', () => ({ api: vi.fn(async () => ({ items: [] })), resetAuthNavigation: vi.fn() }));
vi.mock('@/lib/ThemeContext', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}));
afterEach(cleanup);

it('TabHub menampilkan tab hub dan menandai halaman aktif', () => {
  render(<TabHub path="/tugas" />);
  const daftar = screen.getByRole('navigation', { name: 'Bagian Pekerjaan' });
  expect(within(daftar).getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual([
    '/hari-ini',
    '/tugas',
    '/proyek',
    '/roadmap',
  ]);
  expect(within(daftar).getByRole('link', { name: 'Tugas' }).getAttribute('aria-current')).toBe('page');
});

it('TabHub menggulir tab aktif ke dalam pandangan di layar sempit', () => {
  const gulir = vi.fn();
  Element.prototype.scrollIntoView = gulir;
  render(<TabHub path="/stok-opname" />);
  expect(gulir).toHaveBeenCalledWith({ block: 'nearest', inline: 'center' });
  expect((gulir.mock.contexts[0] as Element).getAttribute('href')).toBe('/stok-opname');
});

it('TabHub tidak dirender untuk hub satu tab atau halaman tanpa hub', () => {
  const { container } = render(
    <>
      <TabHub path="/beranda" />
      <TabHub path="/pengaturan" />
    </>,
  );
  expect(container.innerHTML).toBe('');
});

it('sidebar berisi enam hub dan hub aktif mengikuti tab yang dibuka', () => {
  nav.path = '/stok-opname';
  render(
    <AppShell>
      <p>Isi</p>
    </AppShell>,
  );
  const sidebar = screen.getByRole('navigation', { name: 'Menu utama' });
  const tautan = within(sidebar).getAllByRole('link');
  expect(tautan.map((a) => a.getAttribute('aria-label'))).toEqual([
    'Beranda',
    'Pekerjaan',
    'Catatan',
    'Usaha',
    'Koperasi',
    'Dunia',
  ]);
  const usaha = within(sidebar).getByRole('link', { name: 'Usaha' });
  expect(usaha.getAttribute('aria-current')).toBe('page');
  expect(usaha.getAttribute('href')).toBe('/gerai');
});

it('kepala halaman memuat judul halaman sebagai h1', () => {
  nav.path = '/keuangan';
  render(
    <AppShell>
      <p>Isi</p>
    </AppShell>,
  );
  expect(screen.getByRole('heading', { level: 1, name: 'Buku kas' })).toBeTruthy();
});

it('profil kosong menampilkan inisial M tanpa nama karangan', () => {
  nav.path = '/beranda';
  render(
    <AppShell>
      <p>Isi</p>
    </AppShell>,
  );
  expect(screen.getByLabelText('Menu profil Manajer').textContent).toContain('M');
});
