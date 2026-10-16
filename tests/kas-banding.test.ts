import { expect, it } from 'vitest';
import { kumulatifHarian } from '@/features/dashboard/KasBanding';
import { batasAtas } from '@/components/charts/GrafikLembut';

const kas = (date: string, direction: string, amount: number) => ({ id: date + direction, created_at: '', updated_at: '', data: { date, direction, amount } });

it('menjumlahkan kas kumulatif per tanggal hanya untuk bulan dan arah yang diminta', () => {
  const rows = [kas('2026-10-02', 'keluar', 2_700_000), kas('2026-10-06', 'masuk', 150_000), kas('2026-10-16', 'masuk', 450_000), kas('2026-09-28', 'masuk', 150_000)];
  const masuk = kumulatifHarian(rows, '2026-10-01', 16, 'masuk');
  expect(masuk).toHaveLength(16);
  expect(masuk[4]).toBe(0);
  expect(masuk[5]).toBe(150_000);
  expect(masuk[15]).toBe(600_000);
  expect(kumulatifHarian(rows, '2026-10-01', 16, 'keluar').at(-1)).toBe(2_700_000);
});

it('membulatkan batas atas sumbu ke langkah yang mudah dibaca', () => {
  expect(batasAtas(0)).toBe(4);
  expect(batasAtas(2_325_000)).toBe(2_400_000);
  expect(batasAtas(700_000)).toBe(800_000);
});
