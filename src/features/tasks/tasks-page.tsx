'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence } from 'motion/react';
import * as motion from 'motion/react-m';
import { DropdownMenu, Popover } from 'radix-ui';
import {
  AlarmClock,
  ArchiveRestore,
  Bookmark,
  CalendarDays,
  CalendarRange,
  CircleCheck,
  CircleDashed,
  Columns3,
  Download,
  Ellipsis,
  FileUp,
  List,
  ListChecks,
  LoaderCircle,
  Plus,
  Target,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Item } from '@/features/records/schemas';
import { useWorkspace } from '@/features/workspace/use-workspace';
import { organizationInfo } from '@/features/workspace/use-loaded-workspace';
import { useRecordParams } from '@/features/records/use-record-params';
import { RecordFormSheet } from '@/features/records/lazy';
import { CsvImportSheet } from '@/features/records/lazy';
import { PageLoading } from '@/features/records/records-page';
import { displayValue, fieldLabel } from '@/features/records/related';
import { isProjectHistory } from '@/features/projects/lifecycle';
import { PageHeader } from '@/components/layout/page-header';
import { ViewMenu } from '@/components/ui/view-menu';
import { AvatarStack } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input, SearchField, Select, TOOLBAR_CONTROL } from '@/components/ui/field';
import { StatGrid, StatTile } from '@/components/ui/stat';
import { EmptyState, ErrorState, Notice } from '@/components/ui/states';
import { Sheet } from '@/components/ui/sheet';
import { MenuContent, MenuItem, PopoverContent } from '@/components/ui/menu';
import { DateField } from '@/components/ui/date-time-field';
import { SegmentBar } from '@/components/ui/progress';
import { usePreference } from '@/lib/use-preference';
import { downloadCsv } from '@/lib/ledger';
import { addDays, formatDate, today } from '@/lib/date';
import { isActiveTask, isOverdue, taskStatusChange, type TaskStatus } from '@/lib/task-status';
import { planProgress } from '@/lib/progress';
import { catalog } from '@/features/records/catalog';
import { countTaskStates } from './status-counts';
import { TaskBoard } from './task-board';
import { TaskList } from './task-list';
import { TaskCalendar } from './task-calendar';
import { TaskTimeline } from './task-timeline';
import { TaskSheet } from './lazy';
import { TaskRow } from './task-card';
import { saveTask } from './task-actions';

type View = 'list' | 'board' | 'calendar' | 'timeline';
/** Saringan di bilah alat: selebar pilihan yang aktif, bukan terpotong di lebar tetap. */
const FILTER_SELECT = `${TOOLBAR_CONTROL} w-auto max-w-60 shrink-0 field-sizing-content`;
const LEGACY_VIEWS: Record<string, View> = {
  daftar: 'list',
  harian: 'list',
  papan: 'board',
  kalender: 'calendar',
  gantt: 'timeline',
};
const PRIORITY_RANK: Record<string, number> = { mendesak: 0, tinggi: 1, normal: 2, rendah: 3 };
type SavedView = {
  name: string;
  search: string;
  status: string;
  project: string;
  assignee: string;
  priority: string;
  sort: string;
  view: View;
  sprint: string;
};

