'use client';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Batang progres bersegmen ala TaskTrack. Warna mengikuti nada induknya (`data-tone`) bila ada,
 * selain itu warna aksen.
 */
export function SegmentBar({
  value,
  segments = 8,
  label,
  className,
  onTone,
}: {
  value: number;
  segments?: number;
  label?: string;
  className?: string;
  /** Di atas kartu pastel: ruas kosong putih seperti acuan. */
  onTone?: boolean;
}) {
  // Ruas terakhir bisa terisi sebagian (70% = lima ruas dan setengah ruas), seperti batang TaskTrack.
  const exact = (Math.max(0, Math.min(100, value)) / 100) * segments;
  // Isi mengalir dari ruas pertama: tampil mulai 0, lalu tiap ruas menunggu ruas sebelumnya penuh.
  const [fill, setFill] = useState({ from: 0, to: 0 });
  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      setFill((current) => ({ from: current.to, to: exact })),
    );
    return () => cancelAnimationFrame(frame);
  }, [exact]);
  const fills = (amount: number) =>
    Array.from({ length: segments }, (_, index) => Math.max(0, Math.min(1, amount - index)));
  const before = fills(fill.from);
  const after = fills(fill.to);
  // Mengisi berurutan dari kiri, mengosongkan dari kanan; satu ruas penuh 180 ms.
  const filling = fill.to >= fill.from;
  const timing: { delay: number; duration: number }[] = [];
  let elapsed = 0;
  for (let step = 0; step < segments; step++) {
    const index = filling ? step : segments - 1 - step;
    const duration = Math.abs(after[index] - before[index]) * 180;
    timing[index] = { delay: elapsed, duration };
    elapsed += duration;
  }
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn('flex h-[5px] gap-1', className)}
    >
      {Array.from({ length: segments }, (_, index) => {
        return (
          <span
            key={index}
            className={cn(
              'relative flex-1 overflow-hidden rounded-full',
              onTone
                ? 'bg-surface/80'
                : 'bg-[color-mix(in_srgb,var(--tone-bar,var(--ink-3))_22%,transparent)]',
            )}
          >
            <span
              className="absolute inset-y-0 left-0 rounded-full bg-[var(--tone-bar,var(--accent-strong))] transition-[width] ease-linear"
              style={{
                width: `${after[index] * 100}%`,
                transitionDuration: `${timing[index].duration}ms`,
                transitionDelay: `${timing[index].delay}ms`,
              }}
            />
          </span>
        );
      })}
    </div>
  );
}

export function Bar({
  value,
  className,
  label,
}: {
  value: number;
  className?: string;
  label?: string;
}) {
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn('h-2 overflow-hidden rounded-full bg-surface-3', className)}
    >
      <span
        className="block h-full rounded-full bg-[var(--tone-bar,var(--accent-strong))] transition-[width] duration-700 ease-out"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

/**
 * Cincin persen (kartu proyek, acuan dashboard): busur warna nada induk yang terisi saat muncul,
 * angka persen di tengah.
 */
export function Ring({
  value,
  size = 44,
  label,
  className,
}: {
  value: number;
  size?: number;
  label?: string;
  className?: string;
}) {
  const r = 16;
  const length = 2 * Math.PI * r;
  const percent = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <span
      role="img"
      aria-label={label ?? `${percent}%`}
      className={cn('relative grid shrink-0 place-items-center', className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 40 40" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="20" cy="20" r={r} fill="none" strokeWidth="3.5" className="stroke-line" />
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={length}
          strokeDashoffset={length * (1 - percent / 100)}
          className="animate-[ring-fill_0.9s_var(--ease-out)_backwards] stroke-[var(--tone-bar,var(--accent-strong))]"
          style={{ ['--ring-length' as string]: `${length}` }}
        />
      </svg>
      <span className="tabular relative text-[11px] font-extrabold text-ink">{percent}%</span>
    </span>
  );
}

/** Setengah donat (acuan "69% of target"): busur atas terisi sesuai persen, angka di bawahnya. */
export function HalfDonut({ value, label }: { value: number; label: string }) {
  const r = 52;
  const length = Math.PI * r;
  const percent = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <span
      role="img"
      aria-label={`${label}: ${percent}%`}
      className="relative block w-full max-w-[220px]"
    >
      <svg viewBox="0 0 120 66" className="block w-full" aria-hidden="true">
        <path
          d="M8 60a52 52 0 0 1 104 0"
          fill="none"
          strokeWidth="12"
          strokeLinecap="round"
          className="stroke-surface-3"
        />
        <path
          d="M8 60a52 52 0 0 1 104 0"
          fill="none"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={length}
          strokeDashoffset={length * (1 - percent / 100)}
          className="animate-[ring-fill_1.1s_var(--ease-out)_0.15s_backwards] stroke-accent-strong"
          style={{ ['--ring-length' as string]: `${length}` }}
        />
      </svg>
    </span>
  );
}
