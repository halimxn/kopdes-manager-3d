'use client';
import { DropdownMenu } from 'radix-ui';
import * as motion from 'motion/react-m';
import {
  CalendarClock,
  CalendarPlus,
  Clock,
  Flag,
  Ellipsis,
  ListChecks,
  MessageCircle,
  Repeat,
  XCircle,
} from 'lucide-react';
import type { Item } from '@/features/records/schemas';
import type { Workspace } from '@/features/workspace/use-workspace';
import { Check } from '@/components/ui/check';
import { Pill } from '@/components/ui/pill';
import { MenuContent, MenuItem, MenuSeparator } from '@/components/ui/menu';
import { SegmentBar } from '@/components/ui/progress';
import { AvatarStack } from '@/components/ui/avatar';
import { projectTone } from '@/lib/tones';
import { taskProgress } from '@/lib/progress';
import { daysBetween, formatDate, today } from '@/lib/date';
import { isClosedTask } from '@/lib/task-status';
import { cn } from '@/lib/utils';
import { cancelTask, postponeTask, toggleTaskDone } from './task-actions';
import type { Task } from '@/features/records/schemas';

/** Teks tenggat yang manusiawi: "Hari ini", "Besok", "3 hari lagi", "Terlambat 2 hari". */
export function dueText(task: Item, date = today()): { text: string; late: boolean } {
  const due = String(task.data.due_date || '');
  if (!due) return { text: 'Tanpa tenggat', late: false };
  if (task.data.status === 'selesai')
    return { text: `Selesai ${formatDate(String(task.data.completed_at || due))}`, late: false };
  const diff = daysBetween(date, due);
  if (diff < 0 && !isClosedTask(task.data.status))
    return { text: `Terlambat ${-diff} hari`, late: true };
  if (diff === 0) return { text: 'Hari ini', late: false };
  if (diff === 1) return { text: 'Besok', late: false };
  if (diff <= 7) return { text: `${diff} hari lagi`, late: false };
  return { text: formatDate(due), late: false };
}

/** Kartu tugas berwarna per proyek: tenggat dan aksi di atas, judul, proyek, progres, orang di bawah. */
export function TaskCard({
  task,
  ws,
  onOpen,
  refresh,
  className,
  draggable,
  style,
  compact,
}: {
  task: Item;
  ws: Workspace;
  onOpen: () => void;
  refresh: () => Promise<void> | void;
  className?: string;
  draggable?: boolean;
  style?: React.CSSProperties;
  /** Tanpa catatan singkat, untuk daftar pendek seperti Tenggat dekat di Beranda. */
  compact?: boolean;
}) {
  const project = ws.workstreams?.find((row) => row.id === task.data.workstream_id);
  const subtasks = (task.data.subtasks as { done: boolean }[]) || [];
  const done = task.data.status === 'selesai';
  const due = dueText(task);
  const progress = taskProgress(task.data as unknown as Task);
  const priority = String(task.data.priority || 'normal');
  const people = [
    String(task.data.assignee || ''),
    ...((task.data.followers as string[]) || []),
  ].filter((name, index, all) => name && all.indexOf(name) === index);
  const note = String(task.data.description || '')
    .split(/\r?\n/)[0]
    .trim();
  const comments = ((task.data.activities as { type?: string }[]) || []).filter(
    (entry) => entry.type === 'comment',
  ).length;
  return (
    <article
      data-tone={projectTone(project)}
      data-task={task.id}
      tabIndex={0}
      style={style}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && event.target === event.currentTarget) onOpen();
      }}
      className={cn(
        'group relative flex flex-col gap-2 rounded-[var(--radius-card)] bg-surface-2 p-4 text-ink-2 ring-1 ring-line ring-inset outline-none transition duration-300 hover:-translate-y-0.5 hover:shadow-card focus-visible:ring-2 focus-visible:ring-accent-strong',
        draggable && 'cursor-grab touch-pan-y select-none active:cursor-grabbing',
        className,
      )}
    >
      <div className="flex items-start gap-1.5">
        {/* Kartu sempit: lencana turun ke baris berikut, tombol aksi tetap di dalam kartu. */}
        <div className="flex min-h-8 min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {due.late ? (
            <Pill tone="late" className="min-w-0">
              <Clock />
              <span className="truncate">{due.text}</span>
            </Pill>
          ) : (
            <span className="flex min-w-0 items-center gap-1 text-[12px] font-medium">
              <Clock className="size-3.5 shrink-0" />
              <span className="truncate">{due.text}</span>
            </span>
          )}
          {priority === 'mendesak' && <Pill tone="warn">Mendesak</Pill>}
          {priority === 'tinggi' && (
            <Flag className="size-3.5 shrink-0" role="img" aria-label="Prioritas tinggi" />
          )}
          {Boolean(task.data.recurrence) && task.data.recurrence !== 'tidak' && (
            <Repeat className="size-3.5 shrink-0" aria-label="Berulang" />
          )}
        </div>
        <span className="flex shrink-0 items-center gap-1.5">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger
              className="grid size-8 place-items-center rounded-full ring-1 ring-line-strong transition hover:bg-surface-3"
              aria-label={`Aksi untuk ${String(task.data.title)}`}
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <Ellipsis className="size-4" />
            </DropdownMenu.Trigger>
            <MenuContent align="end" onClick={(event) => event.stopPropagation()}>
              <MenuItem onSelect={() => void postponeTask(task, 1, refresh)}>
                <CalendarClock />
                Tunda 1 hari
              </MenuItem>
              <MenuItem onSelect={() => void postponeTask(task, 7, refresh)}>
                <CalendarPlus />
                Tunda 1 minggu
              </MenuItem>
              <MenuSeparator />
              <MenuItem danger onSelect={() => void cancelTask(task, refresh)}>
                <XCircle />
                Batalkan tugas
              </MenuItem>
            </MenuContent>
          </DropdownMenu.Root>
          <Check
            checked={done}
            onChange={() => void toggleTaskDone(task, refresh)}
            label={`${done ? 'Buka lagi' : 'Tandai selesai'}: ${String(task.data.title)}`}
          />
        </span>
      </div>
      <button
        type="button"
        onClick={onOpen}
        onPointerDown={(event) => draggable && event.stopPropagation()}
        className={cn(
          'line-clamp-2 text-left text-[16px] leading-snug font-medium text-ink outline-none',
          done && 'line-through',
        )}
      >
        {String(task.data.title)}
      </button>
      <p className="-mt-1 flex items-center gap-1.5 text-[13px]">
        <span className="size-2 shrink-0 rounded-full bg-tone-bar" aria-hidden="true" />
        <span className="truncate">{project ? String(project.data.title) : 'Tanpa proyek'}</span>
      </p>
      {note && !compact && <p className="line-clamp-1 text-[12px]">{note}</p>}
      {subtasks.length > 0 && (
        <div className="mt-1 flex flex-col gap-1.5">
          <span className="flex justify-between text-[12px] font-medium">
            Progres <span className="tabular font-semibold text-ink">{progress}%</span>
          </span>
          <SegmentBar value={progress} segments={7} label="Progres subtugas" />
        </div>
      )}
      <div className="mt-auto flex items-center gap-3 pt-1 text-[12px] font-medium">
        {comments > 0 && (
          <span className="flex items-center gap-1" title={`${comments} komentar`}>
            <MessageCircle className="size-3.5" />
            <span className="tabular">{comments}</span>
          </span>
        )}
        {subtasks.length > 0 && (
          <span className="flex items-center gap-1" title="Subtugas selesai">
            <ListChecks className="size-3.5" />
            <span className="tabular">
              {subtasks.filter((s) => s.done).length}/{subtasks.length}
            </span>
          </span>
        )}
        <AvatarStack names={people} max={3} className="ml-auto" />
      </div>
    </article>
  );
}

