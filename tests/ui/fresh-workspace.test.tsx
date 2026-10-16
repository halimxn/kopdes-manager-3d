import { beforeEach, afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PinnedRecords, parsePins } from '@/features/follow-ups/PinnedRecords';
import { getFollowUps } from '@/features/workspace/workspace-navigation';
import type { Item } from '@/features/records/schemas';
import { schemas } from '@/features/records/schemas';
import { Dashboard } from '@/features/dashboard/Dashboard';
import { FollowUps } from '@/features/follow-ups/FollowUps';

const row = (id: string, data: Record<string, unknown>): Item => ({
  id,
  data,
  created_at: '',
  updated_at: '',
});
beforeEach(() => {
  localStorage.clear();
});
afterEach(cleanup);

it('pins a loaded record, restores it, and removes only that entity reference', () => {
  const data = {
    workstreams: [row('same', { title: 'Proyek uji' })],
    documents: [row('same', { title: 'Dokumen uji' })],
  };
  localStorage.setItem('hub-pinned-records', JSON.stringify([{ entity: 'documents', id: 'same' }]));
  const view = render(<PinnedRecords data={data} />);
  fireEvent.change(screen.getByLabelText('Catatan untuk disematkan'), {
    target: { value: 'workstreams:same' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Sematkan' }));
  expect(screen.getByRole('link', { name: /Proyek uji/ }).getAttribute('href')).toBe(
    '/proyek?id=same',
  );
  view.unmount();
  render(<PinnedRecords data={data} />);
  expect(screen.getByRole('link', { name: /Proyek uji/ })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Hapus sematan Proyek uji' }));
  expect(screen.queryByRole('link', { name: /Proyek uji/ })).toBeNull();
  expect(screen.getByRole('link', { name: /Dokumen uji/ })).toBeTruthy();
});

it('retains unloaded references without presenting them as available records', () => {
  localStorage.setItem('hub-pinned-records', '[{"entity":"work-items","id":"missing"}]');
  render(<PinnedRecords data={{}} />);
  expect(screen.getByText('Catatan belum dimuat atau sudah dihapus.')).toBeTruthy();
  expect(parsePins(localStorage.getItem('hub-pinned-records') || '')).toHaveLength(1);
});

it('rejects malformed pins and deduplicates the same reference', () => {
  expect(parsePins('{broken')).toEqual([]);
  expect(parsePins('[{"entity":"organization","id":"profile"}]')).toEqual([]);
  expect(
    parsePins('[{"entity":"documents","id":"one"},{"entity":"documents","id":"one"}]'),
  ).toHaveLength(1);
});

it('keeps dashboard details closed and lists focus tasks as compact rows', () => {
  const data = {
    'work-items': Array.from({ length: 5 }, (_, index) =>
      row(
        `task-${index}`,
        schemas['work-items'].parse({ title: `Tugas uji ${index}`, due_date: '2026-10-03' }),
      ),
    ),
  };
  const view = render(<Dashboard data={data} />);
  // Agenda dan status tugas selalu tampil; fokus berisi tugas terlambat sebagai baris ringkas.
  expect(view.container.querySelector('.dashboard-routines')).toBeTruthy();
  expect(view.container.querySelector('.beranda-status')).toBeTruthy();
  expect(view.container.querySelectorAll('.beranda-fokus .fokus-daftar li')).toHaveLength(5);
  expect(screen.getByRole('link', { name: /Semua tugas/ }).getAttribute('href')).toBe('/tugas');
});

it('reminds about active meetings through seven days without reviving past or closed meetings', () => {
  const reminders = getFollowUps(
    {
      meetings: [
        row('today', { title: 'Rapat hari ini', date: '2026-10-03', status: 'rencana' }),
        row('edge', { title: 'Rapat minggu depan', date: '2026-10-10', status: 'rencana' }),
        row('later', { title: 'Nanti', date: '2026-10-11', status: 'rencana' }),
        row('past', { title: 'Lampau', date: '2026-10-02', status: 'rencana' }),
        row('done', { title: 'Selesai', date: '2026-10-03', status: 'selesai' }),
        row('cancelled', { title: 'Dibatalkan', date: '2026-10-03', status: 'dibatalkan' }),
      ],
      'work-items': [row('undated', { title: 'Tanpa tenggat', status: 'rencana', due_date: '' })],
    },
    '2026-10-03',
  );
  expect(reminders.map((item) => item.id).sort()).toEqual(['meetings:edge', 'meetings:today']);
  expect(reminders.find((item) => item.id === 'meetings:today')?.reason).toBe('Rapat hari ini');
  expect(reminders[0].href).toContain('/rapat?bagian=meetings&record=');
});

it('compact reminders keep reasons in expandable details while preserving urgency and source links', () => {
  render(
    <FollowUps
      compact
      data={{
        'work-items': [
          row('reminder', {
            title: 'Tugas pengingat uji',
            due_date: '2000-01-01',
            status: 'rencana',
          }),
        ],
      }}
    />,
  );
  expect(screen.getByText('Perlu perhatian · 1 · 1 mendesak')).toBeTruthy();
  expect(screen.queryByText('Tenggat terlewat')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Rincian (1)' }));
  expect(screen.getByText('Tenggat terlewat')).toBeTruthy();
  expect(
    screen
      .getByRole('link', { name: /Tugas pengingat uji.*Tenggat terlewat/ })
      .getAttribute('href'),
  ).toBe('/tugas?task=reminder');
  fireEvent.click(screen.getByRole('button', { name: 'Ringkas' }));
  expect(screen.queryByText('Tenggat terlewat')).toBeNull();
});
