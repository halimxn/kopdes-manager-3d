import { describe, expect, it } from 'vitest';
import type { Item } from '@/features/records/schemas';
import { buildConstellation } from '@/features/home/constellation-data';
import { weeklyDone } from '@/features/home/weekly-done';
import { niceMax } from '@/components/ui/charts';
import { monthlyCash } from '@/lib/ledger';

const DATE = '2026-11-02';
const row = (id: string, data: Record<string, unknown>) =>
  ({ id, created_at: '', updated_at: '', data }) as Item;
const project = row('p1', { title: 'Buka gerai' });

describe('buildConstellation', () => {
  it('menggugus tugas per proyek dan menandai yang terlambat', () => {
    const clusters = buildConstellation(
      [project],
      [
        row('t1', { title: 'A', status: 'proses', workstream_id: 'p1', due_date: '2026-10-01' }),
        row('t2', { title: 'B', status: 'rencana', workstream_id: 'p1', due_date: DATE }),
      ],
      DATE,
    );
    expect(clusters).toHaveLength(1);
    expect(clusters[0]).toMatchObject({ id: 'p1', label: 'Buka gerai', active: 2, late: 1 });
    expect(clusters[0].stars[0]).toMatchObject({ id: 't1', status: 'late' });
    expect(clusters[0].stars[1]).toMatchObject({ id: 't2', status: 'active', today: true });
  });

  it('tidak memuat tugas dibatalkan atau selesai lebih dari 30 hari lalu', () => {
    const clusters = buildConstellation(
      [project],
      [
        row('t1', { title: 'Aktif', status: 'rencana', workstream_id: 'p1' }),
        row('t2', { title: 'Batal', status: 'dibatalkan', workstream_id: 'p1' }),
        row('t3', {
          title: 'Lama',
          status: 'selesai',
          workstream_id: 'p1',
          completed_at: '2026-08-01T10:00:00Z',
        }),
        row('t4', {
          title: 'Baru',
          status: 'selesai',
          workstream_id: 'p1',
          completed_at: '2026-10-30T10:00:00Z',
        }),
      ],
      DATE,
    );
    expect(clusters[0].stars.map((star) => star.id).sort()).toEqual(['t1', 't4']);
  });

  it('tidak menggambar gugus tanpa tugas aktif dan tetap sama tiap kali dibangun', () => {
    const done = row('t1', {
      title: 'Selesai',
      status: 'selesai',
      workstream_id: 'p1',
      completed_at: '2026-11-01T10:00:00Z',
    });
    expect(buildConstellation([project], [done], DATE)).toEqual([]);
    const tasks = [row('t2', { title: 'A', status: 'proses' })];
    expect(buildConstellation([], tasks, DATE)).toEqual(buildConstellation([], tasks, DATE));
    expect(buildConstellation([], tasks, DATE)[0].label).toBe('Tanpa proyek');
  });
});

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
