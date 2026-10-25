'use client';
import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlarmClock,
  ArrowRight,
  ArrowUpRight,
  CircleAlert,
  FolderKanban,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleDashed,
  ClipboardCopy,
  Globe2,
  LoaderCircle,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace } from '@/features/workspace/use-workspace';
import { organizationInfo } from '@/features/workspace/use-loaded-workspace';
import { getFollowUps } from '@/features/notifications/follow-ups';
import { RecordDetailSheet } from '@/features/records/record-card';
import { RecordFormSheet } from '@/features/records/lazy';
import { TaskCard } from '@/features/tasks/task-card';
import { TaskSheet } from '@/features/tasks/task-sheet';
import { countTaskStates } from '@/features/tasks/status-counts';
import { MEETING_KINDS, meetingKindOf } from '@/features/agenda/meeting-kinds';
import { isProjectHistory } from '@/features/projects/lifecycle';
import { PageLoading } from '@/features/records/records-page';
import { AvatarStack } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { MetricTile } from '@/components/ui/stat';
import { CountUp } from '@/components/ui/count-up';
import { ErrorState, EmptyState } from '@/components/ui/states';
import { HalfDonut, Ring } from '@/components/ui/progress';
import { Wave } from '@/components/ui/wave';
import { addDays, formatDate, today, weekDays } from '@/lib/date';
import { isActiveTask } from '@/lib/task-status';
import { scopeProgress } from '@/lib/progress';
import { projectTone } from '@/lib/tones';
import { cn } from '@/lib/utils';
import type { Task } from '@/features/records/schemas';
import { RoutinesCard, routineStates, useRoutineChecks } from './routines';
import { useJakartaClock } from '@/lib/clock';
import { DayTimeline } from './day-timeline';
import { buildDailyReport, parseQuickAdd } from './quick-add';

const DAY_SHORT = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const longDate = (date: string) =>
  new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(date + 'T12:00:00Z'));

