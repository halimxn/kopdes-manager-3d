'use client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  FolderOpen,
  ArrowUpRight,
  ArrowLeft,
  Plus,
  Flag,
  FileText,
  Scale,
  Calendar,
  CheckCircle2,
  Search,
  X,
  Layers,
  Clock,
  Edit2,
  User,
  CheckSquare,
  TrendingUp,
  ListTodo,
  FileCode,
  AlertTriangle,
  AlertCircle,
  ShieldCheck,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { ProjectNotes } from './ProjectNotes';
import { Editor } from '../records/Editor';
import { Records } from '../records/Records';
import { schemas, type Item } from '../records/schemas';
import type { Workspace } from '../workspace/useWorkspace';
import { scopeProgress } from '@/lib/progress';
import { formatDate, today } from '@/lib/date';
import { Meter } from '@/components/charts/Charts';
import { EmptyState } from '@/components/ui/EmptyState';
import { recordHref } from '../workspace/workspace-navigation';
import { formatChoiceLabel } from '../records/catalog';
import { isProjectHistory } from './project-lifecycle';
import { Ikon3D } from '@/components/ui/Ikon3D';
import { IkonHalaman } from '@/components/ui/IkonHalaman';
import { ProjectBudget } from './ProjectBudget';

export function Projects({ data, refresh, history = false, draftScope }: { data: Workspace; refresh: () => Promise<void>; history?: boolean; draftScope?: string }) {
  const query = useSearchParams(),
    router = useRouter();
  const [edit, setEdit] = useState<Item | null | undefined>();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const projects = (data.workstreams || []).filter((project) => isProjectHistory(project) === history);
  const selected = (data.workstreams || []).find((row) => row.id === query.get('id'));
  const projectTasks = selected
    ? (data['work-items'] || []).filter((row) => row.data.workstream_id === selected.id)
    : [];
  // These domains link through tasks, rather than having a project field of their own.
  const relatedDocuments = (data.documents || []).filter((row) =>
    projectTasks.some((task) => task.data.document_id === row.id),
  );
  const relatedDecisions = (data.decisions || []).filter(
    (row) =>
      row.data.meeting_id &&
      projectTasks.some((task) => task.data.meeting_id === row.data.meeting_id),
  );
  const relatedIssues = (data.issues || []).filter((row) =>
    projectTasks.some((task) => task.data.issue_id === row.id),
  );

  const tasksFor = (id: string) =>
    (data['work-items'] || [])
      .filter((row) => row.data.workstream_id === id)
      .map((row) => ({ ...schemas['work-items'].parse(row.data), id: row.id }));

  const now = today();

  return (
    <>
      <nav className="project-scope-tabs" aria-label="Rentang proyek"><Link href="/proyek" aria-current={!history ? 'page' : undefined}>Proyek berjalan</Link><Link href="/proyek?tab=riwayat" aria-current={history ? 'page' : undefined}>Riwayat selesai & arsip</Link></nav>
      {selected ? (
        <>
          <div className="project-detail-header-nav">
            <Button
              type="button"
              className="btn-back-project"
              onClick={() => router.push(history ? '/proyek?tab=riwayat' : '/proyek')}
            >
              <ArrowLeft size={15} />
              <span>Semua proyek</span>
            </Button>
            <span className="project-breadcrumb-sep">/</span>
            <span className="project-breadcrumb-title">{String(selected.data.title)}</span>
          </div>

          <section className="project-cover">
            <div className="project-hero-header">
              <div className="project-hero-main">
                <div
                  className="project-symbol-box"
                  style={{
                    backgroundColor: selected.data.color
                      ? `color-mix(in srgb, ${selected.data.color} 15%, var(--brand-soft))`
                      : undefined,
                    color: selected.data.color ? String(selected.data.color) : undefined,
                  }}
                >
                  <FolderOpen size={28} />
                </div>
                <div className="project-hero-info">
                  <div className="project-hero-tags">
                    <span className="project-code-tag">{String(selected.data.code || 'PROYEK')}</span>
                    <span className={`project-status-tag status-${selected.data.status || 'rencana'}`}>
                      <span className="status-dot" />
                      {formatChoiceLabel(String(selected.data.status || 'rencana'))}
                    </span>
                  </div>
                  <h2 className="project-hero-title">{String(selected.data.title)}</h2>
                </div>
              </div>
              <Button
                type="button"
                className="btn-edit-project"
                onClick={() => setEdit(selected)}
              >
                <Edit2 size={15} />
                <span>Ubah proyek</span>
              </Button>
            </div>

            <p className={`project-hero-desc ${!selected.data.description ? 'is-empty' : ''}`}>
              {String(selected.data.description || 'Belum ada deskripsi proyek.')}
            </p>

            <div className="project-properties project-properties-grid">
              <div className="project-prop-card">
                <span className="prop-caption">
                  <Flag size={12} className="prop-icon" /> PRIORITAS
                </span>
                <span className={`prop-pill priority-${selected.data.priority || 'normal'}`}>
                  {formatChoiceLabel(String(selected.data.priority || 'normal'))}
                </span>
              </div>

              <div className="project-prop-card">
                <span className="prop-caption">
                  <User size={12} className="prop-icon" /> PENANGGUNG JAWAB
                </span>
                <strong className="prop-value">
                  {String(selected.data.assignee || 'Belum ditentukan')}
                </strong>
              </div>

              <div className="project-prop-card">
                <span className="prop-caption">
                  <Calendar size={12} className="prop-icon" /> TARGET SELESAI
                </span>
                <strong className="prop-value">
                  {selected.data.target_date
                    ? formatDate(String(selected.data.target_date))
                    : 'Belum ditentukan'}
                </strong>
              </div>

              <div className="project-prop-card">
                <span className="prop-caption">
                  <CheckSquare size={12} className="prop-icon" /> TOTAL TUGAS
                </span>
                <strong className="prop-value">
                  {tasksFor(selected.id).length} catatan
                </strong>
              </div>
            </div>

            <div className="project-progress-card">
              <div className="project-progress-meta">
                <div className="progress-title-wrap">
                  <TrendingUp size={15} className="progress-icon" />
                  <span className="progress-title">Progres Tugas Terhubung</span>
                </div>
                <div className="progress-stats-wrap">
                  <span className="progress-fraction">
                    {tasksFor(selected.id).filter((t) => t.status === 'selesai').length} / {tasksFor(selected.id).length} tugas selesai
                  </span>
                  <span className="progress-badge">
                    {scopeProgress(tasksFor(selected.id))}%
                  </span>
                </div>
              </div>
              <div className="project-progress-track">
                <div
                  className="project-progress-fill"
                  style={{ width: `${scopeProgress(tasksFor(selected.id))}%` }}
                />
              </div>
            </div>

            <div className="sr-only" aria-hidden="true">
              <Meter value={scopeProgress(tasksFor(selected.id))} />
            </div>
            <ProjectBudget project={selected} />
          </section>

          {!isProjectHistory(selected) && tasksFor(selected.id).length > 0 && tasksFor(selected.id).every((task) => ['selesai', 'dibatalkan'].includes(task.status)) && <p className="notice">Seluruh tugas sudah selesai atau dibatalkan. Proyek masih berstatus {formatChoiceLabel(String(selected.data.status || 'rencana'))}. Buka properti proyek dan pilih Selesai setelah meninjau hasil.</p>}

          <nav className="project-section-nav" aria-label="Bagian proyek">
            <a href="#project-tasks" className="project-nav-link">
              <ListTodo size={15} />
              <span>Tugas</span>
              <span className="nav-counter">{tasksFor(selected.id).length}</span>
            </a>
            <a href="#project-notes" className="project-nav-link">
              <FileText size={15} />
              <span>Catatan</span>
            </a>
            <a href="#project-milestones" className="project-nav-link">
              <Flag size={15} />
              <span>Milestone</span>
              <span className="nav-counter">
                {(data.milestones || []).filter((row) => row.data.workstream_id === selected.id).length}
              </span>
            </a>
            <a href="#project-documents" className="project-nav-link">
              <FileCode size={15} />
              <span>Dokumen</span>
              <span className="nav-counter">{relatedDocuments.length}</span>
            </a>
            <a href="#project-decisions" className="project-nav-link">
              <Scale size={15} />
              <span>Keputusan</span>
              <span className="nav-counter">{relatedDecisions.length}</span>
            </a>
            <a href="#project-obstacles" className="project-nav-link">
              <AlertTriangle size={15} />
              <span>Kendala</span>
              <span className="nav-counter">{relatedIssues.length}</span>
            </a>
          </nav>

          <details className="card project-next-actions">
            <summary className="project-next-summary">
              <div className="next-summary-title">
                <Sparkles size={16} className="next-icon" />
                <span>Langkah Berikutnya</span>
                <span className="next-count-pill">
                  {projectTasks.filter((row) => !['selesai', 'dibatalkan'].includes(String(row.data.status))).length} tugas aktif
                </span>
              </div>
              <ChevronDown size={16} className="next-chevron" />
            </summary>
            <div className="project-next-body">
              <p className="project-next-desc">
                Tiga tugas aktif dengan tenggat terdekat dari catatan proyek yang dimuat.
              </p>
              <div className="project-next-list">
                {[...projectTasks]
                  .filter((row) => !['selesai', 'dibatalkan'].includes(String(row.data.status)))
                  .sort((a, b) =>
                    String(a.data.due_date || '9999').localeCompare(String(b.data.due_date || '9999')),
                  )
                  .slice(0, 3)
                  .map((row) => (
                    <Link key={row.id} href={recordHref('work-items', row)} className="project-next-item">
                      <div className="next-item-main">
                        <span className={`next-task-status-dot status-${row.data.status || 'rencana'}`} />
                        <strong>{String(row.data.title)}</strong>
                      </div>
                      <div className="next-item-meta">
                        <span className="next-due-date">
                          {row.data.due_date ? formatDate(String(row.data.due_date)) : 'Tanpa tenggat'}
                        </span>
                        <ArrowUpRight size={14} className="next-arrow" />
                      </div>
                    </Link>
                  ))}
              </div>
              {!projectTasks.some(
                (row) => !['selesai', 'dibatalkan'].includes(String(row.data.status)),
              ) && (
                <div className="project-next-empty">
                  <span>Belum ada tugas aktif.</span>{' '}
                  <a href="#project-tasks" className="text-link">Tambah tugas di bagian tugas proyek →</a>
                </div>
              )}
            </div>
          </details>

          <div className="project-context">
            {/* Project Notes */}
            <div id="project-notes" className="project-section-anchor">
              <ProjectNotes key={selected.id} project={selected} refresh={refresh} />
            </div>

            {/* Related Milestones */}
            <section
              id="project-milestones"
              className="card project-related-card project-section-anchor"
            >
              <h3>
                <Flag size={18} /> Milestone terkait
              </h3>
              {(data.milestones || []).filter((row) => row.data.workstream_id === selected.id)
                .length ? (
                (data.milestones || [])
                  .filter((row) => row.data.workstream_id === selected.id)
                  .map((row) => (
                    <div className="attention" key={row.id}>
                      <strong>{String(row.data.title)}</strong>
                      <small>
                        {row.data.actual_date ? 'Tercapai' : formatDate(String(row.data.due_date))}
                      </small>
                    </div>
                  ))
              ) : (
                <p>Belum ada milestone untuk proyek ini.</p>
              )}
              <Link className="text-link" href="/roadmap">
                Kelola di Gantt →
              </Link>
            </section>

            {/* Related Documents */}
            <section
              id="project-documents"
              className="card project-related-card project-section-anchor"
            >
              <h3>
                <FileText size={18} /> Dokumen & Perizinan Terkait
              </h3>
              {relatedDocuments.length ? (
                relatedDocuments.map((row) => (
                  <div className="attention doc-item-row" key={row.id}>
                    <div>
                      <Link href={recordHref('documents', row)}>
                        <strong>{String(row.data.title)}</strong>
                      </Link>
                      <small>{String(row.data.category || 'Dokumen')}</small>
                    </div>
                    {Boolean(row.data.link) && (
                      <a
                        href={String(row.data.link)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-link"
                      >
                        Buka berkas ↗
                      </a>
                    )}
                  </div>
                ))
              ) : (
                <p>Belum ada dokumen yang ditautkan ke proyek ini.</p>
              )}
              <Link className="text-link" href="/dokumen">
                Buka arsip dokumen →
              </Link>
            </section>

            {/* Related Decisions */}
            <section
              id="project-decisions"
              className="card project-related-card project-section-anchor"
            >
              <h3>
                <Scale size={18} /> Keputusan Strategis
              </h3>
              {relatedDecisions.length ? (
                relatedDecisions.map((row) => (
                  <div className="attention decision-item-row" key={row.id}>
                    <Link href={recordHref('decisions', row)}>
                      <strong>{String(row.data.title)}</strong>
                    </Link>
                    {Boolean(row.data.reason) && <small>{String(row.data.reason)}</small>}
                  </div>
                ))
              ) : (
                <p>Belum ada keputusan formal yang dicatat untuk proyek ini.</p>
              )}
              <Link className="text-link" href="/rapat?bagian=decisions">
                Buka buku keputusan →
              </Link>
            </section>
            <section
              id="project-obstacles"
              className="card project-related-card project-section-anchor"
            >
              <h3>
                <ShieldCheck size={18} /> Kendala terkait tugas
              </h3>
              {relatedIssues.map((row) => (
                <Link
                  className="project-obstacle-link"
                  key={row.id}
                  href={recordHref('issues', row)}
                >
                  <span>
                    <strong>{String(row.data.title)}</strong>
                    <small>Kendala · {String(row.data.status || 'Belum ditentukan')}</small>
                  </span>
                  <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
              ))}
              {!relatedIssues.length && (
                <p>Belum ada kendala yang ditautkan melalui tugas proyek ini.</p>
              )}
              <Link className="text-link" href="/risiko">
                Kelola kendala & risiko →
              </Link>
            </section>
          </div>

          <div id="project-tasks" className="project-section-anchor">
            <Records
              key={selected.id}
              entity="work-items"
              workspace={data}
              refresh={refresh}
              scopeId={selected.id}
              initialFilter="all"
              initialView={isProjectHistory(selected) ? 'daftar' : undefined}
              draftScope={draftScope}
            />
          </div>
        </>
      ) : (
        <>
          <section className="workspace-intro projects-intro-banner">
            <div>
              <h2 className="judul-halaman">
                <Ikon3D kind="folder" size={30} />
                {history ? 'Riwayat proyek' : 'Proyek'}
              </h2>
              <p>{history ? 'Proyek selesai dan arsip beserta tugas, milestone, dan catatannya.' : 'Buat proyek, susun tugas, catat hasil, lalu tinjau sebelum menyelesaikan proyek.'}</p>
            </div>
            {!history && <Button className="primary" onClick={() => setEdit(null)}>
              <Plus size={18} /> Proyek baru
            </Button>}
          </section>

          {/* Project Summary KPI Bar */}
          <div className="projects-kpi-grid">
            <div className="project-kpi-card">
              <span className="kpi-icon-wrap">
                <FolderOpen size={18} />
              </span>
              <div className="kpi-info">
                <strong>{projects.length}</strong>
                <small>Total Proyek</small>
              </div>
            </div>
            <div className="project-kpi-card">
              <span className="kpi-icon-wrap kpi-active">
                <Clock size={18} />
              </span>
              <div className="kpi-info">
                <strong>
                  {projects.filter((p) => (p.data.status || 'rencana') === (history ? 'diarsipkan' : 'aktif')).length}
                </strong>
                <small>{history ? 'Proyek Diarsipkan' : 'Proyek Berjalan'}</small>
              </div>
            </div>
            <div className="project-kpi-card">
              <span className="kpi-icon-wrap kpi-done">
                <CheckCircle2 size={18} />
              </span>
              <div className="kpi-info">
                <strong>{projects.filter((p) => p.data.status === 'selesai').length}</strong>
                <small>Proyek Selesai</small>
              </div>
            </div>
            <div className="project-kpi-card">
              <span className="kpi-icon-wrap kpi-tasks">
                <Layers size={18} />
              </span>
              <div className="kpi-info">
                <strong>
                  {(data['work-items'] || []).filter((t) => projects.some((project) => project.id === t.data.workstream_id)).length}
                </strong>
                <small>Tugas Terhubung</small>
              </div>
            </div>
          </div>

          {/* Search & Status Filters */}
          <div className="projects-toolbar-row">
            <div className="project-search-box">
              <Search size={16} className="search-icon" />
              <Input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nama atau tujuan proyek..."
                aria-label="Cari proyek"
                className="project-search-input"
              />
              {Boolean(search) && (
                <Button
                  type="button"
                  className="btn-clear-search"
                  title="Hapus pencarian"
                  onClick={() => setSearch('')}
                >
                  <X size={14} />
                </Button>
              )}
            </div>

            <div className="project-status-tabs" aria-label="Filter status proyek">
              {(history ? [
                ['', 'Semua'], ['selesai', 'Selesai'], ['diarsipkan', 'Arsip'],
              ] : [
                ['', 'Semua'],
                ['aktif', 'Aktif'],
                ['rencana', 'Rencana'],
                ['ditunda', 'Ditunda'],
              ]).map(([value, label]) => {
                const active = status === value;
                return (
                  <Button
                    key={value}
                    type="button"
                    variant="ghost"
                    aria-pressed={active}
                    className={active ? 'is-active' : ''}
                    onClick={() => setStatus(value)}
                  >
                    <span>{label}</span>
                    <small>
                      {
                        projects.filter((row) => !value || (row.data.status || 'rencana') === value)
                          .length
                      }
                    </small>
                    {active && <span className="ui-segmented-active-dot" aria-hidden="true" />}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="project-grid">
            {projects
              .filter(
                (row) =>
                  (!status || (row.data.status || 'rencana') === status) &&
                  `${row.data.title} ${row.data.description || ''}`
                    .toLocaleLowerCase('id')
                    .includes(search.toLocaleLowerCase('id')),
              )
              .map((row) => {
                const tasks = tasksFor(row.id);
                const openIssues = (data.issues || []).filter(
                  (issue) =>
                    issue.data.status !== 'ditutup' &&
                    (data['work-items'] || []).some(
                      (task) =>
                        task.data.workstream_id === row.id && task.data.issue_id === issue.id,
                    ),
                );
                const nextTask = tasks
                  .filter((t) => !['selesai', 'dibatalkan'].includes(t.status) && t.due_date >= now)
                  .sort((a, b) => a.due_date.localeCompare(b.due_date))[0];
                const progress = scopeProgress(tasks);
                const projectStatus = String(row.data.status || 'rencana');
                const pastelTone =
                  projectStatus === 'selesai'
                    ? 'pastel-emerald'
                    : projectStatus === 'aktif'
                      ? 'pastel-blue'
                      : projectStatus === 'ditunda'
                        ? 'pastel-amber'
                        : 'pastel-purple';

                return (
                  <Link
                    className={`project-card project-card-compact sampul-pekerjaan ${pastelTone}`}
                    href={`/${history ? 'proyek?tab=riwayat&' : 'proyek?'}id=${row.id}`}
                    key={row.id}
                    style={{ ['--warna-proyek' as string]: String(row.data.color || 'var(--brand)') }}
                  >
                    {/* Sampul ala Taskflow: warna hub + ikon, garis atas memakai warna proyek pengguna */}
                    <span className="kartu-pekerjaan-sampul" aria-hidden="true">
                      <IkonHalaman href="/proyek" size={32} />
                    </span>
                    <div className="project-card-header">
                      <div className="project-badge-cluster">
                        <span className="project-code-tag">{String(row.data.code || 'PRJ')}</span>
                        <span className={`project-status-badge status-${projectStatus}`}>
                          {projectStatus}
                        </span>
                      </div>
                      <ArrowUpRight size={17} className="project-card-arrow" />
                    </div>

                    <div className="project-card-body">
                      <h3 className="project-compact-title">{String(row.data.title)}</h3>
                      {Boolean(row.data.description) && (
                        <p className="project-compact-desc">{String(row.data.description)}</p>
                      )}
                    </div>

                    {/* Compact Single-line Progress */}
                    <div className="project-compact-progress-wrap">
                      <div className="project-compact-bar-track">
                        <div
                          className="project-compact-bar-fill"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="project-compact-progress-label">{progress}%</span>
                    </div>

                    {/* Compact Stats Row */}
                    <div className="project-compact-meta-row">
                      <span className="project-meta-pill">
                        <CheckCircle2 size={12} />
                        <span>
                          {tasks.filter((task) => task.status === 'selesai').length} /{' '}
                          {tasks.filter((task) => task.status !== 'dibatalkan').length} tugas
                          selesai
                        </span>
                      </span>
                      {openIssues.length > 0 ? (
                        <span className="project-meta-pill issue-warning">
                          <AlertCircle size={12} /> {openIssues.length} kendala
                        </span>
                      ) : (
                        <span className="project-meta-pill issue-ok">
                          <ShieldCheck size={12} /> Terkendali
                        </span>
                      )}
                      {Boolean(row.data.target_date) && (
                        <span className="project-meta-pill date-pill">
                          <Calendar size={12} /> {formatDate(String(row.data.target_date))}
                        </span>
                      )}
                    </div>

                    {nextTask && (
                      <div className="project-compact-next">
                        <span className="next-label">Langkah berikut:</span>
                        <strong className="next-title">{nextTask.title}</strong>
                        <small className="next-date">({formatDate(nextTask.due_date)})</small>
                      </div>
                    )}
                  </Link>
                );
              })}
          </div>

          {!projects.length ? (
            <EmptyState
              ikon="folder"
              title={history ? 'Belum ada riwayat proyek' : 'Belum ada proyek kerja'}
              description={history ? 'Proyek yang ditandai selesai atau diarsipkan muncul di sini; tugas dan catatan tetap tersimpan.' : 'Buat proyek untuk mengelompokkan tugas, milestone, dan dokumen inisiatif koperasi secara teratur.'}
              pastelVariant="blue"
              action={history ? { label: 'Buka proyek berjalan', href: '/proyek' } : {
                label: 'Buat Proyek Pertama',
                onClick: () => setEdit(null),
                icon: <Plus size={16} />,
              }}
            />
          ) : !projects.some(
              (row) =>
                (!status || (row.data.status || 'rencana') === status) &&
                `${row.data.title} ${row.data.description || ''}`
                  .toLocaleLowerCase('id')
                  .includes(search.toLocaleLowerCase('id')),
            ) ? (
            <EmptyState
              ikon="tanya"
              title="Tidak ada proyek yang cocok"
              description="Coba gunakan kata kunci lain atau bersihkan penyaring status proyek."
              pastelVariant="amber"
              action={{
                label: 'Tampilkan Semua Proyek',
                onClick: () => {
                  setSearch('');
                  setStatus('');
                },
              }}
            />
          ) : null}
        </>
      )}
      {edit !== undefined && (
        <Editor
          entity="workstreams"
          draftScope={draftScope}
          item={edit || undefined}
          workspace={data}
          onClose={() => setEdit(undefined)}
          onSaved={refresh}
        />
      )}
    </>
  );
}
