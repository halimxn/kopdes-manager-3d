'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlarmClock,
  ArrowUpRight,
  CalendarDays,
  ClipboardCopy,
  Globe2,
  ListPlus,
  ListTodo,
} from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace } from '@/features/workspace/use-workspace';
import { organizationInfo } from '@/features/workspace/use-loaded-workspace';
import { RecordDetailSheet } from '@/features/records/record-card';
import { RecordFormSheet } from '@/features/records/lazy';
import { TaskRow } from '@/features/tasks/task-card';
import { TaskSheet } from '@/features/tasks/lazy';
import { countTaskStates } from '@/features/tasks/status-counts';
import { MEETING_KINDS, meetingKindOf } from '@/features/agenda/meeting-kinds';
import { isProjectHistory } from '@/features/projects/lifecycle';
import { PageHeader } from '@/components/layout/page-header';
import { PageLoading } from '@/features/records/records-page';
import { Button } from '@/components/ui/button';
import { BarChart, StackBar } from '@/components/ui/charts';
import { Input } from '@/components/ui/field';
import { StatGrid, StatTile } from '@/components/ui/stat';
import { CountUp } from '@/components/ui/count-up';
import { ErrorState, EmptyState, Skeleton } from '@/components/ui/states';
import { Bar } from '@/components/ui/progress';
import { Tabs } from '@/components/ui/tabs';
import { addDays, formatDate, today, weekDays } from '@/lib/date';
import { isActiveTask } from '@/lib/task-status';
import { scopeProgress } from '@/lib/progress';
import { projectTone } from '@/lib/tones';
import { cn } from '@/lib/utils';
import type { Task } from '@/features/records/schemas';
import { RoutinesCard, routineStates, useRoutineChecks } from './routines';
import { greeting, useJakartaClock } from '@/lib/clock';
import { DayAgenda } from './day-agenda';
import { buildDailyReport, parseQuickAdd } from './quick-add';
import { weeklyDone } from './weekly-done';

// Peta dimuat sesudah halaman tampil agar tidak memperbesar unduhan awal.
const CoopMap = dynamic(() => import('./coop-map').then((module) => module.CoopMap), {
  ssr: false,
  loading: () => <Skeleton className="h-full min-h-[25rem] rounded-[var(--radius-card)]" />,
});

