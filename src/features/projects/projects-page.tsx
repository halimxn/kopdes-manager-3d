'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CircleCheck, FolderKanban, ListChecks, LoaderCircle, Plus, Search } from 'lucide-react';
import type { Item, Task } from '@/features/records/schemas';
import type { Workspace } from '@/features/workspace/use-workspace';
import { useWorkspace } from '@/features/workspace/use-workspace';
import { useRecordParams } from '@/features/records/use-record-params';
import { RecordFormSheet } from '@/features/records/lazy';
import { RecordsView } from '@/features/records/records-view';
import { ENTITY_VIEWS } from '@/features/records/entity-views';
import { PageLoading } from '@/features/records/records-page';
import { formatChoiceLabel } from '@/features/records/catalog';
import { PAGES } from '@/components/layout/nav';
import { PageHeader } from '@/components/layout/page-header';
import { Tabs } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { StatGrid, StatTile } from '@/components/ui/stat';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { SegmentBar } from '@/components/ui/progress';
import { AvatarStack } from '@/components/ui/avatar';
import { scopeProgress } from '@/lib/progress';
import { formatDate, today } from '@/lib/date';
import { projectTone } from '@/lib/tones';
import { isActiveTask } from '@/lib/task-status';
import { isProjectHistory } from './lifecycle';

const RUNNING = ['aktif', 'rencana', 'ditunda'];

/** Kartu proyek: kode, status, progres, kendala, target, dan langkah berikutnya. */
export function ProjectCard({
  project,
  ws,
  index = 0,
}: {
  project: Item;
  ws: Workspace;
  index?: number;
}) {
  const tasks = (ws['work-items'] || []).filter((task) => task.data.workstream_id === project.id);
  const live = tasks.filter((task) => task.data.status !== 'dibatalkan');
  const done = live.filter((task) => task.data.status === 'selesai').length;
  const progress = scopeProgress(tasks.map((task) => task.data as unknown as Task));
  const issueIds = new Set(tasks.map((task) => task.data.issue_id).filter(Boolean));
  const openIssues = (ws.issues || []).filter(
    (issue) => issueIds.has(issue.id) && issue.data.status !== 'ditutup',
  ).length;
  const next = tasks
    .filter((task) => isActiveTask(task.data.status) && String(task.data.due_date) >= today())
    .sort((a, b) => String(a.data.due_date).localeCompare(String(b.data.due_date)))[0];
  const people = [
    ...new Set(
      [
        String(project.data.assignee || ''),
        ...tasks.map((task) => String(task.data.assignee || '')),
      ].filter(Boolean),
    ),
  ];
  return (
    <div className="enter" style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}>
      <Link
        href={`/projects/${project.id}`}
        data-tone={projectTone(project)}
        className="flex h-full flex-col gap-3 rounded-[var(--radius-card)] bg-surface p-5 text-ink-2 shadow-card ring-1 ring-line transition duration-300 hover:-translate-y-0.5 hover:bg-surface-solid"
      >
        <span className="flex items-center gap-2 text-xs">
          <span className="size-2 shrink-0 rounded-full bg-tone-bar" aria-hidden="true" />
          <span className="min-w-0 truncate text-ink-3">#{String(project.data.code || 'PRJ')}</span>
          <span className="ml-auto flex shrink-0 items-center gap-2">
            {['tinggi', 'mendesak'].includes(String(project.data.priority)) && (
              <span className="text-late-bar">Prioritas {String(project.data.priority)}</span>
            )}
            <span>{formatChoiceLabel(String(project.data.status || 'rencana'))}</span>
          </span>
        </span>
        <span className="flex flex-col gap-1">
          <span className="line-clamp-2 text-[17px] leading-snug font-medium text-ink">
            {String(project.data.title)}
          </span>
          {project.data.description ? (
            <span className="line-clamp-2 text-[13px] text-ink-3">
              {String(project.data.description)}
            </span>
          ) : null}
        </span>
        <span className="mt-auto flex flex-col gap-1.5">
          <span className="flex justify-between text-xs">
            {done}/{live.length} tugas selesai{' '}
            <span className="tabular font-medium text-ink">{progress}%</span>
          </span>
          <SegmentBar
            value={progress}
            segments={10}
            label={`Progres ${String(project.data.title)}`}
          />
        </span>
        <span className="truncate text-xs text-ink-3">
          {next ? `Berikutnya: ${String(next.data.title)}` : 'Tidak ada tugas mendatang'}
        </span>
        <span className="flex min-h-8 items-center justify-between gap-3 border-t border-line pt-3 text-xs">
          <span className="min-w-0 truncate">
            {openIssues ? `${openIssues} kendala` : 'Terkendali'}
            {project.data.target_date
              ? ` · Target ${formatDate(String(project.data.target_date))}`
              : ''}
          </span>
          <AvatarStack names={people} max={3} className="shrink-0" />
        </span>
      </Link>
    </div>
  );
}

