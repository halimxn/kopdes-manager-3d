'use client';
import { RecordDrawer, ikonEntitas } from './RecordDrawer';
import { isiDariQuery } from './terkait';
import { Ikon3D } from '@/components/ui/Ikon3D';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { catalog, labels, options, formatChoiceLabel } from './catalog';
import { schemas, type Entity, type Item } from './schemas';
import type { Workspace } from '../workspace/useWorkspace';
import { SavedTaskViews, type TaskView } from '../tasks/SavedTaskViews';
import { TaskBatchActions } from '../tasks/TaskBatchActions';
import { api } from '@/lib/client';
import { today, formatDate } from '@/lib/date';
import { selectTaskStatus, taskStatusChange, isActiveTask, type TaskStatus } from '@/lib/task-status';
import { RiskMatrix } from '@/components/charts/Charts';
import { Select } from '@/components/ui/Select';
import { ListTodo, Columns3, CalendarDays, Calendar, Search, Plus, ChartGantt, CalendarClock, UploadCloud, Target, ChevronDown, X, BookOpen, CheckCircle2, Video, FolderArchive, CheckSquare } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { SprintCard } from '../projects/SprintCard';
import { formatDisplayCode } from '../tasks/task-code';
import { EmptyState } from '@/components/ui/EmptyState';
import dynamic from 'next/dynamic';
import { kartuCatatan } from './RecordCard';
// Tampilan, laci, dan formulir dimuat saat dipakai agar halaman catatan terbuka cepat.
const Editor = dynamic(() => import('./Editor').then((module) => module.Editor));
const TaskCalendar = dynamic(() => import('../tasks/TaskCalendar').then((module) => module.TaskCalendar));
const TaskTimeline = dynamic(() => import('../tasks/TaskTimeline').then((module) => module.TaskTimeline));
const DailyTasksView = dynamic(() => import('../tasks/DailyTasksView').then((module) => module.DailyTasksView));
const TaskDetailDrawer = dynamic(() => import('../tasks/TaskDetailDrawer').then((module) => module.TaskDetailDrawer));
const SprintModal = dynamic(() => import('../projects/SprintModal').then((module) => module.SprintModal));
const ScrumBoardView = dynamic(() => import('../tasks/ScrumBoardView').then((module) => module.ScrumBoardView));
const JournalBoardView = dynamic(() => import('./JournalViews').then((module) => module.JournalBoardView));
const JournalTimelineView = dynamic(() => import('./JournalViews').then((module) => module.JournalTimelineView));
const JournalTableView = dynamic(() => import('./JournalViews').then((module) => module.JournalTableView));
const CompletedTimelineView = dynamic(() => import('./CompletedTimelineView').then((module) => module.CompletedTimelineView));
const CsvDropzone = dynamic(() => import('@/components/ui/CsvDropzone').then((module) => module.CsvDropzone));

