'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlarmClock,
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  ClipboardCopy,
  Globe2,
  ListPlus,
  ListTodo,
} from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace } from '@/features/workspace/use-workspace';
import { organizationInfo } from '@/features/workspace/use-loaded-workspace';
import { getFollowUps } from '@/features/notifications/follow-ups';
import { RecordDetailSheet } from '@/features/records/record-card';
import { RecordFormSheet } from '@/features/records/lazy';
import { TaskCard } from '@/features/tasks/task-card';
import { TaskSheet } from '@/features/tasks/lazy';
import { countTaskStates } from '@/features/tasks/status-counts';
import { MEETING_KINDS, meetingKindOf } from '@/features/agenda/meeting-kinds';
import { isProjectHistory } from '@/features/projects/lifecycle';
import { PageHeader } from '@/components/layout/page-header';
import { PageLoading } from '@/features/records/records-page';
import { AvatarStack } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { AreaChart, StackBar } from '@/components/ui/charts';
import { Input } from '@/components/ui/field';
import { StatGrid, StatTile } from '@/components/ui/stat';
import { CountUp } from '@/components/ui/count-up';
import { ErrorState, EmptyState, Skeleton } from '@/components/ui/states';
import { Ring } from '@/components/ui/progress';
import { Tabs } from '@/components/ui/tabs';
import { addDays, formatDate, today, weekDays } from '@/lib/date';
import { isActiveTask } from '@/lib/task-status';
import { scopeProgress } from '@/lib/progress';
import { projectTone } from '@/lib/tones';
import { cn } from '@/lib/utils';
import type { Task } from '@/features/records/schemas';
import { RoutinesCard, routineStates, useRoutineChecks } from './routines';
import { greeting, useJakartaClock } from '@/lib/clock';
import { DayTimeline } from './day-timeline';
import { buildDailyReport, parseQuickAdd } from './quick-add';
import { weeklyDone } from './weekly-done';

// Peta dengan kanvas dimuat sesudah halaman tampil agar tidak memperbesar unduhan awal.
const CoopMap = dynamic(() => import('./coop-map').then((module) => module.CoopMap), {
  ssr: false,
  loading: () => <Skeleton className="h-full min-h-[25rem] rounded-[var(--radius-card)]" />,
});

const PANEL = 'rounded-[var(--radius-card)] bg-surface p-5 shadow-card ring-1 ring-line';
const ROUND_LINK =
  'grid size-10 shrink-0 place-items-center rounded-full text-ink-2 ring-1 ring-line-strong transition hover:bg-surface-2 hover:text-ink [&_svg]:size-4';

const DAY_SHORT = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const longDate = (date: string) =>
  new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(date + 'T12:00:00Z'));