export function TasksPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { params, isNew, prefill, clear, setParam } = useRecordParams();
  const status = params.get('status') || '';
  const archive = ['selesai', 'dibatalkan'].includes(status);
  const viewParam = params.get('view') || '';
  const view: View = (LEGACY_VIEWS[viewParam] ||
    (['list', 'board', 'calendar', 'timeline'].includes(viewParam) ? viewParam : 'list')) as View;
  const workspace = useWorkspace('tasks', { scope: archive ? 'history' : 'current' });
  const { data, loading, error, refresh, more, loadMore, fetching } = workspace;
  const [search, setSearch] = useState('');
  const project = params.get('project') || '';
  const [assignee, setAssignee] = useState('');
  const [priority, setPriority] = useState('');
  const [sprint, setSprint] = useState('');
  const [sort, setSort] = useState('due');
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<Record<string, unknown> | null>(null);
  const [importing, setImporting] = useState(false);
  const [sprints, setSprints] = useState(false);
  const [sprintForm, setSprintForm] = useState<{ item?: Item } | null>(null);
  const [savedText, setSavedText] = usePreference('kopdes-task-views', '[]');
  const saved: SavedView[] = (() => {
    try {
      return JSON.parse(savedText) as SavedView[];
    } catch {
      return [];
    }
  })();
  const openTaskId = params.get('task');
  const tasks = useMemo(() => data['work-items'] || [], [data]);
  const manager = organizationInfo(data).manager || 'Manajer';
  const date = today();

  // ?new=1 (tombol N, menu Tambah, tautan saran) membuka formulir tugas sekali.
  const [handledNew, setHandledNew] = useState(false);
  if (isNew && !handledNew && !loading) {
    setHandledNew(true);
    setForm({ due_date: date, ...(project ? { workstream_id: project } : {}), ...prefill });
  }
  if (!isNew && handledNew) setHandledNew(false);

  const filtered = useMemo(() => {
    const words = search.toLocaleLowerCase('id').split(/\s+/).filter(Boolean);
    return tasks
      .filter((task) => {
        const d = task.data;
        if (project && d.workstream_id !== project) return false;
        if (sprint && d.sprint_id !== sprint) return false;
        if (priority && d.priority !== priority) return false;
        if (
          assignee === '-'
            ? Boolean(d.assignee)
            : assignee && String(d.assignee || '').toLowerCase() !== assignee.toLowerCase()
        )
          return false;
        if (view === 'list' && !archive) {
          if (status === 'terlambat') {
            if (!isOverdue(d, date)) return false;
          } else if (status) {
            if (d.status !== status) return false;
          } else if (!isActiveTask(d.status)) return false;
        }
        if (!words.length) return true;
        const text = JSON.stringify(d).toLocaleLowerCase('id');
        return words.every((word) => text.includes(word));
      })
      .sort((a, b) => {
        if (archive)
          return String(b.data.completed_at || b.updated_at).localeCompare(
            String(a.data.completed_at || a.updated_at),
          );
        if (sort === 'title') return String(a.data.title).localeCompare(String(b.data.title), 'id');
        if (sort === 'updated') return b.updated_at.localeCompare(a.updated_at);
        if (sort === 'priority')
          return (
            (PRIORITY_RANK[String(a.data.priority)] ?? 2) -
              (PRIORITY_RANK[String(b.data.priority)] ?? 2) ||
            String(a.data.due_date).localeCompare(String(b.data.due_date))
          );
        return String(a.data.due_date || '9999').localeCompare(String(b.data.due_date || '9999'));
      });
  }, [tasks, search, project, sprint, priority, assignee, status, view, archive, sort, date]);

  // Pintasan J/K pindah fokus antar tugas, X centang tugas yang sedang dipilih.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement;
      if (
        target.closest('input, textarea, select') ||
        document.querySelector('[role="dialog"][data-state="open"]')
      )
        return;
      const items = [...document.querySelectorAll<HTMLElement>('main [data-task][tabindex]')];
      const current = target.closest<HTMLElement>('[data-task]');
      const key = event.key.toLowerCase();
      if (key === 'j' || key === 'k') {
        event.preventDefault();
        const index = current ? items.indexOf(current) : -1;
        const next = items[Math.max(0, Math.min(items.length - 1, index + (key === 'j' ? 1 : -1)))];
        next?.focus();
        next?.scrollIntoView({ block: 'nearest' });
      } else if (key === 'x' && current) {
        event.preventDefault();
        current.querySelector<HTMLButtonElement>('[role="checkbox"]')?.click();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (error) return <ErrorState message={error} onRetry={() => void refresh()} />;
  if (loading) return <PageLoading />;

  const counts = countTaskStates(tasks, date);
  const assignees = [
    ...new Set(
      tasks
        .filter((t) => isActiveTask(t.data.status))
        .map((t) => String(t.data.assignee || ''))
        .filter(Boolean),
    ),
  ];
  const projectRow = (data.workstreams || []).find((row) => row.id === project);
  const closedProject = projectRow && isProjectHistory(projectRow);
  const people = [
    ...new Set(tasks.map((task) => String(task.data.assignee || '')).filter(Boolean)),
  ].sort();
  const setStatus = (next: string) => setParam('status', status === next ? null : next);
  const openTask =
    filtered.find((t) => t.id === openTaskId) || tasks.find((t) => t.id === openTaskId);
  const addTask = (extra: Record<string, unknown> = {}) => {
    if (closedProject)
      return toast(
        'Buka kembali proyek sebelum menambah tugas baru. Tugas yang sudah ada tetap dapat diperiksa.',
      );
    setForm({ due_date: date, ...(project ? { workstream_id: project } : {}), ...extra });
  };
  const batch = async (label: string, change: (task: Item) => Record<string, unknown>) => {
    const rows = tasks.filter((task) => selected.has(task.id));
    let done = 0;
    try {
      for (const task of rows) {
        await saveTask(task, change(task), label, manager);
        done++;
      }
      toast.success(`${done} tugas diperbarui`);
      setSelected(new Set());
      setSelecting(false);
    } catch (e) {
      toast.error(`${done} dari ${rows.length} tugas tersimpan. ${(e as Error).message}`);
    } finally {
      await refresh();
    }
  };
  const currentView: SavedView = {
    name: '',
    search,
    status,
    project,
    assignee,
    priority,
    sort,
    view,
    sprint,
  };
  const applyView = (saved: SavedView) => {
    setSearch(saved.search);
    setAssignee(saved.assignee);
    setPriority(saved.priority);
    setSort(saved.sort);
    setSprint(saved.sprint);
    const next = new URLSearchParams();
    if (saved.status) next.set('status', saved.status);
    if (saved.project) next.set('project', saved.project);
    if (saved.view !== 'list') next.set('view', saved.view);
    router.replace(`${pathname}${next.size ? `?${next}` : ''}`);
  };
  const exportCsv = () => {
    const fields = [
      'title',
      'workstream_id',
      'assignee',
      'status',
      'priority',
      'start_date',
      'due_date',
      'completed_at',
    ];
    downloadCsv(
      `tugas-${date}.csv`,
      fields.map((field) => fieldLabel('work-items', field)),
      filtered.map((task) =>
        fields.map((field) => displayValue('work-items', field, task.data[field], data)),
      ),
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={
          archive
            ? status === 'dibatalkan'
              ? 'Tugas dibatalkan'
              : 'Arsip tugas selesai'
            : projectRow
              ? String(projectRow.data.title)
              : 'Tugas'
        }
        subtitle={
          archive
            ? `${filtered.length} tugas`
            : `${counts.rencana + counts.proses} aktif · ${counts.terlambat} terlambat`
        }
        sections={
          archive
            ? undefined
            : [
                <StatGrid key="stats">
                  <StatTile
                    label="Rencana"
                    value={counts.rencana}
                    tone="lavender"
                    icon={<CircleDashed />}
                    onClick={() => setStatus('rencana')}
                    active={status === 'rencana'}
                  />
                  <StatTile
                    label="Dikerjakan"
                    value={counts.proses}
                    tone="sky"
                    icon={<LoaderCircle />}
                    onClick={() => setStatus('proses')}
                    active={status === 'proses'}
                  />
                  <StatTile
                    label="Terlambat"
                    value={counts.terlambat}
                    tone="rose"
                    icon={<AlarmClock />}
                    onClick={() => setStatus('terlambat')}
                    active={status === 'terlambat'}
                  />
                  <StatTile
                    label="Selesai, buka arsip"
                    value={counts.selesai}
                    tone="mint"
                    icon={<CircleCheck />}
                    onClick={() => setParam('status', 'selesai')}
                  />
                </StatGrid>,
              ]
        }
        actions={
          // Di HP tombol tambah koral di bilah bawah sudah membuka tugas baru.
          <Button
            variant="primary"
            onClick={() => addTask()}
            disabled={closedProject}
            className="max-md:hidden"
          >
            <Plus />
            Tugas baru
          </Button>
        }
      />
      {closedProject && (
        <Notice>
          Proyek ini sudah masuk riwayat. Buka kembali proyek sebelum menambah tugas baru. Tugas
          yang sudah ada tetap dapat diperiksa.
        </Notice>
      )}

      {archive && (
        <Link
          href="/tasks"
          className="self-start text-sm font-bold text-accent-ink hover:underline"
        >
          ← Kembali ke tugas aktif
        </Link>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {!archive && (
          <>
            <ViewMenu
              key="view"
              label="Cara melihat tugas"
              caption="Ganti tampilan"
              value={view}
              onChange={(id) => setParam('view', id === 'list' ? null : id)}
              items={[
                { id: 'list', label: 'Daftar', icon: <List /> },
                { id: 'board', label: 'Papan', icon: <Columns3 /> },
                { id: 'calendar', label: 'Kalender', icon: <CalendarDays /> },
                { id: 'timeline', label: 'Linimasa', icon: <CalendarRange /> },
              ]}
            />
            {assignees.length > 0 && (
              <AvatarStack names={assignees} max={3} className="max-lg:hidden" />
            )}
          </>
        )}
        <SearchField
          value={search}
          onChange={setSearch}
          label="Cari tugas"
          placeholder="Cari tugas…"
          className="flex-1 basis-40 sm:basis-56"
        />
        {/* Saringan di baris kedua, di bawah pencarian dan tombol aksi: di HP satu baris geser, di tablet
            dan laptop baris yang boleh membungkus; layar lebar sebaris dengan pencarian. */}
        <div className="scrollbar-none order-last -mx-4 flex w-[calc(100%+2rem)] gap-2 overflow-x-auto px-4 py-1 md:mx-0 md:w-full md:flex-wrap md:overflow-visible md:px-0 md:py-0 2xl:order-none 2xl:w-auto">
          <Select
            aria-label="Proyek"
            value={project}
            onChange={(event) => setParam('project', event.target.value || null)}
            className={FILTER_SELECT}
          >
            <option value="">Semua proyek</option>
            {(data.workstreams || []).map((row) => (
              <option key={row.id} value={row.id}>
                {String(row.data.title)}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Penanggung jawab"
            value={assignee}
            onChange={(event) => setAssignee(event.target.value)}
            className={FILTER_SELECT}
          >
            <option value="">Semua orang</option>
            <option value="-">Belum ada penanggung jawab</option>
            {people.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Prioritas"
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
            className={FILTER_SELECT}
          >
            <option value="">Semua prioritas</option>
            {['mendesak', 'tinggi', 'normal', 'rendah'].map((p) => (
              <option key={p} value={p}>
                {p[0].toUpperCase() + p.slice(1)}
              </option>
            ))}
          </Select>
          {(data.sprints || []).length > 0 && (
            <Select
              aria-label="Periode kerja"
              value={sprint}
              onChange={(event) => setSprint(event.target.value)}
              className={FILTER_SELECT}
            >
              <option value="">Semua periode</option>
              {(data.sprints || []).map((row) => (
                <option key={row.id} value={row.id}>
                  {String(row.data.title)}
                </option>
              ))}
            </Select>
          )}
          {view === 'list' && (
            <Select
              aria-label="Urutkan"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              className={FILTER_SELECT}
            >
              <option value="due">Tenggat terdekat</option>
              <option value="priority">Prioritas</option>
              <option value="title">Judul A–Z</option>
              <option value="updated">Terakhir diubah</option>
            </Select>
          )}
        </div>
        <Popover.Root>
          <Popover.Trigger asChild>
            <Button
              size="icon"
              className="size-11 shadow-card"
              aria-label="Tampilan tersimpan"
              title="Tampilan tersimpan"
            >
              <Bookmark />
            </Button>
          </Popover.Trigger>
          <PopoverContent align="end" className="w-72 p-3">
            <SavedViews
              saved={saved}
              onApply={applyView}
              onSave={(name) =>
                setSavedText(
                  JSON.stringify(
                    [...saved.filter((s) => s.name !== name), { ...currentView, name }].slice(-10),
                  ),
                )
              }
              onDelete={(name) =>
                setSavedText(JSON.stringify(saved.filter((s) => s.name !== name)))
              }
            />
          </PopoverContent>
        </Popover.Root>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button
              size="icon"
              className="size-11 shadow-card"
              aria-label="Lainnya"
              title="Lainnya"
            >
              <Ellipsis />
            </Button>
          </DropdownMenu.Trigger>
          <MenuContent align="end" className="w-56">
            <MenuItem onSelect={() => setSprints(true)}>
              <Target />
              Periode kerja
            </MenuItem>
            <MenuItem onSelect={exportCsv}>
              <Download />
              Unduh CSV
            </MenuItem>
            <MenuItem onSelect={() => setImporting(true)}>
              <FileUp />
              Impor CSV
            </MenuItem>
            <MenuItem onSelect={() => setParam('status', 'dibatalkan')}>
              <ArchiveRestore />
              Tugas dibatalkan
            </MenuItem>
          </MenuContent>
        </DropdownMenu.Root>
        {view === 'list' && !archive && (
          <Button
            // Di HP cukup ikon agar cari, simpanan, lainnya, dan pilih muat satu baris.
            className="shadow-card max-sm:w-11 max-sm:px-0"
            variant={selecting ? 'primary' : 'secondary'}
            onClick={() => {
              setSelecting(!selecting);
              setSelected(new Set());
            }}
          >
            <ListChecks />
            <span className="max-sm:sr-only">{selecting ? 'Selesai memilih' : 'Pilih'}</span>
          </Button>
        )}
      </div>

      {archive ? (
        filtered.length ? (
          <ul className="flex flex-col gap-2">
            {filtered.map((task) => (
              <li key={task.id} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <TaskRow
                    task={task}
                    ws={data}
                    refresh={refresh}
                    onOpen={() => setParam('task', task.id)}
                  />
                </div>
                <Button
                  onClick={async () => {
                    await saveTask(
                      task,
                      taskStatusChange('reopen'),
                      'membuka kembali tugas',
                      manager,
                    );
                    await refresh();
                    toast.success('Tugas dibuka kembali');
                  }}
                >
                  <ArchiveRestore />
                  Buka lagi
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="Arsip masih kosong"
            description="Tugas yang selesai atau dibatalkan akan tersimpan di sini."
          />
        )
      ) : filtered.length === 0 && view === 'list' ? (
        <EmptyState
          title={tasks.length ? 'Tidak ada tugas yang cocok' : 'Belum ada tugas'}
          description={
            tasks.length
              ? 'Ubah saringan atau kata pencarian.'
              : 'Tambahkan tugas pertama, atau ketik di kolom tugas cepat di Beranda.'
          }
          action={
            tasks.length ? (
              <Button
                onClick={() => {
                  setSearch('');
                  setAssignee('');
                  setPriority('');
                  setSprint('');
                  router.replace(pathname);
                }}
              >
                <X />
                Hapus saringan
              </Button>
            ) : (
              <Button variant="primary" onClick={() => addTask()}>
                <Plus />
                Tugas baru
              </Button>
            )
          }
        />
      ) : view === 'board' ? (
        <TaskBoard
          tasks={filtered}
          ws={data}
          refresh={refresh}
          onOpen={(id) => setParam('task', id)}
          onAdd={(s: TaskStatus) => addTask({ status: s })}
          user={manager}
        />
      ) : view === 'calendar' ? (
        <TaskCalendar
          tasks={filtered}
          ws={data}
          refresh={refresh}
          onOpen={(id) => setParam('task', id)}
          onAdd={(due) => addTask({ due_date: due })}
        />
      ) : view === 'timeline' ? (
        <TaskTimeline
          tasks={filtered}
          ws={data}
          refresh={refresh}
          onOpen={(id) => setParam('task', id)}
          user={manager}
        />
      ) : (
        <TaskList
          tasks={filtered}
          ws={data}
          refresh={refresh}
          onOpen={(id) => setParam('task', id)}
          selecting={selecting}
          selected={selected}
          onToggleSelect={(id) =>
            setSelected((current) => {
              const next = new Set(current);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            })
          }
        />
      )}
      {more['work-items'] !== undefined && (
        <Button
          className="self-center"
          busy={fetching === 'work-items'}
          onClick={() => void loadMore('work-items')}
        >
          Muat 50 tugas lagi
        </Button>
      )}

      <AnimatePresence>
        {selecting && selected.size > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed inset-x-3 bottom-24 z-40 mx-auto flex max-w-3xl flex-wrap items-center gap-2 rounded-3xl bg-action p-3 text-on-action shadow-float md:bottom-6"
          >
            <span className="px-2 text-sm font-bold">{selected.size} dipilih</span>
            <span className="ml-auto flex flex-wrap gap-2">
              {(['rencana', 'proses', 'selesai'] as TaskStatus[]).map((s) => (
                <Button
                  key={s}
                  size="sm"
                  className="bg-surface text-ink"
                  onClick={() =>
                    void batch(`mengubah status menjadi ${s}`, () =>
                      taskStatusChange(
                        s === 'selesai' ? 'complete' : s === 'proses' ? 'start' : 'plan',
                      ),
                    )
                  }
                >
                  {s === 'rencana' ? 'Rencana' : s === 'proses' ? 'Dikerjakan' : 'Selesai'}
                </Button>
              ))}
              <Button
                size="sm"
                className="bg-surface text-ink"
                onClick={() =>
                  void batch('menunda satu hari', (task) => ({
                    due_date: addDays(
                      String(task.data.due_date) < date ? date : String(task.data.due_date),
                      1,
                    ),
                  }))
                }
              >
                Tunda 1 hari
              </Button>
              <DateField
                value=""
                placeholder="Ubah tenggat"
                aria-label="Ubah tenggat tugas terpilih"
                className="h-9 w-auto border-transparent bg-surface text-[13px] font-semibold"
                onChange={(value) =>
                  value && void batch(`memindah tenggat ke ${value}`, () => ({ due_date: value }))
                }
              />
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <TaskSheet
        task={openTask}
        ws={data}
        open={Boolean(openTask)}
        onClose={() => setParam('task', null)}
        refresh={refresh}
        siblings={filtered}
        onNavigate={(id) => setParam('task', id)}
      />
      <RecordFormSheet
        open={Boolean(form)}
        entity="work-items"
        prefill={form || undefined}
        workspace={data}
        refresh={refresh}
        onClose={() => {
          setForm(null);
          clear();
        }}
      />
      <CsvImportSheet
        entity="work-items"
        open={importing}
        onClose={() => setImporting(false)}
        refresh={refresh}
      />
      <Sheet
        open={sprints}
        onOpenChange={setSprints}
        title="Periode kerja"
        description={catalog.sprints.description}
      >
        <div className="flex flex-col gap-3">
          <Button variant="primary" onClick={() => setSprintForm({})}>
            <Plus />
            Periode baru
          </Button>
          {(data.sprints || []).length === 0 && (
            <p className="text-sm text-ink-3">
              Belum ada periode kerja. Periode membantu menargetkan tugas mingguan atau bulanan.
            </p>
          )}
          {[...(data.sprints || [])]
            .sort(
              (a, b) => (a.data.status === 'aktif' ? -1 : 0) - (b.data.status === 'aktif' ? -1 : 0),
            )
            .map((row) => {
              const sprintTasks = tasks
                .filter((task) => task.data.sprint_id === row.id)
                .map((task) => ({ status: task.data.status as TaskStatus }));
              const progress = planProgress(sprintTasks);
              return (
                <article
                  key={row.id}
                  data-tone={row.data.status === 'aktif' ? 'sky' : 'slate'}
                  className="flex flex-col gap-2 rounded-2xl bg-tone p-4 text-tone-ink"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex-1 font-bold text-ink">{String(row.data.title)}</span>
                    <span className="rounded-full bg-surface/70 px-2 py-0.5 text-xs font-bold">
                      {String(row.data.status)}
                    </span>
                  </div>
                  {row.data.goal ? <p className="text-sm">{String(row.data.goal)}</p> : null}
                  <p className="text-xs font-semibold">
                    {formatDate(String(row.data.start_date))} –{' '}
                    {formatDate(String(row.data.end_date))} · {sprintTasks.length} tugas
                  </p>
                  <SegmentBar value={progress} segments={10} label="Progres periode" />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-surface/80"
                      onClick={() => {
                        setSprint(row.id);
                        setSprints(false);
                      }}
                    >
                      Lihat tugas
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setSprintForm({ item: row })}>
                      Ubah
                    </Button>
                  </div>
                </article>
              );
            })}
        </div>
      </Sheet>
      <RecordFormSheet
        open={Boolean(sprintForm)}
        entity="sprints"
        item={sprintForm?.item}
        prefill={{
          title: `Periode ${(data.sprints || []).length + 1}`,
          start_date: date,
          end_date: addDays(date, 14),
        }}
        workspace={data}
        refresh={refresh}
        onClose={() => setSprintForm(null)}
      />
    </div>
  );
}

function SavedViews({
  saved,
  onApply,
  onSave,
  onDelete,
}: {
  saved: SavedView[];
  onApply: (view: SavedView) => void;
  onSave: (name: string) => void;
  onDelete: (name: string) => void;
}) {
  const [name, setName] = useState('');
  return (
    <div className="flex flex-col gap-2">
      <p className="px-1 text-sm font-bold">Tampilan tersimpan</p>
      {saved.length === 0 && (
        <p className="px-1 text-xs text-ink-3">
          Simpan saringan dan cara melihat yang sering dipakai.
        </p>
      )}
      {saved.map((view) => (
        <span key={view.name} className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onApply(view)}
            className="flex-1 truncate rounded-xl px-3 py-2 text-left text-sm font-semibold hover:bg-surface-2"
          >
            {view.name}
          </button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={`Hapus ${view.name}`}
            onClick={() => onDelete(view.name)}
          >
            <X />
          </Button>
        </span>
      ))}
      <form
        className="mt-1 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim()) return;
          onSave(name.trim().slice(0, 40));
          setName('');
          toast.success('Tampilan disimpan');
        }}
      >
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nama tampilan"
          maxLength={40}
          className="h-10"
        />
        <Button type="submit" size="sm" variant="primary" disabled={!name.trim()}>
          Simpan
        </Button>
      </form>
    </div>
  );
}