export function Records({
  entity,
  workspace,
  refresh,
  initialFilter = '',
  initialView,
  scopeId,
  draftScope,
}: {
  entity: Entity;
  workspace: Workspace;
  refresh: () => Promise<void>;
  initialFilter?: string;
  initialView?: string;
  scopeId?: string;
  draftScope?: string;
}) {
  const query = useSearchParams(),
    router = useRouter();
  const [edit, setEdit] = useState<Item | null | undefined>(() => {
      const found = (workspace[entity] || []).find((row) => row.id === query.get('record'));
      // ?record= membuka laci detail; ?ubah=1 (atau tugas) langsung membuka form.
      if (found) return query.get('ubah') === '1' || entity === 'work-items' ? found : undefined;
      // Tautan saran: ?baru=1&isi.<kolom>=… membuka form baru yang sudah terisi.
      const isi = isiDariQuery(query);
      if (query.get('baru') === '1' && Object.keys(isi).length)
        return { id: '', created_at: '', updated_at: '', data: isi };
      // Dari Dunia Koperasi ("Beri tugas"): buka tugas baru dengan penanggung jawab terisi.
      const assignee = entity === 'work-items' ? query.get('penanggung')?.trim() : '';
      if (!assignee) return undefined;
      return {
        id: '',
        created_at: '',
        updated_at: '',
        data: {
          ...schemas['work-items'].parse({ title: 'Tugas baru', due_date: today(), assignee }),
          title: '',
        },
      };
    }),
    [lihat, setLihat] = useState<Item | null>(() => {
      const found = (workspace[entity] || []).find((row) => row.id === query.get('record'));
      return found && entity !== 'work-items' && query.get('ubah') !== '1' ? found : null;
    }),
    [detailTask, setDetailTask] = useState<Item | null>(() =>
      entity === 'work-items'
        ? (workspace['work-items'] || []).find((item) => item.id === query.get('task')) || null
        : null,
    ),
    [showSprintModal, setShowSprintModal] = useState<Item | boolean>(false),
    [showCsvModal, setShowCsvModal] = useState(false),
    [sprintFilter, setSprintFilter] = useState(''),
    [journalUnit, setJournalUnit] = useState(''),
    [journalStakeholder, setJournalStakeholder] = useState(''),
    [journalMeeting, setJournalMeeting] = useState(''),
    [filtersOpen, setFiltersOpen] = useState(false),
    [quickTitle, setQuickTitle] = useState(''),
    [search, setSearch] = useState(''),
    [filter, setFilter] = useState<string | null>(initialFilter || null),
    [workstream, setWorkstream] = useState(''),
    [priority, setPriority] = useState(''),
    [sort, setSort] = useState('due'),
    [view, setView] = useState<string>(() => {
      if (initialView) return initialView;
      const paramView = query.get('view');
      if (paramView && ['daftar', 'papan', 'kalender', 'gantt', 'harian'].includes(paramView)) {
        return paramView;
      }
      if (typeof window !== 'undefined') {
        try {
          const savedView = localStorage.getItem(`${draftScope ? draftScope + ':' : ''}preferred_view_${entity}`);
          if (savedView && ['daftar', 'papan', 'kalender', 'gantt', 'harian'].includes(savedView)) {
            return savedView;
          }
        } catch {}
      }
      return 'daftar';
    }),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const handleViewChange = (newView: string) => {
    setView(newView);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`${draftScope ? draftScope + ':' : ''}preferred_view_${entity}`, newView);
      } catch {}
    }
  };
  const closedProject = Boolean(scopeId && workspace.workstreams?.some((project) => project.id === scopeId && ['selesai', 'diarsipkan'].includes(String(project.data.status))));
  function createTask(date = today(), status = 'rencana') {
    if (closedProject) { setError('Buka kembali proyek sebelum menambah tugas baru. Tugas yang sudah ada tetap dapat diperiksa.'); return; }
    setEdit({
      id: '',
      created_at: '',
      updated_at: '',
      data: {
        ...schemas['work-items'].parse({
          title: 'Tugas baru',
          due_date: date,
          status,
          workstream_id: scopeId || workstream || '',
          sprint_id: sprintFilter || '',
        }),
        title: '',
      },
    });
  }
  const requestedView = query.get('view');
  const [previousRequestedView, setPreviousRequestedView] = useState(requestedView);
  // Reconcile a changed navigation request before rendering a stale view.
  if (previousRequestedView !== requestedView) {
    setPreviousRequestedView(requestedView);
    if (
      requestedView &&
      ['daftar', 'papan', 'kalender', 'gantt', 'harian'].includes(requestedView)
    ) {
      setView(requestedView);
    }
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const details = document.querySelector('.view-extra-actions[open]');
      if (details && !details.contains(e.target as Node)) {
        details.removeAttribute('open');
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);
  const quickAdd = query.get('baru') === '1';
  function closeTaskDetail() {
    setDetailTask(null);
    if (query.get('task')) {
      const url = new URL(window.location.href);
      url.searchParams.delete('task');
      router.replace(`${url.pathname}${url.search}${url.hash}`, { scroll: false });
    }
  }
  const effectiveFilter = filter ?? (entity === 'work-items' ? query.get('status') || '' : '');
  const isCompletedArchive = entity === 'work-items' && effectiveFilter === 'selesai';
  const all = (workspace[entity] || []).filter(
      (row) => !scopeId || row.data.workstream_id === scopeId,
    ),
    rows = all
      .filter(
        (row) =>
          JSON.stringify(row.data)
            .toLocaleLowerCase('id')
            .includes(search.toLocaleLowerCase('id')) &&
          (entity !== 'work-items'
            ? true
            : isCompletedArchive
              ? row.data.status === 'selesai'
              : effectiveFilter === 'terlambat'
                ? String(row.data.due_date) < today() && isActiveTask(row.data.status)
                : effectiveFilter === 'all'
                  ? true
                : effectiveFilter
                  ? row.data.status === effectiveFilter
                  : isActiveTask(row.data.status)) &&
          (!workstream || row.data.workstream_id === workstream) &&
          (!sprintFilter || row.data.sprint_id === sprintFilter) &&
          (!priority || row.data.priority === priority) &&
          (!journalUnit || row.data.unit_id === journalUnit) &&
          (!journalStakeholder || row.data.stakeholder_id === journalStakeholder) &&
          (!journalMeeting || row.data.meeting_id === journalMeeting),
      )
      .sort((a, b) =>
        sort === 'title'
          ? String(a.data.title).localeCompare(String(b.data.title), 'id')
          : sort === 'updated'
            ? b.updated_at.localeCompare(a.updated_at)
            : isCompletedArchive
              ? String(b.data.completed_at || b.data.due_date || b.updated_at).localeCompare(
                  String(a.data.completed_at || a.data.due_date || a.updated_at),
                )
              : String(a.data.due_date || a.data.date || '').localeCompare(
                  String(b.data.due_date || b.data.date || ''),
                ),
      );
  const update = async (item: Item, changes: Record<string, unknown>) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await api(entity, { id: item.id, data: { ...item.data, ...changes } });
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const konteksKartu = { entity, workspace, refresh, busy, setBusy, setError, setDetailTask, setLihat, update };
  const card = (row: Item) => kartuCatatan(row, konteksKartu);
  return (
    <section
      className={
        entity === 'work-items'
          ? `task-database task-view-${view}`
          : `domain-records domain-${entity}`
      }
    >
      {isCompletedArchive ? (
        <div className="completed-archive-header">
          <div className="completed-archive-title-wrap">
            <div className="completed-archive-icon" aria-hidden="true">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h2>Arsip Riwayat Selesai</h2>
              <p>
                Rekap tugas yang telah tuntas dikerjakan, diurutkan dan dikelompokkan secara
                kronologis.
              </p>
            </div>
          </div>
          <div className="completed-archive-stats">
            <div className="completed-stat-badge">
              <span className="stat-label">Total Selesai</span>
              <strong>{rows.length} tugas</strong>
            </div>
            {scopeId ? <Button className="btn-back-to-active-tasks" onClick={() => setFilter('all')}>Semua tugas proyek</Button> : <Link href="/tugas" className="btn-back-to-active-tasks">← Kembali ke Tugas Aktif</Link>}
          </div>
        </div>
      ) : (
        <div className="section-head records-head">
          <div>
            <h2>
              <Ikon3D kind={ikonEntitas(entity)} size={30} rapat />
              {catalog[entity].title}
            </h2>
            <p>{catalog[entity].description}</p>
            {all.length > 0 && (
              <div className="records-stats" aria-label="Ringkasan jumlah">
                <span>
                  <strong>{all.length}</strong> total
                </span>
                {Object.entries(
                  all.reduce<Record<string, number>>((n, r) => {
                    const st = String(r.data.status || '');
                    if (st) n[st] = (n[st] || 0) + 1;
                    return n;
                  }, {}),
                )
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 4)
                  .map(([st, n]) => (
                    <span key={st} data-status={st}>
                      <strong>{n}</strong> {formatChoiceLabel(st).toLowerCase()}
                    </span>
                  ))}
              </div>
            )}
          </div>
          <Button
            className="primary"
            disabled={entity === 'work-items' && closedProject}
            onClick={() =>
              setEdit(
                entity === 'organization' && all[0]
                  ? all[0]
                  : scopeId
                    ? {
                        id: '',
                        created_at: '',
                        updated_at: '',
                        data: schemas[entity].parse({
                          title: 'Tugas baru',
                          due_date: today(),
                          workstream_id: scopeId,
                        }),
                      }
                    : null,
              )
            }
          >
            <Plus size={16} />{' '}
            {entity === 'organization' && all.length
              ? 'Ubah profil'
              : entity === 'work-items'
                ? 'Tugas baru'
                : 'Tambah'}
          </Button>
        </div>
      )}
      {entity === 'work-items' && closedProject && <p className="notice">Proyek sudah selesai atau diarsipkan. Seluruh tugas tetap tersimpan. Ubah status proyek ke aktif sebelum menambah tugas baru.</p>}
      {entity === 'journal' && !isCompletedArchive && (
        <div className="recording-metrics journal-metrics">
          <div className="metric-card metric-total">
            <div className="metric-header">
              <small className="metric-label">Total Kegiatan</small>
              <div className="metric-icon-wrap icon-total" aria-hidden="true">
                <BookOpen size={16} />
              </div>
            </div>
            <strong className="metric-value">{all.length}</strong>
            <span className="metric-sub">{all.length} catatan lapangan</span>
          </div>
          <div className="metric-card metric-active">
            <div className="metric-header">
              <small className="metric-label">Bulan Ini</small>
              <div className="metric-icon-wrap icon-active" aria-hidden="true">
                <Calendar size={16} />
              </div>
            </div>
            <strong className="metric-value">
              {all.filter((a) => String(a.data.date || '').startsWith(today().slice(0, 7))).length}
            </strong>
            <span className="metric-sub">
              {new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date())}
            </span>
          </div>
          <div className="metric-card metric-income">
            <div className="metric-header">
              <small className="metric-label">Tindak Lanjut Tugas</small>
              <div className="metric-icon-wrap icon-income" aria-hidden="true">
                <CheckSquare size={16} />
              </div>
            </div>
            <strong className="metric-value">
              {all.filter((a) => Boolean(a.data.work_item_id)).length}
            </strong>
            <span className="metric-sub">Menghasilkan tugas kerja</span>
          </div>
          <div className="metric-card metric-net">
            <div className="metric-header">
              <small className="metric-label">Koordinasi Rapat</small>
              <div className="metric-icon-wrap icon-net" aria-hidden="true">
                <Video size={16} />
              </div>
            </div>
            <strong className="metric-value">
              {all.filter((a) => Boolean(a.data.meeting_id)).length}
            </strong>
            <span className="metric-sub">Terhubung agenda rapat</span>
          </div>
        </div>
      )}
      {(entity === 'work-items' || entity === 'journal') && !isCompletedArchive && (
        <div className="database-views-bar">
          <SegmentedControl
            className="database-views"
            label={`Tampilan ${entity === 'work-items' ? 'tugas' : 'kegiatan'}`}
            value={view}
            onChange={handleViewChange}
            options={(entity === 'work-items'
              ? [
                  ['harian', 'Harian', CalendarClock],
                  ['papan', 'Papan', Columns3],
                  ['daftar', 'Daftar', ListTodo],
                  ['kalender', 'Kalender', CalendarDays],
                  ['gantt', 'Linimasa', ChartGantt],
                ]
              : [
                  ['daftar', 'Daftar', ListTodo],
                  ['papan', 'Papan', Columns3],
                  ['kalender', 'Kalender', CalendarDays],
                  ['gantt', 'Linimasa', ChartGantt],
                ]
            ).map(([value, label, Icon]) => {
              const ViewIcon = Icon as typeof ListTodo;
              return { value: String(value), label: <><ViewIcon size={20} />{String(label)}</> };
            })}
          >
            <span>{rows.length} {entity === 'work-items' ? 'tugas' : 'kegiatan'}</span>
          </SegmentedControl>

          {entity === 'work-items' && (
            <details className="view-extra-actions">
              <summary className="view-extra-summary">
                <span>Lainnya</span>
                <ChevronDown size={13} className="extra-chevron" />
              </summary>
              <div className="view-extra-menu">
                <Button
                  type="button"
                  className="btn-sprint-trigger"
                  title="Kelola Target Periode (Sprint)"
                  aria-label="Kelola periode kerja"
                  onClick={(e) => {
                    e.currentTarget.closest('details')?.removeAttribute('open');
                    setShowSprintModal(true);
                  }}
                >
                  <Target size={15} />
                  <span>Periode kerja</span>
                </Button>
                <Button
                  type="button"
                  className="btn-csv-trigger"
                  title="Tarik & Lepas File CSV"
                  aria-label="Impor CSV"
                  onClick={(e) => {
                    e.currentTarget.closest('details')?.removeAttribute('open');
                    setShowCsvModal(true);
                  }}
                >
                  <UploadCloud size={15} />
                  <span>Impor CSV</span>
                </Button>
              </div>
            </details>
          )}
        </div>
      )}
      {entity === 'work-items' &&
        (workspace.sprints || []).length > 0 &&
        !sprintFilter &&
        !isCompletedArchive &&
        view === 'daftar' && (
          <div className="active-sprints-row">
            {(workspace.sprints || [])
              .filter((s) => s.data.status === 'aktif')
              .map((sprint) => (
                <SprintCard
                  key={sprint.id}
                  sprint={sprint}
                  tasks={all}
                  onEdit={(item) => setShowSprintModal(item)}
                  onRefresh={refresh}
                />
              ))}
          </div>
        )}
      {entity === 'work-items' && !isCompletedArchive && !closedProject && view === 'daftar' && (
        <form
          className="today-quick-add-card"
          onSubmit={async (event) => {
            event.preventDefault();
            if (busy || !quickTitle.trim()) return;
            setBusy(true);
            setError('');
            try {
              await api(entity, {
                data: schemas['work-items'].parse({
                  title: quickTitle,
                  due_date: today(),
                  workstream_id: scopeId || workstream || '',
                }),
              });
              await refresh();
              setQuickTitle('');
            } catch (error) {
              setError((error as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="quick-add-input-wrap">
            <Plus size={18} className="quick-add-icon" />
            <Input
              type="text"
              aria-label="Tulis tugas baru"
              value={quickTitle}
              maxLength={200}
              onChange={(event) => setQuickTitle(event.target.value)}
              placeholder="Tambah tugas baru, lalu tekan Enter…"
              disabled={busy}
            />
          </div>
          <div className="quick-add-actions">
            <Button
              type="submit"
              className="btn-quick-submit"
              disabled={busy || !quickTitle.trim()}
            >
              {busy ? 'Menyimpan…' : 'Tambah'}
            </Button>
          </div>
        </form>
      )}
      {view !== 'harian' && (
        <>
          <button
            type="button"
            className="mobile-filter-toggle"
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            Cari & filter{search || effectiveFilter || workstream || priority || journalUnit || journalStakeholder || journalMeeting ? ' · aktif' : ''}
          </button>
          <div className={`filters ${filtersOpen ? 'filters-expanded' : ''}`}>
            <label>
              <span className="field-caption">
                <Search size={14} /> Cari
              </span>
              <Input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Judul, penanggung jawab, catatan…"
              />
            </label>
            {options[entity + '.status'] && view !== 'papan' && (
              <label>
                <span className="field-caption">Status</span>
                <Select
                  value={effectiveFilter}
                  onChange={(value) => {
                    setFilter(value);
                    if (entity === 'work-items' && query.has('status')) {
                      const next = new URLSearchParams(query.toString());
                      next.delete('status');
                      router.replace(
                        (scopeId ? '/proyek' : '/tugas') + (next.size ? '?' + next.toString() : ''),
                      );
                    }
                  }}
                  options={[
                    { value: '', label: entity === 'work-items' ? 'Tugas aktif' : 'Semua Status' },
                    ...(scopeId && entity === 'work-items' ? [{ value: 'all', label: 'Semua status (termasuk selesai)' }] : []),
                    ...(entity === 'work-items'
                      ? [{ value: 'terlambat', label: 'Terlambat' }]
                      : []),
                    ...options[entity + '.status'].map((value) => ({
                      value,
                      label: formatChoiceLabel(value),
                    })),
                  ]}
                  ariaLabel="Status"
                />
              </label>
            )}
            {entity === 'journal' && (
              <>
                <label>
                  <span className="field-caption">Gerai</span>
                  <Select
                    value={journalUnit}
                    onChange={setJournalUnit}
                    options={[
                      { value: '', label: 'Semua Gerai' },
                      ...(workspace.units || []).map((row) => ({
                        value: row.id,
                        label: String(row.data.title),
                      })),
                    ]}
                    ariaLabel="Gerai"
                  />
                </label>
                <label>
                  <span className="field-caption">Mitra / Pemangku</span>
                  <Select
                    value={journalStakeholder}
                    onChange={setJournalStakeholder}
                    options={[
                      { value: '', label: 'Semua Mitra' },
                      ...(workspace.stakeholders || []).map((row) => ({
                        value: row.id,
                        label: String(row.data.title),
                      })),
                    ]}
                    ariaLabel="Mitra"
                  />
                </label>
                <label>
                  <span className="field-caption">Rapat Terkait</span>
                  <Select
                    value={journalMeeting}
                    onChange={setJournalMeeting}
                    options={[
                      { value: '', label: 'Semua Rapat' },
                      ...(workspace.meetings || []).map((row) => ({
                        value: row.id,
                        label: String(row.data.title),
                      })),
                    ]}
                    ariaLabel="Rapat Terkait"
                  />
                </label>
                {Boolean(search || journalUnit || journalStakeholder || journalMeeting) && (
                  <div className="filter-actions-col">
                    <button
                      type="button"
                      className="btn-filter-reset"
                      onClick={() => {
                        setSearch('');
                        setJournalUnit('');
                        setJournalStakeholder('');
                        setJournalMeeting('');
                      }}
                      title="Hapus semua filter kegiatan"
                    >
                      <X size={13} />
                      <span>Hapus filter</span>
                    </button>
                  </div>
                )}
              </>
            )}
            {!scopeId && ['work-items', 'checklist'].includes(entity) && (
              <label>
                <span className="field-caption">Proyek / bidang kerja</span>
                <Select
                  value={workstream}
                  onChange={setWorkstream}
                  options={[
                    { value: '', label: 'Semua Proyek' },
                    ...(workspace.workstreams || []).map((row) => ({
                      value: row.id,
                      label: String(row.data.title),
                    })),
                  ]}
                  ariaLabel="Proyek / bidang kerja"
                />
              </label>
            )}
            {entity === 'work-items' && (workspace.sprints || []).length > 0 && (
              <label>
                <span className="field-caption">Target periode</span>
                <Select
                  value={sprintFilter}
                  onChange={setSprintFilter}
                  options={[
                    { value: '', label: 'Semua Target Periode (Sprint)' },
                    ...(workspace.sprints || []).map((row) => ({
                      value: row.id,
                      label: String(row.data.title),
                    })),
                  ]}
                  ariaLabel="Target periode"
                />
              </label>
            )}
            {entity === 'work-items' && (
              <>
                <label>
                  <span className="field-caption">Prioritas</span>
                  <Select
                    value={priority}
                    onChange={setPriority}
                    options={[
                      { value: '', label: 'Semua Prioritas' },
                      ...options.priority.map((value) => ({
                        value,
                        label: formatChoiceLabel(value),
                      })),
                    ]}
                    ariaLabel="Prioritas"
                  />
                </label>
                <label>
                  <span className="field-caption">Urutkan</span>
                  <Select
                    value={sort}
                    onChange={setSort}
                    options={[
                      { value: 'due', label: 'Tenggat Terdekat' },
                      { value: 'title', label: 'Nama Tugas (A–Z)' },
                      { value: 'updated', label: 'Terakhir Diubah' },
                    ]}
                    ariaLabel="Urutkan"
                  />
                </label>
              </>
            )}
          </div>
        </>
      )}
      {entity === 'work-items' && !isCompletedArchive && view === 'daftar' && (
        <SavedTaskViews
          value={{
            search,
            status: effectiveFilter,
            project: workstream,
            priority,
            sort: sort as TaskView['sort'],
            view: view as TaskView['view'],
            sprint: sprintFilter,
          }}
          onApply={(saved) => {
            setSearch(saved.search);
            setFilter(saved.status);
            setWorkstream(saved.project);
            setPriority(saved.priority);
            setSort(saved.sort);
            setView(saved.view);
            setSprintFilter(saved.sprint);
          }}
        />
      )}
      {entity === 'work-items' && !isCompletedArchive && view === 'daftar' && (
        <TaskBatchActions items={rows} refresh={refresh} />
      )}
      {error && !showCsvModal && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {entity === 'risks' && <RiskMatrix items={rows} />}
      {!rows.length && !isCompletedArchive && (
        <EmptyState
          title={`Belum ada ${catalog[entity].title.toLowerCase()}`}
          description={`Mulai dengan menambah ${catalog[entity].title.toLowerCase()} baru atau sesuaikan filter pencarian.`}
          tone="emerald"
          action={closedProject ? undefined : {
            label: `Tambah ${catalog[entity].title}`,
            onClick: () => setEdit(null),
          }}
        />
      )}
      {isCompletedArchive ? (
        <CompletedTimelineView
          items={rows}
          workspace={workspace}
          onOpenTask={(task) => setDetailTask(task)}
          onReopenTask={(row) => void update(row, taskStatusChange('reopen'))}
        />
      ) : view === 'harian' && entity === 'work-items' ? (
        <DailyTasksView
          tasks={rows}
          workspace={workspace}
          onOpenTask={(task) => setDetailTask(task)}
          onCreateTask={(date) => createTask(date)}
          onRefresh={refresh}
        />
      ) : view === 'gantt' && entity === 'work-items' ? (
        <TaskTimeline
          key={scopeId || workstream}
          items={rows}
          workspace={workspace}
          refresh={refresh}
          scopeId={scopeId || workstream || undefined}
        />
      ) : view === 'gantt' && entity === 'journal' ? (
        <JournalTimelineView
          activities={rows}
          workspace={workspace}
          onOpenItem={(item) => setEdit(item)}
        />
      ) : view === 'papan' && entity === 'work-items' ? (
        <ScrumBoardView
          tasks={all.filter(
            (row) =>
              JSON.stringify(row.data)
                .toLocaleLowerCase('id')
                .includes(search.toLocaleLowerCase('id')) &&
              (!workstream || row.data.workstream_id === workstream) &&
              (!sprintFilter || row.data.sprint_id === sprintFilter) &&
              (!priority || row.data.priority === priority),
          )}
          workspace={workspace}
          onOpenTask={(task) => setDetailTask(task)}
          onCreateTask={(status) => createTask(today(), status)}
          onRefresh={refresh}
        />
      ) : view === 'papan' && entity === 'journal' ? (
        <JournalBoardView
          activities={rows}
          workspace={workspace}
          onOpenItem={(item) => setEdit(item)}
          onCreateItem={(date) => createTask(date)}
          onRefresh={refresh}
        />
      ) : view === 'kalender' && (entity === 'work-items' || entity === 'journal') ? (
        <TaskCalendar
          items={rows}
          render={card}
          onCreate={(date) => createTask(date)}
          onEdit={(item) => (entity === 'work-items' ? setDetailTask(item) : setEdit(item))}
        />
      ) : entity === 'journal' && rows.length ? (
        <JournalTableView
          activities={rows}
          workspace={workspace}
          onOpenItem={(item) => setEdit(item)}
        />
      ) : entity === 'work-items' && rows.length ? (
        <div className="task-table-wrap">
          <table className="task-table">
            <thead>
              <tr>
                <th className="col-task-title">Tugas & Proyek</th>
                <th className="col-task-status">Status</th>
                <th className="col-task-priority">Prioritas</th>
                <th className="col-task-due">{isCompletedArchive ? 'Diselesaikan' : 'Tenggat'}</th>
                <th className="col-task-assignee">Penanggung Jawab</th>
                <th className="col-task-action">
                  <span className="sr-only">Aksi</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const renderTableRow = (row: Item) => {
                  const isDone = row.data.status === 'selesai';
                  const isLate =
                    String(row.data.due_date) < today() && isActiveTask(row.data.status);
                  const isToday =
                    String(row.data.due_date) === today() && isActiveTask(row.data.status);
                  const project = workspace.workstreams?.find(
                    (p) => p.id === row.data.workstream_id,
                  );
                  const subtasks = Array.isArray(row.data.subtasks) ? row.data.subtasks : [];
                  const doneSubtasks = subtasks.filter((s: { done?: boolean }) => s.done).length;
                  const assigneeName = String(row.data.assignee || '').trim();

                  return (
                    <tr key={row.id} className={isDone ? 'row-completed' : ''}>
                      <td className="col-task-title">
                        <div className="task-title-cell">
                          <Button
                            type="button"
                            className={`task-title-btn ${isDone ? 'is-done-text' : ''}`}
                            onClick={() => setDetailTask(row)}
                            title="Buka rincian tugas"
                          >
                            <span className="task-title-primary">
                              <span className="task-code-tag">
                                {formatDisplayCode(String(row.data.code), 'work-items', row.id)}
                              </span>
                              <span className="task-title-text">{String(row.data.title)}</span>
                            </span>
                            <span className="task-title-sub">
                              <span className={`task-project-name ${project ? 'has-project' : ''}`}>
                                {String(project?.data.title || 'Tanpa proyek')}
                              </span>
                              {subtasks.length > 0 && (
                                <span className="task-subtasks-count">
                                  · {doneSubtasks}/{subtasks.length} subtugas
                                </span>
                              )}
                              {Boolean(row.data.recurrence && row.data.recurrence !== 'tidak') && (
                                <span className="task-recurrence-text">
                                  · {formatChoiceLabel(String(row.data.recurrence))}
                                </span>
                              )}
                            </span>
                          </Button>
                        </div>
                      </td>
                      <td className="col-task-status">
                        <div className="task-status-field">
                          <Select
                            disabled={busy}
                            className={`task-status-custom-select status-${row.data.status}`}
                            value={String(row.data.status)}
                            onChange={(val) =>
                              void update(row, selectTaskStatus(val as TaskStatus))
                            }
                            options={options['work-items.status'].map((value) => ({
                              value,
                              label: formatChoiceLabel(value),
                            }))}
                            ariaLabel={`Status ${String(row.data.title)}`}
                          />
                        </div>
                      </td>
                      <td className="col-task-priority">
                        <span
                          className={`priority-badge priority-${row.data.priority || 'normal'}`}
                        >
                          {formatChoiceLabel(String(row.data.priority || 'normal'))}
                        </span>
                      </td>
                      <td className="col-task-due">
                        {isDone && row.data.completed_at ? (
                          <span
                            className="task-due-chip task-due-done"
                            title="Tanggal diselesaikan"
                          >
                            <Calendar size={12} className="task-due-icon" />
                            <span>Selesai {formatDate(String(row.data.completed_at))}</span>
                          </span>
                        ) : isLate ? (
                          <span className="task-due-chip task-due-late" title="Tenggat terlewat">
                            <Calendar size={12} className="task-due-icon" />
                            <span>{formatDate(String(row.data.due_date))}</span>
                          </span>
                        ) : isToday ? (
                          <span
                            className="task-due-chip task-due-today"
                            title="Jatuh tempo hari ini"
                          >
                            <Calendar size={12} className="task-due-icon" />
                            <span>Hari Ini</span>
                          </span>
                        ) : row.data.due_date ? (
                          <span className="task-due-chip task-due-normal" title="Tenggat waktu">
                            <Calendar size={12} className="task-due-icon" />
                            <span>{formatDate(String(row.data.due_date))}</span>
                          </span>
                        ) : (
                          <span className="task-due-empty">—</span>
                        )}
                      </td>
                      <td className="col-task-assignee">
                        {assigneeName ? (
                          <span
                            className="task-assignee-pill"
                            title={`Penanggung jawab: ${assigneeName}`}
                          >
                            {assigneeName}
                          </span>
                        ) : (
                          <span className="task-assignee-empty">—</span>
                        )}
                      </td>
                      <td className="col-task-action">
                        {!isDone ? (
                          <Button
                            type="button"
                            className="table-btn-done"
                            disabled={busy}
                            onClick={() => void update(row, taskStatusChange('complete'))}
                            title="Tandai tugas selesai"
                          >
                            Selesai
                          </Button>
                        ) : isCompletedArchive ? (
                          <Button
                            type="button"
                            className="table-btn-reopen"
                            disabled={busy}
                            onClick={() => void update(row, taskStatusChange('reopen'))}
                            title="Buka kembali tugas ini (kembalikan ke rencana)"
                          >
                            Buka Kembali ↩
                          </Button>
                        ) : (
                          <span className="task-done-label">Selesai</span>
                        )}
                      </td>
                    </tr>
                  );
                };

                return rows.map(renderTableRow);
              })()}
            </tbody>
          </table>
        </div>
      ) : entity === 'meetings' ? (
        <div className="meetings-container">
          {(() => {
            const todayStr = today();
            const upcoming = rows.filter((r) => String(r.data.date) >= todayStr);
            const past = rows.filter((r) => String(r.data.date) < todayStr);

            return (
              <>
                <section
                  className="meeting-section-group"
                  aria-label="Rapat akan datang dan hari ini"
                >
                  <div className="meeting-section-header">
                    <div className="meeting-section-title-wrap">
                      <CalendarDays size={16} />
                      <h3>Rapat Mendatang & Hari Ini</h3>
                    </div>
                    <span className="badge">{upcoming.length}</span>
                  </div>
                  {upcoming.length > 0 ? (
                    <div className="records">{upcoming.map(card)}</div>
                  ) : (
                    <EmptyState
                      title="Tidak ada agenda rapat"
                      description="Tidak ada rapat yang terjadwal untuk hari ini atau mendatang."
                      tone="purple"
                      compact
                    />
                  )}
                </section>

                {past.length > 0 && (
                  <section
                    className="meeting-section-group past-meetings"
                    aria-label="Riwayat rapat sebelumnya"
                  >
                    <div className="meeting-section-header">
                      <div className="meeting-section-title-wrap">
                        <FolderArchive size={16} />
                        <h3>Riwayat Rapat Sebelumnya</h3>
                      </div>
                      <span className="badge">{past.length}</span>
                    </div>
                    <div className="records">{past.map(card)}</div>
                  </section>
                )}
              </>
            );
          })()}
        </div>
      ) : (
        <div className="records">{rows.map(card)}</div>
      )}
      {(edit !== undefined || quickAdd) && (
        <Editor
          entity={entity}
          item={edit || undefined}
          quick={quickAdd && entity === 'work-items' && !Object.keys(isiDariQuery(query)).length}
          draftScope={draftScope}
          workspace={workspace}
          onClose={() => {
            setEdit(undefined);
            if (quickAdd)
              router.replace(entity === 'work-items' ? '/tugas' : window.location.pathname);
            else if (query.get('penanggung')) {
              const url = new URL(window.location.href);
              url.searchParams.delete('penanggung');
              router.replace(`${url.pathname}${url.search}${url.hash}`, { scroll: false });
            }
          }}
          onSaved={refresh}
        />
      )}
      {lihat && (
        <RecordDrawer
          key={lihat.id}
          entity={entity}
          row={(workspace[entity] || []).find((r) => r.id === lihat.id) || lihat}
          workspace={workspace}
          onClose={() => {
            setLihat(null);
            if (query.get('record')) {
              const url = new URL(window.location.href);
              url.searchParams.delete('record');
              router.replace(`${url.pathname}${url.search}${url.hash}`, { scroll: false });
            }
          }}
          onEdit={() => {
            setEdit(lihat);
            setLihat(null);
          }}
        />
      )}
      {detailTask && entity === 'work-items' && (
        <TaskDetailDrawer
          key={detailTask.id}
          task={
            (workspace['work-items'] || []).find((item) => item.id === detailTask.id) || detailTask
          }
          workspace={workspace}
          onClose={closeTaskDetail}
          onUpdated={refresh}
          onFullEdit={(task) => {
            closeTaskDetail();
            setEdit(task);
          }}
          onDelete={async (task) => {
            if (
              !window.confirm(
                `Hapus tugas "${task.data.title || 'ini'}"? Tindakan ini tidak dapat dibatalkan.`,
              )
            )
              return;
            closeTaskDetail();
            await api('work-items', { id: task.id, data: { ...task.data, status: 'dibatalkan' } });
            await refresh();
          }}
          onPrev={() => {
            const idx = rows.findIndex((t) => t.id === detailTask.id);
            if (idx > 0) setDetailTask(rows[idx - 1]);
          }}
          onNext={() => {
            const idx = rows.findIndex((t) => t.id === detailTask.id);
            if (idx >= 0 && idx < rows.length - 1) setDetailTask(rows[idx + 1]);
          }}
        />
      )}
      {showSprintModal && (
        <SprintModal
          sprint={typeof showSprintModal === 'object' ? showSprintModal : null}
          onClose={() => setShowSprintModal(false)}
          onSaved={refresh}
        />
      )}
      {showCsvModal && (
        <Modal
          className="sprint-modal-dialog"
          aria-labelledby="csv-modal-title"
          onDismiss={() => { if (!busy) setShowCsvModal(false); }}
        >
          <div className="sprint-modal-card">
            <header className="sprint-modal-head">
              <div className="title-with-badge">
                <span className="sprint-icon-pill">
                  <UploadCloud size={18} />
                </span>
                <h2 id="csv-modal-title">Impor File CSV — {catalog[entity].title}</h2>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="close-btn"
                onClick={() => setShowCsvModal(false)}
                disabled={busy}
                aria-label="Tutup modal"
              >
                <X size={18} />
              </Button>
            </header>
            <p className="dialog-sub">
              Unggah file CSV dengan kolom sesuai format data untuk menambahkan data secara
              langsung.
            </p>
            <Button type="button" disabled={busy} onClick={() => {
              const url = URL.createObjectURL(new Blob(['\uFEFF' + catalog[entity].fields.join(',') + '\r\n'], { type: 'text/csv;charset=utf-8' }));
              const anchor = document.createElement('a');
              anchor.href = url; anchor.download = `format-${entity}.csv`; anchor.click();
              URL.revokeObjectURL(url);
            }}>Unduh format CSV</Button>
            <p>Isi judul pada kolom title. Tanggal memakai YYYY-MM-DD; kolom kosong memakai nilai bawaan.</p>
            <CsvDropzone
              disabled={busy}
              onDataParsed={async (parsedRows) => {
                setBusy(true);
                setError('');
                let saved = 0;
                try {
                  // Semua baris divalidasi dahulu agar kesalahan berkas tidak menyimpan sebagian data.
                  const records = parsedRows.map((row, index) => {
                    const result = schemas[entity].safeParse({
                      ...(entity === 'work-items' ? { due_date: today() }
                        : catalog[entity].fields.includes('date') ? { date: today() } : {}),
                      ...Object.fromEntries(Object.entries(row).filter(([, value]) => value.trim() !== '')),
                    });
                    if (!result.success) throw new Error(`Baris ${index + 2}: ${result.error.issues.map(issue => `${labels[String(issue.path[0])] || 'Isian'}: ${issue.message}`).join('; ')}`);
                    return result.data;
                  });
                  for (const data of records) {
                    await api(entity, { data });
                    saved++;
                  }
                  setShowCsvModal(false);
                } catch (err) {
                  setError(`${saved} dari ${parsedRows.length} baris tersimpan. ${(err as Error).message} Impor ulang hanya baris yang belum tersimpan.`);
                } finally {
                  try { if (saved) await refresh(); }
                  catch (err) { setError(`${saved} baris tersimpan, tetapi daftar belum dapat dimuat ulang. ${(err as Error).message}`); }
                  finally { setBusy(false); }
                }
              }}
            />
            {busy && <p role="status">Menyimpan baris CSV…</p>}
            {error && <p className="notice error" role="alert">{error}</p>}
          </div>
        </Modal>
      )}
    </section>
  );
}
