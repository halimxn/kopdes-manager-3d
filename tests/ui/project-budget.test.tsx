import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ProjectBudget, muatRealisasi } from '@/features/projects/ProjectBudget';
import { schemas, type Item } from '@/features/records/schemas';

const mocks = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('@/lib/client', () => ({ api: mocks.api }));
afterEach(() => {
  cleanup();
  mocks.api.mockReset();
});

const proyekId = '11111111-1111-4111-8111-111111111111';
const kas = (amount: number, direction: 'masuk' | 'keluar') => ({ id: crypto.randomUUID(), data: { amount, direction } });

it('proyek lama tanpa anggaran tetap valid dan kas boleh ditautkan ke proyek', () => {
  expect(schemas.workstreams.parse({ title: 'Gerai', code: 'GR' }).budget).toBe(0);
  expect(schemas.workstreams.parse({ title: 'Gerai', code: 'GR', budget: '2500000' }).budget).toBe(2_500_000);
  const entri = schemas['cash-entries'].parse({
    title: 'Cat',
    date: '2026-10-15',
    direction: 'keluar',
    amount: 100,
    category: 'Renovasi',
    account: 'Kas',
    workstream_id: proyekId,
  });
  expect(entri.workstream_id).toBe(proyekId);
});

it('menjumlahkan semua halaman transaksi proyek', async () => {
  mocks.api
    .mockResolvedValueOnce({ items: [kas(400, 'keluar'), kas(50, 'masuk')], hasMore: true, nextOffset: 100 })
    .mockResolvedValueOnce({ items: [kas(100, 'keluar')], hasMore: false, nextOffset: 200 });
  expect(await muatRealisasi(proyekId)).toEqual({ keluar: 500, masuk: 50, jumlah: 3 });
  expect(mocks.api).toHaveBeenLastCalledWith(expect.stringContaining(`project=${proyekId}`));
  expect(mocks.api).toHaveBeenLastCalledWith(expect.stringContaining('offset=100'));
});

it('menandai realisasi yang melebihi anggaran', async () => {
  mocks.api.mockImplementation(async (path: string) =>
    path === 'capabilities' ? { operations: true } : { items: [kas(1_200, 'keluar')], hasMore: false, nextOffset: 100 },
  );
  const proyek = { id: proyekId, data: { title: 'Gerai', budget: 1_000 } } as unknown as Item;
  render(<ProjectBudget project={proyek} />);
  expect(await screen.findByText('Melebihi anggaran')).toBeTruthy();
  expect(screen.getByText('120% terpakai')).toBeTruthy();
});
