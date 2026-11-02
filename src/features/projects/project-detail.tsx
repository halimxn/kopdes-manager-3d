'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Diamond,
  ExternalLink,
  Pencil,
  Plus,
  RotateCcw,
  Scale,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Item, Task } from '@/features/records/schemas';
import type { Workspace } from '@/features/workspace/use-workspace';
import { useWorkspace } from '@/features/workspace/use-workspace';
import { RecordFormSheet } from '@/features/records/lazy';
import { formatChoiceLabel } from '@/features/records/catalog';
import { PageLoading } from '@/features/records/records-page';
import { TaskBoard } from '@/features/tasks/task-board';
import { TaskList } from '@/features/tasks/task-list';
import { TaskSheet } from '@/features/tasks/lazy';
import { TaskRow } from '@/features/tasks/task-card';
import { recordLink } from '@/components/layout/nav';
import { Tabs } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/field';
import { StatGrid, StatTile } from '@/components/ui/stat';
import { EmptyState, ErrorState, Notice } from '@/components/ui/states';
import { SegmentBar, Bar } from '@/components/ui/progress';
import { api } from '@/lib/client';
import { rupiah } from '@/lib/ledger';
import { daysBetween, formatDate, today } from '@/lib/date';
import { projectTone } from '@/lib/tones';
import { scopeProgress } from '@/lib/progress';
import { isActiveTask, type TaskStatus } from '@/lib/task-status';
import { isProjectHistory } from './lifecycle';
import { cn } from '@/lib/utils';

/** Realisasi anggaran dari buku kas yang ditautkan ke proyek; galat tampil sebagai galat, bukan nol. */
function useProjectCash(projectId: string, enabled: boolean) {
  const [state, setState] = useState<{ rows: Item[]; error: string; loading: boolean }>({
    rows: [],
    error: '',
    loading: true,
  });
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    (async () => {
      const rows: Item[] = [];
      for (let page = 0; page < 50; page++) {
        const result = await api<{ items: Item[]; hasMore: boolean }>(
          `cash-entries?project=${projectId}&scope=all&limit=100&offset=${page * 100}`,
        );
        rows.push(...result.items);
        if (!result.hasMore) break;
      }
      return rows;
    })()
      .then((rows) => live && setState({ rows, error: '', loading: false }))
      .catch(
        (error: Error) => live && setState({ rows: [], error: error.message, loading: false }),
      );
    return () => {
      live = false;
    };
  }, [projectId, enabled]);
  return state;
}

/** Catatan proyek dengan format ringan: judul (#, ##), butir (-), daftar periksa (- [ ]), kutipan (>). */
function NotesView({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-1.5 text-[15px] leading-relaxed">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('## '))
          return (
            <h4 key={i} className="mt-2 text-base font-extrabold">
              {line.slice(3)}
            </h4>
          );
        if (line.startsWith('# '))
          return (
            <h3 key={i} className="mt-2 text-lg font-extrabold">
              {line.slice(2)}
            </h3>
          );
        if (/^- \[[ x]\] /.test(line))
          return (
            <p
              key={i}
              className={cn(
                'flex items-center gap-2',
                line[3] === 'x' && 'text-ink-3 line-through',
              )}
            >
              <span
                className={cn(
                  'grid size-4 place-items-center rounded border-2 border-line-strong text-[10px]',
                  line[3] === 'x' && 'border-done-bar bg-done-bar text-on-bar',
                )}
              >
                {line[3] === 'x' ? '✓' : ''}
              </span>
              {line.slice(6)}
            </p>
          );
        if (line.startsWith('- '))
          return (
            <p key={i} className="pl-4 before:-ml-4 before:mr-2 before:content-['•']">
              {line.slice(2)}
            </p>
          );
        if (line.startsWith('> '))
          return (
            <p key={i} className="rounded-xl bg-warn px-3 py-2 text-warn-ink">
              {line.slice(2)}
            </p>
          );
        return line.trim() ? <p key={i}>{line}</p> : <span key={i} className="h-2" />;
      })}
    </div>
  );
}