const PANEL = 'rounded-[var(--radius-card)] bg-surface p-5 shadow-card ring-1 ring-line';
const OPEN_LINK =
  'grid size-9 shrink-0 place-items-center rounded-full text-ink-3 transition hover:bg-surface-2 hover:text-ink max-sm:size-11 [&_svg]:size-4';

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
  // Yang terlambat dan jatuh hari ini sudah ada di daftar peta; di sini hanya yang akan datang.
  const upcoming = deadlines.filter((row) => String(row.data.due_date) > date);
  const runningProjects = (data.workstreams || []).filter((p) => !isProjectHistory(p));
  const projects = runningProjects.slice(0, 4);
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
  const weeks = weeklyDone(tasks, date, Number(span));
  const weekTotal = weeks.reduce((total, week) => total + week.value, 0);

  const quickAddForm = (
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
        placeholder="Tugas cepat: Cek stok @Budi besok"
        className={cn('h-11 rounded-full border-line-strong bg-surface-2', quick.trim() && 'pr-28')}
      />
      {quick.trim() && (
        <Button
          type="submit"
          size="sm"
          variant="primary"
          className="absolute top-1/2 right-1.5 -translate-y-1/2"
        >
          Tambah
        </Button>
      )}
    </form>
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={`${greeting(now)}, ${(manager || 'Manajer').split(' ')[0]}`}
        subtitle={
          <>
            {longDate(date)}
            {coop && <span className="max-sm:hidden"> · {coop}</span>}
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
              icon={<ListTodo />}
              onClick={() => router.push('/tasks')}
            />
            <StatTile
              label="Terlambat"
              value={late}
              tone={late > 0 ? 'rose' : 'slate'}
              icon={<AlarmClock />}
              onClick={() => router.push('/tasks?status=terlambat')}
            />
            <StatTile
              label="Agenda hari ini"
              value={todayMeetings}
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

      {/* Satu panel utama dan satu kartu ringkasan seperti acuan; di bawah xl rutin didahulukan. */}
      <div className="grid gap-5 xl:grid-cols-12 xl:grid-rows-[35rem]">
        <div className="min-h-0 xl:col-span-8">
          <CoopMap
            ws={data}
            date={date}
            caps={caps}
            more={more}
            refresh={refresh}
            onOpenTask={setOpenTask}
            quickAdd={quickAddForm}
          />
        </div>
        <div className="min-h-0 max-xl:order-first xl:col-span-4">
          <RoutinesCard
            routines={data.routines || []}
            checks={checks}
            setChecks={setChecks}
            reload={reload}
            refresh={refresh}
            ready={routinesReady}
          />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-12">
        <section
          aria-labelledby="today-title"
          className={cn(PANEL, 'flex flex-col gap-4 xl:col-span-6')}
        >
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <h2 id="today-title" className="mr-auto text-lg font-medium">
              {day === date ? 'Hari ini' : formatDate(day)}
            </h2>
            <Link
              href="/agenda"
              aria-label="Buka Agenda"
              className={cn(OPEN_LINK, 'md:order-last')}
            >
              <ArrowUpRight />
            </Link>
            <div
              className="grid w-full grid-cols-7 gap-1 md:w-[24rem]"
              role="group"
              aria-label="Pilih hari"
            >
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
                      'flex flex-col items-center rounded-2xl py-1 transition-colors duration-200',
                      value === day ? 'bg-accent text-accent-ink' : 'text-ink-2 hover:bg-surface-2',
                    )}
                  >
                    <span className="text-[11px] opacity-80">{DAY_SHORT[index]}</span>
                    <span className="tabular text-[15px] leading-5 font-medium">
                      {Number(value.slice(8))}
                    </span>
                    <span
                      className={cn(
                        'mt-0.5 size-1 rounded-full',
                        busy ? 'bg-current' : 'bg-transparent',
                      )}
                    />
                  </button>
                );
              })}
            </div>
          </div>
          <DayAgenda
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

        <section
          aria-labelledby="deadline-title"
          className={cn(PANEL, 'flex flex-col gap-2 xl:col-span-6')}
        >
          <div className="flex items-center justify-between gap-2">
            <h2 id="deadline-title" className="text-lg font-medium">
              Tenggat berikutnya
            </h2>
            <Link href="/tasks" aria-label="Buka Tugas" className={OPEN_LINK}>
              <ArrowUpRight />
            </Link>
          </div>
          {upcoming.length ? (
            <div className="-mx-2 flex flex-col">
              {upcoming.slice(0, 4).map((row) => (
                <TaskRow
                  key={row.id}
                  plain
                  task={row}
                  ws={data}
                  refresh={refresh}
                  onOpen={() => setOpenTask(row.id)}
                />
              ))}
            </div>
          ) : (
            <p className="py-2 text-sm text-ink-3">Tidak ada tenggat dalam 14 hari ke depan.</p>
          )}
        </section>
      </div>

      {/* Tinjauan: satu panel berkolom, bukan tiga kartu, karena ketiganya dibaca bersama. */}
      <section
        aria-label="Tinjauan kerja"
        className={cn(
          PANEL,
          'grid gap-x-8 gap-y-5 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] xl:grid-cols-[minmax(0,3fr)_minmax(0,5fr)_minmax(0,4fr)]',
        )}
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[15px] font-medium">Progres tugas</h2>
            <Link href="/tasks" aria-label="Buka Tugas" className={OPEN_LINK}>
              <ArrowUpRight />
            </Link>
          </div>
          <p className="text-[34px] leading-none font-normal tracking-tight">
            <CountUp value={Math.round(doneRate)} />%
            <span className="ml-2 text-[13px] tracking-normal text-ink-3">selesai</span>
          </p>
          <StackBar
            label={`${counts.selesai} selesai, ${counts.proses} dikerjakan, ${counts.rencana} belum dikerjakan`}
            parts={[
              { value: counts.selesai, className: 'bg-action' },
              { value: counts.proses, className: 'bg-ink-3' },
              { value: counts.rencana, className: 'bg-line-strong' },
            ]}
          />
          <dl className="flex flex-col text-sm">
            {(
              [
                ['Selesai', counts.selesai, 'bg-action', 'selesai'],
                ['Dikerjakan', counts.proses, 'bg-ink-3', 'proses'],
                ['Belum dikerjakan', counts.rencana, 'bg-line-strong', 'rencana'],
                ['Terlambat', late, 'bg-late-bar', 'terlambat'],
              ] as const
            ).map(([label, value, dot, status]) => (
              <Link
                key={status}
                href={`/tasks?status=${status}`}
                className="-mx-2 flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-surface-2"
              >
                <span className={cn('size-2 rounded-full', dot)} aria-hidden="true" />
                <dt className="flex-1 text-ink-2">{label}</dt>
                <dd className="tabular font-medium">{value}</dd>
              </Link>
            ))}
          </dl>
        </div>

        <div className="flex min-w-0 flex-col gap-3 border-line max-md:border-t max-md:pt-5 md:border-l md:pl-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[15px] font-medium">Tugas selesai</h2>
            <div className="flex items-center gap-1">
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
                className={OPEN_LINK}
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
              dalam {span} minggu, rata-rata{' '}
              {(weekTotal / Number(span)).toLocaleString('id-ID', { maximumFractionDigits: 1 })} per
              minggu
            </span>
          </p>
          {weekTotal ? (
            <BarChart
              key={span}
              rows={weeks.map((week) => ({ label: week.label, values: [week.value] }))}
              series={[{ label: 'Tugas selesai', className: 'fill-action' }]}
              height={190}
              label={`Tugas selesai per minggu, ${weekTotal} dalam ${span} minggu terakhir`}
            />
          ) : (
            <p className="rounded-2xl bg-surface-2 px-4 py-8 text-center text-sm text-ink-3">
              Belum ada tugas selesai yang bertanggal dalam {span} minggu terakhir.
            </p>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-3 border-t border-line pt-5 md:col-span-2 xl:col-span-1 xl:border-t-0 xl:border-l xl:pt-0 xl:pl-8">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[15px] font-medium">
              Proyek berjalan
              <span className="tabular ml-2 font-normal text-ink-3">{runningProjects.length}</span>
            </h2>
            <Link href="/projects" aria-label="Buka Proyek" className={OPEN_LINK}>
              <ArrowUpRight />
            </Link>
          </div>
          {projects.length ? (
            <ul className="grid gap-x-8 gap-y-1 md:grid-cols-2 xl:grid-cols-1">
              {projects.map((project) => {
                const projectTasks = tasks.filter((t) => t.data.workstream_id === project.id);
                const progress = scopeProgress(projectTasks.map((t) => t.data as unknown as Task));
                return (
                  <li key={project.id}>
                    <Link
                      href={`/projects/${project.id}`}
                      data-tone={projectTone(project)}
                      className="-mx-2 flex flex-col gap-1.5 rounded-xl px-2 py-2 transition-colors hover:bg-surface-2"
                    >
                      <span className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="truncate font-medium text-ink">
                          {String(project.data.title)}
                        </span>
                        <span className="tabular shrink-0 text-xs text-ink-3">
                          {Math.round(progress)}%
                        </span>
                      </span>
                      <Bar value={progress} label={`Progres ${String(project.data.title)}`} />
                    </Link>
                  </li>
                );
              })}
            </ul>
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
        </div>
      </section>

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
