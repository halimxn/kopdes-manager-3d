import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { UbinStatusTugas, hitungStatusTugas } from '@/features/tasks/UbinStatusTugas';

const tugas = (id: string, status: string, due_date: string) => ({ id, created_at: '', updated_at: '', data: { title: id, status, due_date } });
const rows = [
  tugas('a', 'rencana', '2026-10-30'),
  tugas('b', 'rencana', '2026-10-01'),
  tugas('c', 'proses', '2026-10-02'),
  tugas('d', 'selesai', '2026-10-01'),
  tugas('e', 'dibatalkan', '2026-10-01'),
];
afterEach(cleanup);

it('menghitung rencana, dikerjakan, terlambat (belum selesai dan lewat tenggat), dan selesai', () => {
  expect(hitungStatusTugas(rows, '2026-10-20')).toEqual({ rencana: 2, proses: 1, terlambat: 2, selesai: 1 });
});

it('menekan ubin menyaring; menekan ubin yang aktif melepas saringan', () => {
  const pilih = vi.fn();
  const { rerender } = render(<UbinStatusTugas rows={rows} aktif="" onPilih={pilih} />);
  fireEvent.click(screen.getByRole('button', { name: /Dikerjakan/ }));
  expect(pilih).toHaveBeenLastCalledWith('proses');
  rerender(<UbinStatusTugas rows={rows} aktif="proses" onPilih={pilih} />);
  const aktif = screen.getByRole('button', { name: /Dikerjakan/ });
  expect(aktif.getAttribute('aria-pressed')).toBe('true');
  fireEvent.click(aktif);
  expect(pilih).toHaveBeenLastCalledWith('');
});
