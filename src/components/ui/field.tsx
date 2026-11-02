import {
  CalendarDays,
  ChevronDown,
  CircleAlert,
  Clock,
  Search,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ComponentProps, ReactNode } from 'react';

/**
 * Kolom isian: latar `field` dan garis yang terlihat saat diam, menyala warna sorotan saat diisi.
 * Galat ditandai garis dan pesan, bukan warna saja.
 */
const CONTROL =
  'w-full rounded-2xl border border-field-line bg-field px-4 text-[15px] text-ink transition-[border-color,background-color,box-shadow] duration-200 ease-out outline-none placeholder:text-ink-3 hover:border-ink-3/50 focus:border-accent-strong focus:ring-4 focus:ring-accent disabled:cursor-not-allowed disabled:border-line disabled:bg-surface-3 disabled:text-ink-3 aria-invalid:border-late-ink aria-invalid:focus:ring-late [&[type=number]]:tabular-nums';

/** Kolom di bilah alat halaman (cari, saringan): pil tipis langsung di atas latar. */
export const TOOLBAR_CONTROL = 'rounded-full border-line-strong bg-surface-2 hover:border-ink-3/50';

/** Ikon di kiri kolom; menyala bersama kolomnya saat aktif (kolom memakai kelas `peer`). */
const LEAD_ICON =
  'pointer-events-none absolute top-1/2 left-4 grid -translate-y-1/2 place-items-center text-ink-3 transition-colors peer-focus:text-accent-strong peer-disabled:opacity-50 [&_svg]:size-[18px]';

/** Kolom tanggal dan jam: ikon kalender/jam di kiri, dan seluruh kolom membuka pemilih bawaan. */
const PICKERS: Partial<Record<string, LucideIcon>> = {
  date: CalendarDays,
  month: CalendarDays,
  'datetime-local': CalendarDays,
  time: Clock,
};

export function Input({
  className,
  wrapperClassName,
  icon,
  type,
  onClick,
  ...props
}: ComponentProps<'input'> & { icon?: ReactNode; wrapperClassName?: string }) {
  const Picker = type ? PICKERS[type] : undefined;
  const lead = icon ?? (Picker ? <Picker /> : null);
  const input = (
    <input
      type={type}
      className={cn(
        CONTROL,
        'h-11',
        lead && 'peer pl-11',
        // Ikon bawaan peramban diganti ikon di kiri; tanggal kosong tampil redup seperti petunjuk.
        Picker &&
          'cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-date-and-time-value]:text-left',
        Picker && props.value === '' && 'text-ink-3',
        className,
      )}
      onClick={(event) => {
        // Bukan hanya ikon kecil: klik di mana pun membuka kalender/jam. Kolom hanya-baca menolaknya.
        if (Picker)
          try {
            event.currentTarget.showPicker();
          } catch {}
        onClick?.(event);
      }}
      {...props}
    />
  );
  if (!lead) return input;
  return (
    <span className={cn('relative block min-w-0', wrapperClassName)}>
      {input}
      <span className={LEAD_ICON} aria-hidden="true">
        {lead}
      </span>
    </span>
  );
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(CONTROL, 'min-h-24 resize-y py-2.5 leading-relaxed', className)}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  icon,
  ...props
}: ComponentProps<'select'> & { icon?: ReactNode }) {
  return (
    <span className="relative block">
      <select
        className={cn(
          CONTROL,
          'field-select peer h-11 appearance-none pr-10',
          icon && 'pl-11',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      {icon && (
        <span className={LEAD_ICON} aria-hidden="true">
          {icon}
        </span>
      )}
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-3 transition-colors peer-hover:text-ink-2 peer-focus:text-accent-strong"
        aria-hidden="true"
      />
    </span>
  );
}

/** Kotak cari di bilah alat: ikon menyala saat aktif, tombol hapus muncul bila ada teks, Esc mengosongkan. */
export function SearchField({
  value,
  onChange,
  label,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn('group relative min-w-0', className)}>
      <Search
        className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-ink-3 transition-colors group-focus-within:text-accent-strong"
        aria-hidden="true"
      />
      <input
        type="search"
        value={value}
        aria-label={label}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && value) {
            event.preventDefault();
            event.stopPropagation();
            onChange('');
          }
        }}
        className={cn(
          CONTROL,
          TOOLBAR_CONTROL,
          'h-11 pr-11 pl-11 [&::-webkit-search-cancel-button]:appearance-none',
        )}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Hapus pencarian"
          className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 animate-[item-in_0.2s_var(--ease-out)] place-items-center rounded-full text-ink-3 transition-colors hover:bg-surface-3 hover:text-ink"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

/** Label, kontrol, petunjuk, dan pesan galat dalam satu susunan yang sama di semua formulir. */
export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('flex flex-col gap-1.5', className)}>
      <span className="text-[13px] font-semibold text-ink-2">
        {label}
        {required && (
          <>
            <span className="text-late-ink" aria-hidden="true">
              {' '}
              *
            </span>
            <span className="sr-only"> (wajib)</span>
          </>
        )}
      </span>
      {children}
      {hint && !error && <span className="text-xs leading-relaxed text-ink-3">{hint}</span>}
      {error && (
        <span
          className="flex animate-[item-in_0.25s_var(--ease-out)] items-start gap-1.5 text-xs font-semibold text-late-ink"
          role="alert"
        >
          <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </span>
      )}
    </label>
  );
}
