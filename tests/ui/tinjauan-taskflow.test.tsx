import { readFileSync } from 'node:fs';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { WorkspacePage } from '@/features/workspace/WorkspacePage';
import { AppShell } from '@/components/layout/AppShell';

const keadaan = vi.hoisted(() => ({ loading: false, error: '', query: '' }));
vi.mock('@/features/workspace/useWorkspace', () => ({
  useWorkspace: () => ({
    data: {},
    loading: keadaan.loading,
    error: keadaan.error,
    refresh: vi.fn(),
    operations: true,
    logistics: true,
    administration: true,
    more: {},
    loadMore: vi.fn(),
    fetching: null,
  }),
}));
vi.mock('next/navigation', () => ({
  usePathname: () => '/tugas',
  useSearchParams: () => new URLSearchParams(keadaan.query),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
vi.mock('@/lib/client', () => ({ api: vi.fn(async () => ({ items: [] })), resetAuthNavigation: vi.fn() }));
vi.mock('@/lib/ThemeContext', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  Object.assign(keadaan, { loading: false, error: '', query: '' });
});

it('tab hub tetap ada saat halaman gagal dimuat, agar halaman saudara masih bisa dibuka', () => {
  keadaan.error = 'Supabase tidak menjawab';
  render(<WorkspacePage slug="penjualan" />);
  const tab = screen.getByRole('navigation', { name: 'Bagian Usaha' });
  expect(within(tab).getByRole('link', { name: 'Pembelian' }).getAttribute('href')).toBe('/pembelian');
});

it('tab hub tetap ada saat halaman masih memuat (tidak bergeser setelah data datang)', () => {
  keadaan.loading = true;
  render(<WorkspacePage slug="anggota" />);
  expect(screen.getByRole('navigation', { name: 'Bagian Koperasi' })).toBeTruthy();
});

it('dok ponsel menandai Pekerjaan pada tampilan kalender tugas', () => {
  keadaan.query = 'view=kalender';
  render(
    <AppShell>
      <p>Isi</p>
    </AppShell>,
  );
  const dok = screen.getByRole('navigation', { name: 'Navigasi cepat' });
  expect(within(dok).getByRole('link', { name: 'Pekerjaan' }).getAttribute('aria-current')).toBe('page');
});

it('cincin fokus tab hub dan kartu pekerjaan tidak terpotong oleh wadah bergulir', () => {
  const kerangka = readFileSync('src/styles/kerangka.css', 'utf8');
  const beranda = readFileSync('src/styles/halaman/beranda.css', 'utf8');
  expect(kerangka).toMatch(/\.tab-hub a:focus-visible\s*\{[^}]*outline-offset:\s*-2px/);
  expect(beranda).toMatch(/\.beranda-berjalan-baris\s*\{[^}]*padding:\s*6px 4px 8px/);
});

it('bilah gulir tab hub terlihat di tablet dan desktop, disembunyikan hanya di ponsel', () => {
  const kerangka = readFileSync('src/styles/kerangka.css', 'utf8');
  const tabHub = kerangka.match(/\n\.tab-hub\s*\{([^}]*)\}/)![1];
  expect(tabHub).toMatch(/scrollbar-width:\s*thin/);
  expect(kerangka).toMatch(/@media \(max-width: 767px\)\s*\{[^@]*\.tab-hub\s*\{[^}]*scrollbar-width:\s*none/);
});

it('galat ruang kerja memakai h2, karena h1 milik kepala kerangka', () => {
  keadaan.error = 'Supabase tidak menjawab';
  render(<WorkspacePage slug="tugas" />);
  expect(screen.getByRole('heading', { level: 2, name: 'Ruang kerja belum dapat dimuat' })).toBeTruthy();
  expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
});

it('tombol sidebar di layar lebar berlabel sesuai keadaan dan memakai aria-expanded', () => {
  render(
    <AppShell>
      <p>Isi</p>
    </AppShell>,
  );
  const tombol = screen.getByRole('button', { name: 'Ciutkan sidebar navigasi' });
  expect(tombol.getAttribute('aria-expanded')).toBe('true');
  fireEvent.click(tombol);
  const lagi = screen.getByRole('button', { name: 'Tampilkan sidebar navigasi' });
  expect(lagi.getAttribute('aria-expanded')).toBe('false');
  fireEvent.click(lagi);
});

it('tombol menu di bawah 1024 px membuka lembar menu dengan aria-expanded', () => {
  vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(800);
  render(
    <AppShell>
      <p>Isi</p>
    </AppShell>,
  );
  const tombol = screen.getByRole('button', { name: 'Buka menu navigasi' });
  expect(tombol.getAttribute('aria-expanded')).toBe('false');
  fireEvent.click(tombol);
  expect(tombol.getAttribute('aria-expanded')).toBe('true');
});

it('bagian Perlu perhatian di Beranda bisa dituju dari tautan /beranda#perhatian', () => {
  const beranda = readFileSync('src/styles/halaman/beranda.css', 'utf8');
  const dashboard = readFileSync('src/features/dashboard/Dashboard.tsx', 'utf8');
  expect(dashboard).toMatch(/<section id="perhatian"/);
  expect(dashboard).not.toMatch(/href="\/tindak-lanjut"/);
  expect(beranda).toMatch(/#perhatian\s*\{[^}]*scroll-margin-top/);
});

it('warna seleksi dan ikon 3D memakai token merek, bukan heks mentah', () => {
  const dasar = readFileSync('src/styles/dasar.css', 'utf8');
  const ikon = readFileSync('src/components/ui/Ikon3D.tsx', 'utf8');
  expect(dasar).toMatch(/::selection\s*\{[^}]*color-mix\([^)]*var\(--brand\)/);
  expect(ikon).not.toMatch(/color:\s*'#546fff'/i);
});
