import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Projects } from '@/features/projects/Projects';
import { Operations } from '@/features/operations/Operations';
import { TodayView } from '@/features/dashboard/TodayView';
import { projectWorkspace } from '@/features/qa/popup-fixtures';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));
vi.mock('@/lib/client', () => ({ api: vi.fn(async () => ({ items: [], hasMore: false, nextOffset: 0 })) }));
afterEach(() => {
  cleanup();
  localStorage.clear();
});

it('kartu proyek memakai sampul warna hub Taskflow', () => {
  const { container } = render(<Projects data={projectWorkspace} refresh={async () => {}} />);
  const kartu = container.querySelector('a.project-card')!;
  expect(kartu.classList.contains('sampul-pekerjaan')).toBe(true);
  expect(kartu.querySelector('.kartu-pekerjaan-sampul')).toBeTruthy();
});

it('halaman pencatatan tidak lagi memuat sub-navigasi sendiri (sudah ada tab hub)', () => {
  render(<Operations slug="anggota" data={{}} ready refresh={vi.fn()} />);
  expect(screen.queryByRole('navigation', { name: 'Halaman pencatatan' })).toBeNull();
});

it('halaman fitur tidak merender h1 kedua; h1 milik kepala kerangka', () => {
  const today = render(<TodayView workspace={{}} refresh={vi.fn()} />);
  expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
  today.unmount();
  render(<Projects data={projectWorkspace} refresh={async () => {}} />);
  expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
});
