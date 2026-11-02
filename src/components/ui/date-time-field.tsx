'use client';
import { Popover } from 'radix-ui';
import { useState } from 'react';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { PopoverContent } from './menu';
import { addDays, formatDate, monthRange, today, weekDays } from '@/lib/date';
import { cn } from '@/lib/utils';

/**
 * Pemilih tanggal dan jam bergaya aplikasi, pengganti kalender/jam bawaan peramban yang tidak
 * bisa diberi gaya. Nilai tetap teks "YYYY-MM-DD" dan "HH:MM" seperti kolom bawaan.
 */
const TRIGGER =
  'group flex h-11 w-full min-w-0 items-center gap-2.5 rounded-xl border border-field-line bg-field pr-3 pl-3.5 text-left text-[15px] text-ink outline-none transition-[border-color,background-color,box-shadow] duration-200 hover:border-ink-3/50 focus-visible:border-accent-strong focus-visible:ring-4 focus-visible:ring-accent disabled:cursor-not-allowed disabled:border-line disabled:bg-surface-3 disabled:text-ink-3 data-[state=open]:border-accent-strong data-[state=open]:bg-surface data-[state=open]:ring-4 data-[state=open]:ring-accent [&>svg]:size-[18px] [&>svg]:shrink-0';
const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

type FieldProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
  placeholder?: string;
};

export function DateField({
  value,
  onChange,
  disabled,
  className,
  placeholder = 'Pilih tanggal',
  clearable,
  ...rest
}: FieldProps & { clearable?: boolean }) {
  const [open, setOpen] = useState(false);
  const now = today();
  const [view, setView] = useState(value || now);
  const month = monthRange(view, 0, '9999-12-31');
  const first = weekDays(month.start)[0];
  const days = Array.from({ length: 42 }, (_, i) => addDays(first, i));
  const pick = (next: string) => {
    onChange(next);
    setOpen(false);
  };
  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setView(value || now);
      }}
    >
      <Popover.Trigger
        type="button"
        disabled={disabled}
        aria-label={rest['aria-label']}
        className={cn('field-trigger', TRIGGER, className)}
      >
        <CalendarDays className="text-ink-3 transition-colors group-data-[state=open]:text-accent-strong" />
        <span className={cn('flex-1 truncate', !value && 'text-ink-3')}>
          {value ? formatDate(value) : placeholder}
        </span>
        <ChevronDown className="size-4 text-ink-3 transition-transform group-data-[state=open]:rotate-180" />
      </Popover.Trigger>
      <PopoverContent align="start" className="z-[60] w-[19rem] p-3">
        <div className="flex items-center justify-between pb-2">
          <button
            type="button"
            aria-label="Bulan sebelumnya"
            onClick={() => setView(monthRange(view, -1, '9999-12-31').start)}
            className="grid size-9 place-items-center rounded-xl text-ink-2 hover:bg-surface-2"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="text-sm font-bold text-ink capitalize">{month.label}</span>
          <button
            type="button"
            aria-label="Bulan berikutnya"
            onClick={() => setView(monthRange(view, 1, '9999-12-31').start)}
            className="grid size-9 place-items-center rounded-xl text-ink-2 hover:bg-surface-2"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-0.5 text-center" role="grid" aria-label={month.label}>
          {WEEKDAYS.map((day) => (
            <span key={day} className="py-1 text-[11px] font-bold text-ink-3">
              {day}
            </span>
          ))}
          {days.map((day) => {
            const inMonth = day.slice(0, 7) === month.start.slice(0, 7);
            const selected = day === value;
            return (
              <button
                key={day}
                type="button"
                aria-label={formatDate(day)}
                aria-pressed={selected}
                onClick={() => pick(day)}
                className={cn(
                  'tabular grid h-9 place-items-center rounded-xl text-[13px] font-semibold transition-colors',
                  inMonth ? 'text-ink' : 'text-ink-3/60',
                  selected ? 'bg-action text-on-action' : 'hover:bg-surface-2',
                  day === now &&
                    !selected &&
                    'text-accent-strong ring-1 ring-accent-strong ring-inset',
                )}
              >
                {Number(day.slice(8))}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex gap-2 border-t border-line pt-2">
          <button
            type="button"
            onClick={() => pick(now)}
            className="h-9 flex-1 rounded-xl text-[13px] font-bold text-accent-ink hover:bg-accent"
          >
            Hari ini
          </button>
          <button
            type="button"
            onClick={() => pick(addDays(now, 1))}
            className="h-9 flex-1 rounded-xl text-[13px] font-bold text-ink-2 hover:bg-surface-2"
          >
            Besok
          </button>
          {clearable && value && (
            <button
              type="button"
              onClick={() => pick('')}
              className="h-9 flex-1 rounded-xl text-[13px] font-bold text-late-ink hover:bg-late"
            >
              Hapus
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover.Root>
  );
}

/** Jam kerja tiap 30 menit; jam yang sudah tersimpan di luar daftar tetap ikut ditampilkan. */
const TIMES = Array.from({ length: 36 }, (_, i) => {
  const minutes = 5 * 60 + i * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${minutes % 60 ? '30' : '00'}`;
});

export function TimeField({
  value,
  onChange,
  disabled,
  className,
  placeholder = 'Pilih jam',
  ...rest
}: FieldProps) {
  const [open, setOpen] = useState(false);
  const times = value && !TIMES.includes(value) ? [...TIMES, value].sort() : TIMES;
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        type="button"
        disabled={disabled}
        aria-label={rest['aria-label']}
        className={cn('field-trigger', TRIGGER, className)}
      >
        <Clock className="text-ink-3 transition-colors group-data-[state=open]:text-accent-strong" />
        <span className={cn('tabular flex-1 truncate', !value && 'text-ink-3')}>
          {value || placeholder}
        </span>
        <ChevronDown className="size-4 max-sm:hidden text-ink-3 transition-transform group-data-[state=open]:rotate-180" />
      </Popover.Trigger>
      <PopoverContent align="start" className="z-[60] w-44 p-1.5">
        <div
          className="grid max-h-64 grid-cols-2 gap-0.5 overflow-y-auto overscroll-contain"
          role="listbox"
          aria-label={rest['aria-label'] || 'Jam'}
          ref={(node) => {
            // Jam terpilih langsung terlihat saat daftar dibuka.
            node?.querySelector('[aria-selected=true]')?.scrollIntoView({ block: 'center' });
          }}
        >
          {times.map((time) => (
            <button
              key={time}
              type="button"
              role="option"
              aria-selected={time === value}
              onClick={() => {
                onChange(time);
                setOpen(false);
              }}
              className="tabular h-9 rounded-xl text-[13px] font-semibold text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink aria-selected:bg-action aria-selected:text-on-action"
            >
              {time}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover.Root>
  );
}
