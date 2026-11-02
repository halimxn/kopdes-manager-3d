'use client';
import { AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import * as motion from 'motion/react-m';
import { CalendarClock, Check as CheckIcon, Flag, Repeat } from 'lucide-react';
import type { Item } from '@/features/records/schemas';
import type { Workspace } from '@/features/workspace/use-workspace';
import { Check } from '@/components/ui/check';
import { AvatarStack } from '@/components/ui/avatar';
import { projectTone } from '@/lib/tones';
import { cn } from '@/lib/utils';
import { dueText } from './task-card';
import { postponeTask, toggleTaskDone } from './task-actions';

const GROUPS = [
  { status: 'rencana', label: 'Rencana', tone: 'lavender' },
  { status: 'proses', label: 'Dikerjakan', tone: 'sky' },
  { status: 'selesai', label: 'Selesai', tone: 'mint' },
  { status: 'dibatalkan', label: 'Dibatalkan', tone: 'slate' },
];
const PRIORITY_TONE: Record<string, string> = {
  mendesak: 'text-late-ink',
  tinggi: 'text-late-ink',
  normal: 'text-ink-3',
  rendah: 'text-ink-3',
};

/** Baris tugas: di HP geser kanan = selesai, geser kiri = tunda ke besok. */
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
  const due = dueText(task);
  const done = task.data.status === 'selesai';
  const priority = String(task.data.priority || 'normal');
  return (
    <motion.li
      layout
      initial={false}
      exit={{ opacity: 0, height: 0 }}
      className="relative overflow-hidden rounded-2xl"
    >
      <motion.span
        style={{ opacity: doneOpacity }}
        className="absolute inset-0 flex items-center bg-done pl-5 text-sm font-bold text-done-ink"
      >
        <CheckIcon className="mr-2 size-4" /> Selesai
      </motion.span>
      <motion.span
        style={{ opacity: laterOpacity }}
        className="absolute inset-0 flex items-center justify-end bg-doing pr-5 text-sm font-bold text-doing-ink"
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
          'relative flex items-center gap-3 bg-surface px-3 py-3 outline-none transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-strong md:px-4',
          selected && 'bg-accent hover:bg-accent',
        )}
      >
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
        <span className="size-2 shrink-0 rounded-full bg-tone-bar" aria-hidden="true" />
        <button
          type="button"
          onClick={selecting ? onSelect : onOpen}
          className="min-w-0 flex-1 text-left"
        >
          <span
            className={cn(
              'block truncate text-[15px] font-medium text-ink',
              done && 'text-ink-3 line-through',
            )}
          >
            {String(task.data.title)}
          </span>
          <span className="flex items-center gap-2 text-xs text-ink-3">
            <span className="truncate">
              {project ? String(project.data.title) : 'Tanpa proyek'}
            </span>
            {subtasks.length > 0 && (
              <span className="tabular shrink-0">
                · {subtasks.filter((s) => s.done).length}/{subtasks.length}
              </span>
            )}
            {Boolean(task.data.recurrence) && task.data.recurrence !== 'tidak' && (
              <Repeat className="size-3 shrink-0" aria-label="Berulang" />
            )}
            <span className={cn('shrink-0 md:hidden', due.late && 'font-medium text-late-ink')}>
              · {due.text}
            </span>
          </span>
        </button>
        {priority !== 'normal' && (
          <Flag
            className={cn('hidden size-4 shrink-0 md:block', PRIORITY_TONE[priority])}
            aria-label={`Prioritas ${priority}`}
          />
        )}
        <span
          className={cn(
            'hidden w-32 shrink-0 text-right text-[13px] font-semibold md:block',
            due.late ? 'text-late-ink' : 'text-ink-2',
          )}
        >
          {due.text}
        </span>
        <AvatarStack
          names={[String(task.data.assignee || '')]}
          className="hidden w-10 shrink-0 justify-end md:flex"
        />
      </motion.div>
    </motion.li>
  );
}

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
  const groups = GROUPS.map((group) => ({
    ...group,
    rows: tasks.filter((task) => task.data.status === group.status),
  })).filter((group) => group.rows.length);
  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => (
        <section
          key={group.status}
          aria-label={group.label}
          className="overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-card"
        >
          <header
            data-tone={group.tone}
            className="flex items-center gap-2 border-b border-line px-4 py-3"
          >
            <span className="size-2.5 rounded-full bg-tone-bar" />
            <h2 className="text-[15px] font-extrabold">{group.label}</h2>
            <span className="tabular rounded-full bg-surface-3 px-2 py-0.5 text-xs font-bold text-ink-2">
              {group.rows.length}
            </span>
          </header>
          <ul className="flex flex-col divide-y divide-line/70">
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
        </section>
      ))}
    </div>
  );
}
