import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PilihPenanggung, calonPenanggung } from '@/features/records/PilihPenanggung';

const orang = (id: string, data: Record<string, unknown>) => ({ id, created_at: '', updated_at: '', data });
const staf = [
  orang('s1', { title: 'Budi Darma', role: 'Kasir', status: 'aktif' }),
  orang('s2', { title: 'Ayu Rahma', role: '', status: 'ditunjuk' }),
  orang('s3', { title: 'Dodi Lama', role: 'Gudang', status: 'nonaktif' }),
];
afterEach(cleanup);

it('calon penanggung jawab: manajer, lalu Tim yang tidak nonaktif, lalu nama lama di luar Tim', () => {
  expect(calonPenanggung(staf, 'Slamet', 'Pak Joko')).toEqual([
    { nama: 'Slamet', peran: 'Manajer' },
    { nama: 'Budi Darma', peran: 'Kasir' },
    { nama: 'Ayu Rahma', peran: 'Tim' },
    { nama: 'Pak Joko', peran: 'Tidak ada di Tim' },
  ]);
  // Nama tersimpan yang sudah ada di Tim tidak digandakan, meski beda huruf besar-kecil.
  expect(calonPenanggung(staf, '', 'budi darma').map((c) => c.nama)).toEqual(['Budi Darma', 'Ayu Rahma']);
});

it('pemilih mengirim nama orang yang dipilih lewat radio assignee', () => {
  const { container } = render(
    <form>
      <PilihPenanggung id="pj" label="Penanggung jawab" nilai="budi darma" staf={staf} manajer="Slamet" />
    </form>,
  );
  const form = container.querySelector('form')!;
  expect(new FormData(form).get('assignee')).toBe('Budi Darma');
  fireEvent.click(screen.getByRole('radio', { name: /Ayu Rahma/ }));
  expect(new FormData(form).get('assignee')).toBe('Ayu Rahma');
  fireEvent.click(screen.getByRole('radio', { name: /Belum ada/ }));
  expect(new FormData(form).get('assignee')).toBe('');
  expect(screen.queryByRole('radio', { name: /Dodi Lama/ })).toBeNull();
});

it('Tim kosong menampilkan petunjuk menambah anggota', () => {
  render(<PilihPenanggung id="pj" label="Penanggung jawab" nilai="" staf={[]} manajer="" />);
  expect(screen.getByRole('link', { name: 'Tambah anggota Tim' }).getAttribute('href')).toBe('/tim?baru=1');
});