export function HomePage() {
  const { data, loading, error, refresh, routines: routinesReady } = useWorkspace('home');
  const { checks, setChecks, reload } = useRoutineChecks(routinesReady);
  const now = useJakartaClock();
  const date = today();
  const [day, setDay] = useState(date);
  const [openTask, setOpenTask] = useState<string | null>(null);
  const [openMeeting, setOpenMeeting] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
  const [quick, setQuick] = useState('');
  const carousel = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const tasks = useMemo(() => data['work-items'] || [], [data]);
  const meetings = useMemo(
    () => (data.meetings || []).filter((m) => m.data.status !== 'dibatalkan'),
    [data],
  );
  const { name: coop } = organizationInfo(data);
  const team = (data.staff || [])
    .filter((row) => row.data.status !== 'nonaktif')
    .map((row) => String(row.data.title));
  const counts = countTaskStates(tasks, date);
  const deadlines = useMemo(
    () =>
      tasks
        .filter(
          (task) =>
            isActiveTask(task.data.status) &&
            task.data.due_date &&
            String(task.data.due_date) <= addDays(date, 14),
        )
        .sort((a, b) => String(a.data.due_date).localeCompare(String(b.data.due_date))),
    [tasks, date],
  );
  const attention = getFollowUps(data, date)
    .filter((item) => !item.id.startsWith('work-items') && !item.id.startsWith('meetings'))
    .slice(0, 4);
  const projects = (data.workstreams || []).filter((p) => !isProjectHistory(p)).slice(0, 4);
  const week = weekDays(day);
  const dayTasks = tasks.filter(
    (task) => task.data.due_date === day && task.data.status !== 'dibatalkan',
  );
  const dayMeetings = meetings.filter((m) => m.data.date === day);
  const late = counts.terlambat;
  const todayCount = tasks.filter(
    (t) => t.data.due_date === date && isActiveTask(t.data.status),
  ).length;
  const task = tasks.find((row) => row.id === openTask);

  if (error) return <ErrorState message={error} onRetry={() => void refresh()} />;
  if (loading) return <PageLoading />;

  const copyReport = async () => {
    const states = routineStates(data.routines || [], checks, date, now);
    const text = buildDailyReport({
      date,
      coop,
      routines: states.map((s) => ({
        title: String(s.routine.data.title),
        time: String(s.routine.data.time),
        done: s.done,
      })),
      tasks: tasks.map((t) => ({
        title: String(t.data.title),
        status: String(t.data.status),
        due: String(t.data.due_date || ''),
        completedAt: String(t.data.completed_at || ''),
        assignee: String(t.data.assignee || ''),
      })),
      meetings: meetings
        .filter((m) => m.data.date === date)
        .map((m) => ({
          title: String(m.data.title),
          time: String(m.data.time || ''),
          kind: MEETING_KINDS[meetingKindOf(m)].label,
        })),
      activities: (data.journal || [])
        .filter((j) => j.data.date === date)
        .map((j) => ({ title: String(j.data.title) })),
    });
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Laporan hari ini disalin. Tempel di grup WhatsApp pengurus.');
    } catch {
      window.prompt('Salin laporan ini:', text);
    }
  };

  const active = counts.rencana + counts.proses;
  const doneRate = active + counts.selesai ? (counts.selesai / (active + counts.selesai)) * 100 : 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Kepala langsung di atas latar, seperti acuan: judul dan tanggal kiri, aksi berbentuk pil kanan. */}
      <header className="enter flex flex-wrap items-end gap-x-4 gap-y-3 px-1">
        <div className="min-w-44 flex-1">
          <h1 className="text-[26px] leading-tight font-extrabold tracking-tight text-ink md:text-[30px]">
            Kerja hari ini
          </h1>
          <p className="text-[13px] font-semibold text-ink-3">
            {longDate(date)}
            {coop && <span className="max-sm:hidden"> · {coop}</span>}
            {' · '}
            {todayCount} tugas hari ini
            {late > 0 && (
              <>
                {' · '}
                <Link
                  href="/tasks?status=terlambat"
                  className="font-bold text-late-ink hover:underline"
                >
                  {late} terlambat
                </Link>
              </>
            )}
          </p>
        </div>
        {team.length > 0 && (
          <Link
            href="/team"
            className="hidden items-center xl:flex"
            aria-label={`Tim: ${team.length} orang`}
          >
            <AvatarStack names={team} max={4} />
          </Link>
        )}
        <div className="flex gap-2">
          <Button
            onClick={() => void copyReport()}
            aria-label="Salin laporan hari ini"
            className="rounded-full border-transparent shadow-card"
          >
            <ClipboardCopy />
            <span className="max-sm:hidden">Salin laporan</span>
          </Button>
          <Button asChild variant="primary" className="rounded-full">
            <Link href="/world?lokasi=kantor" aria-label="Masuk ke Dunia Koperasi 3D">
              <Globe2 />
              <span className="max-sm:hidden">Masuk ke 3D</span>
            </Link>
          </Button>
        </div>
      </header>

      {/* Empat ubin angka putih: urut alur kerja belum → dikerjakan → terlambat → selesai. */}
      <section aria-label="Ringkasan tugas" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {(
          [
            [
              'Belum dikerjakan',
              counts.rencana,
              'sky',
              <CircleDashed key="i" />,
              'rencana',
              'Rencana',
            ],
            [
              'Dikerjakan',
              counts.proses,
              'lavender',
              <LoaderCircle key="i" />,
              'proses',
              'Sedang berjalan',
            ],
            [
              'Terlambat',
              late,
              'rose',
              <AlarmClock key="i" />,
              'terlambat',
              late ? 'Perlu ditindak' : 'Tidak ada',
            ],
            [
              'Selesai',
              counts.selesai,
              'mint',
              <CircleCheck key="i" />,
              'selesai',
              '30 hari terakhir',
            ],
          ] as const
        ).map(([label, value, tone, icon, status, note], index) => (
          <MetricTile
            key={status}
            label={label}
            value={value}
            tone={tone}
            icon={icon}
            note={note}
            style={{ animationDelay: `${60 + index * 60}ms` }}
            onClick={() => router.push(`/tasks?status=${status}`)}
          />
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="enter lg:col-span-7" style={{ animationDelay: '220ms' }}>
          <RoutinesCard
            routines={data.routines || []}
            checks={checks}
            setChecks={setChecks}
            reload={reload}
            refresh={refresh}
            ready={routinesReady}
          />
        </div>
        <div className="flex flex-col gap-4 lg:col-span-5">
          {/* Kartu progres setengah donat seperti "69% dari target" pada acuan. */}
          <section
            aria-labelledby="progress-title"
            className="enter flex flex-col rounded-[var(--radius-card)] bg-surface p-5 shadow-card ring-1 ring-line/60"
            style={{ animationDelay: '280ms' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="progress-title" className="text-base font-extrabold">
                  Progres tugas
                </h2>
                <p className="text-xs font-semibold text-ink-3">
                  Selesai dari semua tugas yang sedang dilacak
                </p>
              </div>
              <Link
                href="/tasks"
                className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-ink-2 transition hover:bg-surface-3 hover:text-ink"
                aria-label="Buka Tugas"
              >
                <ArrowUpRight className="size-4" />
              </Link>
            </div>
            <div className="mt-3 flex flex-col items-center">
              <HalfDonut value={doneRate} label="Tugas selesai" />
              <span className="-mt-9 text-[28px] leading-none font-extrabold tracking-tight">
                <CountUp value={Math.round(doneRate)} />%
              </span>
              <span className="mt-1 text-xs font-semibold text-ink-3">
                {counts.selesai} selesai · {active} masih berjalan
              </span>
            </div>
          </section>
          <form
            className="enter relative"
            style={{ animationDelay: '340ms' }}
            onSubmit={(event) => {
              event.preventDefault();
              if (!quick.trim()) return;
              const parsed = parseQuickAdd(quick, {
                today: date,
                staff: (data.staff || []).map((row) => String(row.data.title)),
                projects: (data.workstreams || []).map((row) => ({
                  id: row.id,
                  title: String(row.data.title),
                })),
              });
              setDraft({ due_date: date, ...parsed });
              setQuick('');
            }}
          >
            <label className="sr-only" htmlFor="quick-add">
              Tambah tugas cepat
            </label>
            <Input
              id="quick-add"
              value={quick}
              onChange={(event) => setQuick(event.target.value)}
              maxLength={200}
              icon={<Sparkles className="text-accent-strong" />}
              placeholder="Tugas cepat: Cek stok gula @Budi besok"
              className="h-12 rounded-full border-transparent bg-surface pr-24 shadow-card"
            />
            <Button
              type="submit"
              size="sm"
              variant="primary"
              className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-full"
              disabled={!quick.trim()}
            >
              Tambah
            </Button>
          </form>
        </div>
      </div>

      <section aria-labelledby="deadline-title" className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <h2 id="deadline-title" className="text-lg font-extrabold">
            Tenggat dekat
          </h2>
          <div className="flex gap-1">
            <Button
              size="icon-sm"
              aria-label="Geser ke kiri"
              className="rounded-full"
              onClick={() => carousel.current?.scrollBy({ left: -320, behavior: 'smooth' })}
            >
              <ChevronLeft />
            </Button>
            <Button
              size="icon-sm"
              aria-label="Geser ke kanan"
              className="rounded-full"
              onClick={() => carousel.current?.scrollBy({ left: 320, behavior: 'smooth' })}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
        {deadlines.length ? (
          <div
            ref={carousel}
            className="scrollbar-none -mx-4 flex snap-x snap-mandatory items-start gap-4 overflow-x-auto px-4 pt-1 pb-3 md:-mx-1 md:px-1"
          >
            {deadlines.map((row, index) => (
              <div
                key={row.id}
                className="enter w-[min(19rem,80vw)] shrink-0 snap-start transition duration-300 hover:-translate-y-1"
                style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
              >
                <TaskCard
                  task={row}
                  ws={data}
                  refresh={refresh}
                  onOpen={() => setOpenTask(row.id)}
                />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Tidak ada tenggat dalam 14 hari"
            description="Tugas aktif bertenggat akan muncul di sini, yang terlambat paling depan."
          />
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-12">
        <section
          aria-labelledby="today-title"
          className="rounded-[var(--radius-card)] bg-surface p-4 shadow-card ring-1 ring-line/60 md:p-5 lg:col-span-7"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 id="today-title" className="text-lg font-extrabold">
              {day === date ? 'Hari ini' : formatDate(day)}
            </h2>
            <Link
              href="/agenda"
              className="flex items-center gap-1 rounded-full bg-surface-2 px-3 py-1.5 text-xs font-bold text-ink-2 transition hover:bg-surface-3 hover:text-ink"
            >
              Agenda <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <div className="mb-4 grid grid-cols-7 gap-1.5" role="group" aria-label="Pilih hari">
            {week.map((value, index) => {
              const busy =
                tasks.some((t) => t.data.due_date === value && isActiveTask(t.data.status)) ||
                meetings.some((m) => m.data.date === value);
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={value === day}
                  onClick={() => setDay(value)}
                  className={cn(
                    'relative flex flex-col items-center gap-0.5 rounded-2xl py-2.5 transition duration-300',
                    value === day
                      ? 'bg-action text-on-action shadow-[0_10px_20px_-12px_var(--action)]'
                      : 'text-ink-2 hover:bg-surface-2',
                  )}
                >
                  <span className="text-xs font-semibold opacity-80">{DAY_SHORT[index]}</span>
                  <span className="tabular text-lg font-extrabold">{Number(value.slice(8))}</span>
                  <span
                    className={cn(
                      'size-1.5 rounded-full',
                      busy ? 'bg-current' : 'bg-transparent',
                      value === date && value !== day && 'bg-accent-strong',
                    )}
                  />
                </button>
              );
            })}
          </div>
          <DayTimeline
            date={day}
            meetings={dayMeetings}
            tasks={dayTasks}
            ws={data}
            now={now}
            refresh={refresh}
            onOpenTask={setOpenTask}
            onOpenMeeting={setOpenMeeting}
          />
        </section>

        <div className="flex flex-col gap-4 lg:col-span-5">
          <section
            aria-labelledby="attention-title"
            className="rounded-[var(--radius-card)] bg-surface p-4 shadow-card ring-1 ring-line/60 md:p-5"
          >
            <h2 id="attention-title" className="mb-3 text-lg font-extrabold">
              Perlu perhatian
            </h2>
            {attention.length ? (
              <ul className="flex flex-col gap-2">
                {attention.map((item, index) => (
                  <li key={item.id} className="enter" style={{ animationDelay: `${index * 50}ms` }}>
                    <Link
                      href={item.href}
                      className="group flex items-center gap-3 rounded-2xl bg-surface-2 px-3 py-2.5 transition hover:bg-surface-3"
                    >
                      <span
                        className={cn(
                          'grid size-9 shrink-0 place-items-center rounded-xl',
                          item.urgent ? 'bg-late text-late-ink' : 'bg-warn text-warn-ink',
                        )}
                      >
                        {item.urgent ? (
                          <CircleAlert className="size-4" />
                        ) : (
                          <AlarmClock className="size-4" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-ink">
                          {item.title}
                        </span>
                        <span className="block truncate text-xs font-semibold text-ink-3">
                          {item.kind} · {item.reason}
                        </span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-2xl bg-done px-4 py-3 text-sm font-semibold text-done-ink">
                Dokumen, stok, risiko, dan kendala aman.
              </p>
            )}
          </section>
          <section aria-labelledby="projects-title" className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <h2 id="projects-title" className="text-lg font-extrabold">
                Proyek berjalan
              </h2>
              <Link
                href="/projects"
                className="rounded-full bg-surface px-3 py-1.5 text-xs font-bold text-ink-2 shadow-card transition hover:text-ink"
              >
                Semua
              </Link>
            </div>
            {projects.length ? (
              <div className="grid grid-cols-2 gap-3">
                {projects.map((project, index) => {
                  const projectTasks = tasks.filter((t) => t.data.workstream_id === project.id);
                  const progress = scopeProgress(
                    projectTasks.map((t) => t.data as unknown as Task),
                  );
                  return (
                    // Kartu seperti kartu properti acuan: area warna proyek di atas, nama dan cincin persen di bawah.
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      data-tone={projectTone(project)}
                      className="enter group flex flex-col gap-2.5 rounded-[var(--radius-card)] bg-surface p-2.5 shadow-card ring-1 ring-line/60 transition duration-300 hover:-translate-y-1 hover:shadow-float"
                      style={{ animationDelay: `${index * 60}ms` }}
                    >
                      <span className="relative grid h-20 place-items-center overflow-hidden rounded-2xl bg-tone text-tone-ink">
                        <Wave />
                        <FolderKanban className="relative size-7 transition-transform duration-500 group-hover:scale-110" />
                      </span>
                      <span className="flex items-center gap-2 px-1 pb-1">
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-2 text-[13px] leading-snug font-bold text-ink">
                            {String(project.data.title)}
                          </span>
                          <span className="block text-[11px] font-semibold text-ink-3">
                            {projectTasks.length} tugas
                          </span>
                        </span>
                        <Ring value={progress} label={`Progres ${String(project.data.title)}`} />
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title="Belum ada proyek berjalan"
                action={
                  <Button asChild variant="primary">
                    <Link href="/projects?new=1">Buat proyek</Link>
                  </Button>
                }
              />
            )}
          </section>
        </div>
      </div>

      <TaskSheet
        task={task}
        ws={data}
        open={Boolean(task)}
        onClose={() => setOpenTask(null)}
        refresh={refresh}
        siblings={deadlines}
        onNavigate={setOpenTask}
      />
      <RecordDetailSheet
        entity="meetings"
        row={meetings.find((m) => m.id === openMeeting)}
        ws={data}
        open={Boolean(openMeeting)}
        onClose={() => setOpenMeeting(null)}
        onEdit={() => router.push(`/agenda?record=${openMeeting}&edit=1`)}
        refresh={refresh}
      />
      <RecordFormSheet
        open={Boolean(draft)}
        entity="work-items"
        prefill={draft || undefined}
        workspace={data}
        refresh={refresh}
        onClose={() => setDraft(null)}
      />
    </div>
  );
}
