'use client';
import { cn } from '@/lib/utils';
import type { Tone } from '@/lib/tones';
import type { ReactNode } from 'react';
import { AvatarStack } from './avatar';
import { CountUp } from './count-up';

/**
 * Angka ringkasan langsung di atas latar (acuan Solvik): ikon dalam lingkaran, angka yang menghitung
 * naik, dan label di bawahnya. Ikon satu warna agar deretan angka tenang; hanya nada `rose` (yang perlu
 * diperhatikan) berwarna koral. Catatan kecil menjelaskan arti angka.
 */
export function StatTile({
  label,
  value,
  note,
  badge,
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
  badge?: ReactNode;
  tone?: Tone;
  icon?: ReactNode;
  onClick?: () => void;
  active?: boolean;
  /** Orang yang terlibat; ditampilkan bertumpuk. */
  people?: string[];
  className?: string;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-pressed={onClick ? active : undefined}
      className={cn(
        'flex min-w-0 items-center gap-3 rounded-[1.75rem] text-left',
        onClick &&
          '-m-1.5 p-1.5 pr-4 transition-colors hover:bg-surface-2 active:scale-[0.98] aria-pressed:bg-surface-3',
        className,
      )}
    >
      <span
        className={cn(
          'grid size-11 shrink-0 place-items-center rounded-full bg-surface-2 ring-1 ring-line [&_svg]:size-[18px]',
          tone === 'rose' ? 'text-late-bar' : 'text-ink-2',
        )}
      >
        {icon ?? <span className="size-2.5 rounded-full bg-current" />}
      </span>
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-x-2">
          <span className="tabular text-xl leading-tight font-medium tracking-tight text-ink">
            {typeof value === 'number' ? <CountUp value={value} /> : value}
          </span>
          {badge}
        </span>
        <span className="block text-sm leading-snug text-ink-2">{label}</span>
        {note && <span className="block text-xs leading-snug text-ink-3">{note}</span>}
      </span>
      {people && people.length > 0 && <AvatarStack names={people} max={3} className="ml-1" />}
    </Tag>
  );
}

export function StatGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'grid w-full grid-cols-2 gap-x-4 gap-y-4 sm:flex sm:w-auto sm:flex-wrap sm:gap-x-8',
        className,
      )}
    >
      {children}
    </div>
  );
}