function ProjectNotes({
  project,
  refresh,
}: {
  project: Item;
  refresh: () => Promise<void> | void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(String(project.data.notes || ''));
  const insert = (snippet: string) =>
    setText((current) => `${current}${current && !current.endsWith('\n') ? '\n' : ''}${snippet}`);
  return (
    <section className="rounded-[var(--radius-card)] bg-surface p-5 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-extrabold">Catatan proyek</h3>
        {!editing && (
          <Button size="sm" onClick={() => setEditing(true)}>
            <Pencil />
            Ubah
          </Button>
        )}
      </div>
      {editing ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-1.5">
            {[
              ['Judul', '## Judul'],
              ['Butir', '- Butir'],
              ['Periksa', '- [ ] Butir pemeriksaan'],
              ['Penting', '> Catatan penting'],
            ].map(([label, snippet]) => (
              <Button key={label} size="sm" variant="ghost" onClick={() => insert(snippet)}>
                {label}
              </Button>
            ))}
          </div>
          <Textarea
            value={text}
            maxLength={5000}
            rows={10}
            onChange={(event) => setText(event.target.value)}
          />
          <p className="text-xs text-ink-3">{text.length}/5000 karakter</p>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setText(String(project.data.notes || ''));
                setEditing(false);
              }}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={async () => {
                try {
                  await api('workstreams', {
                    id: project.id,
                    data: { ...project.data, notes: text },
                  });
                  await refresh();
                  setEditing(false);
                  toast.success('Catatan proyek tersimpan');
                } catch (error) {
                  toast.error((error as Error).message);
                }
              }}
            >
              Simpan catatan
            </Button>
          </div>
        </div>
      ) : text.trim() ? (
        <NotesView text={text} />
      ) : (
        <p className="text-sm text-ink-3">
          Belum ada catatan. Tulis keputusan kecil, daftar periksa, atau hal penting proyek ini.
        </p>
      )}
    </section>
  );
}

