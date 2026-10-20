import { beforeEach, describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { Dashboard } from '@/features/dashboard/Dashboard';
import { Records } from '@/features/records/Records';
import { schemas } from '@/features/records/schemas';
import { Projects } from '@/features/projects/Projects';
const mocks = vi.hoisted(() => ({ api: vi.fn(), replace: vi.fn() }));
vi.mock('@/lib/client', () => ({ api: mocks.api }));
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: mocks.replace }),
}));
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);
describe('Alur kerja dasar UI', () => {
  it('proyek menampilkan progres tugas terkait tanpa mencampur proyek lain', () => {
    const projectId = '7fd6a2ac-dc55-48bc-abd8-f0e4c76b00a5';
    const item = (id: string, data: Record<string, unknown>) => ({
      id,
      data,
      created_at: '',
      updated_at: '',
    });
    render(
      <Projects
        refresh={vi.fn()}
        data={{
          workstreams: [
            item(projectId, schemas.workstreams.parse({ title: 'Persiapan gerai', code: 'PG' })),
          ],
          'work-items': [
            item(
              'one',
              schemas['work-items'].parse({
                title: 'SOP',
                due_date: '2026-10-01',
                status: 'selesai',
                workstream_id: projectId,
              }),
            ),
            item(
              'two',
              schemas['work-items'].parse({ title: 'Di luar proyek', due_date: '2026-10-01' }),
            ),
          ],
        }}
      />,
    );
    expect(screen.getByRole('link', { name: /Persiapan gerai/ }).getAttribute('href')).toBe(
      `/proyek?id=${projectId}`,
    );
    expect(screen.getByText('1 / 1 tugas selesai')).toBeTruthy();
  });
  it('daftar tugas proyek hanya menampilkan tugas dalam lingkup dan dapat difilter prioritas', () => {
    const data = (title: string, workstream_id: string, priority = 'normal') =>
      schemas['work-items'].parse({ title, workstream_id, priority, due_date: '2026-10-01' });
    const id = '7fd6a2ac-dc55-48bc-abd8-f0e4c76b00a5';
    render(
      <Records
        entity="work-items"
        scopeId={id}
        refresh={vi.fn()}
        workspace={{
          'work-items': [
            { id: 'one', data: data('SOP utama', id, 'mendesak'), created_at: '', updated_at: '' },
            { id: 'two', data: data('Baca dokumen', id), created_at: '', updated_at: '' },
            { id: 'three', data: data('Proyek lain', ''), created_at: '', updated_at: '' },
          ],
        }}
      />,
    );
    expect(screen.queryByText('Proyek lain')).toBeNull();
    fireEvent.change(screen.getByLabelText('Prioritas', { exact: true }), {
      target: { value: 'mendesak' },
    });
    expect(screen.getByText('SOP utama')).toBeTruthy();
    expect(screen.queryByText('Baca dokumen')).toBeNull();
  });
  it('dashboard kosong mengajak membuat proyek tanpa mengarang capaian', () => {
    render(<Dashboard data={{}} />);
    expect(screen.getByText('Belum ada proyek')).toBeTruthy();
    expect(screen.getByRole('link', { name: /0 terlambat/ })).toBeTruthy();
    expect(screen.getByRole('link', { name: /0 jatuh tempo hari ini/ })).toBeTruthy();
  });
  it('aksi selesai mengirim status dan tanggal penyelesaian yang valid', async () => {
    mocks.api.mockResolvedValue({});
    const refresh = vi.fn().mockResolvedValue(undefined);
    const data = schemas['work-items'].parse({ title: 'Tinjau dokumen', due_date: '2026-10-01' });
    render(
      <Records
        entity="work-items"
        workspace={{
          'work-items': [
            { id: '7fd6a2ac-dc55-48bc-abd8-f0e4c76b00a5', data, created_at: '', updated_at: '' },
          ],
        }}
        refresh={refresh}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Selesai' }));
    await waitFor(() =>
      expect(mocks.api).toHaveBeenCalledWith(
        'work-items',
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'selesai',
            completed_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
          }),
        }),
      ),
    );
    expect(refresh).toHaveBeenCalledOnce();
  });
  it('penyimpanan gagal menampilkan pesan dan tidak mengklaim berhasil', async () => {
    mocks.api.mockRejectedValue(new Error('Koneksi terputus'));
    const refresh = vi.fn();
    const data = schemas.checklist.parse({ title: 'SOP disetujui' });
    render(
      <Records
        entity="checklist"
        workspace={{
          checklist: [
            { id: '7fd6a2ac-dc55-48bc-abd8-f0e4c76b00a5', data, created_at: '', updated_at: '' },
          ],
        }}
        refresh={refresh}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Selesai' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Koneksi terputus'));
    expect(refresh).not.toHaveBeenCalled();
  });
});
it('tambah tugas memahami @nama, !prioritas, dan kata waktu tanpa membuka form', async () => {
  mocks.api.mockResolvedValue({});
  render(
    <Records
      entity="work-items"
      workspace={{ staff: [{ id: 's1', created_at: '', updated_at: '', data: { title: 'Budi Darma' } }] }}
      refresh={vi.fn().mockResolvedValue(undefined)}
    />,
  );
  const input = screen.getByLabelText('Tulis tugas baru');
  fireEvent.change(input, { target: { value: 'Cek timbangan @budi !tinggi' } });
  fireEvent.submit(input.closest('form')!);
  await waitFor(() =>
    expect(mocks.api).toHaveBeenCalledWith(
      'work-items',
      expect.objectContaining({
        data: expect.objectContaining({ title: 'Cek timbangan', assignee: 'Budi Darma', priority: 'tinggi' }),
      }),
    ),
  );
});
it('tambah tugas langsung menyimpan judul dan mempertahankan lingkup proyek', async () => {
  mocks.api.mockResolvedValue({});
  const scope = '7fd6a2ac-dc55-48bc-abd8-f0e4c76b00a5';
  render(
    <Records
      entity="work-items"
      workspace={{}}
      scopeId={scope}
      refresh={vi.fn().mockResolvedValue(undefined)}
    />,
  );
  const input = screen.getByLabelText('Tulis tugas baru');
  fireEvent.change(input, { target: { value: 'Hubungi pemasok' } });
  fireEvent.submit(input.closest('form')!);
  await waitFor(() =>
    expect(mocks.api).toHaveBeenCalledWith(
      'work-items',
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Hubungi pemasok',
          workstream_id: scope,
          status: 'rencana',
        }),
      }),
    ),
  );
  await waitFor(() => expect((input as HTMLInputElement).value).toBe(''));
});