export function HomePage() {
  const {
    data,
    loading,
    error,
    refresh,
    routines: routinesReady,
    operations,
    logistics,
    administration,
    more,
  } = useWorkspace('home');
  const caps = useMemo(
    () => ({ operations, logistics, administration }),
    [operations, logistics, administration],
  );
  const { checks, setChecks, reload } = useRoutineChecks(routinesReady);
  const now = useJakartaClock();
  const date = today();
  const [day, setDay] = useState(date);
  const [openTask, setOpenTask] = useState<string | null>(null);
  const [openMeeting, setOpenMeeting] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
  const [quick, setQuick] = useState('');
  const [span, setSpan] = useState('12');
  const router = useRouter();
  const tasks = useMemo(() => data['work-items'] || [], [data]);
  const meetings = useMemo(
    () => (data.meetings || []).filter((m) => m.data.status !== 'dibatalkan'),
    [data],
  );
  const { name: coop, manager } = organizationInfo(data);
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
  const todayMeetings = meetings.filter((m) => m.data.date === date).length;
  // Sumbernya sama dengan Peta koperasi, supaya tidak ada dua angka berbeda di satu layar.
  const needed = getFollowUps(data, date).length;
  const weeks = weeklyDone(tasks, date, Number(span));
  const weekTotal = weeks.reduce((total, week) => total + week.value, 0);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={`${greeting(now)}, ${(manager || 'Manajer').split(' ')[0]}`}
        subtitle={
          <>
            {longDate(date)}
            {coop && <span className="max-sm:hidden"> · {coop}</span>}
            {needed > 0 && (
              <span className="font-semibold text-ink"> · {needed} hal perlu ditindak</span>
            )}
          </>
        }
        sections={[
          // HP: tiga kolom agar angka ketiga tidak sendirian di barisnya.
          <StatGrid
            key="stats"
            className="max-sm:grid-cols-3 max-sm:[&>*]:flex-col max-sm:[&>*]:items-start max-sm:[&>*]:gap-2"
          >
            <StatTile
              label="Tugas hari ini"
              value={todayCount}
              tone="sky"
              icon={<ListTodo />}
              onClick={() => router.push('/tasks')}
            />
            <StatTile
              label="Terlambat"
              value={late}
              tone="rose"
              icon={<AlarmClock />}
              onClick={() => router.push('/tasks?status=terlambat')}
            />
            <StatTile
              label="Agenda hari ini"
              value={todayMeetings}
              tone="lavender"
              icon={<CalendarDays />}
              onClick={() => router.push('/agenda')}
            />
          </StatGrid>,
        ]}
        actions={
          <>
            <Button onClick={() => void copyReport()} aria-label="Salin laporan hari ini">
              <ClipboardCopy />
              <span className="max-sm:hidden">Salin laporan</span>
            </Button>
            <Button asChild variant="primary">
              <Link href="/world?lokasi=kantor" aria-label="Masuk ke Dunia Koperasi 3D">
                <Globe2 />
                Masuk ke 3D
              </Link>
            </Button>
          </>
        }
      />

      <form
        className="relative"
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
          icon={<ListPlus />}
          placeholder="Tugas cepat: Cek stok gula @Budi besok"
          className="h-12 rounded-full border-line-strong bg-surface-2 pr-28"
        />
        <Button
          type="submit"
          size="sm"
          variant="primary"
          className="absolute top-1/2 right-1.5 -translate-y-1/2"
          disabled={!quick.trim()}
        >
          Tambah
        </Button>
      </form>

      {/* Baris utama: yang dicentang pagi hari, peta kerja, lalu ringkasan progres. */}
      <div className="grid gap-4 max-md:contents lg:grid-cols-12 xl:grid-cols-[minmax(0,3.1fr)_minmax(0,6.5fr)_minmax(0,2.4fr)]">
        <div className="max-md:order-1 lg:col-span-5 xl:col-auto">
          <RoutinesCard
            routines={data.routines || []}
            checks={checks}
            setChecks={setChecks}
            reload={reload}
            refresh={refresh}
            ready={routinesReady}
          />
        </div>
        <div className="max-md:order-3 lg:col-span-7 xl:col-auto">
          <CoopMap
            ws={data}
            date={date}
            caps={caps}
            more={more}
            coop={coop}
            refresh={refresh}
            onOpenTask={setOpenTask}
          />
        </div>
        {/* Panel gelap seperti kartu rekening acuan: dasar mengikuti tema, isinya bertoken gelap. */}
        <section
          aria-labelledby="progress-title"
          className="flex flex-col rounded-[var(--radius-card)] bg-deep shadow-card ring-1 ring-line max-md:order-4 lg:col-span-12 xl:col-auto"
        >
          <div data-theme="dark" className="flex h-full flex-col gap-4 p-5 text-on-deep">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="progress-title" className="text-lg font-medium">
                  Progres tugas
                </h2>
                <p className="text-[13px] text-on-deep-2">Semua tugas yang sedang dilacak</p>
              </div>
              <Link
                href="/tasks"
                aria-label="Buka Tugas"
                className={cn(ROUND_LINK, 'text-on-deep ring-line-strong hover:bg-deep-2')}
              >
                <ArrowUpRight />
              </Link>
            </div>
            <p className="text-[38px] leading-none font-normal tracking-tight">
              <CountUp value={Math.round(doneRate)} />%
              <span className="ml-2 text-[13px] tracking-normal text-on-deep-2">selesai</span>
            </p>
            <StackBar
              label={`${counts.selesai} selesai, ${counts.proses} dikerjakan, ${counts.rencana} belum dikerjakan`}
              parts={[
                { value: counts.selesai, className: 'bg-action' },
                { value: counts.proses, className: 'bg-on-deep/55' },
                { value: counts.rencana, className: 'bg-on-deep/25' },
              ]}
            />
            <dl className="flex flex-1 flex-col justify-around text-sm">
              {(
                [
                  ['Selesai', counts.selesai, 'bg-action', 'selesai'],
                  ['Dikerjakan', counts.proses, 'bg-on-deep/55', 'proses'],
                  ['Belum dikerjakan', counts.rencana, 'bg-on-deep/25', 'rencana'],
                  ['Terlambat', late, 'bg-late-bar', 'terlambat'],
                ] as const
              ).map(([label, value, dot, status]) => (
                <Link
                  key={status}
                  href={`/tasks?status=${status}`}
                  className="-mx-2 flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-deep-2"
                >
                  <span className={cn('size-2 rounded-full', dot)} aria-hidden="true" />
                  <dt className="flex-1 text-on-deep-2">{label}</dt>
                  <dd className="tabular font-medium">{value}</dd>
                </Link>
              ))}
            </dl>
            <div className="mt-auto grid grid-cols-2 gap-2">
              <Link
                href="/team"
                className="flex flex-col gap-1.5 rounded-2xl bg-deep-2 p-3 transition-colors hover:bg-surface-3"
              >
                <span className="text-xs text-on-deep-2">Tim aktif</span>
                <span className="tabular text-xl leading-none font-medium">{team.length}</span>
                {team.length > 0 && <AvatarStack names={team} max={2} />}
              </Link>
              <Link
                href="/projects"
                className="flex flex-col gap-1.5 rounded-2xl bg-deep-2 p-3 transition-colors hover:bg-surface-3"
              >
                <span className="text-xs text-on-deep-2">Proyek berjalan</span>
                <span className="tabular text-xl leading-none font-medium">
                  {(data.workstreams || []).filter((p) => !isProjectHistory(p)).length}
                </span>
              </Link>
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-4 max-md:contents lg:grid-cols-12">
        <section
          aria-labelledby="done-title"
          // Garis grafik memakai warna sorotan, bukan warna yang mirip tanda terlambat.
          className={cn(
            PANEL,
            'flex flex-col gap-3 [--tone-bar:var(--accent-strong)] max-md:order-5 lg:col-span-7',
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="done-title" className="text-[15px] font-medium">
              Tugas selesai
            </h2>
            <div className="flex items-center gap-2">
              <Tabs
                label="Rentang waktu"
                value={span}
                onChange={setSpan}
                items={[
                  { id: '4', label: '4 mgg' },
                  { id: '12', label: '12 mgg' },
                ]}
              />
              <Link
                href="/tasks?status=selesai"
                aria-label="Buka arsip tugas"
                className={ROUND_LINK}
              >
                <ArrowUpRight />
              </Link>
            </div>
          </div>
          <p className="flex flex-wrap items-baseline gap-x-2.5">
            <span className="text-[34px] leading-none font-normal tracking-tight">
              <CountUp value={weekTotal} />
            </span>
            <span className="text-[13px] text-ink-3">
              tugas dalam {span} minggu terakhir, rata-rata{' '}
              {(weekTotal / Number(span)).toLocaleString('id-ID', { maximumFractionDigits: 1 })} per
              minggu
            </span>
          </p>
          {weekTotal ? (
            <AreaChart
              key={span}
              points={weeks}
              label={`Tugas selesai per minggu, ${weekTotal} dalam ${span} minggu terakhir`}
            />
          ) : (
            <p className="rounded-2xl bg-surface-2 px-4 py-8 text-center text-sm text-ink-3">
              Belum ada tugas selesai yang bertanggal dalam {span} minggu terakhir.
            </p>
          )}
        </section>

        <section
          aria-labelledby="deadline-title"
          className={cn(PANEL, 'flex flex-col gap-3 max-md:order-2 lg:col-span-5')}
        >
          <div className="flex items-center justify-between gap-2">
            <h2 id="deadline-title" className="text-[15px] font-medium">
              Tenggat dekat
              {deadlines.length > 0 && (
                <span className="tabular ml-2 font-normal text-ink-3">{deadlines.length}</span>
              )}
            </h2>
            <Link href="/tasks" aria-label="Buka Tugas" className={ROUND_LINK}>
              <ArrowUpRight />
            </Link>
          </div>
          {deadlines.length ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {deadlines.slice(0, 4).map((row) => (
                  <TaskCard
                    key={row.id}
                    compact
                    task={row}
                    ws={data}
                    refresh={refresh}
                    onOpen={() => setOpenTask(row.id)}
                  />
                ))}
              </div>
              {deadlines.length > 4 && (
                <Link
                  href="/tasks"
                  className="flex items-center justify-center gap-1 rounded-full py-2 text-sm font-medium text-ink-2 transition hover:bg-surface-2 hover:text-ink"
                >
                  Lihat semua {deadlines.length}
                  <ChevronRight className="size-4" />
                </Link>
              )}
            </>
          ) : (
            <EmptyState
              title="Tidak ada tenggat dalam 14 hari"
              description="Tugas aktif bertenggat akan muncul di sini, yang terlambat paling depan."
            />
          )}
        </section>
      </div>

      <div className="grid gap-4 max-md:order-6 lg:grid-cols-12">
        <section aria-labelledby="today-title" className={cn(PANEL, 'lg:col-span-7')}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 id="today-title" className="text-[15px] font-medium">
              {day === date ? 'Hari ini' : formatDate(day)}
            </h2>
            <Link href="/agenda" aria-label="Buka Agenda" className={ROUND_LINK}>
              <ArrowUpRight />
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
                    'relative flex flex-col items-center gap-0.5 rounded-[1.25rem] py-2.5 transition duration-300',
                    value === day ? 'bg-action text-on-action' : 'text-ink-2 hover:bg-surface-2',
                  )}
                >
                  <span className="text-xs opacity-80">{DAY_SHORT[index]}</span>
                  <span className="tabular text-lg font-medium">{Number(value.slice(8))}</span>
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
          <section aria-labelledby="projects-title" className={cn(PANEL, 'flex flex-1 flex-col')}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 id="projects-title" className="text-[15px] font-medium">
                Proyek berjalan
              </h2>
              <Link href="/projects" aria-label="Buka Proyek" className={ROUND_LINK}>
                <ArrowUpRight />
              </Link>
            </div>
            {projects.length ? (
              <div className="grid flex-1 auto-rows-fr grid-cols-2 gap-3">
                {projects.map((project) => {
                  const projectTasks = tasks.filter((t) => t.data.workstream_id === project.id);
                  const progress = scopeProgress(
                    projectTasks.map((t) => t.data as unknown as Task),
                  );
                  return (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      data-tone={projectTone(project)}
                      className="flex min-h-28 flex-col justify-between gap-2 rounded-[1.25rem] bg-tone p-3.5 text-tone-ink ring-1 ring-tone-line ring-inset transition duration-300 hover:-translate-y-0.5 hover:shadow-card"
                    >
                      <span className="line-clamp-2 text-sm leading-snug font-medium text-ink">
                        {String(project.data.title)}
                      </span>
                      <span className="flex items-end justify-between gap-2">
                        <span className="text-xs">{projectTasks.length} tugas</span>
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
