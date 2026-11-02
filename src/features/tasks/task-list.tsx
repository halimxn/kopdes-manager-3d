'use client';
import { useState } from 'react';
import { AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import * as motion from 'motion/react-m';
import { CalendarClock, Check as CheckIcon, ChevronDown, Flag, Repeat } from 'lucide-react';
import type { Item } from '@/features/records/schemas';
import type { Workspace } from '@/features/workspace/use-workspace';
import { Avatar } from '@/components/ui/avatar';
import { Check } from '@/components/ui/check';
import { projectTone } from '@/lib/tones';
import { cn } from '@/lib/utils';
import { dueText } from './task-card';
import { postponeTask, toggleTaskDone } from './task-actions';

const GROUPS = [
  { status: 'rencana', label: 'Rencana' },
  { status: 'proses', label: 'Dikerjakan' },
  { status: 'selesai', label: 'Selesai' },
  { status: 'dibatalkan', label: 'Dibatalkan' },
];
// Kolom sama untuk kepala dan semua baris, supaya tenggat dan orang sejajar sampai bawah.
const COLUMNS =
  'md:grid md:grid-cols-[minmax(0,1fr)_9rem_6.5rem_7.5rem] xl:grid-cols-[minmax(0,1fr)_13rem_11rem_7rem_8.5rem]';
const PRIORITY_LABEL: Record<string, string> = {
  mendesak: 'Mendesak',
  tinggi: 'Tinggi',
  rendah: 'Rendah',
};

/** Baris tugas berkolom. Di HP geser kanan = selesai, geser kiri = tunda ke besok. */
function SwipeRow({
  task,
  ws,
  refresh,
  onOpen,
  selecting,
  selected,
  onSelect,
}: {
  task: Item;
  ws: Workspace;
  refresh: () => Promise<void> | void;
  onOpen: () => void;
  selecting: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const x = useMotionValue(0);
  const doneOpacity = useTransform(x, [20, 90], [0, 1]);
  const laterOpacity = useTransform(x, [-90, -20], [1, 0]);
  const project = ws.workstreams?.find((row) => row.id === task.data.workstream_id);
  const subtasks = (task.data.subtasks as { done: boolean }[]) || [];
  const finished = subtasks.filter((item) => item.done).length;
  const due = dueText(task);
  const done = task.data.status === 'selesai';
  const priority = String(task.data.priority || 'normal');
  const assignee = String(task.data.assignee || '');
  const projectName = project ? String(project.data.title) : 'Tanpa proyek';
  return (
    <motion.li
      layout
      initial={false}
      exit={{ opacity: 0, height: 0 }}
      className="relative overflow-hidden"
    >
      <motion.span
        style={{ opacity: doneOpacity }}
        className="absolute inset-0 flex items-center bg-done pl-5 text-sm font-medium text-done-ink"
      >
        <CheckIcon className="mr-2 size-4" /> Selesai
      </motion.span>
      <motion.span
        style={{ opacity: laterOpacity }}
        className="absolute inset-0 flex items-center justify-end bg-doing pr-5 text-sm font-medium text-doing-ink"
      >
        Besok <CalendarClock className="ml-2 size-4" />
      </motion.span>
      <motion.div
        drag={selecting ? false : 'x'}
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.5}
        dragSnapToOrigin
        style={{ x, touchAction: 'pan-y' }}
        onDragEnd={(_, info) => {
          if (info.offset.x > 90 && !done) void toggleTaskDone(task, refresh);
          else if (info.offset.x < -90) void postponeTask(task, 1, refresh);
        }}
        data-tone={projectTone(project)}
        data-task={task.id}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && event.target === event.currentTarget) onOpen();
        }}
        className={cn(
          COLUMNS,
          'group relative flex min-h-14 items-center gap-x-4 bg-surface-solid px-4 py-2 outline-none transition-colors hover:bg-[color-mix(in_srgb,var(--ink)_4%,var(--surface-solid))] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-strong',
          selected && 'bg-accent hover:bg-accent',
        )}
      >
        <span className="flex min-w-0 flex-1 items-center gap-3">
          {selecting ? (
            <Check
              checked={selected}
              onChange={onSelect}
              label={`Pilih ${String(task.data.title)}`}
              size="sm"
            />
          ) : (
            <Check
              checked={done}
              onChange={() => void toggleTaskDone(task, refresh)}
              label={`${done ? 'Buka lagi' : 'Tandai selesai'}: ${String(task.data.title)}`}
            />
          )}
          <button
            type="button"
            onClick={selecting ? onSelect : onOpen}
            className="min-w-0 flex-1 text-left"
          >
            <span
              className={cn(
                'flex items-center gap-2 text-[14.5px] text-ink',
                done && 'text-ink-3 line-through',
              )}
            >
              <span className="truncate">{String(task.data.title)}</span>
              {Boolean(task.data.recurrence) && task.data.recurrence !== 'tidak' && (
                <Repeat className="size-3 shrink-0 text-ink-3" aria-label="Berulang" />
              )}
              {subtasks.length > 0 && (
                <span className="tabular shrink-0 text-xs text-ink-3">
                  {finished}/{subtasks.length}
                </span>
              )}
            </span>
            {/* HP: proyek dan tenggat di bawah judul, karena kolomnya disembunyikan. */}
            <span className="flex items-center gap-1.5 text-xs text-ink-3 md:hidden">
              <span className="size-1.5 shrink-0 rounded-full bg-tone-bar" aria-hidden="true" />
              <span className="truncate">{projectName}</span>
              <span className={cn('shrink-0', due.late && 'text-late-bar')}>· {due.text}</span>
            </span>
          </button>
        </span>
        <span className="hidden min-w-0 items-center gap-2 text-[13px] text-ink-2 md:flex">
          <span className="size-2 shrink-0 rounded-full bg-tone-bar" aria-hidden="true" />
          <span className="truncate">{projectName}</span>
        </span>
        <span className="hidden min-w-0 items-center gap-2 text-[13px] text-ink-2 xl:flex">
          {assignee ? (
            <>
              <Avatar name={assignee} className="size-7 text-[10px] ring-0" />
              <span className="truncate">{assignee}</span>
            </>
          ) : (
            <span className="text-ink-3">Belum ada</span>
          )}
        </span>
        <span
          className={cn(
            'hidden items-center gap-1.5 text-[13px] md:flex',
            priority === 'mendesak' ? 'text-late-bar' : 'text-ink-2',
          )}
        >
          {priority !== 'normal' ? (
            <>
              <Flag className="size-3.5 shrink-0" aria-hidden="true" />
              {PRIORITY_LABEL[priority] ?? priority}
            </>
          ) : (
            <span className="text-ink-3">Normal</span>
          )}
        </span>
        <span className="hidden items-center justify-between gap-1 md:flex">
          <span className={cn('truncate text-[13px]', due.late ? 'text-late-bar' : 'text-ink-2')}>
            {due.text}
          </span>
          {!done && !selecting && (
            <button
              type="button"
              onClick={() => void postponeTask(task, 1, refresh)}
              aria-label={`Tunda 1 hari: ${String(task.data.title)}`}
              title="Tunda 1 hari"
              className="grid size-8 shrink-0 place-items-center rounded-full text-ink-3 opacity-0 transition group-hover:opacity-100 hover:bg-surface-3 hover:text-ink focus-visible:opacity-100"
            >
              <CalendarClock className="size-4" />
            </button>
          )}
        </span>
      </motion.div>
    </motion.li>
  );
}

