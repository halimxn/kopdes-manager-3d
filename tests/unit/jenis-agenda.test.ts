import { expect, it } from 'vitest';
import { catatHasilHref, jenisDari } from '@/features/meetings/jenis';
import { schemas } from '@/features/records/schemas';

const agenda = (data: Record<string, unknown>) => ({ id: 'm1', created_at: '', updated_at: '', data });

it('agenda lama tanpa jenis dianggap rapat; jenis yang dikenal dipakai apa adanya', () => {
  expect(jenisDari(agenda({ title: 'Rapat lama' }))).toBe('rapat');
  expect(jenisDari(agenda({ title: 'Ke pemasok', jenis: 'kunjungan' }))).toBe('kunjungan');
  expect(jenisDari(agenda({ title: 'Aneh', jenis: 'pesta' }))).toBe('rapat');
  expect(schemas.meetings.parse({ title: 'Rapat', date: '2026-10-20' }).jenis).toBe('rapat');
  expect(() => schemas.meetings.parse({ title: 'X', date: '2026-10-20', jenis: 'pesta' })).toThrow();
});

it('Catat hasil membuka form kegiatan yang tertaut ke agenda', () => {
  const url = new URL(catatHasilHref(agenda({ title: 'Kunjungan sales' }), '2026-10-20'), 'http://x');
  expect(url.pathname).toBe('/jurnal');
  expect(Object.fromEntries(url.searchParams)).toEqual({
    baru: '1',
    'isi.meeting_id': 'm1',
    'isi.title': 'Hasil: Kunjungan sales',
    'isi.date': '2026-10-20',
  });
});
