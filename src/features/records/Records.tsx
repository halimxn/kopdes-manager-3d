'use client';
import { useDragSort } from '@/components/ui/useDragSort';
import { LihatDiDunia } from '@/components/ui/LihatDiDunia';
import { RecordDrawer, ikonEntitas } from './RecordDrawer';
import { isiDariQuery, ringkasan } from './terkait';
import { Ikon3D } from '@/components/ui/Ikon3D';
import { DragOverlay } from '@/components/ui/DragOverlay';
import { IconButton } from '@/components/ui/Button';
import { AppIcon } from '@/components/ui/AppIcon';
import { GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import React from 'react';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { catalog, labels, options, formatChoiceLabel } from './catalog';
import { schemas, type Entity, type Item } from './schemas';
import type { Workspace } from '../workspace/useWorkspace';
import { SavedTaskViews, type TaskView } from '../tasks/SavedTaskViews';
import { TaskBatchActions } from '../tasks/TaskBatchActions';
import { Editor } from './Editor';
import { api } from '@/lib/client';
import { today, addDays, formatDate } from '@/lib/date';
import {
  selectTaskStatus,
  taskStatusChange,
  isActiveTask,
  type TaskStatus,
} from '@/lib/task-status';
import { readiness, subtaskProgress } from '@/lib/progress';
import { Meter, RiskMatrix } from '@/components/charts/Charts';
import { TaskCalendar } from '../tasks/TaskCalendar';
import { ReadinessRadar } from '@/components/charts/ReadinessRadar';
import { Select } from '@/components/ui/Select';
import {
  ListTodo,
  Columns3,
  CalendarDays,
  Calendar,
  Search,
  Plus,
  ChartGantt,
  CalendarClock,
  UploadCloud,
  Target,
  ChevronDown,
  X,
  Shield,
  Landmark,
  Scale,
  Users2,
  Building2,
  Wheat,
  Handshake,
  CircleDot,
  Clock,
  MapPin,
  Users,
  BookOpen,
  FileText,
  Phone,
  CheckCircle2,
  Video,
  AlertCircle,
  ShieldCheck,
  FolderArchive,
  User,
  CheckSquare,
  Flag,
  Check,
  RotateCcw,
  ExternalLink,
  Flame,
  MoreHorizontal,
  Trash2,
  ArrowUpRight,
} from 'lucide-react';
import { TaskTimeline } from '../tasks/TaskTimeline';
import { downloadMeeting, meetingJoinUrl } from '../meetings/meeting';
import { DailyTasksView } from '../tasks/DailyTasksView';
import { TaskDetailDrawer } from '../tasks/TaskDetailDrawer';
import { SprintModal } from '../projects/SprintModal';
import { Modal } from '@/components/ui/Modal';
import { SprintCard } from '../projects/SprintCard';
import { CsvDropzone } from '@/components/ui/CsvDropzone';
import { ScrumBoardView } from '../tasks/ScrumBoardView';
import { formatDisplayCode } from '../tasks/task-code';
import { EmptyState } from '@/components/ui/EmptyState';

function getStakeholderCategoryClass(category: string) {
  const cat = category.toLowerCase();
  if (cat.includes('keamanan') || cat.includes('babinsa') || cat.includes('bhabinkamtibmas'))
    return 'badge-security';
  if (
    cat.includes('pemerintah') ||
    cat.includes('kepala desa') ||
    cat.includes('kades') ||
    cat.includes('bpd')
  )
    return 'badge-gov';
  if (cat.includes('pengawas')) return 'badge-supervisor';
  if (cat.includes('pengurus') || cat.includes('pengelola')) return 'badge-board';
  if (cat.includes('dinas') || cat.includes('pembina')) return 'badge-agency';
  if (cat.includes('masyarakat') || cat.includes('tani') || cat.includes('gapoktan'))
    return 'badge-community';
  if (cat.includes('mitra') || cat.includes('pemasok')) return 'badge-partner';
  return 'badge-general';
}

function getStakeholderCategoryIcon(category: string): React.ReactElement {
  const cat = category.toLowerCase();
  if (cat.includes('keamanan') || cat.includes('babinsa') || cat.includes('bhabinkamtibmas'))
    return <Shield size={13} />;
  if (
    cat.includes('pemerintah') ||
    cat.includes('kepala desa') ||
    cat.includes('kades') ||
    cat.includes('bpd')
  )
    return <Landmark size={13} />;
  if (cat.includes('pengawas')) return <Scale size={13} />;
  if (cat.includes('pengurus') || cat.includes('pengelola')) return <Users2 size={13} />;
  if (cat.includes('dinas') || cat.includes('pembina')) return <Building2 size={13} />;
  if (cat.includes('masyarakat') || cat.includes('tani') || cat.includes('gapoktan'))
    return <Wheat size={13} />;
  if (cat.includes('mitra') || cat.includes('pemasok')) return <Handshake size={13} />;
  return <CircleDot size={13} />;
}

function CompletedTimelineView({
  items,
  workspace,
  onOpenTask,
  onReopenTask,
}: {
  items: Item[];
  workspace: Workspace;
  onOpenTask: (task: Item) => void;
  onReopenTask: (task: Item) => void;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="Belum Ada Tugas yang Selesai"
        description="Tugas yang telah Anda tuntaskan akan tersusun rapi secara kronologis di linimasa ini."
        tone="blue"
        compact
      />
    );
  }

  const todayStr = today();
  const weekAgo = addDays(todayStr, -7);
  const twoWeeksAgo = addDays(todayStr, -14);

  const groups = [
    {
      id: 'pekan-ini',
      title: 'Pekan Ini',
      subtitle: '7 hari terakhir',
      items: items.filter((r) => {
        if (r.data.status !== 'selesai') return false;
        const d = String(r.data.completed_at || r.data.due_date || r.updated_at.slice(0, 10));
        return d >= weekAgo;
      }),
    },
    {
      id: 'pekan-lalu',
      title: 'Pekan Lalu',
      subtitle: '8–14 hari lalu',
      items: items.filter((r) => {
        if (r.data.status !== 'selesai') return false;
        const d = String(r.data.completed_at || r.data.due_date || r.updated_at.slice(0, 10));
        return d >= twoWeeksAgo && d < weekAgo;
      }),
    },
    {
      id: 'arsip-lama',
      title: 'Arsip Sebelumnya',
      subtitle: 'Lebih dari 2 pekan lalu',
      items: items.filter((r) => {
        if (r.data.status !== 'selesai') return false;
        const d = String(r.data.completed_at || r.data.due_date || r.updated_at.slice(0, 10));
        return d < twoWeeksAgo;
      }),
    },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="completed-github-timeline" aria-label="Linimasa riwayat tugas selesai">
      {groups.map((group) => (
        <section key={group.id} className="timeline-group-section">
          <div className="timeline-group-header">
            <div className="timeline-group-badge">
              <CheckCircle2 size={13} />
              <span>{group.title}</span>
            </div>
            <span className="timeline-group-sub">
              · {group.subtitle} ({group.items.length} tugas)
            </span>
            <div className="timeline-group-divider-line" />
          </div>
          <div className="timeline-group-stream">
            <div className="timeline-vertical-spine" aria-hidden="true" />
            {group.items.map((row) => {
              const project = workspace.workstreams?.find((p) => p.id === row.data.workstream_id);
              const subtasks = Array.isArray(row.data.subtasks) ? row.data.subtasks : [];
              const doneSubtasks = subtasks.filter((s: { done?: boolean }) => s.done).length;
              const assigneeName = String(row.data.assignee || '').trim();
              const completedDate = String(
                row.data.completed_at || row.data.due_date || row.updated_at.slice(0, 10),
              );

              return (
                <article key={row.id} className="timeline-task-row">
                  <div className="timeline-node" aria-hidden="true">
                    <CheckCircle2 size={15} />
                  </div>
                  <div className="timeline-task-bubble">
                    <div className="timeline-bubble-head">
                      <div className="timeline-title-wrap">
                        <span className="task-code-tag">
                          {formatDisplayCode(String(row.data.code), 'work-items', row.id)}
                        </span>
                        <Button
                          type="button"
                          className="timeline-task-title-btn"
                          onClick={() => onOpenTask(row)}
                          title="Buka rincian tugas"
                        >
                          {String(row.data.title)}
                        </Button>
                        {project && (
                          <span className="task-project-name has-project">
                            {String(project.data.title)}
                          </span>
                        )}
                      </div>
                      <Button
                        type="button"
                        className="table-btn-reopen"
                        title="Buka kembali tugas ini ke daftar tugas aktif"
                        onClick={() => onReopenTask(row)}
                      >
                        Buka Kembali ↩
                      </Button>
                    </div>
                    <div className="timeline-bubble-meta">
                      <span className="meta-chip meta-chip-date" title="Tanggal diselesaikan">
                        <Calendar size={12} />
                        <span>Selesai {formatDate(completedDate)}</span>
                      </span>
                      {assigneeName && (
                        <span className="meta-chip meta-chip-assignee">
                          <User size={12} />
                          <span>{assigneeName}</span>
                        </span>
                      )}
                      {subtasks.length > 0 && (
                        <span className="meta-chip meta-chip-subtasks">
                          <CheckSquare size={12} />
                          <span>
                            {doneSubtasks}/{subtasks.length} subtugas tuntas
                          </span>
                        </span>
                      )}
                      {Boolean(row.data.priority && row.data.priority !== 'normal') && (
                        <span className={`priority-badge priority-${row.data.priority}`}>
                          <Flag size={11} /> {formatChoiceLabel(String(row.data.priority))}
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function JournalBoardView({
  activities,
  workspace,
  onOpenItem,
  onCreateItem,
  onRefresh,
}: {
  activities: Item[];
  workspace: Workspace;
  onOpenItem: (item: Item) => void;
  onCreateItem: (date: string) => void;
  onRefresh: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [moveError, setMoveError] = useState('');
  const todayStr = today();

  const cols = [
    {
      id: 'mendatang',
      title: 'Terjadwal / Rencana',
      subtitle: 'Aktivitas mendatang',
      color: 'var(--brand)',
      filter: (a: Item) => String(a.data.date || '') > todayStr,
      defaultDate: addDays(todayStr, 1),
    },
    {
      id: 'hari-ini',
      title: 'Hari Ini',
      subtitle: 'Aktivitas lapangan hari ini',
      color: 'var(--tone-success-accent)',
      filter: (a: Item) => String(a.data.date || '') === todayStr,
      defaultDate: todayStr,
    },
    {
      id: 'terlaksana',
      title: 'Terdokumentasi',
      subtitle: 'Riwayat catatan lapangan',
      color: 'var(--ink-muted)',
      filter: (a: Item) => String(a.data.date || '') < todayStr,
      defaultDate: addDays(todayStr, -1),
    },
  ];

  async function handleDrop(targetColId: string, draggedId: string) {
    if (!draggedId || busy) return;
    const item = activities.find((a) => a.id === draggedId);
    if (!item) return;

    let targetDate = String(item.data.date || todayStr);
    if (targetColId === 'hari-ini') targetDate = todayStr;
    else if (targetColId === 'mendatang' && String(item.data.date) <= todayStr) {
      targetDate = addDays(todayStr, 1);
    } else if (targetColId === 'terlaksana' && String(item.data.date) >= todayStr) {
      targetDate = addDays(todayStr, -1);
    }

    if (targetDate === item.data.date) {
      return;
    }

    setBusy(true);
    setMoveError('');
    try {
      await api('journal', {
        id: item.id,
        data: { ...item.data, date: targetDate },
      });
      await onRefresh();
    } catch (error) {
      setMoveError(error instanceof Error ? error.message : 'Gagal memindahkan kegiatan.');
    } finally {
      setBusy(false);
    }
  }

  const {
    root: dragRef,
    preview: dragPreview,
    over: dragOver,
    handle: dragHandle,
  } = useDragSort((id, target) => {
    void handleDrop(target, id);
  }, busy);
  const dragOverCol = dragOver;
  return (
    <div
      ref={dragRef}
      className="journal-board-container"
      aria-label="Papan alur kegiatan lapangan"
    >
      <DragOverlay
        preview={dragPreview}
        title={String(activities.find((item) => item.id === dragPreview?.id)?.data.title || '')}
      />
      {moveError && (
        <p role="alert" className="notice error">
          {moveError}
        </p>
      )}
      <div className="scrum-board-columns cols-3">
        {cols.map((col) => {
          const colItems = activities.filter(col.filter);
          const isOver = dragOverCol === col.id;

          return (
            <div
              key={col.id}
              className={`scrum-column ${isOver ? 'drag-over' : ''}`}
              data-drop-zone={col.id}
            >
              <div className="scrum-column-header">
                <div className="scrum-col-title-group">
                  <span className="scrum-col-indicator" style={{ backgroundColor: col.color }} />
                  <div className="scrum-col-title-text">
                    <h3 className="column-title">{col.title}</h3>
                    <small className="column-subtitle">{col.subtitle}</small>
                  </div>
                </div>
                <div className="scrum-col-header-actions">
                  <span className="scrum-count-pill">{colItems.length}</span>
                  <Button
                    type="button"
                    className="scrum-col-add-btn"
                    onClick={() => onCreateItem(col.defaultDate)}
                    title={`Tambah kegiatan di ${col.title}`}
                    aria-label={`Tambah kegiatan di ${col.title}`}
                  >
                    <Plus size={15} strokeWidth={2.4} />
                  </Button>
                </div>
              </div>

              <div className="scrum-cards-list">
                {colItems.length === 0 ? (
                  <div className="scrum-empty-column-placeholder">
                    <span>Belum ada kegiatan</span>
                  </div>
                ) : (
                  colItems.map((item) => {
                    const unit = (workspace.units || []).find((u) => u.id === item.data.unit_id);
                    const stakeholder = (workspace.stakeholders || []).find(
                      (s) => s.id === item.data.stakeholder_id,
                    );
                    const linkedMeeting = (workspace.meetings || []).find(
                      (m) => m.id === item.data.meeting_id,
                    );

                    return (
                      <article
                        key={item.id}
                        className="scrum-task-card"

                        onClick={() => onOpenItem(item)}
                      >
                        <div className="ui-card-move" onClick={(event) => event.stopPropagation()}>
                          <IconButton
                            type="button"
                            className="ui-drag-handle"
                            aria-label={'Seret ' + String(item.data.title)}
                            disabled={busy}
                            {...dragHandle(item.id)}
                          >
                            <GripVertical />
                          </IconButton>
                          <Select
                            ariaLabel={'Pindahkan ' + String(item.data.title) + ' ke'}
                            value={col.id}
                            disabled={busy}
                            onChange={(target) => {
                              void handleDrop(target, item.id);
                            }}
                            options={cols.map((column) => ({
                              value: column.id,
                              label: column.title,
                            }))}
                          />
                        </div>
                        <div className="card-top-row">
                          <span className="task-code-tag">
                            {formatDisplayCode(
                              item.data.code ? String(item.data.code) : undefined,
                              'journal',
                              item.id,
                            )}
                          </span>
                          <span className="task-due-chip task-due-today">
                            <Calendar size={12} />
                            <span>{formatDate(String(item.data.date))}</span>
                          </span>
                        </div>
                        <h4 className="card-task-title">{String(item.data.title)}</h4>
                        {Boolean(item.data.notes) && (
                          <p className="card-description-snippet">
                            {String(item.data.notes).slice(0, 90)}
                            {String(item.data.notes).length > 90 ? '…' : ''}
                          </p>
                        )}
                        <div className="card-bottom-section">
                          <div className="card-assignee-row journal-board-chips">
                            {unit && (
                              <span className="relation-chip chip-unit" title={`Gerai: ${String(unit.data.title)}`}>
                                <Building2 size={11} />
                                <span>{String(unit.data.title)}</span>
                              </span>
                            )}
                            {stakeholder && (
                              <span className="relation-chip chip-stakeholder" title={`Mitra: ${String(stakeholder.data.title)}`}>
                                <Handshake size={11} />
                                <span>{String(stakeholder.data.title)}</span>
                              </span>
                            )}
                            {linkedMeeting && (
                              <span className="relation-chip chip-meeting-join">
                                <Video size={11} />
                                <span>Rapat</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function JournalTimelineView({
  activities,
  workspace,
  onOpenItem,
}: {
  activities: Item[];
  workspace: Workspace;
  onOpenItem: (item: Item) => void;
}) {
  if (activities.length === 0) {
    return (
      <EmptyState
        title="Belum ada catatan kegiatan"
        description="Catatan kegiatan lapangan akan tersusun rapi secara kronologis di linimasa ini."
        tone="amber"
        compact
      />
    );
  }

  const sorted = [...activities].sort((a, b) =>
    String(b.data.date || '').localeCompare(String(a.data.date || '')),
  );

  return (
    <div className="journal-timeline-container" aria-label="Linimasa kegiatan lapangan">
      <div className="timeline-vertical-spine" aria-hidden="true" />
      <div className="journal-timeline-stream">
        {sorted.map((item) => {
          const unit = (workspace.units || []).find((u) => u.id === item.data.unit_id);
          const stakeholder = (workspace.stakeholders || []).find(
            (s) => s.id === item.data.stakeholder_id,
          );
          const linkedMeeting = (workspace.meetings || []).find(
            (m) => m.id === item.data.meeting_id,
          );
          const joinUrl = meetingJoinUrl(linkedMeeting);

          return (
            <article key={item.id} className="timeline-task-row">
              <div className="timeline-node timeline-node-journal" aria-hidden="true">
                <BookOpen size={14} />
              </div>
              <div className="timeline-task-bubble">
                <div className="timeline-bubble-head">
                  <div className="timeline-title-wrap">
                    <span className="task-code-tag">
                      {formatDisplayCode(
                        item.data.code ? String(item.data.code) : undefined,
                        'journal',
                        item.id,
                      )}
                    </span>
                    <button
                      type="button"
                      className="timeline-task-title-btn"
                      onClick={() => onOpenItem(item)}
                      title="Lihat / ubah rincian kegiatan"
                    >
                      {String(item.data.title)}
                    </button>
                    {unit && (
                      <span className="task-project-name has-project">
                        {String(unit.data.title)}
                      </span>
                    )}
                  </div>
                  <span className="task-due-chip task-due-today">
                    <Calendar size={12} />
                    <span>{formatDate(String(item.data.date))}</span>
                  </span>
                </div>
                {Boolean(item.data.notes) && (
                  <p className="timeline-notes-snippet">{String(item.data.notes)}</p>
                )}
                <div className="timeline-bubble-meta">
                  {stakeholder && (
                    <span className="meta-chip meta-chip-assignee">
                      <Handshake size={12} />
                      <span>{String(stakeholder.data.title)}</span>
                    </span>
                  )}
                  {joinUrl && (
                    <a
                      href={joinUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="journal-join-chip"
                      title="Gabung rapat daring"
                    >
                      <Video size={11} />
                      <span>Rapat Daring ↗</span>
                    </a>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function JournalTableView({
  activities,
  workspace,
  onOpenItem,
}: {
  activities: Item[];
  workspace: Workspace;
  onOpenItem: (item: Item) => void;
}) {
  const todayStr = today();

  return (
    <div className="task-table-wrap journal-table-wrap">
      <table className="task-table journal-table">
        <thead>
          <tr>
            <th className="col-journal-date">
              <span className="journal-th-content">
                <Calendar size={13} aria-hidden="true" />
                <span>Tanggal</span>
              </span>
            </th>
            <th className="col-journal-main">
              <span className="journal-th-content">
                <FileText size={13} aria-hidden="true" />
                <span>Kegiatan Lapangan & Uraian</span>
              </span>
            </th>
            <th className="col-journal-relation">
              <span className="journal-th-content">
                <Building2 size={13} aria-hidden="true" />
                <span>Terkait & Koordinasi</span>
              </span>
            </th>
            <th className="col-journal-action">
              <span className="sr-only">Aksi</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {activities.map((row) => {
            const rowDate = String(row.data.date || '');
            const isToday = rowDate === todayStr;
            const unit = workspace.units?.find((u) => u.id === row.data.unit_id);
            const task = workspace['work-items']?.find((t) => t.id === row.data.work_item_id);
            const stakeholder = workspace.stakeholders?.find(
              (s) => s.id === row.data.stakeholder_id,
            );
            const meeting = workspace.meetings?.find((m) => m.id === row.data.meeting_id);
            const joinUrl = meetingJoinUrl(meeting);

            return (
              <tr key={row.id} className="journal-table-row">
                <td className="col-journal-date">
                  <span className={`journal-date-badge ${isToday ? 'is-today' : ''}`}>
                    <Calendar size={12} aria-hidden="true" />
                    <span>{formatDate(rowDate)}</span>
                    {isToday && <span className="journal-today-indicator">Hari ini</span>}
                  </span>
                </td>
                <td className="col-journal-main">
                  <div className="journal-main-cell">
                    <Button
                      type="button"
                      className="journal-title-interactive"
                      onClick={() => onOpenItem(row)}
                      title="Lihat atau ubah rincian kegiatan"
                    >
                      <span className="journal-code-tag">
                        {formatDisplayCode(
                          row.data.code ? String(row.data.code) : undefined,
                          'journal',
                          row.id,
                        )}
                      </span>
                      <strong className="journal-title-text">{String(row.data.title)}</strong>
                    </Button>
                    {Boolean(row.data.notes) && (
                      <p className="journal-notes-preview">{String(row.data.notes)}</p>
                    )}
                  </div>
                </td>
                <td className="col-journal-relation">
                  <div className="journal-relation-chips">
                    {unit && (
                      <span
                        className="relation-chip chip-unit"
                        title={`Gerai: ${String(unit.data.title)}`}
                      >
                        <Building2 size={12} />
                        <span>{String(unit.data.title)}</span>
                      </span>
                    )}
                    {task ? (
                      <Link
                        href={`/tugas?task=${encodeURIComponent(task.id)}`}
                        className="relation-chip chip-task has-link"
                        title={`Buka tugas: ${String(task.data.title)}`}
                      >
                        <CheckSquare size={12} />
                        <span>{String(task.data.title)}</span>
                        <span
                          className={`task-status-mini status-${String(task.data.status || 'rencana')}`}
                        >
                          {String(task.data.status || 'rencana')}
                        </span>
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className="relation-chip chip-add-task"
                        title="Buat tugas tindak lanjut langsung dari kegiatan ini"
                        onClick={() => {
                          window.dispatchEvent(
                            new CustomEvent('hub-task', {
                              detail: {
                                title: `Tindak lanjut: ${row.data.title}`,
                                description: String(row.data.notes || ''),
                                notes: `Sumber kegiatan: ${row.id}`,
                              },
                            }),
                          );
                        }}
                      >
                        <Plus size={12} />
                        <span>Tindak Lanjut</span>
                      </button>
                    )}
                    {stakeholder && (
                      <span
                        className="relation-chip chip-stakeholder"
                        title={`Mitra: ${String(stakeholder.data.title)}`}
                      >
                        <Handshake size={12} />
                        <span>{String(stakeholder.data.title)}</span>
                      </span>
                    )}
                    {joinUrl && (
                      <a
                        href={joinUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="relation-chip chip-meeting-join"
                        title="Masuk ruang rapat daring (Google Meet / Zoom)"
                      >
                        <Video size={12} />
                        <span>Gabung rapat ↗</span>
                      </a>
                    )}
                  </div>
                </td>
                <td className="col-journal-action">
                  <button
                    type="button"
                    className="journal-action-open"
                    onClick={() => onOpenItem(row)}
                    title="Buka rincian kegiatan"
                  >
                    <span>Buka</span>
                    <ArrowUpRight size={13} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

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
  const renderCalendarTaskCard = (row: Item) => {
    const isDone = row.data.status === 'selesai';
    const subtasks = Array.isArray(row.data.subtasks)
      ? (row.data.subtasks as { title: string; done: boolean }[])
      : [];
    const doneSubtasks = subtasks.filter((s) => s.done).length;
    const progressPct = subtaskProgress(subtasks);
    const project = workspace.workstreams?.find((p) => p.id === row.data.workstream_id);
    const isLate = String(row.data.due_date) < today() && isActiveTask(row.data.status);
    const isToday = String(row.data.due_date) === today() && isActiveTask(row.data.status);
    const assignee = String(
      row.data.assignee || workspace.organization?.[0]?.data?.manager || 'Manajer',
    ).trim();
    const initials =
      assignee
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'M';
    const priority = String(row.data.priority || 'normal').toLowerCase();

    return (
      <article key={row.id} className={`calendar-task-card ${isDone ? 'is-completed' : ''}`}>
        {/* Top metadata strip */}
        <div className="cal-card-top-row">
          <div className="cal-card-top-left">
            <Button
              type="button"
              className={`task-round-check ${isDone ? 'checked' : ''}`}
              disabled={busy}
              onClick={() => void update(row, taskStatusChange(isDone ? 'reopen' : 'complete'))}
              title={isDone ? 'Tandai belum selesai' : 'Tandai selesai'}
              aria-label={isDone ? 'Tandai belum selesai' : 'Tandai selesai'}
            >
              {isDone && <Check size={13} strokeWidth={2.8} />}
            </Button>
            <span className="card-task-code">
              {formatDisplayCode(String(row.data.code), 'work-items', row.id)}
            </span>
            {project && (
              <span className="card-project-pill" title={String(project.data.title)}>
                <span
                  className="project-dot"
                  style={{ backgroundColor: String(project.data.color || 'var(--brand)') }}
                />
                <span className="card-project-name">{String(project.data.title)}</span>
              </span>
            )}
          </div>
          <div className="cal-card-top-right">
            {priority !== 'normal' && (
              <span className={`card-priority-pill priority-${priority}`}>
                {priority === 'tinggi' && <Flame size={11} className="inline-icon" />}
                {priority === 'mendesak' && <AlertCircle size={11} className="inline-icon" />}
                <span>{formatChoiceLabel(priority)}</span>
              </span>
            )}
            <span className={`card-status-badge status-${row.data.status}`}>
              {formatChoiceLabel(String(row.data.status || 'rencana'))}
            </span>
          </div>
        </div>

        {/* Title and description */}
        <div className="cal-card-title-wrap">
          <h4
            className={`cal-card-title ${isDone ? 'is-done-text' : ''}`}
            onClick={() => setDetailTask(row)}
            title="Buka rincian tugas"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setDetailTask(row);
              }
            }}
          >
            {String(row.data.title)}
          </h4>
          {Boolean(row.data.description) && (
            <p className="cal-card-desc">{String(row.data.description)}</p>
          )}
        </div>

        {/* Subtasks checklist with round check and mini progress */}
        {subtasks.length > 0 && (
          <div className="cal-card-subtasks-section">
            <div className="cal-subtasks-header">
              <div className="cal-subtasks-label">
                <CheckSquare size={13} className="subtask-icon" />
                <span>
                  {doneSubtasks}/{subtasks.length} subtugas selesai ({progressPct}%)
                </span>
              </div>
              <div className="subtask-mini-track">
                <div className="subtask-mini-fill" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
            <div className="cal-subtasks-list">
              {subtasks.map((task, index) => (
                <div key={index} className={`cal-subtask-item ${task.done ? 'is-done' : ''}`}>
                  <Button
                    type="button"
                    className={`subtask-round-check ${task.done ? 'checked' : ''}`}
                    disabled={busy}
                    onClick={() => {
                      const newSubtasks = subtasks.map((s, i) =>
                        i === index ? { ...s, done: !s.done } : s,
                      );
                      void update(row, { subtasks: newSubtasks });
                    }}
                    title={task.done ? 'Tandai belum selesai' : 'Tandai selesai'}
                    aria-label={task.done ? 'Tandai belum selesai' : 'Tandai selesai'}
                  >
                    {task.done && <Check size={11} strokeWidth={2.8} />}
                  </Button>
                  <span className="cal-subtask-title">{task.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer: Assignee, Due date & Actions */}
        <div className="cal-card-footer">
          <div className="cal-card-footer-left">
            <span className="cal-assignee-pill" title={`Penanggung jawab: ${assignee}`}>
              <span className="cal-assignee-avatar">{initials}</span>
              <span className="cal-assignee-name">{assignee}</span>
            </span>
            {Boolean(row.data.due_date) && (
              <span
                className={`cal-due-pill ${isLate ? 'is-late' : isToday ? 'is-today' : ''}`}
                title={`Tenggat: ${formatDate(String(row.data.due_date))}`}
              >
                <Calendar size={12} />
                <span>{isToday ? 'Hari Ini' : formatDate(String(row.data.due_date))}</span>
              </span>
            )}
          </div>

          <div className="cal-card-footer-right">
            <Button
              type="button"
              className="cal-btn-action cal-btn-shift"
              disabled={busy}
              onClick={() =>
                void update(row, { due_date: addDays(String(row.data.due_date || today()), 1) })
              }
              title="Tunda tenggat +1 hari"
            >
              +1 hari
            </Button>
            <Button
              type="button"
              className="cal-btn-action cal-btn-detail"
              onClick={() => setDetailTask(row)}
              title="Buka rincian lengkap tugas"
            >
              <ExternalLink size={13} />
              <span>Buka catatan</span>
            </Button>
            {!isDone ? (
              <Button
                type="button"
                className="cal-btn-action cal-btn-done"
                disabled={busy}
                onClick={() => void update(row, taskStatusChange('complete'))}
                title="Tandai tugas ini selesai"
              >
                <Check size={13} strokeWidth={2.4} />
                <span>Selesai</span>
              </Button>
            ) : (
              <Button
                type="button"
                className="cal-btn-action cal-btn-reopen"
                disabled={busy}
                onClick={() => void update(row, taskStatusChange('reopen'))}
                title="Buka kembali tugas ini"
              >
                <RotateCcw size={13} strokeWidth={2.4} />
                <span>Buka lagi</span>
              </Button>
            )}
            <details className="cal-more-options">
              <summary className="cal-more-summary" title="Opsi lainnya" aria-label="Opsi lainnya">
                <MoreHorizontal size={15} />
              </summary>
              <div className="cal-more-menu">
                <Button
                  type="button"
                  disabled={busy}
                  onClick={(e) => {
                    e.currentTarget.closest('details')?.removeAttribute('open');
                    void update(row, {
                      due_date: addDays(String(row.data.due_date || today()), 7),
                    });
                  }}
                >
                  +1 minggu
                </Button>
                <div className="cal-more-divider" />
                <Button
                  type="button"
                  className="danger"
                  disabled={busy}
                  onClick={async (e) => {
                    e.currentTarget.closest('details')?.removeAttribute('open');
                    if (!confirm(`Hapus “${row.data.title}”?`)) return;
                    setBusy(true);
                    try {
                      await api(entity, { id: row.id }, 'DELETE');
                      await refresh();
                    } catch (err) {
                      setError((err as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <Trash2 size={13} />
                  <span>Hapus tugas</span>
                </Button>
              </div>
            </details>
          </div>
        </div>
      </article>
    );
  };
  const card = (row: Item) => {
    if ((entity as string) === 'work-items') {
      return renderCalendarTaskCard(row);
    }
    return (
      <article className={`record card ${entity === 'units' ? 'unit-record' : ''} ${entity === 'meetings' ? 'meeting-record' : ''}`} key={row.id}>
        <div className="section-head">
          <h3>
            {(entity === 'units' || entity === 'meetings') && <span className="record-domain-icon"><Ikon3D kind={entity === 'units' ? 'toko' : 'kalender'} size={28} rapat /></span>}
            {['work-items', 'journal'].includes(entity) && (
              <span className="task-code-tag mr-2">
                {formatDisplayCode(String(row.data.code), entity, row.id)}
              </span>
            )}
            {entity === 'staff' && (
              <span className="record-avatar" aria-hidden="true">
                {String(row.data.title || '?').slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="record-title-text">{String(row.data.title)}</span>
          </h3>
          {Boolean(row.data.status) && (
            <span className={'badge ' + (row.data.status === 'selesai' ? 'ok' : '')}>
              {String(row.data.status)}
            </span>
          )}
          {entity === 'stakeholders' && Boolean(row.data.category) && (
            <span
              className={`stakeholder-badge ${getStakeholderCategoryClass(String(row.data.category))}`}
            >
              {getStakeholderCategoryIcon(String(row.data.category))} {String(row.data.category)}
            </span>
          )}
        </div>
        <div className="record-meta">
          {ringkasan(entity, row, workspace).map((teks) => (
            <span key={teks} className="record-chip">
              {teks}
            </span>
          ))}
          {entity === 'deliveries' && (
            <>
              <span className={`delivery-dir-tag is-${row.data.direction === 'keluar' ? 'out' : 'in'}`}>
                {row.data.direction === 'keluar' ? 'Barang Keluar' : 'Barang Masuk'}
              </span>
              {Boolean(row.data.dock && row.data.dock !== 'belum ditentukan') && (
                <span className="delivery-dock-tag">Dok {String(row.data.dock)}</span>
              )}
              {Boolean(row.data.arrival_time) && (
                <span className="delivery-time-tag">
                  <Clock size={12} /> {String(row.data.arrival_time)} WIB
                </span>
              )}
              {Boolean(row.data.planned_date) && (
                <span>Rencana: {formatDate(String(row.data.planned_date))}</span>
              )}
              {Boolean(row.data.arrived_date) && (
                <span>Tiba: {formatDate(String(row.data.arrived_date))}</span>
              )}
              {Boolean(row.data.vehicle || row.data.license_plate) && (
                <span>
                  {[row.data.vehicle, row.data.license_plate]
                    .filter(Boolean)
                    .map(String)
                    .join(' · ')}
                </span>
              )}
              {Boolean(row.data.driver_name) && (
                <span>Sopir: {String(row.data.driver_name)}</span>
              )}
              {Boolean(row.data.stakeholder_id) && (
                <span>
                  Mitra:{' '}
                  {String(
                    workspace.stakeholders?.find((s) => s.id === row.data.stakeholder_id)?.data
                      .title || 'tidak ditemukan',
                  )}
                </span>
              )}
              {Boolean(row.data.unit_id) && (
                <span>
                  Gerai:{' '}
                  {String(
                    workspace.units?.find((u) => u.id === row.data.unit_id)?.data.title ||
                      'tidak ditemukan',
                  )}
                </span>
              )}
            </>
          )}
          {entity === 'meetings' && (
            <>
              <span className="meeting-time-tag">
                <Clock size={12} /> {String(row.data.time)} WIB
              </span>
              <span
                className={`meeting-mode-tag mode-${String(row.data.mode || 'tatap muka').replace(' ', '-')}`}
              >
                {String(row.data.mode).toLowerCase() === 'online'
                  ? 'Online'
                  : String(row.data.mode).toLowerCase() === 'hybrid'
                    ? 'Hybrid'
                    : 'Tatap Muka'}
              </span>
            </>
          )}
          {entity === 'journal' && (
            <>
              {Boolean(row.data.work_item_id) && (
                <span>
                  Tugas:{' '}
                  {String(
                    workspace['work-items']?.find((t) => t.id === row.data.work_item_id)?.data
                      .title || 'tidak ditemukan',
                  )}
                </span>
              )}
              {Boolean(row.data.stakeholder_id) && (
                <span>
                  Mitra:{' '}
                  {String(
                    workspace.stakeholders?.find((s) => s.id === row.data.stakeholder_id)?.data
                      .title || 'tidak ditemukan',
                  )}
                </span>
              )}
              {Boolean(row.data.unit_id) && (
                <span>
                  Gerai:{' '}
                  {String(
                    workspace.units?.find((u) => u.id === row.data.unit_id)?.data.title ||
                      'tidak ditemukan',
                  )}
                </span>
              )}
              {(() => {
                const meeting = workspace.meetings?.find((m) => m.id === row.data.meeting_id);
                const joinUrl = meetingJoinUrl(meeting);
                return joinUrl ? (
                  <a
                    href={joinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="journal-join-link"
                    title="Masuk ruang rapat daring (Google Meet / Zoom)"
                  >
                    <Video size={13} className="inline-icon" />
                    <span>Gabung rapat ↗</span>
                  </a>
                ) : null;
              })()}
            </>
          )}
          {Boolean(row.data.assignee) && <span>{entity === 'units' ? 'Penanggung jawab: ' : ''}{String(row.data.assignee)}</span>}
          {Boolean(row.data.priority) && <span>Prioritas {String(row.data.priority)}</span>}
          {Boolean(row.data.due_date || row.data.date) && (
            <span
              className={
                String(row.data.due_date) < today() && isActiveTask(row.data.status) ? 'late' : ''
              }
            >
              {formatDate(String(row.data.due_date || row.data.date))}
            </span>
          )}
        </div>
        {entity === 'units' && (
          <Meter
            value={readiness(
              (workspace.checklist || [])
                .filter((i) => i.data.unit_id === row.id)
                .map((i) => schemas.checklist.parse(i.data)),
            )}
          />
        )}
        {entity === 'units' && (
          <ReadinessRadar
            items={(workspace.checklist || [])
              .filter((item) => item.data.unit_id === row.id)
              .map((item) => schemas.checklist.parse(item.data))}
          />
        )}
        {entity === 'checklist' && Boolean(row.data.evidence) && (
          <p className="record-text">Bukti: {String(row.data.evidence)}</p>
        )}
        {entity === 'documents' && (
          <div className="document-card-details">
            {/* Jenis, nomor, dan status sudah tampil di cip dan lencana kepala kartu. */}
            <div className="doc-dates-row">
              {Boolean(row.data.issued_date) && (
                <span className="doc-date">Terbit: {formatDate(String(row.data.issued_date))}</span>
              )}
              {Boolean(row.data.expires_date) ? (
                <span
                  className={`doc-expiry ${
                    String(row.data.expires_date) < today()
                      ? 'is-expired'
                      : String(row.data.expires_date) <= addDays(today(), 30)
                        ? 'is-near-expiry'
                        : 'is-valid'
                  }`}
                >
                  {String(row.data.expires_date) < today() ? (
                    <>
                      <AlertCircle size={13} /> Kadaluwarsa (
                      {formatDate(String(row.data.expires_date))})
                    </>
                  ) : String(row.data.expires_date) <= addDays(today(), 30) ? (
                    <>
                      <Clock size={13} /> Berakhir dalam 30 hari (
                      {formatDate(String(row.data.expires_date))})
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={13} /> Berlaku s.d.{' '}
                      {formatDate(String(row.data.expires_date))}
                    </>
                  )}
                </span>
              ) : (
                <span className="doc-expiry is-permanent">
                  <ShieldCheck size={13} /> Masa berlaku tetap
                </span>
              )}
            </div>
          </div>
        )}
        {entity === 'risks' &&
          (() => {
            const prob = Number(row.data.probability || 3);
            const imp = Number(row.data.impact || 3);
            const score = prob * imp;
            const level =
              score >= 15
                ? { label: 'Bahaya kritis', cls: 'risk-critical', desc: 'Perlu tindakan segera' }
                : score >= 8
                  ? { label: 'Perlu waspada', cls: 'risk-warning', desc: 'Siapkan mitigasi' }
                  : { label: 'Terkendali', cls: 'risk-safe', desc: 'Dalam SOP standar' };
            return (
              <div className="risk-card-details">
                <p className="risk-level-strip">
                  <span className={`risk-level-badge ${level.cls}`}>{level.label}</span>
                  <span className="risk-level-desc">{level.desc}</span>
                </p>
                {Boolean(row.data.mitigation) && (
                  <p className="record-text">
                    <strong>Mitigasi: </strong>
                    {String(row.data.mitigation)}
                  </p>
                )}
              </div>
            );
          })()}
        {entity === 'stakeholders' &&
          (() => {
            const rawContact = String(row.data.contact || '').trim();
            const phoneDigits = rawContact.replace(/[^\d+]/g, '');
            const isPhone = phoneDigits.length >= 8;
            const waPhone = phoneDigits.startsWith('0')
              ? '62' + phoneDigits.slice(1)
              : phoneDigits.replace(/^\+/, '');
            const lastContactStr = String(row.data.last_contact || '');
            const isLate = Boolean(lastContactStr && lastContactStr < addDays(today(), -14));
            const interactions = (workspace.interactions || []).filter(
              (i) => i.data.stakeholder_id === row.id,
            );

            return (
              <div className="stakeholder-card-body">
                {rawContact && (
                  <div className="stakeholder-contact-row">
                    <span className="contact-text">
                      <span className="contact-icon">
                        <Phone size={12} />
                      </span>{' '}
                      {rawContact}
                    </span>
                    {isPhone && (
                      <div className="contact-actions">
                        <a
                          href={`https://wa.me/${waPhone}`}
                          target="_blank"
                          rel="noreferrer"
                          className="button wa-btn"
                          title="Kirim pesan WhatsApp"
                        >
                          WhatsApp ↗
                        </a>
                        <a
                          href={`tel:${phoneDigits}`}
                          className="button call-btn"
                          title="Panggil nomor telepon"
                        >
                          Telepon
                        </a>
                      </div>
                    )}
                  </div>
                )}

                <div className="stakeholder-comm-status">
                  <span className={`comm-date ${isLate ? 'late-warning' : ''}`}>
                    {lastContactStr
                      ? `Kontak terakhir: ${formatDate(lastContactStr)}`
                      : 'Belum ada catatan interaksi'}
                    {isLate ? ' · Perlu dihubungi kembali (>14 hari)' : ''}
                  </span>
                  {interactions.length > 0 && (
                    <span className="comm-count">{interactions.length} riwayat interaksi</span>
                  )}
                </div>
              </div>
            );
          })()}
        {['description', 'notes', 'minutes', 'reason', 'follow_up', 'items']
          .filter((key) => (entity !== 'stakeholders' || key !== 'follow_up') && (entity !== 'meetings' || key !== 'minutes'))
          .map((key) =>
            row.data[key] ? (
              <p className="record-text" key={key}>
                <strong>{labels[key]}: </strong>
                {String(row.data[key])}
              </p>
            ) : null,
          )}
        {entity === 'stakeholders' && Boolean(row.data.follow_up) && (
          <div className="stakeholder-followup-callout">
            <strong>Tindak Lanjut:</strong> {String(row.data.follow_up)}
          </div>
        )}
        {Boolean(row.data.link) && (
          <a href={String(row.data.link)} target="_blank" rel="noreferrer">
            Buka tautan ↗
          </a>
        )}
        {entity === 'meetings' &&
          (() => {
            const linkedDecisions = (workspace.decisions || []).filter(
              (d) => d.data.meeting_id === row.id,
            );
            return (
              <div className="meeting-card-details">
                {Boolean(row.data.location) && String(row.data.mode).toLowerCase() !== 'online' && (
                  <p className="meeting-detail-row">
                    <MapPin size={13} />
                    <strong>Tempat / Lokasi: </strong>
                    <span>{String(row.data.location)}</span>
                  </p>
                )}
                {Boolean(row.data.participants) && (
                  <p className="meeting-detail-row">
                    <Users size={13} />
                    <strong>Peserta Rapat: </strong>
                    <span>{String(row.data.participants)}</span>
                  </p>
                )}
                {Boolean(row.data.agenda) && (
                  <div className="meeting-section-box">
                    <BookOpen size={13} />
                    <strong>Agenda Pembahasan: </strong>
                    <p className="record-text">{String(row.data.agenda)}</p>
                  </div>
                )}
                {Boolean(row.data.minutes) && (
                  <div className="meeting-section-box">
                    <FileText size={13} />
                    <strong>Notulen / Hasil Kesepakatan: </strong>
                    <p className="record-text">{String(row.data.minutes)}</p>
                  </div>
                )}
                {linkedDecisions.length > 0 && (
                  <div className="meeting-section-box meeting-decisions-box">
                    <div className="meeting-decisions-head">
                      <CheckCircle2 size={13} />
                      <strong>Keputusan Terkait ({linkedDecisions.length}):</strong>
                    </div>
                    <ul className="meeting-decisions-list">
                      {linkedDecisions.map((dec) => (
                        <li key={dec.id}>
                          <span className="decision-title">{String(dec.data.title)}</span>
                          {dec.data.reason ? (
                            <span className="decision-reason">{String(dec.data.reason)}</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="meeting-action-row">
                  {Boolean(row.data.meeting_url) &&
                    String(row.data.mode).toLowerCase() !== 'tatap muka' &&
                    /^https?:\/\//.test(String(row.data.meeting_url)) && (
                      <a
                        className="button meeting-join btn-join-meeting"
                        href={String(row.data.meeting_url)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Video size={13} />
                        Masuk Rapat Online ↗
                      </a>
                    )}
                  <Button
                    className="button meeting-join btn-download-ics"
                    onClick={() => downloadMeeting(row)}
                    title="Unduh jadwal rapat .ics"
                  >
                    Unduh Jadwal (.ics)
                  </Button>
                  <Button
                    className="button meeting-followup-btn"
                    onClick={() => {
                      window.dispatchEvent(
                        new CustomEvent('hub-task', {
                          detail: {
                            title: `Tindak lanjut: ${row.data.title}`,
                            description: String(row.data.minutes || row.data.agenda || ''),
                            notes: `Sumber meetings: ${row.id}`,
                            meeting_id: row.id,
                          },
                        }),
                      );
                    }}
                    title="Buat tugas tindak lanjut rapat"
                  >
                    + Tindak Lanjut
                  </Button>
                </div>
              </div>
            );
          })()}
        {entity === 'work-items' &&
          Array.isArray(row.data.subtasks) &&
          row.data.subtasks.length > 0 && (
            <div className="subtask-list">
              <small>
                {row.data.subtasks.filter((task) => task.done).length}/{row.data.subtasks.length}{' '}
                subtugas selesai
              </small>
              {(row.data.subtasks as { title: string; done: boolean }[]).map((task, index) => (
                <label className="check" key={index}>
                  <Input
                    type="checkbox"
                    checked={task.done}
                    disabled={busy}
                    onChange={(event) =>
                      void update(row, {
                        subtasks: (row.data.subtasks as { title: string; done: boolean }[]).map(
                          (subtask, i) =>
                            i === index ? { ...subtask, done: event.target.checked } : subtask,
                        ),
                      })
                    }
                  />
                  <span>{task.title}</span>
                </label>
              ))}
            </div>
          )}
        <div className="actions">
          <Button onClick={() => (entity === 'work-items' ? setDetailTask(row) : setLihat(row))}>
            Buka catatan
          </Button>
          <LihatDiDunia entity={entity} id={row.id} />
          {entity === 'journal' && (
            <Button
              type="button"
              className="btn-journal-followup"
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent('hub-task', {
                    detail: {
                      title: `Tindak lanjut: ${row.data.title}`,
                      description: String(row.data.notes || ''),
                      notes: `Sumber kegiatan: ${row.id}`,
                      ...(row.data.work_item_id ? { parent_id: row.data.work_item_id } : {}),
                    },
                  }),
                );
              }}
              title="Buat tugas tindak lanjut dari kegiatan ini"
            >
              + Tindak lanjut
            </Button>
          )}
          {(entity === 'work-items' || entity === 'checklist') && row.data.status !== 'selesai' && (
            <Button
              disabled={busy}
              onClick={() =>
                void update(row, {
                  ...(entity === 'work-items'
                    ? taskStatusChange('complete')
                    : { status: 'selesai' }),
                })
              }
            >
              Selesai
            </Button>
          )}
          <details className="record-options">
            <summary><AppIcon name="more" size={16} /><span>Opsi lainnya</span><ChevronDown size={14} aria-hidden="true" /></summary>
            <div className="actions">
              {entity === 'work-items' && (
                <>
                  <Button
                    disabled={busy}
                    onClick={() =>
                      void update(row, { due_date: addDays(String(row.data.due_date), 1) })
                    }
                  >
                    +1 hari
                  </Button>
                  <Button
                    disabled={busy}
                    onClick={() =>
                      void update(row, { due_date: addDays(String(row.data.due_date), 7) })
                    }
                  >
                    +1 minggu
                  </Button>
                  <div className="inline-label">
                    <span>Status</span>
                    <Select
                      value={String(row.data.status)}
                      disabled={busy}
                      onChange={(val) =>
                        void update(row, {
                          ...(entity === 'work-items'
                            ? selectTaskStatus(val as TaskStatus)
                            : { status: val }),
                        })
                      }
                      options={options['work-items.status'].map((value) => ({
                        value,
                        label: formatChoiceLabel(value),
                      }))}
                      ariaLabel="Status"
                    />
                  </div>
                </>
              )}
              {entity === 'issues' && (
                <Button
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent('hub-task', {
                        detail: {
                          title: `Tindak lanjut: ${row.data.title}`,
                          description: String(row.data.description || ''),
                          notes: `Sumber ${entity}: ${row.id}`,
                          issue_id: row.id,
                        },
                      }),
                    );
                  }}
                >
                  + Tindak lanjut
                </Button>
              )}
              {!['organization', 'workstreams'].includes(entity) && (
                <Button
                  className="danger"
                  disabled={busy}
                  onClick={async () => {
                    if (!confirm(`Hapus “${row.data.title}”?`)) return;
                    setBusy(true);
                    try {
                      await api(entity, { id: row.id }, 'DELETE');
                      await refresh();
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Hapus
                </Button>
              )}
            </div>
          </details>
        </div>
      </article>
    );
  };
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
