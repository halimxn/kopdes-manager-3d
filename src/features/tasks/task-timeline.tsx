'use client';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { CalendarRange, ChevronLeft, ChevronRight, Diamond, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import type { Item, Task } from '@/features/records/schemas';
import type { Workspace } from '@/features/workspace/use-workspace';
import { Button } from '@/components/ui/button';
import { Tabs } from '@/components/ui/tabs';
import { addDays, daysBetween, formatDate, today } from '@/lib/date';
import { scheduleConflicts, shiftSchedule } from '@/lib/timeline';
import { projectTone } from '@/lib/tones';
import { cn } from '@/lib/utils';
import { saveTask } from './task-actions';
import { TaskRow } from './task-card';
import { Avatar } from '@/components/ui/avatar';
import { useJakartaClock } from '@/lib/clock';

const SCALES = { day: 56, week: 20, month: 7 } as const;
// Satu baris per proyek; tugas yang bertumpuk waktunya turun ke lajur berikutnya.
const LANE = 38;
const GAP = 8;
const WEEKDAY = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
type Schedule = { start_date: string; due_date: string };

/** Susun tugas satu proyek ke lajur-lajur agar batang yang waktunya bertumpuk tidak saling menutupi. */
function packLanes<T>(items: T[], range: (item: T) => [string, string]) {
  const ends: string[] = [];
  const placed = items.map((item) => {
    const [from, to] = range(item);
    let lane = ends.findIndex((end) => end < from);
    if (lane < 0) lane = ends.length;
    ends[lane] = to;
    return { item, lane };
  });
  return { placed, count: Math.max(1, ends.length) };
}

/**
 * Linimasa (Gantt): batang dari tanggal mulai sampai tenggat. Seret untuk menggeser, seret ujung
 * kanan untuk mengubah tenggat, atau pakai panah/Shift+panah. Perubahan ditinjau dulu sebelum
 * disimpan; jadwal tugas lain tidak digeser otomatis.
 */
export function TaskTimeline({
  tasks,
  ws,
  refresh,
  onOpen,
  user,
}: {
  tasks: Item[];
  ws: Workspace;
  refresh: () => Promise<void> | void;
  onOpen: (id: string) => void;
  user?: string;
}) {
  const [scale, setScale] = useState<keyof typeof SCALES>('day');
  const [start, setStart] = useState(addDays(today(), -7));
  const [span, setSpan] = useState(42);
  const [pending, setPending] = useState<Record<string, Schedule>>({});
  const [saving, setSaving] = useState(false);
  const drag = useRef<{ id: string; x: number; resize: boolean; base: Schedule } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const px = SCALES[scale];
  const now = useJakartaClock();
  const date = today();
  const end = addDays(start, span - 1);
  const active = tasks.filter((task) => task.data.status !== 'dibatalkan' && task.data.due_date);
  const schedule = (task: Item): Schedule =>
    pending[task.id] ?? {
      start_date: String(task.data.start_date || task.data.due_date),
      due_date: String(task.data.due_date),
    };
  const rows = active
    .filter((task) => {
      const s = schedule(task);
      return s.due_date >= start && s.start_date <= end;
    })
    .sort((a, b) => schedule(a).start_date.localeCompare(schedule(b).start_date));
  const days = Array.from({ length: span }, (_, i) => addDays(start, i));
  const projectOrder = [...(ws.workstreams || []).map((p) => p.id), ''];
  const lanes = projectOrder
    .map((id) => {
      const own = rows.filter(
        (task) =>
          String(task.data.workstream_id || '') === id ||
          (!id && !projectOrder.includes(String(task.data.workstream_id || ''))),
      );
      const { placed, count } = packLanes(own, (task) => [
        schedule(task).start_date,
        schedule(task).due_date,
      ]);
      const project = ws.workstreams?.find((p) => p.id === id);
      return {
        id,
        title: project ? String(project.data.title) : 'Tanpa proyek',
        tone: projectTone(project),
        items: placed.map(({ item, lane }) => ({ task: item, lane })),
        height: count * LANE + GAP * 2 - (LANE - 36),
      };
    })
    .filter((group) => group.items.length);
  const milestones = (ws.milestones || []).filter(
    (m) => String(m.data.due_date) >= start && String(m.data.due_date) <= end,
  );
  const asTasks = active.map((task) => ({
    ...(task.data as unknown as Task),
    id: task.id,
    ...schedule(task),
  }));
  const conflicts = asTasks.filter((task) => scheduleConflicts(task, asTasks).length).length;
  const changed = Object.keys(pending).length;

  const shift = (task: Item, delta: number, resize: boolean, base = schedule(task)) => {
    if (!delta) return;
    setPending((current) => ({
      ...current,
      [task.id]: shiftSchedule(
        { start_date: base.start_date, due_date: base.due_date },
        delta,
        resize,
      ),
    }));
  };
  const savePending = async () => {
    setSaving(true);
    let saved = 0;
    try {
      for (const [id, value] of Object.entries(pending)) {
        const task = tasks.find((row) => row.id === id);
        if (!task) continue;
        await saveTask(
          task,
          value,
          `mengubah jadwal menjadi ${value.start_date} – ${value.due_date}`,
          user,
        );
        saved++;
      }
      setPending({});
      toast.success('Jadwal tersimpan');
    } catch (error) {
      toast.error(`${saved} dari ${changed} jadwal tersimpan. ${(error as Error).message}`);
    } finally {
      setSaving(false);
      await refresh();
    }
  };
  const fit = () => {
    const dates = active
      .flatMap((task) => [
        String(task.data.start_date || task.data.due_date),
        String(task.data.due_date),
      ])
      .sort();
    if (!dates.length) return;
    const first = addDays(dates[0], -2);
    setStart(first);
    setSpan(Math.min(366, Math.max(14, daysBetween(first, dates[dates.length - 1]) + 5)));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="min-w-0 flex-1 text-lg font-medium lg:mr-auto lg:flex-none">
          {formatDate(start)} – {formatDate(end)}
        </h2>
        <Button onClick={fit} aria-label="Lihat semua jadwal" className="lg:order-last">
          <CalendarRange />
          <span className="max-sm:hidden">Lihat semua</span>
        </Button>
        <div className="max-lg:basis-full max-lg:h-0" aria-hidden="true" />
        <Tabs
          label="Skala"
          className="max-sm:[&_button]:px-3"
          items={[
            { id: 'day', label: 'Hari' },
            { id: 'week', label: 'Minggu' },
            { id: 'month', label: 'Bulan' },
          ]}
          value={scale}
          onChange={(id) => setScale(id as keyof typeof SCALES)}
        />
        <div
          className="flex items-center rounded-full bg-surface-2 p-1 ring-1 ring-line"
          role="group"
          aria-label="Geser jadwal"
        >
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Mundur"
            onClick={() => setStart(addDays(start, -Math.round(span / 2)))}
          >
            <ChevronLeft />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setStart(addDays(today(), -7))}>
            Hari ini
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Maju"
            onClick={() => setStart(addDays(start, Math.round(span / 2)))}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
      {conflicts > 0 && (
        <p className="flex items-center gap-2 rounded-2xl bg-warn px-4 py-3 text-sm font-semibold text-warn-ink">
          <TriangleAlert className="size-4" />
          {conflicts} tugas bertabrakan dengan prasyaratnya (prasyarat belum selesai sebelum tugas
          dimulai).
        </p>
      )}
      {changed > 0 && (
        <div className="sticky top-20 z-20 flex flex-wrap items-center gap-3 rounded-full bg-surface-solid py-2 pr-2 pl-5 shadow-float ring-1 ring-line-strong max-sm:rounded-[1.5rem]">
          <span className="flex-1 text-sm text-ink">
            {changed} perubahan jadwal belum disimpan. Jadwal tugas lain tidak digeser otomatis.
          </span>
          <Button size="sm" variant="ghost" onClick={() => setPending({})}>
            Batal
          </Button>
          <Button size="sm" variant="primary" busy={saving} onClick={() => void savePending()}>
            Simpan jadwal
          </Button>
        </div>
      )}
      <div className="hidden overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-card ring-1 ring-line md:block">
        <div className="flex">
          <div className="w-48 shrink-0 border-r border-line">
            <div className="flex h-16 items-end px-5 pb-2.5 text-xs text-ink-3">Proyek</div>
            {milestones.length > 0 && (
              <div className="flex h-9 items-center border-t border-line px-5 text-[13px] text-ink-2">
                Milestone
              </div>
            )}
            {lanes.map((group) => (
              <div
                key={group.id}
                data-tone={group.tone}
                className="flex items-center gap-2 border-t border-line px-5 text-[13px] text-ink-2"
                style={{ height: group.height }}
              >
                <span className="size-2 shrink-0 rounded-full bg-tone-bar" aria-hidden="true" />
                {group.id ? (
                  <Link href={`/projects/${group.id}`} className="truncate hover:text-ink">
                    {group.title}
                  </Link>
                ) : (
                  <span className="truncate">{group.title}</span>
                )}
              </div>
            ))}
          </div>
          <div className="min-w-0 flex-1 overflow-x-auto" data-board>
            <div className="relative" style={{ width: span * px }}>
              {/* Kisi kolom hari dan bayangan kolom hari ini, di belakang batang. */}
              <div className="pointer-events-none absolute inset-0 flex" aria-hidden="true">
                {days.map((day) => {
                  const weekday = new Date(day + 'T12:00:00Z').getUTCDay();
                  return (
                    <span
                      key={day}
                      className={cn(
                        'h-full shrink-0',
                        // Garis hanya di awal pekan agar batang tidak tenggelam dalam kisi.
                        weekday === 1 && 'border-l border-line',
                        scale === 'day' && [0, 6].includes(weekday) && 'bg-surface-2',
                        day === date &&
                          'bg-[color-mix(in_srgb,var(--accent-strong)_8%,transparent)]',
                      )}
                      style={{ width: px }}
                    />
                  );
                })}
              </div>
              <div className="relative flex h-16">
                {days.map((day) => {
                  const weekday = new Date(day + 'T12:00:00Z').getUTCDay();
                  const show =
                    scale === 'day' ||
                    (scale === 'week' && weekday === 1) ||
                    (scale === 'month' && day.endsWith('-01'));
                  return (
                    <span
                      key={day}
                      className={cn(
                        'relative shrink-0 text-center',
                        day === date ? 'text-accent-strong' : 'text-ink-3',
                      )}
                      style={{ width: px }}
                    >
                      {show &&
                        (scale === 'day' ? (
                          <span className="absolute inset-x-0 bottom-2 flex flex-col items-center leading-tight">
                            <span className="text-[11px]">{WEEKDAY[weekday]}</span>
                            <span
                              className={cn(
                                'tabular text-sm font-medium',
                                day === date ? 'text-accent-strong' : 'text-ink',
                              )}
                            >
                              {Number(day.slice(8))}
                            </span>
                          </span>
                        ) : (
                          <span className="absolute bottom-2.5 left-1.5 text-xs whitespace-nowrap">
                            {scale === 'month'
                              ? formatDate(day).replace(/^\d+ /, '')
                              : formatDate(day)}
                          </span>
                        ))}
                    </span>
                  );
                })}
              </div>
              {milestones.length > 0 && (
                <div className="relative h-9 border-t border-line">
                  {milestones.map((m) => (
                    <span
                      key={m.id}
                      title={`${String(m.data.title)} · ${formatDate(String(m.data.due_date))}`}
                      className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 text-accent-strong"
                      style={{ left: (daysBetween(start, String(m.data.due_date)) + 0.5) * px }}
                    >
                      <Diamond
                        className={cn(
                          'size-4',
                          m.data.actual_date ? 'fill-done-ink text-done-ink' : 'fill-current',
                        )}
                      />
                    </span>
                  ))}
                </div>
              )}
              {lanes.map((group) => (
                <div
                  key={group.id}
                  className="relative border-t border-line"
                  style={{ height: group.height }}
                >
                  {group.items.map(({ task, lane }) => {
                    const s = schedule(task);
                    const left = Math.max(0, daysBetween(start, s.start_date)) * px;
                    const right = Math.min(span, daysBetween(start, s.due_date) + 1) * px;
                    const project = ws.workstreams?.find((p) => p.id === task.data.workstream_id);
                    const done = task.data.status === 'selesai';
                    const people = [
                      String(task.data.assignee || ''),
                      ...((task.data.followers as string[]) || []),
                    ].filter((name, index, all) => name && all.indexOf(name) === index);
                    const solid = selected === task.id || Boolean(pending[task.id]);
                    return (
                      <div
                        key={task.id}
                        role="slider"
                        tabIndex={0}
                        aria-label={`${String(task.data.title)}: ${formatDate(s.start_date)} sampai ${formatDate(s.due_date)}`}
                        aria-valuetext={`${s.start_date} – ${s.due_date}`}
                        aria-valuenow={daysBetween(start, s.start_date)}
                        data-tone={projectTone(project)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') return onOpen(task.id);
                          if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
                          event.preventDefault();
                          shift(task, event.key === 'ArrowRight' ? 1 : -1, event.shiftKey);
                        }}
                        onFocus={() => setSelected(task.id)}
                        onPointerDown={(event) => {
                          setSelected(task.id);
                          if (event.pointerType !== 'mouse') return;
                          event.currentTarget.setPointerCapture(event.pointerId);
                          drag.current = {
                            id: task.id,
                            x: event.clientX,
                            resize: (event.target as HTMLElement).dataset.grip === 'end',
                            base: s,
                          };
                        }}
                        onPointerMove={(event) => {
                          const current = drag.current;
                          if (!current || current.id !== task.id) return;
                          const delta = Math.round((event.clientX - current.x) / px);
                          setPending((all) => ({
                            ...all,
                            [task.id]: shiftSchedule(current.base, delta, current.resize),
                          }));
                        }}
                        onPointerUp={() => (drag.current = null)}
                        onDoubleClick={() => onOpen(task.id)}
                        className={cn(
                          // Batang kapsul; batang terpilih berwarna penuh.
                          'absolute z-[2] flex h-[30px] cursor-grab items-center gap-1.5 overflow-hidden rounded-full border pr-3.5 pl-[3px] text-[12.5px] whitespace-nowrap outline-none transition-colors active:cursor-grabbing',
                          solid
                            ? 'z-10 border-transparent bg-tone-bar text-on-bar'
                            : 'border-tone-line bg-tone text-ink hover:border-tone-bar',
                          done && !solid && 'text-ink-3 line-through',
                        )}
                        style={{ left, width: Math.max(px, right - left), top: GAP + lane * LANE }}
                      >
                        {people.length ? (
                          <Avatar name={people[0]} className="size-6 text-[9px] ring-0" />
                        ) : (
                          <span className="w-2 shrink-0" />
                        )}
                        <span className="truncate">{String(task.data.title)}</span>
                        <span
                          data-grip="end"
                          className="absolute inset-y-0 right-0 w-3 cursor-ew-resize"
                          aria-hidden="true"
                        />
                      </div>
                    );
                  })}
                </div>
              ))}
              {date >= start && date <= end && (
                <span
                  className="pointer-events-none absolute top-[64px] bottom-0 z-[1] w-px -translate-x-1/2 bg-accent-strong"
                  style={{
                    left:
                      (daysBetween(start, date) +
                        (now
                          ? (Number(now.slice(0, 2)) * 60 + Number(now.slice(3))) / 1440
                          : 0.5)) *
                      px,
                  }}
                  aria-hidden="true"
                >
                  <span className="absolute top-0 left-1/2 size-2 -translate-x-1/2 rounded-full bg-accent-strong" />
                </span>
              )}
            </div>
          </div>
        </div>
        {!rows.length && (
          <p className="p-6 text-center text-sm text-ink-3">
            Tidak ada tugas pada rentang ini. Tekan &quot;Lihat semua&quot;.
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2 md:hidden">
        {rows.map((task) => (
          <div key={task.id} className="flex flex-col gap-1">
            <span className="tabular px-1 text-xs text-ink-3">
              {formatDate(schedule(task).start_date)} – {formatDate(schedule(task).due_date)}
            </span>
            <TaskRow task={task} ws={ws} refresh={refresh} onOpen={() => onOpen(task.id)} />
          </div>
        ))}
        {!rows.length && (
          <p className="rounded-2xl bg-surface p-6 text-center text-sm text-ink-3">
            Tidak ada tugas pada rentang ini.
          </p>
        )}
      </div>
    </div>
  );
}
