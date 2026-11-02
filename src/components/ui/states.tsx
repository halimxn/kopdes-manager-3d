import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

/** Keadaan kosong: satu kalimat jelas dan paling banyak satu tindakan, tanpa angka palsu. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-[var(--radius-card)] border border-dashed border-line-strong px-6 py-10 text-center',
        className,
      )}
    >
      {icon && (
        <span className="grid size-14 place-items-center rounded-full bg-accent text-accent-ink [&_svg]:size-6">
          {icon}
        </span>
      )}
      <p className="text-base font-bold text-ink">{title}</p>
      {description && <p className="max-w-sm text-sm text-ink-3">{description}</p>}
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      className={cn('block animate-pulse rounded-2xl bg-surface-3', className)}
      aria-hidden="true"
    />
  );
}

/** Galat memuat data: tampil apa adanya, tidak pernah menjadi angka nol. */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-[var(--radius-card)] bg-late p-5 text-late-ink"
    >
      <p className="font-bold">Data belum dapat dimuat</p>
      <p className="text-sm">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full bg-surface-solid px-4 py-2 text-sm font-medium text-ink"
        >
          Coba lagi
        </button>
      )}
    </div>
  );
}

/** Pemberitahuan modul yang butuh migrasi; menjelaskan alasan, bukan menampilkan daftar kosong. */
export function Notice({
  children,
  tone = 'warn',
}: {
  children: ReactNode;
  tone?: 'warn' | 'doing';
}) {
  return (
    <p
      role="status"
      className={cn(
        'rounded-2xl px-4 py-3 text-sm font-semibold',
        tone === 'warn' ? 'bg-warn text-warn-ink' : 'bg-doing text-doing-ink',
      )}
    >
      {children}
    </p>
  );
}