/** Versi baris untuk daftar padat (Daftar, Beranda di HP). */
export function TaskRow({
  task,
  ws,
  onOpen,
  refresh,
}: {
  task: Item;
  ws: Workspace;
  onOpen: () => void;
  refresh: () => Promise<void> | void;
}) {
  const project = ws.workstreams?.find((row) => row.id === task.data.workstream_id);
  const done = task.data.status === 'selesai';
  const due = dueText(task);
  const subtasks = (task.data.subtasks as { done: boolean }[]) || [];
  return (
    <motion.div
      layout
      data-tone={projectTone(project)}
      data-task={task.id}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && event.target === event.currentTarget) onOpen();
      }}
      className="flex items-center gap-3 rounded-[1.25rem] bg-surface px-3 py-2.5 ring-1 ring-line outline-none transition hover:bg-surface-3 focus-visible:ring-2 focus-visible:ring-accent-strong"
    >
      <Check
        checked={done}
        onChange={() => void toggleTaskDone(task, refresh)}
        label={`${done ? 'Buka lagi' : 'Tandai selesai'}: ${String(task.data.title)}`}
      />
      <span className="size-2 shrink-0 rounded-full bg-tone-bar" aria-hidden="true" />
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <span
          className={cn(
            'block truncate text-[14.5px] font-medium text-ink',
            done && 'text-ink-3 line-through',
          )}
        >
          {String(task.data.title)}
        </span>
        <span className="flex items-center gap-2 text-xs text-ink-3">
          <span className="truncate">{project ? String(project.data.title) : 'Tanpa proyek'}</span>
          {subtasks.length > 0 && (
            <span className="tabular">
              · {subtasks.filter((s) => s.done).length}/{subtasks.length} subtugas
            </span>
          )}
        </span>
      </button>
      <span
        className={cn(
          'hidden shrink-0 text-xs font-medium sm:block',
          due.late ? 'text-late-ink' : 'text-ink-3',
        )}
      >
        {due.text}
      </span>
      <AvatarStack names={[String(task.data.assignee || '')]} className="hidden shrink-0 sm:flex" />
    </motion.div>
  );
}
