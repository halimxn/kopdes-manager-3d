import type { Item } from '@/features/records/schemas';
import { addDays } from '@/lib/date';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/**
 * Jumlah tugas selesai per tujuh hari, minggu terakhir berakhir pada `date`. Menjawab "membaik atau
 * tidak"; tugas tanpa tanggal selesai tidak dihitung, bukan ditebak.
 */
export function weeklyDone(tasks: Item[], date: string, weeks: number) {
  return Array.from({ length: weeks }, (_, index) => {
    const end = addDays(date, -7 * (weeks - 1 - index));
    const start = addDays(end, -6);
    const value = tasks.filter((task) => {
      const done = String(task.data.completed_at || '').slice(0, 10);
      return task.data.status === 'selesai' && done >= start && done <= end;
    }).length;
    return { label: `${Number(end.slice(8))} ${MONTHS[Number(end.slice(5, 7)) - 1]}`, value };
  });
}