/** Daftar tugas: satu tabel per status dengan kolom sejajar; tiap kelompok bisa dilipat. */
export function TaskList({
  tasks,
  ws,
  refresh,
  onOpen,
  selecting,
  selected,
  onToggleSelect,
}: {
  tasks: Item[];
  ws: Workspace;
  refresh: () => Promise<void> | void;
  onOpen: (id: string) => void;
  selecting: boolean;
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
}) {
  const [folded, setFolded] = useState<Set<string>>(() => new Set());
  const groups = GROUPS.map((group) => ({
    ...group,
    rows: tasks.filter((task) => task.data.status === group.status),
  })).filter((group) => group.rows.length);
  if (!groups.length) return null;
  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] shadow-card ring-1 ring-line">
      <div
        className={cn(
          COLUMNS,
          'hidden gap-x-4 border-b border-line bg-surface-solid px-4 py-2.5 text-xs text-ink-3',
        )}
        aria-hidden="true"
      >
        <span className="pl-9">Tugas</span>
        <span>Proyek</span>
        <span className="hidden xl:block">Penanggung jawab</span>
        <span>Prioritas</span>
        <span>Tenggat</span>
      </div>
      {groups.map((group) => {
        const closed = folded.has(group.status);
        return (
          <section key={group.status} aria-label={group.label}>
            <button
              type="button"
              aria-expanded={!closed}
              onClick={() =>
                setFolded((current) => {
                  const next = new Set(current);
                  if (closed) next.delete(group.status);
                  else next.add(group.status);
                  return next;
                })
              }
              className="flex h-11 w-full items-center gap-2 border-b border-line bg-[color-mix(in_srgb,var(--ink)_5%,var(--surface-solid))] px-4 text-left text-[13px] font-medium text-ink"
            >
              <ChevronDown
                className={cn(
                  'size-4 text-ink-3 transition-transform duration-300',
                  closed && '-rotate-90',
                )}
                aria-hidden="true"
              />
              <h2>{group.label}</h2>
              <span className="tabular text-xs font-normal text-ink-3">{group.rows.length}</span>
            </button>
            {!closed && (
              <ul className="divide-y divide-line">
                <AnimatePresence initial={false}>
                  {group.rows.map((task) => (
                    <SwipeRow
                      key={task.id}
                      task={task}
                      ws={ws}
                      refresh={refresh}
                      onOpen={() => onOpen(task.id)}
                      selecting={selecting}
                      selected={selected.has(task.id)}
                      onSelect={() => onToggleSelect(task.id)}
                    />
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
