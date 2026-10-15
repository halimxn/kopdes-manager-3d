import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Records } from '@/features/records/Records';
import { meetingJoinUrl } from '@/features/meetings/meeting';
import { catalog, navigation } from '@/features/records/catalog';
import type { Item } from '@/features/records/schemas';

const mocks = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(''),
  useRouter: () => ({ replace: mocks.replace }),
}));
vi.mock('@/lib/client', () => ({ api: vi.fn() }));

const item = (id: string, data: Record<string, unknown>): Item => ({
  id,
  data,
  created_at: '',
  updated_at: '',
});

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it('menu kegiatan dibedakan dari daftar tugas', () => {
  const kegiatan = navigation.find(([href]) => href === '/jurnal');
  const tugas = navigation.find(([href]) => href === '/tugas');
  expect(kegiatan?.[1]).toBe('Kegiatan');
  expect(tugas?.[1]).toBe('Tugas');
  expect(catalog.journal.title).toBe('Kegiatan');
  expect(catalog.journal.fields).toContain('meeting_id');
});

it('tautan gabung rapat hanya sah untuk rapat online/hybrid dengan URL http', () => {
  expect(meetingJoinUrl(undefined)).toBeNull();
  expect(
    meetingJoinUrl(item('m1', { mode: 'tatap muka', meeting_url: 'https://meet.google.com/x' })),
  ).toBeNull();
  expect(meetingJoinUrl(item('m2', { mode: 'online', meeting_url: '' }))).toBeNull();
  expect(meetingJoinUrl(item('m3', { mode: 'online', meeting_url: 'javascript:alert(1)' }))).toBeNull();
  expect(
    meetingJoinUrl(item('m4', { mode: 'hybrid', meeting_url: 'https://meet.google.com/abc' })),
  ).toBe('https://meet.google.com/abc');
});

it('kegiatan menampilkan tautan gabung rapat hanya untuk rapat daring yang valid', async () => {
  const meeting = item('m1', {
    title: 'Rapat pengurus',
    mode: 'online',
    meeting_url: 'https://meet.google.com/abc',
  });
  const journal = item('j1', {
    title: 'Koordinasi gerai',
    date: '2026-10-02',
    notes: 'Hasil rapat',
    work_item_id: 't1',
    meeting_id: 'm1',
  });
  render(
    <Records
      entity="journal"
      workspace={{
        journal: [journal],
        meetings: [meeting],
        'work-items': [item('t1', { title: 'Siapkan rak', due_date: '2026-10-05' })],
      }}
      refresh={vi.fn()}
    />,
  );
  expect(await screen.findByText('Koordinasi gerai')).toBeTruthy();
  expect(screen.getByText(/Siapkan rak/)).toBeTruthy();
  expect(screen.getByRole('link', { name: /Gabung rapat/ }).getAttribute('href')).toBe(
    'https://meet.google.com/abc',
  );
});

it('kegiatan tidak menampilkan tombol rapat untuk pertemuan tatap muka', () => {
  render(
    <Records
      entity="journal"
      workspace={{
        journal: [
          item('j2', {
            title: 'Kunjungan lapangan',
            date: '2026-10-02',
            meeting_id: 'm2',
          }),
        ],
        meetings: [item('m2', { title: 'Rapat fisik', mode: 'tatap muka', meeting_url: '' })],
      }}
      refresh={vi.fn()}
    />,
  );
  expect(screen.queryByRole('link', { name: /Gabung rapat/ })).toBeNull();
});