function Milestones({
  project,
  ws,
  refresh,
  closed,
}: {
  project: Item;
  ws: Workspace;
  refresh: () => Promise<void> | void;
  closed: boolean;
}) {
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState<{ item?: Item } | null>(null);
  const date = today();
  const rows = (ws.milestones || [])
    .filter((m) => m.data.workstream_id === project.id)
    .sort((a, b) => String(a.data.due_date).localeCompare(String(b.data.due_date)));
  const visible = rows.filter((m) =>
    filter === 'done' ? m.data.actual_date : filter === 'upcoming' ? !m.data.actual_date : true,
  );
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Tabs
          label="Saring milestone"
          value={filter}
          onChange={setFilter}
          items={[
            { id: 'all', label: 'Semua', count: rows.length },
            {
              id: 'upcoming',
              label: 'Mendatang',
              count: rows.filter((m) => !m.data.actual_date).length,
            },
            { id: 'done', label: 'Tercapai', count: rows.filter((m) => m.data.actual_date).length },
          ]}
        />
        {!closed && (
          <Button className="ml-auto" variant="primary" onClick={() => setForm({})}>
            <Plus />
            Milestone baru
          </Button>
        )}
      </div>
      {visible.length ? (
        visible.map((milestone) => {
          const reached = Boolean(milestone.data.actual_date);
          const due = String(milestone.data.due_date);
          const diff = daysBetween(date, due);
          const related = (ws['work-items'] || []).filter(
            (t) => t.data.milestone_id === milestone.id && t.data.status !== 'dibatalkan',
          );
          return (
            <article
              key={milestone.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl bg-surface p-4 shadow-card"
            >
              <Diamond
                className={cn(
                  'size-5',
                  reached
                    ? 'fill-done-ink text-done-ink'
                    : diff < 0
                      ? 'text-late-ink'
                      : 'text-accent-strong',
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="font-bold">{String(milestone.data.title)}</p>
                <p className="text-xs text-ink-3">
                  {reached
                    ? `Tercapai ${formatDate(String(milestone.data.actual_date))}`
                    : diff < 0
                      ? `Terlewat ${-diff} hari`
                      : diff === 0
                        ? 'Hari ini'
                        : `${diff} hari lagi`}{' '}
                  · {related.filter((t) => t.data.status === 'selesai').length}/{related.length}{' '}
                  tugas selesai
                </p>
              </div>
              <Button
                size="sm"
                variant={reached ? 'ghost' : 'soft'}
                onClick={async () => {
                  await api('milestones', {
                    id: milestone.id,
                    data: { ...milestone.data, actual_date: reached ? '' : date },
                  });
                  await refresh();
                }}
              >
                {reached ? (
                  <>
                    <RotateCcw />
                    Buka kembali
                  </>
                ) : (
                  'Tandai tercapai'
                )}
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`Ubah ${String(milestone.data.title)}`}
                onClick={() => setForm({ item: milestone })}
              >
                <Pencil />
              </Button>
            </article>
          );
        })
      ) : (
        <EmptyState
          title="Belum ada milestone"
          description="Milestone menandai hasil penting proyek, misalnya izin terbit atau gerai siap buka."
        />
      )}
      <RecordFormSheet
        open={Boolean(form)}
        entity="milestones"
        item={form?.item}
        prefill={{ workstream_id: project.id, due_date: date }}
        workspace={ws}
        refresh={refresh}
        onClose={() => setForm(null)}
      />
    </section>
  );
}

export function ProjectDetail({ id }: { id: string }) {
  const { data, loading, error, refresh, operations } = useWorkspace('projects', {
    scope: 'all',
    project: id,
  });
  const [tab, setTab] = useState('tasks');
  const [taskView, setTaskView] = useState<'board' | 'list'>('board');
  const [openTask, setOpenTask] = useState<string | null>(null);
  const [form, setForm] = useState<{
    entity: 'workstreams' | 'work-items';
    prefill?: Record<string, unknown>;
  } | null>(null);
  const cash = useProjectCash(id, operations && tab === 'budget');
  if (error) return <ErrorState message={error} />;
  if (loading) return <PageLoading />;
  const project = (data.workstreams || []).find((row) => row.id === id);
  if (!project)
    return (
      <EmptyState
        title="Proyek tidak ditemukan"
        description="Proyek mungkin sudah dihapus."
        action={
          <Button asChild>
            <Link href="/projects">Kembali ke proyek</Link>
          </Button>
        }
      />
    );
  const closed = isProjectHistory(project);
  const tasks = (data['work-items'] || []).filter((task) => task.data.workstream_id === id);
  const live = tasks.filter((task) => task.data.status !== 'dibatalkan');
  const progress = scopeProgress(tasks.map((task) => task.data as unknown as Task));
  const nextSteps = tasks
    .filter((task) => isActiveTask(task.data.status))
    .sort((a, b) =>
      String(a.data.due_date || '9999').localeCompare(String(b.data.due_date || '9999')),
    )
    .slice(0, 3);
  const documents = (data.documents || []).filter((doc) =>
    tasks.some((t) => t.data.document_id === doc.id),
  );
  const decisions = (data.decisions || []).filter((d) =>
    tasks.some((t) => t.data.meeting_id && t.data.meeting_id === d.data.meeting_id),
  );
  const issues = (data.issues || []).filter((issue) =>
    tasks.some((t) => t.data.issue_id === issue.id),
  );
  const allDone = live.length > 0 && live.every((task) => task.data.status === 'selesai');
  const budget = Number(project.data.budget || 0);
  const spent = cash.rows
    .filter((row) => row.data.direction === 'keluar')
    .reduce((sum, row) => sum + Number(row.data.amount || 0), 0);
  const received = cash.rows
    .filter((row) => row.data.direction === 'masuk')
    .reduce((sum, row) => sum + Number(row.data.amount || 0), 0);
  const task = tasks.find((t) => t.id === openTask);
  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/projects"
        className="flex items-center gap-1.5 self-start text-sm font-bold text-ink-3 hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        Semua proyek
      </Link>
      <section
        data-tone={projectTone(project)}
        className="relative overflow-hidden rounded-[1.75rem] bg-tone p-6 text-tone-ink ring-1 ring-tone-line ring-inset md:p-8"
      >
        <div className="relative flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap gap-1.5 text-xs font-bold">
              <span className="rounded-full border border-tone-line px-2.5 py-0.5">
                #{String(project.data.code || 'PRJ')}
              </span>
              <span className="rounded-full bg-surface/75 px-2.5 py-0.5">
                {formatChoiceLabel(String(project.data.status))}
              </span>
            </p>
            <h1 className="mt-3 text-[30px] leading-[1.1] font-normal tracking-[-0.02em] text-ink md:text-[38px]">
              {String(project.data.title)}
            </h1>
            {project.data.description ? (
              <p className="mt-2 max-w-2xl">{String(project.data.description)}</p>
            ) : null}
          </div>
          <Button className="bg-surface/85" onClick={() => setForm({ entity: 'workstreams' })}>
            <Pencil />
            Ubah proyek
          </Button>
        </div>
        <div className="relative mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Prioritas', formatChoiceLabel(String(project.data.priority || 'normal'))],
            ['Penanggung jawab', String(project.data.assignee || 'Belum ada')],
            [
              'Target selesai',
              project.data.target_date
                ? formatDate(String(project.data.target_date))
                : 'Belum ditentukan',
            ],
            ['Total tugas', `${live.length} tugas`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-surface/70 px-4 py-3">
              <p className="text-xs font-bold opacity-80">{label}</p>
              <p className="font-bold text-ink">{value}</p>
            </div>
          ))}
        </div>
        <div className="relative mt-5 flex items-center gap-3">
          <SegmentBar
            value={progress}
            segments={14}
            className="h-2 flex-1"
            label="Progres proyek"
          />
          <span className="tabular text-sm font-extrabold">{progress}%</span>
        </div>
      </section>
      {closed && (
        <Notice>
          Proyek ini sudah masuk riwayat. Ubah status proyek untuk membukanya kembali sebelum
          menambah tugas baru.
        </Notice>
      )}
      {!closed && allDone && (
        <Notice tone="doing">
          Semua tugas proyek sudah selesai. Setelah diperiksa, ubah status proyek menjadi Selesai.
          Status tugas tidak berubah otomatis.
        </Notice>
      )}
      {nextSteps.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-extrabold">Langkah berikutnya</h2>
          {nextSteps.map((row) => (
            <TaskRow
              key={row.id}
              task={row}
              ws={data}
              refresh={refresh}
              onOpen={() => setOpenTask(row.id)}
            />
          ))}
        </section>
      )}
      <Tabs
        label="Bagian proyek"
        value={tab}
        onChange={setTab}
        items={[
          { id: 'tasks', label: 'Tugas', count: live.length },
          {
            id: 'milestones',
            label: 'Milestone',
            count: (data.milestones || []).filter((m) => m.data.workstream_id === id).length,
          },
          { id: 'budget', label: 'Anggaran' },
          { id: 'notes', label: 'Catatan' },
          {
            id: 'related',
            label: 'Terkait',
            count: documents.length + decisions.length + issues.length,
          },
        ]}
      />
      {tab === 'tasks' && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Tabs
              label="Cara melihat"
              value={taskView}
              onChange={(v) => setTaskView(v as 'board' | 'list')}
              items={[
                { id: 'board', label: 'Papan' },
                { id: 'list', label: 'Daftar' },
              ]}
            />
            {!closed && (
              <Button
                className="ml-auto"
                variant="primary"
                onClick={() =>
                  setForm({
                    entity: 'work-items',
                    prefill: { workstream_id: id, due_date: today() },
                  })
                }
              >
                <Plus />
                Tugas
              </Button>
            )}
          </div>
          {!tasks.length ? (
            <EmptyState title="Belum ada tugas di proyek ini" />
          ) : taskView === 'board' ? (
            <TaskBoard
              tasks={tasks}
              ws={data}
              refresh={refresh}
              onOpen={setOpenTask}
              onAdd={(status: TaskStatus) =>
                !closed &&
                setForm({
                  entity: 'work-items',
                  prefill: { workstream_id: id, status, due_date: today() },
                })
              }
            />
          ) : (
            <TaskList
              tasks={tasks}
              ws={data}
              refresh={refresh}
              onOpen={setOpenTask}
              selecting={false}
              selected={new Set()}
              onToggleSelect={() => {}}
            />
          )}
        </section>
      )}
      {tab === 'milestones' && (
        <Milestones project={project} ws={data} refresh={refresh} closed={closed} />
      )}
      {tab === 'budget' &&
        (!operations ? (
          <Notice>
            Buku kas belum aktif di server ini, jadi realisasi anggaran belum dapat dihitung.
          </Notice>
        ) : cash.error ? (
          <ErrorState message={cash.error} />
        ) : (
          <section className="flex flex-col gap-3">
            <StatGrid>
              <StatTile
                icon={<Wallet />}
                label="Anggaran"
                value={budget ? rupiah(budget) : 'Belum diisi'}
                tone="lavender"
              />
              <StatTile
                icon={<ArrowUpRight />}
                label="Uang keluar"
                value={cash.loading ? '…' : rupiah(spent)}
                tone="rose"
                note={`${cash.rows.length} transaksi tertaut`}
              />
              <StatTile
                icon={<ArrowDownLeft />}
                label="Uang masuk"
                value={cash.loading ? '…' : rupiah(received)}
                tone="mint"
              />
              <StatTile
                icon={<Scale />}
                label={spent > budget && budget ? 'Melebihi anggaran' : 'Sisa anggaran'}
                value={budget ? rupiah(Math.abs(budget - spent)) : '—'}
                tone={spent > budget && budget ? 'rose' : 'sky'}
              />
            </StatGrid>
            {budget > 0 && (
              <div className="rounded-2xl bg-surface p-4 ring-1 ring-line">
                <p className="mb-2 flex justify-between text-sm font-bold">
                  Anggaran terpakai{' '}
                  <span className="tabular">{Math.round((spent / budget) * 100)}%</span>
                </p>
                <Bar value={(spent / budget) * 100} label="Anggaran terpakai" />
              </div>
            )}
            <p className="text-xs text-ink-3">
              Realisasi dihitung dari buku kas yang ditautkan ke proyek ini; bukan saldo bank.
            </p>
          </section>
        ))}
      {tab === 'notes' && <ProjectNotes project={project} refresh={refresh} />}
      {tab === 'related' && (
        <section className="grid gap-4 lg:grid-cols-3">
          {[
            {
              title: 'Dokumen',
              rows: documents,
              entity: 'documents' as const,
              empty: 'Tautkan dokumen lewat kolom dokumen di tugas.',
            },
            {
              title: 'Keputusan rapat',
              rows: decisions,
              entity: 'decisions' as const,
              empty: 'Keputusan rapat yang menaut tugas proyek ini.',
            },
            {
              title: 'Kendala',
              rows: issues,
              entity: 'issues' as const,
              empty: 'Kendala lapangan yang menaut tugas proyek ini.',
            },
          ].map((group) => (
            <div
              key={group.title}
              className="flex flex-col gap-2 rounded-[var(--radius-card)] bg-surface p-4 shadow-card"
            >
              <h3 className="font-extrabold">
                {group.title} <span className="text-ink-3">({group.rows.length})</span>
              </h3>
              {group.rows.length ? (
                group.rows.map((row) => (
                  <Link
                    key={row.id}
                    href={recordLink(group.entity, row.id)}
                    className="flex items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2 text-sm font-semibold hover:bg-surface-3"
                  >
                    <span className="truncate">{String(row.data.title)}</span>
                    {row.data.link ? <ExternalLink className="size-4 shrink-0 text-ink-3" /> : null}
                  </Link>
                ))
              ) : (
                <p className="text-sm text-ink-3">{group.empty}</p>
              )}
            </div>
          ))}
        </section>
      )}
      <TaskSheet
        task={task}
        ws={data}
        open={Boolean(task)}
        onClose={() => setOpenTask(null)}
        refresh={refresh}
        siblings={tasks}
        onNavigate={setOpenTask}
      />
      <RecordFormSheet
        open={form?.entity === 'workstreams'}
        entity="workstreams"
        item={project}
        workspace={data}
        refresh={refresh}
        onClose={() => setForm(null)}
      />
      <RecordFormSheet
        open={form?.entity === 'work-items'}
        entity="work-items"
        prefill={form?.prefill}
        workspace={data}
        refresh={refresh}
        onClose={() => setForm(null)}
      />
    </div>
  );
}
