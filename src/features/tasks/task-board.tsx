'use client';
import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import * as motion from 'motion/react-m';
import { Plus } from 'lucide-react';
import type { Item } from '@/features/records/schemas';
import type { Workspace } from '@/features/workspace/use-workspace';
import type { TaskStatus } from '@/lib/task-status';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TaskCard } from './task-card';
import { setTaskStatus } from './task-actions';
import { useBoardDrag } from './use-board-drag';

const COLUMNS: { status: TaskStatus; label: string; tone: string }[] = [
  { status: 'rencana', label: 'Rencana', tone: 'lavender' },
  { status: 'proses', label: 'Dikerjakan', tone: 'sky' },
  { status: 'selesai', label: 'Selesai', tone: 'mint' },
  { status: 'dibatalkan', label: 'Dibatalkan', tone: 'slate' },
];
const ORDER: TaskStatus[] = ['rencana', 'proses', 'selesai'];

/**
 * Papan tugas: seret kartu antar kolom (mouse, sentuh-tahan) atau Shift+←/→ dari keyboard.
 * Kolom Dibatalkan disembunyikan kecuali diminta.
 */
export function TaskBoard({
  tasks,
  ws,
  refresh,
  onOpen,
  onAdd,
  user,
}: {
  tasks: Item[];
  ws: Workspace;
  refresh: () => Promise<void> | void;
  onOpen: (id: string) => void;
  onAdd: (status: TaskStatus) => void;
  user?: string;
}) {
  const [showCancelled, setShowCancelled] = useState(false);
  const move = (id: string, status: string) => {
    const task = tasks.find((row) => row.id === id);
    if (task && task.data.status !== status)
      void setTaskStatus(task, status as TaskStatus, refresh, user);
  };
  const { dragging, over, handle } = useBoardDrag(move);
  const columns = COLUMNS.filter((column) => column.status !== 'dibatalkan' || showCancelled);
  return (
    <div className="flex flex-col gap-3">
      <div
        data-board
        className="scrollbar-none -mx-4 grid snap-x snap-mandatory auto-cols-[min(21rem,86vw)] grid-flow-col gap-4 overflow-x-auto px-4 pb-3 md:mr-[-1.5rem] md:ml-0 md:pr-6 md:pl-0 lg:mx-0 lg:auto-cols-auto lg:grid-flow-row lg:grid-cols-[repeat(var(--cols),minmax(0,1fr))] lg:px-0 xl:gap-5"
        style={{ '--cols': columns.length } as React.CSSProperties}
      >
        {columns.map((column) => {
          const items = tasks.filter((task) => task.data.status === column.status);
          return (
            <section
              key={column.status}
              data-drop={column.status}
              aria-label={`Kolom ${column.label}`}
              className={cn(
                'flex min-h-80 snap-start flex-col gap-3 rounded-[var(--radius-card)] bg-surface p-3 shadow-card ring-1 ring-line transition-colors',
                over === column.status && dragging && 'bg-accent ring-accent-strong',
              )}
            >
              <header className="flex items-center gap-2 px-1.5 pt-0.5">
                <h2 className="flex-1 text-[15px] font-medium">{column.label}</h2>
                <span className="tabular text-xs text-ink-3">{items.length}</span>
                {column.status !== 'dibatalkan' && (
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Tambah tugas ke ${column.label}`}
                    onClick={() => onAdd(column.status)}
                  >
                    <Plus />
                  </Button>
                )}
              </header>
              <div className="flex flex-1 flex-col gap-3">
                <AnimatePresence initial={false}>
                  {items.map((task) => (
                    <motion.div
                      key={task.id}
                      layout
                      initial={false}
                      animate={{ opacity: dragging === task.id ? 0.35 : 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      onPointerDown={handle(task.id)}
                      onKeyDown={(event) => {
                        if (!event.shiftKey || !['ArrowLeft', 'ArrowRight'].includes(event.key))
                          return;
                        event.preventDefault();
                        const next =
                          ORDER[
                            ORDER.indexOf(task.data.status as TaskStatus) +
                              (event.key === 'ArrowRight' ? 1 : -1)
                          ];
                        if (next) move(task.id, next);
                      }}
                    >
                      <TaskCard
                        task={task}
                        ws={ws}
                        refresh={refresh}
                        onOpen={() => onOpen(task.id)}
                        draggable
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
                {!items.length && (
                  <p className="grid flex-1 place-items-center rounded-2xl border-2 border-dashed border-line p-6 text-center text-sm font-semibold text-ink-3">
                    Seret tugas ke sini
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => setShowCancelled((v) => !v)}
        className="self-start text-sm font-semibold text-ink-3 hover:text-ink"
      >
        {showCancelled
          ? 'Sembunyikan tugas dibatalkan'
          : `Tampilkan tugas dibatalkan (${tasks.filter((t) => t.data.status === 'dibatalkan').length})`}
      </button>
    </div>
  );
}
