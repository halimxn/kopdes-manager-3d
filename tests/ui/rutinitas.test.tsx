import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Dashboard } from '@/features/dashboard/Dashboard';

afterEach(() => { cleanup(); localStorage.clear(); vi.useRealTimers(); });

it('rutinitas berikutnya mengikuti WIB, centang tersimpan, dan jam yang lewat diperbarui', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-13T01:29:00Z'));
  localStorage.clear();
  const view = render(<Dashboard data={{}} preferenceScope="audit-rutin-" />);
  expect(screen.getByText('Berikutnya').closest('li')?.textContent).toContain('Briefing singkat');
  act(() => vi.advanceTimersByTime(120_000));
  expect(screen.getByText('Berikutnya').closest('li')?.textContent).toContain('Cek persediaan');
  const briefing = screen.getByRole('checkbox', { name: /Briefing singkat/ });
  fireEvent.click(briefing);
  expect((briefing as HTMLInputElement).checked).toBe(true);
  expect(screen.getByText('1/6')).toBeTruthy();
  view.unmount();
  render(<Dashboard data={{}} preferenceScope="audit-rutin-" />);
  expect((screen.getByRole('checkbox', { name: /Briefing singkat/ }) as HTMLInputElement).checked).toBe(true);
  expect(screen.getByText('1/6')).toBeTruthy();
});
