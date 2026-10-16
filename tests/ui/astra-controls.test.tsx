import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/Button';
import { DateInput } from '@/components/ui/DateField';
import { BottomNav } from '@/components/ui/BottomNav';
import { Badge } from '@/components/ui/Badge';
afterEach(cleanup);

it('tombol loading mencegah pengiriman ganda dan menyatakan status proses', () => {
  const save = vi.fn();
  render(<Button loading onClick={save}>Simpan</Button>);
  const button = screen.getByRole('button');
  fireEvent.click(button);
  expect(save).not.toHaveBeenCalled();
  expect(button.getAttribute('aria-busy')).toBe('true');
});
it('tanggal memakai satu pemicu dan mempertahankan validasi form native', () => {
  const { container } = render(<form><DateInput name="date" label="Tanggal" required /></form>);
  const native = container.querySelector('input')!;
  expect(native.className).toBe('ui-date-native');
  expect(native.tabIndex).toBe(-1);
  expect(native.required).toBe(true);
  fireEvent.invalid(native);
  expect(screen.getByRole('group', { name: 'Kalender Tanggal' })).toBeTruthy();
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Pilih tanggal' }));
});
it('dock memiliki lima item dan aksi/menu dapat dioperasikan', () => {
  const action = vi.fn(), menu = vi.fn();
  render(<BottomNav path="/tugas" calendar={false} menu={true} onAction={action} onMenu={menu} />);
  expect(screen.getByRole('navigation').children).toHaveLength(5);
  expect(screen.getByRole('link', { name: 'Pekerjaan' }).getAttribute('aria-current')).toBe('page');
  expect(screen.getByRole('link', { name: 'Dunia' }).getAttribute('href')).toBe('/dunia-koperasi');
  fireEvent.click(screen.getByRole('button', { name: 'Tambah catatan' }));
  fireEvent.click(screen.getByRole('button', { name: 'Semua halaman' }));
  expect(action).toHaveBeenCalledOnce();
  expect(menu).toHaveBeenCalledOnce();
});
it('badge tetap menyatakan status dengan teks', () => {
  render(<Badge tone="danger">Lewat 1 hari</Badge>);
  expect(screen.getByText('Lewat 1 hari').getAttribute('data-tone')).toBe('danger');
});
