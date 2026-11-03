'use client';
import { Video } from 'lucide-react';
import type { Item } from '@/features/records/schemas';
import type { Workspace } from '@/features/workspace/use-workspace';
import { MEETING_KINDS, meetingKindOf } from '@/features/agenda/meeting-kinds';
import { meetingJoinUrl } from '@/features/agenda/meeting';
import { addMinutes } from './quick-add';
import { TaskRow } from '@/features/tasks/task-card';
import { today } from '@/lib/date';
import { cn } from '@/lib/utils';

const hasTime = (meeting: Item) => /^\d{2}:\d{2}$/.test(String(meeting.data.time));

/**
 * Satu hari: jadwal urut jam. Tugas hanya untuk hari lain, karena tugas hari ini sudah ada di daftar
 * Peta koperasi dan satu hal tidak perlu tampil dua kali.
 */
export function DayAgenda({
  date,
  meetings,
  tasks,
  ws,
  now,
  refresh,
  onOpenTask,
  onOpenMeeting,
}: {
  date: string;
  meetings: Item[];
  tasks: Item[];
  ws: Workspace;
  now: string;
  refresh: () => Promise<void> | void;
  onOpenTask: (id: string) => void;
  onOpenMeeting: (id: string) => void;
}) {
  const isToday = date === today();
  // Rapat tanpa jam di depan, supaya tidak tenggelam di bawah jadwal yang sudah lewat.
  const sorted = [...meetings].sort((a, b) =>
    String(hasTime(a) ? a.data.time : '').localeCompare(String(hasTime(b) ? b.data.time : '')),
  );
  return (
    <div className="flex flex-col gap-4">
      <div className="min-w-0">
        <h3 className="pb-1.5 text-xs font-medium text-ink-3">Jadwal ({sorted.length})</h3>
        {sorted.length ? (
          <ul className="flex flex-col">
            {sorted.map((meeting) => {
              const kind = meetingKindOf(meeting);
              const timed = hasTime(meeting);
              const start = String(meeting.data.time);
              const end = timed ? addMinutes(start, Number(meeting.data.duration || 60)) : '';
              const past = isToday && timed && now && end < now;
              const running = isToday && timed && now && start <= now && now < end;
              const join = meetingJoinUrl(meeting);
              return (
                <li key={meeting.id} className="-mx-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenMeeting(meeting.id)}
                    className="flex min-w-0 flex-1 items-baseline gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-surface-2"
                  >
                    <span className="tabular w-11 shrink-0 text-[13px] text-ink-3">
                      {timed ? start.replace(':', '.') : 'Bebas'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          'block truncate text-[14.5px] font-medium text-ink',
                          past && 'font-normal text-ink-3',
                        )}
                      >
                        {String(meeting.data.title)}
                      </span>
                      <span className="block truncate text-xs text-ink-3">
                        {running ? (
                          <span className="font-medium text-accent-ink">Sedang berjalan</span>
                        ) : (
                          MEETING_KINDS[kind].label
                        )}
                        {' · '}
                        {meeting.data.mode === 'online'
                          ? 'Online'
                          : String(meeting.data.location || 'Tatap muka')}
                      </span>
                    </span>
                  </button>
                  {join && !past && (
                    <a
                      href={join}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Gabung: ${String(meeting.data.title)}`}
                      className="mr-1 inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] text-ink-2 ring-1 ring-line-strong transition hover:bg-surface-2 hover:text-ink max-sm:h-11"
                    >
                      <Video className="size-4" />
                      Gabung
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="py-2 text-sm text-ink-3">Tidak ada rapat atau kunjungan.</p>
        )}
      </div>
      {!isToday && (
        <div className="min-w-0">
          <h3 className="pb-1.5 text-xs font-medium text-ink-3">
            Tugas bertenggat ({tasks.length})
          </h3>
          {tasks.length ? (
            <div className="-mx-2 flex flex-col">
              {tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  plain
                  task={task}
                  ws={ws}
                  onOpen={() => onOpenTask(task.id)}
                  refresh={refresh}
                />
              ))}
            </div>
          ) : (
            <p className="py-2 text-sm text-ink-3">Tidak ada tugas bertenggat.</p>
          )}
        </div>
      )}
    </div>
  );
}
