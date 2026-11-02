'use client';
import { useEffect, useRef } from 'react';
import { MapPin, Video } from 'lucide-react';
import type { Item } from '@/features/records/schemas';
import type { Workspace } from '@/features/workspace/use-workspace';
import { MEETING_KINDS, meetingKindOf } from '@/features/agenda/meeting-kinds';
import { meetingJoinUrl } from '@/features/agenda/meeting';
import { addMinutes } from './quick-add';
import { TaskRow } from '@/features/tasks/task-card';
import { today } from '@/lib/date';
import { cn } from '@/lib/utils';

const HOUR = 64;
const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
const TONE = { rapat: 'lavender', kunjungan: 'sky', acara: 'peach', lainnya: 'mint' } as const;

/**
 * Linimasa satu hari: rapat di rel jam (blok berwarna per jenis), tugas bertenggat hari itu di
 * baris "Tanpa jam", dan garis "sekarang" bila hari ini.
 */
export function DayTimeline({
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
  const timed = meetings
    .filter((m) => /^\d{2}:\d{2}$/.test(String(m.data.time)))
    .sort((a, b) => String(a.data.time).localeCompare(String(b.data.time)));
  const startHour = Math.min(7, ...timed.map((m) => Math.floor(minutes(String(m.data.time)) / 60)));
  const endHour = Math.max(
    18,
    ...timed.map((m) =>
      Math.ceil(minutes(addMinutes(String(m.data.time), Number(m.data.duration || 60))) / 60),
    ),
  );
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
  const isToday = date === today();
  const nowTop = now ? ((minutes(now) - startHour * 60) / 60) * HOUR : -1;
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isToday && nowTop > 0)
      scroller.current?.scrollTo({ top: Math.max(0, nowTop - HOUR * 1.5), behavior: 'smooth' });
  }, [isToday, nowTop]);
  // Rapat yang bertumpuk dibagi ke beberapa lajur agar tidak saling menutupi.
  const lanes: string[] = [];
  const placed = timed.map((meeting) => {
    const start = String(meeting.data.time);
    const end = addMinutes(start, Number(meeting.data.duration || 60));
    let lane = lanes.findIndex((laneEnd) => laneEnd <= start);
    if (lane < 0) lane = lanes.push(end) - 1;
    else lanes[lane] = end;
    return { meeting, start, end, lane };
  });
  const laneCount = Math.max(1, lanes.length);
  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="pb-2 text-xs font-medium text-ink-3">
          Tugas bertenggat hari ini ({tasks.length})
        </p>
        {tasks.length ? (
          <div className="flex flex-col gap-1.5">
            {tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                ws={ws}
                onOpen={() => onOpenTask(task.id)}
                refresh={refresh}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-3">Tidak ada tugas bertenggat di hari ini.</p>
        )}
      </div>
      <div
        ref={scroller}
        className="relative max-h-[20rem] overflow-y-auto rounded-2xl"
        aria-label="Jadwal per jam"
      >
        <div className="relative" style={{ height: hours.length * HOUR }}>
          {hours.map((hour, index) => (
            <div
              key={hour}
              className="absolute inset-x-0 flex gap-3 border-t border-line"
              style={{ top: index * HOUR }}
            >
              <span className="tabular -mt-2.5 w-12 shrink-0 pr-1 text-right text-xs font-medium text-ink-3">
                {String(hour).padStart(2, '0')}.00
              </span>
            </div>
          ))}
          {!timed.length && (
            <p className="absolute top-6 right-4 left-16 rounded-2xl bg-surface-2 p-4 text-sm text-ink-3">
              Tidak ada rapat atau kunjungan terjadwal di hari ini.
            </p>
          )}
          {placed.map(({ meeting, start, end, lane }) => {
            const kind = meetingKindOf(meeting);
            const top = ((minutes(start) - startHour * 60) / 60) * HOUR;
            const height = Math.max(36, ((minutes(end) - minutes(start)) / 60) * HOUR - 4);
            const join = meetingJoinUrl(meeting);
            const past = isToday && now && end < now;
            const Icon = MEETING_KINDS[kind].icon;
            return (
              <div
                key={meeting.id}
                data-tone={TONE[kind]}
                className={cn(
                  'absolute overflow-hidden rounded-2xl bg-tone p-3 text-tone-ink shadow-sm transition hover:shadow-card',
                  // Warna dipudarkan, bukan teksnya: rapat yang sudah lewat tetap harus terbaca.
                  past && 'saturate-[.35]',
                )}
                style={{
                  top: top + 2,
                  height,
                  left: `calc(4rem + (100% - 4rem) * ${lane / laneCount})`,
                  width: `calc((100% - 4rem) / ${laneCount} - 6px)`,
                }}
              >
                <button
                  type="button"
                  onClick={() => onOpenMeeting(meeting.id)}
                  className="block w-full text-left"
                >
                  <span className="flex items-center gap-1.5 text-[11px] font-medium">
                    <Icon className="size-3.5" />
                    {start.replace(':', '.')}–{end.replace(':', '.')} · {MEETING_KINDS[kind].label}
                  </span>
                  <span className="block truncate text-sm font-medium text-ink">
                    {String(meeting.data.title)}
                  </span>
                  {height > 70 && (
                    <span className="mt-0.5 flex items-center gap-1 truncate text-xs font-medium">
                      <MapPin className="size-3" />
                      {meeting.data.mode === 'online'
                        ? 'Rapat online'
                        : String(meeting.data.location || 'Tatap muka')}
                    </span>
                  )}
                </button>
                {join && !past && height > 90 && (
                  <a
                    href={join}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1.5 inline-flex h-7 items-center gap-1 rounded-full bg-surface/80 px-2.5 text-xs font-medium"
                  >
                    <Video className="size-3.5" />
                    Gabung
                  </a>
                )}
              </div>
            );
          })}
          {isToday && nowTop >= 0 && nowTop <= hours.length * HOUR && (
            <div
              className="pointer-events-none absolute right-0 left-12 flex items-center"
              style={{ top: nowTop }}
              aria-label={`Sekarang ${now}`}
            >
              <span className="size-2.5 rounded-full bg-accent-strong" />
              <span className="h-0.5 flex-1 bg-accent-strong" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
