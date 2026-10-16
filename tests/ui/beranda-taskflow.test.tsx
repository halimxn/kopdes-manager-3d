import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { KartuPekerjaan } from '@/features/dashboard/KartuPekerjaan';
import { KalenderMini } from '@/features/dashboard/KalenderMini';
import { Dashboard } from '@/features/dashboard/Dashboard';
import { schemas } from '@/features/records/schemas';
import { today } from '@/lib/date';

const P1 = 'c0de0000-0000-4000-8000-000000000001';
vi.mock('@/lib/client', () => ({ api: vi.fn(async () => ({ items: [], hasMore: false, nextOffset: 0 })) }));
afterEach(cleanup);

it('kartu pekerjaan menampilkan judul, progres bertulis, dan tautan', () => {
  render(<KartuPekerjaan judul="Siapkan rak gerai" hub="usaha" href="/tugas?task=1" progres={40} tenggat="20 Okt" />);
  expect(screen.getByRole('link', { name: /Siapkan rak gerai/ }).getAttribute('href')).toBe('/tugas?task=1');
  expect(screen.getByText('40%')).toBeTruthy();
  expect(screen.getByText(/20 Okt/)).toBeTruthy();
});

it('kartu tanpa progres menulis "Belum dinilai", bukan 0%', () => {
  render(<KartuPekerjaan judul="Rapat pengurus" hub="catatan" href="/rapat" progres={null} />);
  expect(screen.getByText('Belum dinilai')).toBeTruthy();
  expect(screen.queryByText('0%')).toBeNull();
});

it('kalender mini menandai tanggal berkegiatan dengan teks yang dapat dibaca', () => {
  render(<KalenderMini tanggal="2026-10-16" tandai={['2026-10-20']} />);
  expect(screen.getByRole('table', { name: 'Oktober 2026' })).toBeTruthy();
  expect(screen.getByLabelText('20 Oktober, ada kegiatan')).toBeTruthy();
  expect(screen.getByLabelText('16 Oktober, hari ini')).toBeTruthy();
});

it('kalender mini memulai minggu pada Senin', () => {
  // 1 Oktober 2026 jatuh pada Kamis: tiga sel kosong (Sen–Rab) sebelum tanggal 1.
  render(<KalenderMini tanggal="2026-10-16" tandai={[]} />);
  const barisPertama = screen.getAllByRole('row')[1];
  const sel = within(barisPertama).getAllByRole('cell');
  expect(sel.slice(0, 3).every((td) => td.textContent === '')).toBe(true);
  expect(sel[3].textContent).toBe('1');
});

it('Beranda menempatkan kalender mini dan agenda di panel kanan, kartu proyek di Pekerjaan berjalan', () => {
  const now = today();
  const { container } = render(
    <Dashboard
      data={{
        workstreams: [{ id: P1, created_at: '', updated_at: '', data: { title: 'Gerai sembako', status: 'aktif', code: 'GS' } }],
        'work-items': [
          {
            id: 't1',
            created_at: '',
            updated_at: '',
            data: schemas['work-items'].parse({ title: 'Susun rak', workstream_id: P1, status: 'selesai', due_date: now }),
          },
        ],
      }}
    />,
  );
  const panel = container.querySelector('aside.panel-kanan')!;
  expect(panel).toBeTruthy();
  expect(within(panel as HTMLElement).getByRole('table')).toBeTruthy();
  expect(panel.querySelector('.dashboard-routines')).toBeTruthy();
  const berjalan = screen.getByRole('region', { name: 'Pekerjaan berjalan' });
  const kartu = within(berjalan).getByRole('link', { name: /Gerai sembako/ });
  expect(kartu.getAttribute('href')).toBe('/proyek?id=' + P1);
  expect(within(kartu).getByText('100%')).toBeTruthy();
});
