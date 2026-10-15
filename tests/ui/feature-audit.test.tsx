import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Reports, type Report } from '@/features/reports/Reports';
import { reportSnapshot } from '@/features/reports/report-snapshot';
import { Records } from '@/features/records/Records';
import { CsvDropzone } from '@/components/ui/CsvDropzone';

const api = vi.hoisted(() => vi.fn());
vi.mock('@/lib/client', () => ({ api }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});
beforeEach(() => {
  api.mockReset();
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(cleanup);
const report = (id: string): Report => ({
  id,
  title: `Laporan ${id}`,
  period_start: '2026-10-01',
  period_end: '2026-10-07',
  snapshot: { ...reportSnapshot({}, '2026-10-01', '2026-10-07'), notes: `Catatan ${id}` },
});

it('laporan membedakan memuat, kosong, dan galat serta dapat dicoba ulang', async () => {
  let resolve!: (rows: Report[]) => void;
  api.mockReturnValueOnce(
    new Promise<Report[]>((done) => {
      resolve = done;
    }),
  );
  const view = render(<Reports />);
  expect(screen.getByText('Memuat laporan…')).toBeTruthy();
  expect(screen.queryByText(/Belum ada laporan tersimpan/)).toBeNull();
  await act(async () => resolve([]));
  expect(screen.getByText(/Belum ada laporan tersimpan/)).toBeTruthy();
  view.unmount();
  api
    .mockRejectedValueOnce(new Error('Jaringan terputus'))
    .mockResolvedValueOnce([report('pulih')]);
  render(<Reports />);
  await screen.findByText('Jaringan terputus');
  expect(screen.queryByText(/Belum ada laporan tersimpan/)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Coba muat laporan lagi' }));
  await screen.findByText('Catatan pulih');
  expect(screen.queryByText('Jaringan terputus')).toBeNull();
});

it('laporan lama dapat dimuat setelah 100 laporan tanpa kehilangan dokumen pilihan', async () => {
  api
    .mockResolvedValueOnce(Array.from({ length: 100 }, (_, index) => report(String(index))))
    .mockResolvedValueOnce([report('lama')]);
  render(<Reports />);
  fireEvent.click(await screen.findByText('Muat laporan lebih lama'));
  await screen.findByText('Laporan lama');
  expect(api).toHaveBeenLastCalledWith('reports?offset=100', undefined, 'GET', {
    bypassCache: true,
  });
  expect(screen.getByText('Catatan 0')).toBeTruthy();
  expect(screen.queryByText('Muat laporan lebih lama')).toBeNull();
});

it('dokumen arsip dapat dipilih dengan Enter dan Spasi', () => {
  render(<Reports previewReports={[report('satu'), report('dua')]} />);
  fireEvent.keyDown(screen.getByRole('button', { name: /Laporan dua/ }), { key: 'Enter' });
  expect(screen.getByText('Catatan dua')).toBeTruthy();
  fireEvent.keyDown(screen.getByRole('button', { name: /Laporan satu/ }), { key: ' ' });
  expect(screen.getByText('Catatan satu')).toBeTruthy();
});

it('CSV tugas menyimpan judul berkoma dan tidak mengirim kolom date yang tidak sah', async () => {
  api.mockResolvedValue({});
  const refresh = vi.fn().mockResolvedValue(undefined);
  render(<Records entity="work-items" workspace={{}} refresh={refresh} />);
  fireEvent.click(screen.getByRole('button', { name: 'Impor CSV' }));
  expect(screen.getByRole('button', { name: 'Unduh format CSV' })).toBeTruthy();
  fireEvent.change(await screen.findByLabelText('Berkas CSV'), {
    target: {
      files: [
        new File(
          ['title,due_date,description\n"Rapat, gudang",2026-10-13,"Catatan ""baru"""'],
          'tugas.csv',
          { type: 'text/csv' },
        ),
      ],
    },
  });
  await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
  expect(api).toHaveBeenCalledWith('work-items', {
    data: expect.objectContaining({
      title: 'Rapat, gudang',
      description: 'Catatan "baru"',
      due_date: '2026-10-13',
    }),
  });
  expect(api.mock.calls[0][1].data).not.toHaveProperty('date');
});

it('CSV dengan baris kedua rusak tidak menyimpan baris pertama', async () => {
  render(<Records entity="work-items" workspace={{}} refresh={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Impor CSV' }));
  fireEvent.change(screen.getByLabelText('Berkas CSV'), {
    target: {
      files: [
        new File(['title,due_date\nBaik,2026-10-13\nRusak,bukan-tanggal'], 'tugas.csv', {
          type: 'text/csv',
        }),
      ],
    },
  });
  await screen.findByText(/0 dari 2 baris tersimpan/);
  expect(api).not.toHaveBeenCalled();
});

it('CSV yang gagal di jaringan melaporkan baris tersimpan dan memuat ulang daftar', async () => {
  api.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('Jaringan putus'));
  const refresh = vi.fn().mockResolvedValue(undefined);
  render(<Records entity="work-items" workspace={{}} refresh={refresh} />);
  fireEvent.click(screen.getByRole('button', { name: 'Impor CSV' }));
  fireEvent.change(screen.getByLabelText('Berkas CSV'), {
    target: { files: [new File(['title\nSatu\nDua\nTiga'], 'tugas.csv', { type: 'text/csv' })] },
  });
  await screen.findByText(/1 dari 3 baris tersimpan/);
  expect(api).toHaveBeenCalledTimes(2);
  expect(refresh).toHaveBeenCalledOnce();
});

it('pemilih CSV dapat digunakan lewat keyboard dan menolak berkas lebih dari 5 MB', async () => {
  const parsed = vi.fn();
  render(<CsvDropzone onDataParsed={parsed} />);
  const input = screen.getByLabelText('Berkas CSV') as HTMLInputElement;
  const click = vi.spyOn(input, 'click').mockImplementation(() => {});
  fireEvent.keyDown(screen.getByRole('button', { name: 'Pilih berkas CSV' }), { key: 'Enter' });
  expect(click).toHaveBeenCalledOnce();
  const file = new File(['title\nData'], 'besar.csv', { type: 'text/csv' });
  Object.defineProperty(file, 'size', { value: 5_000_001 });
  fireEvent.change(input, { target: { files: [file] } });
  await screen.findByText('Berkas CSV maksimal 5 MB.');
  expect(parsed).not.toHaveBeenCalled();
});
