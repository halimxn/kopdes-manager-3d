import { describe, expect, it } from 'vitest';
import type { Item } from '@/features/records/schemas';
import { weeklyDone } from '@/features/home/weekly-done';
import { niceMax } from '@/components/ui/charts';
import { monthlyCash } from '@/lib/ledger';

const DATE = '2026-11-02';
const row = (id: string, data: Record<string, unknown>) =>
  ({ id, created_at: '', updated_at: '', data }) as Item;

describe('weeklyDone', () => {
  it('menghitung tugas selesai per tujuh hari tanpa menebak tanggal yang kosong', () => {
    const weeks = weeklyDone(
      [
        row('a', { status: 'selesai', completed_at: '2026-11-02T01:00:00Z' }),
        row('b', { status: 'selesai', completed_at: '2026-10-27' }),
        row('c', { status: 'selesai', completed_at: '2026-10-26' }),
        row('d', { status: 'selesai' }),
        row('e', { status: 'proses', completed_at: '2026-11-01' }),
      ],
      DATE,
      2,
    );
    expect(weeks.map((week) => week.value)).toEqual([1, 2]);
    expect(weeks[1].label).toBe('2 Nov');
  });
});

describe('monthlyCash', () => {
  it('menjumlahkan uang masuk dan keluar per bulan, termasuk melewati pergantian tahun', () => {
    const months = monthlyCash(
      [
        row('a', { date: '2026-11-02', direction: 'masuk', amount: 100 }),
        row('b', { date: '2026-11-20', direction: 'keluar', amount: 40 }),
        row('c', { date: '2026-01-15', direction: 'masuk', amount: 7 }),
        row('d', { date: '2025-12-31', direction: 'keluar', amount: 9 }),
        row('e', { date: '2025-11-30', direction: 'masuk', amount: 999 }),
      ],
      '2026-02-01',
      3,
    );
    expect(months).toEqual([
      { label: 'Des', values: [0, 9] },
      { label: 'Jan', values: [7, 0] },
      { label: 'Feb', values: [0, 0] },
    ]);
    expect(
      monthlyCash([row('a', { date: '2026-11-02', direction: 'masuk', amount: 100 })], DATE, 1),
    ).toEqual([{ label: 'Nov', values: [100, 0] }]);
  });
});

describe('niceMax', () => {
  it('membulatkan puncak sumbu ke atas', () => {
    expect(niceMax(0)).toBe(1);
    expect(niceMax(7)).toBe(10);
    expect(niceMax(12)).toBe(20);
    expect(niceMax(4_300_000)).toBe(5_000_000);
  });
});
