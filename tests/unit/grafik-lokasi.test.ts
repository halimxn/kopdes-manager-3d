import { expect, it } from 'vitest';
import { grafikLokasi } from '@/features/dunia-3d/grafik-lokasi';
import type { WorldModel } from '@/features/dunia-3d/model/world-model';
import type { Item } from '@/features/records/schemas';

const row = (id: string, data: Record<string, unknown>) => ({ id, data }) as unknown as Item;
const model = { inventory: { racks: { A: [], B: [], C: [], D: [], E: [], F: [] }, coldRacks: { C1: [], C2: [], C3: [] } } } as unknown as WorldModel;
const dasar = { model, hari: '2026-10-15', stock: true, shipping: true, unavailable: false };

it('tugas terbuka dipisah: lewat tenggat, dikerjakan, rencana', () => {
  const [tumpuk] = grafikLokasi({
    ...dasar,
    lokasi: 'kantor',
    data: {
      'work-items': [
        row('1', { status: 'proses', due_date: '2026-10-10' }),
        row('2', { status: 'proses', due_date: '2026-10-20' }),
        row('3', { status: 'rencana', due_date: '2026-10-20' }),
        row('4', { status: 'selesai', due_date: '2026-10-01', completed_at: '2026-10-15' }),
      ],
    },
  });
  expect(tumpuk).toMatchObject({
    jenis: 'tumpuk',
    bagian: [
      { label: 'Lewat tenggat', nilai: 1 },
      { label: 'Dikerjakan', nilai: 1 },
      { label: 'Rencana', nilai: 1 },
    ],
  });
});

it('gerai tanpa migrasi 10 menulis belum aktif, bukan nol', () => {
  const [grafik] = grafikLokasi({ ...dasar, lokasi: 'gerai', data: {} });
  expect(grafik).toMatchObject({ jenis: 'catatan', teks: expect.stringContaining('belum aktif') });
});

it('data belum tersedia tidak menghasilkan angka', () => {
  expect(grafikLokasi({ ...dasar, unavailable: true, lokasi: 'gudang', data: {} })).toEqual([
    { jenis: 'catatan', judul: 'Grafik', teks: 'Data belum tersedia.' },
  ]);
});
