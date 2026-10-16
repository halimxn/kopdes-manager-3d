import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Progress } from '@/components/ui/Progress';
afterEach(cleanup);

it('progres dengan angka menuliskan label dan persen', () => {
  render(<Progress value={40} label="Progres" tampilkanAngka />);
  expect(screen.getByText('Progres')).toBeTruthy();
  expect(screen.getByText('40%')).toBeTruthy();
  expect(screen.getByRole('progressbar', { name: 'Progres' }).getAttribute('aria-valuenow')).toBe('40');
});

it('progres belum dinilai tidak ditulis sebagai 0%', () => {
  render(<Progress value={null} label="Progres" tampilkanAngka />);
  expect(screen.getByText('Belum dinilai')).toBeTruthy();
  expect(screen.queryByText('0%')).toBeNull();
});

it('tanpa tampilkanAngka hanya bilah yang dirender', () => {
  const { container } = render(<Progress value={40} label="Progres" />);
  expect(container.firstElementChild?.getAttribute('role')).toBe('progressbar');
  expect(screen.queryByText('40%')).toBeNull();
});
