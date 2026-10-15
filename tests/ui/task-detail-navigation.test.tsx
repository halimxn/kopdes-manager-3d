import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Records } from '@/features/records/Records';
import { schemas } from '@/features/records/schemas';

const mocks = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
  useRouter: () => ({ replace: mocks.replace }),
}));
vi.mock('@/lib/client', () => ({ api: vi.fn() }));

const taskId = '7b11b059-00e5-4cc6-834b-c9204d047429';
const task = {
  id: taskId,
  created_at: '',
  updated_at: '',
  data: schemas['work-items'].parse({ title: 'Mengunjungi koperasi', due_date: '2026-10-02' }),
};

beforeEach(() => {
  window.history.replaceState(null, '', `/tugas?task=${taskId}`);
  mocks.replace.mockImplementation((url: string) => window.history.replaceState(null, '', url));
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  window.history.replaceState(null, '', '/');
});

it('menutup tugas menghapus parameter URL sehingga pergantian tampilan tidak membukanya lagi', async () => {
  const props = {
    entity: 'work-items' as const,
    workspace: { 'work-items': [task] },
    refresh: vi.fn(),
  };
  const view = render(<Records {...props} />);
  expect(await screen.findByRole('dialog', { name: 'Detail Tugas' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Tutup' }));
  expect(mocks.replace).toHaveBeenCalledWith('/tugas', { scroll: false });
  expect(screen.queryByRole('dialog', { name: 'Detail Tugas' })).toBeNull();
  view.unmount();
  render(<Records {...props} />);
  fireEvent.click(screen.getByRole('button', { name: 'Papan' }));
  expect(screen.queryByRole('dialog', { name: 'Detail Tugas' })).toBeNull();
});
