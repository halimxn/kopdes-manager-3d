// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AWALAN_ID_CONTOH, dataContoh } from '@/features/demo/data-contoh';
import { schemas, type Entity } from '@/features/records/schemas';
import { references } from '@/features/records/catalog';

describe('data contoh', () => {
  const rows = dataContoh('2026-10-10');
  it('lolos skema server dan berpenanda id contoh', () => {
    expect(rows.length).toBeGreaterThan(150);
    for (const r of rows) {
      expect(r.id.startsWith(AWALAN_ID_CONTOH)).toBe(true);
      expect(() => schemas[r.entity as Entity].parse(r.data)).not.toThrow();
    }
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
  });
  it('relasi menunjuk catatan dengan entitas yang benar', () => {
    const byId = new Map(rows.map((r) => [r.id, r.entity]));
    for (const r of rows)
      for (const [field, target] of Object.entries(references)) {
        const v = r.data[field];
        if (v) expect(byId.get(String(v)), `${r.entity}.${field}`).toBe(target);
      }
  });
  it('deterministik dan memuat kasus yang perlu tampak', () => {
    expect(dataContoh('2026-10-10')).toEqual(rows);
    const of = (e: string) => rows.filter((r) => r.entity === e);
    expect(of('meetings').filter((m) => m.data.date === '2026-10-10')).toHaveLength(3);
    expect(new Set(of('meetings').map((m) => m.data.jenis))).toEqual(new Set(['rapat', 'kunjungan', 'acara']));
    expect(of('units').some((u) => u.data.status !== 'aktif')).toBe(true);
    expect(
      of('work-items').some((t) => t.data.status === 'rencana' && String(t.data.due_date) < '2026-10-10'),
    ).toBe(true);
    expect(
      of('inventory-items').some((b) => Number(b.data.book_quantity) < Number(b.data.minimum_quantity)),
    ).toBe(true);
  });
});

describe('klien demo', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_MODE_DEMO', '1');
    vi.stubEnv('VERCEL', '');
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    (await import('@/lib/server/demo-db')).aturUlangDemo();
  });

  it('tidak aktif di Vercel walau flag menyala', async () => {
    vi.stubEnv('VERCEL', '1');
    const { modeDemo } = await import('@/lib/demo');
    expect(modeDemo()).toBe(false);
  });

  it('daftar, cari, simpan tugas, dan mutasi stok lewat layanan yang sama', async () => {
    const { listPage, save, list } = await import('@/features/records/service');
    const base = { offset: 0, limit: 50 } as const;
    const kini = await listPage('work-items', { ...base, scope: 'current' } as never);
    expect(kini.items.length).toBeGreaterThan(5);
    expect(kini.items.every((t) => ['rencana', 'proses'].includes(String(t.data.status)) || t.data.completed_at)).toBe(true);
    const cari = await listPage('members', { ...base, q: 'a' } as never);
    expect(cari.items.length).toBeGreaterThan(0);

    const tugas = await save('work-items', { title: 'Tugas uji demo', due_date: '2026-10-12' });
    expect(tugas.id).toBeTruthy();
    expect((await list('work-items')).some((t) => t.id === tugas.id)).toBe(true);

    const barang = (await list('inventory-items'))[0];
    const awal = Number(barang.data.book_quantity);
    await save('stock-movements', { title: 'Uji', item_id: barang.id, kind: 'keluar', quantity: 1, date: '2026-10-10' });
    const sesudah = (await list('inventory-items')).find((b) => b.id === barang.id)!;
    expect(sesudah.data.book_quantity).toBe(awal - 1);
    await expect(
      save('stock-movements', { title: 'Uji', item_id: barang.id, kind: 'keluar', quantity: 10 ** 8, date: '2026-10-10' }),
    ).rejects.toThrow('Stok buku tidak cukup');
  });

  it('menolak hapus catatan yang masih dirujuk', async () => {
    const { db } = await import('@/lib/server/db');
    const proyek = (await db().from('hub_records').select('*').eq('entity', 'units').limit(1)).data![0];
    const { error } = await db().from('hub_records').delete().eq('id', proyek.id);
    expect(error).not.toBeNull();
  });
  it('menyimpan ulang atau membuka kembali tugas selesai tidak menggandakan pengulangan demo', async () => {
    const { save, list } = await import('@/features/records/service');
    const payload = { title: 'Uji tugas berulang', due_date: '2026-10-13', recurrence: 'harian' };
    const row = await save('work-items', payload);
    await save('work-items', { ...payload, status: 'selesai' }, row.id);
    await save('work-items', { ...payload, status: 'selesai', notes: 'Catatan baru' }, row.id);
    await save('work-items', payload, row.id);
    await save('work-items', { ...payload, status: 'selesai' }, row.id);
    expect((await list('work-items')).filter(item => item.data.title === payload.title)).toHaveLength(2);
  });
});
