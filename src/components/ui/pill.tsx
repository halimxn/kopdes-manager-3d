import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

const TONES = {
  // Tema gelap: lencana penuh seperti acuan; tema terang: lembut.
  plan: 'bg-plan text-plan-ink dark:bg-plan-bar dark:text-on-bar',
  doing: 'bg-doing text-doing-ink dark:bg-doing-bar dark:text-on-bar',
  done: 'bg-done text-done-ink dark:bg-done-bar dark:text-on-bar',
  late: 'bg-late text-late-ink dark:bg-late-bar dark:text-on-bar',
  warn: 'bg-warn text-warn-ink dark:bg-warn-bar dark:text-on-bar',
  accent: 'bg-accent text-accent-ink',
  neutral: 'bg-surface-3 text-ink-2',
  outline: 'border border-current/30 bg-transparent',
} as const;
export type PillTone = keyof typeof TONES;

export function Pill({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: PillTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-semibold whitespace-nowrap [&_svg]:size-3.5',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Status catatan apa pun → nada pill; status selesai/terlambat selalu berwarna sama di semua halaman. */
export function statusTone(status: unknown): PillTone {
  const value = String(status || '');
  if (
    ['selesai', 'hadir', 'diterima', 'tersedia', 'aktif', 'siap buka', 'ditutup', 'baik'].includes(
      value,
    )
  )
    return 'done';
  if (
    [
      'proses',
      'dikirim',
      'tiba',
      'diperiksa',
      'ditangani',
      'diproses',
      'dipesan',
      'persiapan',
      'siap uji',
      'ditunjuk',
    ].includes(value)
  )
    return 'doing';
  if (['alpa', 'rusak', 'dibatalkan', 'terbuka', 'terlambat', 'belum ada', 'sakit'].includes(value))
    return 'late';
  if (['ditunda', 'izin', 'cuti', 'perlu perbaikan', 'draf', 'nonaktif'].includes(value))
    return 'warn';
  return 'plan';
}
