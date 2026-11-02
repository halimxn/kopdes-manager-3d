import { describe, expect, it } from 'vitest';
import type { Item } from '@/features/records/schemas';
import { buildCoopMap } from '@/features/home/coop-map-data';
import { getFollowUps } from '@/features/notifications/follow-ups';

const DATE = '2026-11-02';
const row = (id: string, data: Record<string, unknown>) =>
  ({ id, created_at: '', updated_at: '', data }) as Item;
const ALL = { operations: true, logistics: true, administration: true };
const domain = (map: ReturnType<typeof buildCoopMap>, id: string) =>
  map.find((item) => item.id === id)!;

describe('buildCoopMap', () => {
  it('menyusun delapan bidang koperasi', () => {
    const map = buildCoopMap({}, DATE, ALL);
    expect(map.map((item) => item.id)).toEqual([
      'kerja',
      'agenda',
      'gerai',
      'barang',
      'kas',
      'anggota',
      'tim',
      'dokumen',
    ]);
    expect(map.every((item) => item.urgent === 0 && item.soon === 0)).toBe(true);
  });

  it('menaruh tiap tindak lanjut di bidangnya dengan tingkat yang benar', () => {
    const map = buildCoopMap(
      {
        'work-items': [
          row('t1', { title: 'Lewat', status: 'proses', due_date: '2026-10-01' }),
          row('t2', { title: 'Hari ini', status: 'rencana', due_date: DATE }),
          row('t3', { title: 'Nanti', status: 'rencana', due_date: '2026-12-01' }),
        ],
        'inventory-items': [
          row('i1', { title: 'Habis', book_quantity: 0, minimum_quantity: 5 }),
          row('i2', { title: 'Aman', book_quantity: 50, minimum_quantity: 5 }),
        ],
        documents: [row('d1', { title: 'Izin', expires_date: '2026-10-01' })],
      },
      DATE,
      ALL,
    );
    const work = domain(map, 'kerja');
    expect(work.urgent).toBe(1);
    expect(work.soon).toBe(1);
    expect(work.actions.find((item) => item.id === 't2')?.today).toBe(true);
    // Tugas yang belum mendekat tetap jadi titik peta, tetapi tidak masuk daftar tindakan.
    expect(work.records.map((item) => item.id)).toContain('t3');
    expect(work.actions.map((item) => item.id)).not.toContain('t3');
    expect(domain(map, 'barang').urgent).toBe(1);
    expect(domain(map, 'dokumen').urgent).toBe(1);
  });

  it('jumlah di peta sama dengan aturan tindak lanjut lonceng', () => {
    const ws = {
      'work-items': [row('t1', { title: 'Lewat', status: 'proses', due_date: '2026-10-01' })],
      deliveries: [row('k1', { title: 'Beras', status: 'dikirim', planned_date: '2026-10-30' })],
      issues: [row('s1', { title: 'Freezer', status: 'terbuka', due_date: DATE })],
    };
    const total = buildCoopMap(ws, DATE, ALL).reduce((sum, item) => sum + item.actions.length, 0);
    expect(total).toBe(getFollowUps(ws, DATE).length);
  });

  it('kas hanya uang tercatat 7 hari dan disebut bukan saldo', () => {
    const kas = domain(
      buildCoopMap(
        {
          'cash-entries': [
            row('c1', { title: 'Jual', date: DATE, direction: 'masuk', amount: 200000 }),
            row('c2', { title: 'Beli', date: '2026-10-28', direction: 'keluar', amount: 50000 }),
            row('c3', { title: 'Lama', date: '2026-09-01', direction: 'masuk', amount: 999000 }),
          ],
        },
        DATE,
        ALL,
      ),
      'kas',
    );
    expect(kas.stats[0]).toEqual({
      label: 'Uang masuk',
      value: expect.stringContaining('200.000'),
    });
    expect(kas.stats[1]).toEqual({
      label: 'Uang keluar',
      value: expect.stringContaining('50.000'),
    });
    expect(kas.note).toContain('bukan saldo');
    expect(kas.records).toHaveLength(2);
  });

  it('modul yang belum aktif tidak diberi angka nol', () => {
    const map = buildCoopMap({}, DATE, { operations: false });
    const kas = domain(map, 'kas');
    expect(kas.active).toBe(false);
    expect(kas.stats).toEqual([]);
    expect(kas.note).toContain('Belum aktif');
    expect(domain(map, 'gerai').stats.map((stat) => stat.label)).not.toContain('Omzet 7 hari');
  });

  it('menandai jumlah yang belum lengkap dengan tanda tambah', () => {
    const barang = domain(
      buildCoopMap(
        { 'inventory-items': [row('i1', { title: 'A', book_quantity: 9, minimum_quantity: 1 })] },
        DATE,
        ALL,
        { 'inventory-items': 50 },
      ),
      'barang',
    );
    expect(barang.stats[0].value).toBe('1+');
  });

  it('memberi posisi tetap dan membatasi jumlah titik', () => {
    const tasks = Array.from({ length: 30 }, (_, index) =>
      row(`t${index}`, { title: `T${index}`, status: 'rencana', due_date: '2026-12-01' }),
    );
    const first = domain(buildCoopMap({ 'work-items': tasks }, DATE, ALL), 'kerja');
    const second = domain(buildCoopMap({ 'work-items': tasks }, DATE, ALL), 'kerja');
    expect(first.records).toHaveLength(14);
    expect(first.records).toEqual(second.records);
  });
});

describe('getFollowUps bidang baru', () => {
  it('mencatat kesiapan gerai, pengiriman, absensi, dan pelatihan wajib', () => {
    const items = getFollowUps(
      {
        units: [
          row('u1', { title: 'Gerai A', status: 'persiapan' }),
          row('u2', { title: 'Gerai B', status: 'aktif' }),
        ],
        checklist: [
          row('c1', { unit_id: 'u1', required: true, status: 'selesai' }),
          row('c2', { unit_id: 'u1', required: true, status: 'rencana' }),
          row('c3', { unit_id: 'u2', required: true, status: 'rencana' }),
        ],
        deliveries: [
          row('k1', { title: 'Lewat', status: 'dikirim', planned_date: '2026-10-30' }),
          row('k2', { title: 'Selesai', status: 'selesai', planned_date: '2026-10-30' }),
        ],
        staff: [row('s1', { title: 'Budi' })],
        attendance: [
          row('a1', { staff_id: 's1', date: DATE, status: 'alpa' }),
          row('a2', { staff_id: 's1', date: '2026-11-01', status: 'alpa' }),
        ],
        trainings: [
          row('l1', { title: 'K3', required: true, status: 'rencana', date: '2026-10-01' }),
        ],
      },
      DATE,
    );
    const by = (id: string) => items.find((item) => item.id === id);
    expect(by('units:u1')?.reason).toBe('Kesiapan buka 50%');
    expect(by('units:u2')).toBeUndefined();
    expect(by('deliveries:k1')?.urgent).toBe(true);
    expect(by('deliveries:k2')).toBeUndefined();
    expect(by('attendance:a1')).toMatchObject({ title: 'Budi', urgent: true });
    expect(by('attendance:a2')).toBeUndefined();
    expect(by('trainings:l1')?.reason).toBe('Pelatihan wajib lewat jadwal');
  });
});
