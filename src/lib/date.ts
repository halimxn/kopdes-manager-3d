export function today(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
export function addDays(value: string, amount: number): string {
  const date = new Date(value + 'T12:00:00Z');
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
/** Rentang satu bulan kalender; `geser` -1 = bulan lalu. Akhir bulan berjalan dibatasi `sampai` (hari ini). */
export function monthRange(value: string, geser = 0, sampai = value): { start: string; end: string; label: string } {
  const awal = new Date(value.slice(0, 7) + '-01T12:00:00Z');
  awal.setUTCMonth(awal.getUTCMonth() + geser);
  const start = awal.toISOString().slice(0, 10);
  const akhirBulan = new Date(awal);
  akhirBulan.setUTCMonth(akhirBulan.getUTCMonth() + 1, 0);
  const end = akhirBulan.toISOString().slice(0, 10);
  const label = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(awal);
  return { start, end: end > sampai ? sampai : end, label };
}
/** Tujuh tanggal Senin–Minggu dari pekan yang memuat `value` (pekan Indonesia dimulai Senin). */
export function hariSeminggu(value: string): string[] {
  const hari = new Date(value + 'T12:00:00Z').getUTCDay();
  const senin = addDays(value, -((hari + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => addDays(senin, i));
}
export function daysBetween(start: string, end: string): number {
  return Math.round((Date.parse(end + 'T12:00:00Z') - Date.parse(start + 'T12:00:00Z')) / 86400000);
}
export function nextOccurrence(value: string, recurrence: string): string {
  if (recurrence === 'harian') return addDays(value, 1);
  if (recurrence === 'mingguan') return addDays(value, 7);
  const current = new Date(value + 'T12:00:00Z');
  const day = current.getUTCDate();
  current.setUTCDate(1);
  current.setUTCMonth(current.getUTCMonth() + 1);
  const last = new Date(
    Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, 0),
  ).getUTCDate();
  current.setUTCDate(Math.min(day, last));
  return current.toISOString().slice(0, 10);
}
export function formatDate(value?: string | null): string {
  if (!value || value === 'undefined' || value === 'null') {
    return 'Belum ditentukan';
  }
  const dateStr = value.length === 10 ? value + 'T12:00:00Z' : value;
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) {
    return 'Belum ditentukan';
  }
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
}

export function formatDateTime(value?: string | null): string {
  const parsed = value ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return '—';
  return (
    new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      dateStyle: 'medium',
      timeStyle: 'short',
      hourCycle: 'h23',
    }).format(parsed) + ' WIB'
  );
}