export function ProjectsPage() {
  const { params, isNew } = useRecordParams();
  const requested = params.get('tab') || params.get('bagian');
  const tab = requested === 'risks' || requested === 'issues' ? requested : 'list';
  const history = params.get('view') === 'history' || params.get('tab') === 'riwayat';
  const { data, loading, error, refresh } = useWorkspace('projects', { scope: 'all' });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [creating, setCreating] = useState(false);
  const [handledNew, setHandledNew] = useState(false);
  if (isNew && tab === 'list' && !handledNew && !loading) {
    setHandledNew(true);
    setCreating(true);
  }
  // Tautan lama /proyek?id=<id> diarahkan ke halaman detail proyek.
  const router = useRouter();
  const legacyId = params.get('id');
  useEffect(() => {
    if (legacyId) router.replace(`/projects/${legacyId}`);
  }, [legacyId, router]);
  if (error) return <ErrorState message={error} onRetry={() => void refresh()} />;
  const projects = (data.workstreams || []).filter((p) =>
    history ? isProjectHistory(p) : !isProjectHistory(p),
  );
  const visible = projects.filter(
    (p) =>
      (!status || p.data.status === status) &&
      `${p.data.title} ${p.data.description}`
        .toLocaleLowerCase('id')
        .includes(search.toLocaleLowerCase('id')),
  );
  const tasks = data['work-items'] || [];
  const statuses = history ? ['selesai', 'diarsipkan'] : RUNNING;
  const allProjects = data.workstreams || [];
  // Satu bilah tab untuk semua bagian, supaya tidak ada dua bilah bertumpuk.
  const tabBar = (
    <Tabs
      label="Bagian proyek"
      items={[
        {
          id: 'list',
          label: 'Berjalan',
          count: loading ? undefined : allProjects.filter((p) => !isProjectHistory(p)).length,
        },
        {
          id: 'history',
          label: 'Riwayat & arsip',
          count: loading ? undefined : allProjects.filter(isProjectHistory).length,
        },
        ...(PAGES.projects.tabs || [])
          .filter((t) => t.id !== 'list')
          .map((t) => ({
            id: t.id,
            label: t.label,
            count: !loading && t.entity ? (data[t.entity] || []).length : undefined,
          })),
      ]}
      value={tab === 'list' && history ? 'history' : tab}
      onChange={(id) => {
        const next = new URLSearchParams(params.toString());
        for (const key of ['tab', 'view', 'bagian']) next.delete(key);
        if (id === 'history') next.set('view', 'history');
        else if (id !== 'list') next.set('tab', id);
        setStatus('');
        router.replace(`/projects${next.size ? `?${next}` : ''}`, { scroll: false });
      }}
    />
  );
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Proyek"
        subtitle={tab === 'list' ? 'Proyek dan bidang kerja koperasi beserta tugasnya.' : undefined}
        sections={
          tab === 'list' && !loading
            ? [
                <StatGrid key="stats">
                  <StatTile
                    icon={<FolderKanban />}
                    label="Total proyek"
                    value={(data.workstreams || []).length}
                    tone="lavender"
                  />
                  <StatTile
                    icon={<LoaderCircle />}
                    label="Berjalan"
                    value={(data.workstreams || []).filter((p) => p.data.status === 'aktif').length}
                    tone="sky"
                  />
                  <StatTile
                    icon={<CircleCheck />}
                    label="Selesai"
                    value={
                      (data.workstreams || []).filter((p) => p.data.status === 'selesai').length
                    }
                    tone="mint"
                  />
                  <StatTile
                    icon={<ListChecks />}
                    label="Tugas terhubung"
                    value={tasks.filter((t) => t.data.workstream_id).length}
                    tone="peach"
                  />
                </StatGrid>,
              ]
            : undefined
        }
      />
      {tab === 'list' && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {tabBar}
          {!history && (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus />
              Proyek baru
            </Button>
          )}
        </div>
      )}
      {loading ? (
        <PageLoading />
      ) : tab !== 'list' ? (
        <RecordsView
          key={tab}
          tabs={tabBar}
          entity={tab === 'risks' ? 'risks' : 'issues'}
          ws={data}
          refresh={refresh}
          details={
            ENTITY_VIEWS[tab === 'risks' ? 'risks' : 'issues']?.details
              ? (rows) => ENTITY_VIEWS[tab === 'risks' ? 'risks' : 'issues']!.details!(rows, data)
              : undefined
          }
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative min-w-0 flex-1 basis-52">
              <span className="sr-only">Cari proyek</span>
              <Search className="pointer-events-none absolute top-1/2 left-4 z-10 size-[18px] -translate-y-1/2 text-ink-3" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari proyek…"
                className="rounded-full border-line-strong bg-surface-2 pl-11"
              />
            </label>
            <div className="scrollbar-none flex max-w-full gap-2 overflow-x-auto p-px">
              {['', ...statuses].map((value) => (
                <button
                  key={value || 'all'}
                  type="button"
                  aria-pressed={status === value}
                  onClick={() => setStatus(value)}
                  className="flex h-9 shrink-0 items-center gap-2 rounded-full bg-surface-2 px-3.5 text-[13px] font-medium text-ink-2 ring-1 ring-line transition aria-pressed:bg-action aria-pressed:text-on-action"
                >
                  {value ? formatChoiceLabel(value) : 'Semua'}
                  <span className="tabular text-xs opacity-70">
                    {value
                      ? projects.filter((p) => p.data.status === value).length
                      : projects.length}
                  </span>
                </button>
              ))}
            </div>
          </div>
          {visible.length ? (
            <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((project, index) => (
                <ProjectCard key={project.id} project={project} ws={data} index={index} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<FolderKanban />}
              title={
                projects.length
                  ? 'Tidak ada proyek yang cocok'
                  : history
                    ? 'Belum ada proyek di riwayat'
                    : 'Belum ada proyek berjalan'
              }
              description={
                history
                  ? 'Proyek berstatus Selesai atau Diarsipkan tampil di sini.'
                  : 'Proyek mengelompokkan tugas, milestone, anggaran, dan catatan.'
              }
              action={
                !history && !projects.length ? (
                  <Button variant="primary" onClick={() => setCreating(true)}>
                    <Plus />
                    Proyek baru
                  </Button>
                ) : undefined
              }
            />
          )}
        </>
      )}
      <RecordFormSheet
        open={creating}
        entity="workstreams"
        prefill={{ status: 'aktif', start_date: today() }}
        workspace={data}
        refresh={refresh}
        onClose={() => setCreating(false)}
      />
    </div>
  );
}
