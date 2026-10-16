import { readFileSync } from 'node:fs';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
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
