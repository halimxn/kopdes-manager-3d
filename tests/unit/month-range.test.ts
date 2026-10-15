import { expect, it } from 'vitest';
import { monthRange } from '@/lib/date';

it('rentang bulan berjalan berhenti di hari ini dan bulan lalu penuh', () => {
  expect(monthRange('2026-10-15')).toEqual({ start: '2026-10-01', end: '2026-10-15', label: 'Oktober 2026' });
  expect(monthRange('2026-03-31', -1)).toEqual({ start: '2026-02-01', end: '2026-02-28', label: 'Februari 2026' });
  expect(monthRange('2026-01-10', -1).start).toBe('2025-12-01');
});
