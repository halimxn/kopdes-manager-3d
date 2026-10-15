import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { Dashboard } from '@/features/dashboard/Dashboard';
import { TaskCalendar } from '@/features/tasks/TaskCalendar';
import { schemas } from '@/features/records/schemas';
import { today, formatDate } from '@/lib/date';
afterEach(cleanup);
it('beranda memakai jumlah selesai nyata dan filter tenggat', () => {
  const item = (id: string, title: string, status: string, due: string, completed = '') => ({
    id,
    created_at: '',
    updated_at: '',
    data: schemas['work-items'].parse({ title, status, due_date: due, completed_at: completed }),
  });
  render(
    <Dashboard
      data={{
        'work-items': [
          item('one', 'Selesai nyata', 'selesai', today(), today()),
          item('two', 'Terlambat nyata', 'proses', '2020-01-01'),
        ],
      }}
    />,
  );
  fireEvent.click(screen.getByText('Grafik pekerjaan'));
  expect(
    screen.getByRole('group', { name: new RegExp(`${formatDate(today())}: 1 selesai`) }),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Terlambat 1' }));
  expect(within(screen.getByRole('region', { name: 'Tugas pilihan' })).getByRole('link', { name: /Terlambat nyata/ }).getAttribute('href')).toBe(
    '/tugas?task=two',
  );
  expect(within(screen.getByRole('region', { name: 'Tugas pilihan' })).queryByRole('link', { name: /Selesai nyata/ })).toBeNull();
  expect(screen.queryByText('60%')).toBeNull();
}, 15000);
it('kalender mingguan melintasi tahun dan tambah tugas memakai tanggal terpilih', () => {
  const create = vi.fn();
  render(<TaskCalendar items={[]} render={() => null} onCreate={create} />);
  fireEvent.change(screen.getByLabelText('Bulan kalender'), { target: { value: '2026-12' } });
  fireEvent.click(screen.getByRole('button', { name: formatDate('2026-12-31') }));
  fireEvent.click(screen.getByRole('button', { name: 'Minggu' }));
  expect(screen.getByRole('button', { name: formatDate('2027-01-03') })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: `Tambah tugas ${formatDate('2027-01-03')}` }));
  expect(create).toHaveBeenCalledWith('2027-01-03');
  fireEvent.click(screen.getByRole('button', { name: 'Minggu berikutnya' }));
  expect(screen.getByRole('button', { name: formatDate('2027-01-04') })).toBeTruthy();
}, 15000);
it('mode hari hanya menampilkan tugas pada hari tersebut', () => {
  const make = (id: string, due_date: string) => ({
    id,
    created_at: '',
    updated_at: '',
    data: { title: id, due_date, status: 'proses' },
  });
  render(
    <TaskCalendar
      items={[make('hari-ini', today()), make('lama', '2020-01-01')]}
      render={(item) => <p key={item.id}>Agenda {item.id}</p>}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Hari' }));
  expect(screen.getByText('Agenda hari-ini')).toBeTruthy();
  expect(screen.queryByText('Agenda lama')).toBeNull();
});
it('filter proyek dan grafik status/tanggal menampilkan tugas yang sama tanpa status ganda', () => {
  const make = (id: string, status: string, workstream_id: string) => ({
    id,
    created_at: '',
    updated_at: '',
    data: schemas['work-items'].parse({
      title: id,
      status,
      workstream_id,
      due_date: '2020-01-01',
      completed_at: status === 'selesai' ? today() : '',
    }),
  });
  render(
    <Dashboard
      data={{
        workstreams: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            created_at: '',
            updated_at: '',
            data: { title: 'Gerai' },
          },
          {
            id: '22222222-2222-4222-8222-222222222222',
            created_at: '',
            updated_at: '',
            data: { title: 'Administrasi' },
          },
        ],
        'work-items': [
          make('Aktif gerai', 'proses', '11111111-1111-4111-8111-111111111111'),
          make('Selesai gerai', 'selesai', '11111111-1111-4111-8111-111111111111'),
          make('Aktif administrasi', 'proses', '22222222-2222-4222-8222-222222222222'),
        ],
      }}
    />,
  );
  fireEvent.change(screen.getByLabelText('Proyek'), {
    target: { value: '11111111-1111-4111-8111-111111111111' },
  });
  fireEvent.click(screen.getByText('Grafik pekerjaan'));
  expect(within(screen.getByRole('region', { name: 'Tugas pilihan' })).queryByRole('link', { name: /Aktif administrasi/ })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Dikerjakan 1' }));
  expect(within(screen.getByRole('region', { name: 'Tugas pilihan' })).getByRole('link', { name: /Aktif gerai/ })).toBeTruthy();
  expect(within(screen.getByRole('region', { name: 'Tugas pilihan' })).queryByRole('link', { name: /Selesai gerai/ })).toBeNull();
  expect(screen.getByRole('button', { name: 'Dibatalkan 0' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: `${formatDate(today())}: 1 selesai` }));
  expect(within(screen.getByRole('region', { name: 'Tugas pilihan' })).getByRole('link', { name: /Selesai gerai/ })).toBeTruthy();
  expect(within(screen.getByRole('region', { name: 'Tugas pilihan' })).queryByRole('link', { name: /Aktif gerai/ })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Hapus pilihan' }));
  expect(within(screen.getByRole('region', { name: 'Tugas pilihan' })).getByRole('link', { name: /Aktif gerai/ })).toBeTruthy();
});
