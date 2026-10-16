import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { ModulUsahaHarian } from '@/features/dashboard/ModulUsahaHarian';
import { invalidateWorkspaceCache } from '@/features/workspace/useWorkspace';
import { today } from '@/lib/date';

const mocks = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('@/lib/client', () => ({ api: mocks.api }));
afterEach(() => {
  cleanup();
  mocks.api.mockReset();
  invalidateWorkspaceCache();
});

it('tidak tampil sebelum migrasi administrasi aktif', async () => {
  mocks.api.mockResolvedValue({ operations: true, logistics: true, administration: false });
  const { container } = render(<ModulUsahaHarian />);
  await waitFor(() => expect(mocks.api).toHaveBeenCalledWith('capabilities'));
  expect(container.innerHTML).toBe('');
});

it('menampilkan omzet 7 hari dan petugas yang belum absen', async () => {
  const hari = today();
  mocks.api.mockImplementation(async (path: string) => {
    if (path === 'capabilities') return { operations: true, logistics: true, administration: true };
    if (path.startsWith('sales'))
      return { items: [{ id: 's1', data: { unit_id: 'u1', date: hari, amount: 1_500_000, transactions: 30 } }] };
    if (path.startsWith('attendance'))
      return { items: [{ id: 'a1', data: { staff_id: 'p1', date: hari, status: 'hadir', check_in_time: '07:05' } }] };
    if (path.startsWith('staff'))
      return {
        items: [
          { id: 'p1', data: { title: 'Sari', status: 'aktif' } },
          { id: 'p2', data: { title: 'Budi', status: 'aktif' } },
        ],
      };
    return { items: [{ id: 'u1', data: { title: 'Gerai Sembako' } }] };
  });
  render(<ModulUsahaHarian />);
  expect((await screen.findAllByText('Rp 1,5 jt')).length).toBeGreaterThan(0);
  expect(screen.getByRole('img', { name: '1 dari 2 petugas hadir' })).toBeTruthy();
  expect(screen.getByText('Belum absen').closest('li')?.textContent).toBe('Belum absen1');
  expect(mocks.api).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`^attendance\\?from=${hari}&to=${hari}`)));
});
