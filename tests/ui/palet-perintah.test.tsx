import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { WorkspaceSearch, tautanBuatTugas } from '@/features/workspace/WorkspaceSearch';

const baris = (id: string, data: Record<string, unknown>) => ({ id, created_at: '', updated_at: '', data });
const workspace = {
  staff: [baris('s1', { title: 'Budi Darma' })],
  workstreams: [baris('p1', { title: 'Gerai sembako' })],
};
afterEach(cleanup);

it('kalimat tugas menjadi tautan form tugas terisi', () => {
  const url = new URL(tautanBuatTugas('Cek stok @budi #gerai !tinggi', workspace), 'http://x');
  expect(url.pathname).toBe('/tugas');
  expect(url.searchParams.get('baru')).toBe('1');
  expect(url.searchParams.get('isi.title')).toBe('Cek stok');
  expect(url.searchParams.get('isi.assignee')).toBe('Budi Darma');
  expect(url.searchParams.get('isi.workstream_id')).toBe('p1');
  expect(url.searchParams.get('isi.priority')).toBe('tinggi');
});

it('palet menawarkan Buat tugas dan perintah yang cocok dengan kata kunci', () => {
  render(<WorkspaceSearch workspace={workspace} onNavigate={vi.fn()} />);
  expect(screen.getByRole('link', { name: 'Jadwalkan agenda' }).getAttribute('href')).toBe('/rapat?baru=1');
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'catat' } });
  expect(screen.getByRole('link', { name: /Buat tugas: catat/ })).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Catat kegiatan' })).toBeTruthy();
  expect(screen.queryByRole('link', { name: 'Jadwalkan agenda' })).toBeNull();
});

it('panah bawah dan atas memindah fokus antara kolom cari dan hasil', () => {
  render(<WorkspaceSearch workspace={workspace} onNavigate={vi.fn()} />);
  const kolom = screen.getByRole('searchbox');
  kolom.focus();
  fireEvent.keyDown(kolom, { key: 'ArrowDown' });
  expect(document.activeElement?.textContent).toContain('Tambah tugas');
  fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
  expect(document.activeElement?.textContent).toContain('Jadwalkan agenda');
  fireEvent.keyDown(document.activeElement!, { key: 'ArrowUp' });
  fireEvent.keyDown(document.activeElement!, { key: 'ArrowUp' });
  expect(document.activeElement).toBe(kolom);
});
