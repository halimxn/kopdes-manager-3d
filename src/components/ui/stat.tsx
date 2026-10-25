'use client';
import { cn } from '@/lib/utils';
import type { Tone } from '@/lib/tones';
import type { CSSProperties, ReactNode } from 'react';
import { Wave } from './wave';
import { AvatarStack } from './avatar';
import { CountUp } from './count-up';

/** Ubin angka pastel ala ringkasan TaskTrack; catatan kecil menjelaskan arti angkanya. */
export function StatTile({
  label,
  value,
  note,
  tone = 'slate',
  icon,
  onClick,
  active,
  people,
  className,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  tone?: Tone;
  icon?: ReactNode;
  onClick?: () => void;
  active?: boolean;
  /** Orang yang terlibat; ditampilkan bertumpuk seperti ringkasan TaskTrack. */
  people?: string[];
  className?: string;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-pressed={onClick ? active : undefined}
      data-tone={tone}
      className={cn(
        'relative flex min-h-24 flex-col md:min-h-28 items-start gap-1 overflow-hidden rounded-[var(--radius-card)] bg-tone p-4 text-left text-tone-ink transition duration-300',
        onClick &&
          'hover:-translate-y-0.5 hover:shadow-card aria-pressed:ring-2 aria-pressed:ring-tone-bar',
        className,
      )}
    >
      <Wave />
      <span className="relative flex items-center gap-2 text-[13px] font-bold [&_svg]:size-4">
        {icon}
        {label}
      </span>
      {people && people.length > 0 && (
        <AvatarStack names={people} max={3} className="relative mt-2" />
      )}
      <span className="tabular relative mt-auto text-[26px] leading-tight font-extrabold tracking-tight text-ink">
        {value}
      </span>
      {note && <span className="relative text-xs font-semibold opacity-80">{note}</span>}
    </Tag>
  );
}

/**
 * Ubin angka putih ringkas (acuan dashboard 25 Okt): ikon dalam kotak berwarna, label kecil,
 * angka besar yang menghitung naik. Terangkat sedikit saat disentuh kursor.
 */
export function MetricTile({
  label,
  value,
  note,
  tone = 'slate',
  icon,
  onClick,
  className,
  style,
}: {
  label: string;
  value: number;
  note?: ReactNode;
  tone?: Tone;
  icon?: ReactNode;
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      style={style}
      className={cn(
        'enter flex min-w-0 items-center gap-3 max-sm:flex-col max-sm:items-start max-sm:gap-2.5 rounded-[var(--radius-card)] bg-surface p-3.5 text-left shadow-card ring-1 ring-line/60 transition duration-300 md:p-4',
        onClick && 'hover:-translate-y-1 hover:shadow-float active:scale-[0.98]',
        className,
      )}
    >
      <span
        data-tone={tone}
        className="grid size-11 shrink-0 place-items-center rounded-2xl bg-tone text-tone-ink [&_svg]:size-5"
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-xs font-bold text-ink-3">{label}</span>
        <span className="block text-[24px] leading-tight font-extrabold tracking-tight text-ink">
          <CountUp value={value} />
        </span>
        {note && <span className="block truncate text-xs font-semibold text-ink-3">{note}</span>}
      </span>
    </Tag>
  );
}

export function StatGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid grid-cols-2 gap-3 lg:grid-cols-4', className)}>{children}</div>;
}
