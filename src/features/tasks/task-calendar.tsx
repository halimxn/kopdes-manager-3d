'use client';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { Item } from '@/features/records/schemas';
import type { Workspace } from '@/features/workspace/use-workspace';
import { Button } from '@/components/ui/button';
import { Check } from '@/components/ui/check';
import { Tabs } from '@/components/ui/tabs';
import { addDays, formatDate, today, weekDays } from '@/lib/date';
import { isOverdue } from '@/lib/task-status';
import { projectTone } from '@/lib/tones';
import { cn } from '@/lib/utils';
import { toggleTaskDone } from './task-actions';

const DAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const monthLabel = (month: string) =>
  new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(month + '-15T12:00:00Z'),
  );
const dayLabel = (date: string) =>
  new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(date + 'T12:00:00Z'));
function shiftMonth(month: string, delta: number) {
  const date = new Date(month + '-15T12:00:00Z');
  date.setUTCMonth(date.getUTCMonth() + delta);
  return date.toISOString().slice(0, 7);
}

/**
 * Kalender tugas per tenggat: kisi bulan atau pekan di kiri, rincian hari terpilih di kanan. Tugas di
 * panel hari bisa langsung dicentang. HP: kisi ringkas bertitik, rincian hari di bawahnya.
 */
export function TaskCalendar({
  tasks,
  ws,
  refresh,
  onOpen,
  onAdd,
}: {
  tasks: Item[];
  ws: Workspace;
  refresh: () => Promise<void> | void;
  onOpen: (id: string) => void;
  onAdd: (date: string) => void;
}) {
  const [mode, setMode] = useState<'month' | 'week'>('month');
  const [month, setMonth] = useState(today().slice(0, 7));
  const [selected, setSelected] = useState(today());
  const date = today();
  const first = weekDays(month + '-01')[0];
  const daysInMonth = new Date(
    Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0),
  ).getUTCDate();
  const offset = weekDays(month + '-01').indexOf(month + '-01');
  const cells =
    mode === 'month'
      ? Array.from({ length: Math.ceil((offset + daysInMonth) / 7) * 7 }, (_, i) =>
          addDays(first, i),
        )
      : weekDays(selected);
  const onDay = (day: string) =>
    tasks.filter((task) => task.data.due_date === day && task.data.status !== 'dibatalkan');
  const toneOf = (task: Item) =>
    projectTone(ws.workstreams?.find((project) => project.id === task.data.workstream_id));
  const dayTasks = onDay(selected);
  const limit = mode === 'month' ? 3 : 10;
  const go = (delta: number) =>
    mode === 'month'
      ? setMonth(shiftMonth(month, delta))
      : setSelected(addDays(selected, delta * 7));
  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <section className="overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-card ring-1 ring-line">
        <header className="flex flex-wrap items-center gap-2 p-3 pl-5">
          <h2 className="mr-auto text-lg font-medium capitalize">
            {mode === 'month'
              ? monthLabel(month)
              : `${formatDate(cells[0])} – ${formatDate(cells[6])}`}
          </h2>
          <Tabs
            label="Rentang kalender"
            items={[
              { id: 'month', label: 'Bulan' },
              { id: 'week', label: 'Pekan' },
            ]}
            value={mode}
            onChange={(id) => setMode(id as 'month' | 'week')}
          />
          <div className="flex items-center rounded-full bg-surface-2 p-1 ring-1 ring-line">
            <Button size="icon-sm" variant="ghost" aria-label="Sebelumnya" onClick={() => go(-1)}>
              <ChevronLeft />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setMonth(date.slice(0, 7));
                setSelected(date);
              }}
            >
              Hari ini
            </Button>
            <Button size="icon-sm" variant="ghost" aria-label="Berikutnya" onClick={() => go(1)}>
              <ChevronRight />
            </Button>
          </div>
        </header>
        <div className="grid grid-cols-7 border-y border-line text-center text-xs text-ink-3">
          {DAYS.map((day) => (
            <span key={day} className="py-2">
              {day}
            </span>
          ))}
        </div>
        <div className="grid auto-rows-fr grid-cols-7">
          {cells.map((day) => {
            const items = onDay(day);
            const outside = mode === 'month' && day.slice(0, 7) !== month;
            const late = items.some((task) => isOverdue(task.data, date));
            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelected(day)}
                aria-pressed={day === selected}
                aria-label={`${formatDate(day)}, ${items.length} tugas`}
                className={cn(
                  'flex flex-col items-center gap-1 border-r border-b border-line p-1 text-left transition-colors outline-none hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-strong aria-pressed:bg-surface-3 md:items-stretch md:p-2 [&:nth-child(7n)]:border-r-0',
                  mode === 'month' ? 'min-h-14 md:min-h-[6.75rem]' : 'min-h-60',
                )}
              >
                <span
                  className={cn(
                    'tabular grid size-7 shrink-0 place-items-center rounded-full text-[13px]',
                    outside ? 'text-ink-3/70' : 'text-ink',
                    day === date && 'bg-action font-medium text-on-action',
                  )}
                >
                  {Number(day.slice(8))}
                </span>
                <span className="hidden min-w-0 flex-col gap-0.5 md:flex">
                  {items.slice(0, limit).map((task) => (
                    <span
                      key={task.id}
                      data-tone={toneOf(task)}
                      className={cn(
                        'flex min-w-0 items-center gap-1.5 text-[12px] leading-5 text-ink-2',
                        task.data.status === 'selesai' && 'text-ink-3 line-through',
                      )}
                    >
                      <span
                        className={cn(
                          'size-1.5 shrink-0 rounded-full',
                          isOverdue(task.data, date) ? 'bg-late-bar' : 'bg-tone-bar',
                        )}
                        aria-hidden="true"
                      />
                      <span className="truncate">{String(task.data.title)}</span>
                    </span>
                  ))}
                  {items.length > limit && (
                    <span className="pl-3 text-[11.5px] text-ink-3">
                      +{items.length - limit} lainnya
                    </span>
                  )}
                </span>
                {items.length > 0 && (
                  <span
                    className={cn(
                      'size-1.5 rounded-full md:hidden',
                      late ? 'bg-late-bar' : 'bg-ink-3',
                    )}
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-[var(--radius-card)] bg-surface p-4 shadow-card ring-1 ring-line xl:sticky xl:top-[84px]">
        <div>
          <h3 className="text-[17px] font-medium capitalize">
            {selected === date ? 'Hari ini' : dayLabel(selected)}
          </h3>
          <p className="text-[13px] text-ink-3">
            {selected === date && <span className="capitalize">{dayLabel(selected)} · </span>}
            {dayTasks.length ? `${dayTasks.length} tugas bertenggat` : 'Tidak ada tenggat'}
          </p>
        </div>
        {dayTasks.length > 0 && (
          <ul className="flex flex-col gap-0.5">
            {dayTasks.map((task) => {
              const done = task.data.status === 'selesai';
              return (
                <li
                  key={task.id}
                  data-tone={toneOf(task)}
                  className="-mx-1.5 flex items-center gap-2.5 rounded-2xl px-1.5 py-2 transition-colors hover:bg-surface-2"
                >
                  <Check
                    checked={done}
                    onChange={() => void toggleTaskDone(task, refresh)}
                    label={`${done ? 'Buka lagi' : 'Tandai selesai'}: ${String(task.data.title)}`}
                  />
                  <button
                    type="button"
                    onClick={() => onOpen(task.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span
                      className={cn(
                        'line-clamp-2 text-[13.5px] leading-snug text-ink',
                        done && 'text-ink-3 line-through',
                      )}
                    >
                      {String(task.data.title)}
                    </span>
                    <span
                      className={cn(
                        'block truncate text-xs',
                        isOverdue(task.data, date) ? 'text-late-bar' : 'text-ink-3',
                      )}
                    >
                      {String(task.data.assignee || 'Belum ada penanggung jawab')}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <Button onClick={() => onAdd(selected)}>
          <Plus />
          Tambah di tanggal ini
        </Button>
      </section>
    </div>
  );
}
