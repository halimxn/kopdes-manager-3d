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

/** Kartu proyek pastel: kode, status, progres, kendala, target, dan langkah berikutnya. */
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
        className="flex h-full flex-col gap-3 rounded-[var(--radius-card)] bg-tone p-5 text-tone-ink ring-1 ring-tone-line ring-inset transition duration-300 hover:-translate-y-0.5 hover:shadow-card"
      >
        <span className="relative flex flex-wrap items-center gap-1.5">
          <span className="rounded-full border border-tone-line px-2.5 py-0.5 text-[11px] font-semibold">
            #{String(project.data.code || 'PRJ')}
          </span>
          <span className="rounded-full bg-surface/75 px-2.5 py-0.5 text-[11px] font-bold">
            {formatChoiceLabel(String(project.data.status || 'rencana'))}
          </span>
          {['tinggi', 'mendesak'].includes(String(project.data.priority)) && (
            <span className="rounded-full bg-surface/75 px-2 py-0.5 text-[11px] font-bold text-late-ink">
              Prioritas {String(project.data.priority)}
            </span>
          )}
        </span>
        <span className="relative text-lg leading-snug font-extrabold text-ink">
          {String(project.data.title)}
        </span>
        {project.data.description ? (
          <span className="relative line-clamp-2 text-sm">{String(project.data.description)}</span>
        ) : null}
        <span className="relative flex flex-col gap-1.5">
          <span className="flex justify-between text-xs font-bold">
            Progres <span className="tabular">{progress}%</span>
          </span>
          <SegmentBar
            value={progress}
            segments={10}
            label={`Progres ${String(project.data.title)}`}
            onTone
          />
        </span>
        <span className="relative text-xs font-semibold">
          {done}/{live.length} tugas selesai · {openIssues ? `${openIssues} kendala` : 'Terkendali'}
          {project.data.target_date
            ? ` · Target ${formatDate(String(project.data.target_date))}`
            : ''}
        </span>
        {next && (
          <span className="relative truncate rounded-xl bg-surface/70 px-3 py-2 text-xs font-semibold">
            Berikutnya: {String(next.data.title)}
          </span>
        )}
        <span className="relative mt-auto flex items-center justify-between">
          <AvatarStack names={people} />
        </span>
      </Link>
    </div>
  );
}

export function ProjectsPage() {
  const { params, setParam, isNew } = useRecordParams();
  const tab =
    params.get('tab') ||
    (params.get('bagian') === 'risks'
      ? 'risks'
      : params.get('bagian') === 'issues'
        ? 'issues'
        : 'list');
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
        actions={
          <>
            <Tabs
              label="Bagian proyek"
              items={(PAGES.projects.tabs || []).map((t) => ({
                id: t.id,
                label: t.label,
                count:
                  !loading && t.entity && t.id !== 'list'
                    ? (data[t.entity] || []).length
                    : undefined,
              }))}
              value={tab}
              onChange={(id) => setParam('tab', id === 'list' ? null : id)}
            />
            {tab === 'list' && !history && (
              <Button variant="primary" onClick={() => setCreating(true)}>
                <Plus />
                Proyek baru
              </Button>
            )}
          </>
        }
      />
      {loading ? (
        <PageLoading />
      ) : tab !== 'list' ? (
        <RecordsView
          key={tab}
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
            <Tabs
              label="Proyek berjalan atau riwayat"
              items={[
                { id: 'running', label: 'Berjalan' },
                { id: 'history', label: 'Riwayat & arsip' },
              ]}
              value={history ? 'history' : 'running'}
              onChange={(id) => setParam('view', id === 'history' ? 'history' : null)}
            />
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
            <div className="scrollbar-none flex gap-2 overflow-x-auto">
              {['', ...statuses].map((value) => (
                <button
                  key={value || 'all'}
                  type="button"
                  aria-pressed={status === value}
                  onClick={() => setStatus(value)}
                  className="flex h-9 shrink-0 items-center gap-2 rounded-full bg-surface-2 px-3.5 text-[13px] font-medium text-ink-2 shadow-card aria-pressed:bg-action aria-pressed:text-on-action"
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
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
