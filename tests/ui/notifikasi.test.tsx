import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Notifikasi, susunPengingat } from '@/features/notifikasi/Notifikasi';
import type { Item } from '@/features/records/schemas';

const mocks = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('@/lib/client', () => ({ api: mocks.api }));
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  mocks.api.mockReset();
});

const tugas = (id: string, title: string, due_date: string, status = 'belum'): Item =>
  ({ id, entity: 'work-items', data: { title, due_date, status }, created_at: '', updated_at: '' }) as unknown as Item;

it('menyusun pengingat terlambat dan tenggat besok tanpa tugas selesai', () => {
  const daftar = susunPengingat(
    {
      'work-items': [
        tugas('a', 'Laporan bulanan', '2026-10-10'),
        tugas('b', 'Cek gudang', '2026-10-16'),
        tugas('c', 'Sudah beres', '2026-10-16', 'selesai'),
      ],
    },
    '2026-10-15',
  );
  expect(daftar.map((item) => item.title)).toContain('Laporan bulanan');
  expect(daftar.find((item) => item.title === 'Cek gudang')?.reason).toBe('Tenggat besok');
  expect(daftar.some((item) => item.title === 'Sudah beres')).toBe(false);
});

it('lonceng membuka panel pengingat dan menandai sudah dilihat', async () => {
  mocks.api.mockImplementation(async (path: string) => {
    if (path === 'capabilities') return { operations: false, logistics: false };
    if (path.startsWith('work-items')) return { items: [tugas('a', 'Laporan bulanan', '2020-01-01')] };
    return { items: [] };
  });
  render(<Notifikasi />);
  fireEvent.click(screen.getByRole('button', { name: /^Pengingat/ }));
  expect(await screen.findByText('Laporan bulanan')).toBeTruthy();
  expect(mocks.api).not.toHaveBeenCalledWith(expect.stringMatching(/^inventory-items/));
  fireEvent.click(screen.getByRole('button', { name: 'Tutup pengingat', hidden: true }));
  expect(screen.getByRole('button', { name: 'Pengingat' })).toBeTruthy();
});
