'use client';
import { useDragSort } from '@/components/ui/useDragSort';
import { warnaOrang } from '@/lib/orang';
import { DragOverlay } from '@/components/ui/DragOverlay';
import { IconButton } from '@/components/ui/Button';
import { GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useState } from 'react';
import Link from 'next/link';
import { Plus, AlertCircle, Check, CheckCircle2, Calendar, Flame, CheckSquare } from 'lucide-react';
import { taskProgress } from '@/lib/progress';
import { type Item } from '../records/schemas';
import { type Workspace } from '../workspace/useWorkspace';
import { api } from '@/lib/client';
import { formatDate, today } from '@/lib/date';
import { selectTaskStatus, isActiveTask, type TaskStatus } from '@/lib/task-status';
import { formatDisplayCode } from './task-code';

type ScrumColumn = {
  id: string;
  key: string;
  title: string;
  subtitle: string;
  color: string;
};

const ACTIVE_COLUMNS: ScrumColumn[] = [
  {
    id: 'rencana',
    key: 'rencana',
    title: 'Rencana',
    subtitle: 'Rencana pekerjaan',
    color: 'var(--ink-muted)',
  },
  {
    id: 'proses',
    key: 'proses',
    title: 'Dikerjakan',
    subtitle: 'Sedang berjalan',
    color: 'var(--brand)',
  },
];

const ARCHIVE_COLUMNS: ScrumColumn[] = [
  {
    id: 'dibatalkan',
    key: 'dibatalkan',
    title: 'Dibatalkan',
    subtitle: 'Tidak dilanjutkan',
    color: 'var(--tone-danger-text)',
  },
  {
    id: 'selesai',
    key: 'selesai',
    title: 'Selesai',
    subtitle: 'Tuntas',
    color: 'var(--tone-success-text)',
  },
];

export function ScrumBoardView({
  tasks,
  workspace,
  onOpenTask,
  onCreateTask,
  onRefresh,
}: {
  tasks: Item[];
  workspace: Workspace;
  onOpenTask: (task: Item) => void;
  onCreateTask: (status: string) => void;
  onRefresh: () => Promise<void>;
}) {
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showArchiveCols, setShowArchiveCols] = useState(false);

  const completedTotalCount = (workspace['work-items'] || []).filter(
    (t) => t.data.status === 'selesai',
  ).length;

  const columnsToRender = showArchiveCols
    ? [...ACTIVE_COLUMNS, ...ARCHIVE_COLUMNS]
    : ACTIVE_COLUMNS;

  // Group tasks by status
  function getTasksForColumn(colKey: string): Item[] {
    return tasks.filter((task) => {
      const status = String(task.data.status || 'rencana');
      if (colKey === 'rencana') return status === 'rencana';
      if (colKey === 'proses') return status === 'proses';
      if (colKey === 'dibatalkan') return status === 'dibatalkan';
      if (colKey === 'selesai') return status === 'selesai';
      return false;
    });
  }

  async function handleDrop(targetColKey: string, draggedTaskId: string) {
    if (!draggedTaskId || busyId) return;
    const task = tasks.find((t) => t.id === draggedTaskId);
    if (!task) return;

    // Kolom papan hanya memakai status sah; pindahkan kartu memakai
    // aturan status domain supaya tanggal selesai ikut berubah.
    const nextStatus = targetColKey as TaskStatus;

    if (task.data.status === nextStatus) {
      return;
    }

    setBusyId(task.id);
    setError('');
    try {
      await api('work-items', {
        id: task.id,
        data: {
          ...task.data,
          ...selectTaskStatus(nextStatus),
        },
      });
      await onRefresh();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleQuickMove(task: Item, targetColKey: string) {
    if (busyId) return;
    const nextStatus = targetColKey as TaskStatus;
    if (task.data.status === nextStatus) return;

    setBusyId(task.id);
    setError('');
    try {
      await api('work-items', {
        id: task.id,
        data: {
          ...task.data,
          ...selectTaskStatus(nextStatus),
        },
      });
      await onRefresh();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  const {
    root: dragRef,
    preview: dragPreview,
    over: dragOver,
    handle: dragHandle,
  } = useDragSort((id, target) => {
    void handleDrop(target, id);
  }, Boolean(busyId));
  const draggedTaskId = dragPreview?.id ?? null;
  const dragOverCol = dragOver;
  return (
    <div ref={dragRef} className="scrum-view-container" aria-label="Papan tugas">
      <DragOverlay
        preview={dragPreview}
        title={String(tasks.find((task) => task.id === dragPreview?.id)?.data.title || '')}
      />
      <p className="sr-only" role="status">
        {dragPreview ? 'Kartu dipilih. Lepaskan pada kolom tujuan; Escape membatalkan.' : ''}
      </p>
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}

      {/* Board Sub-header with Archive Toggle */}
      <div className="scrum-board-toolbar">
        <span className="scrum-board-hint">
          Seret kartu antar-kolom untuk mengubah status pekerjaan.
        </span>
        <Button
          type="button"
          className="scrum-toggle-archive-btn"
          aria-pressed={showArchiveCols}
          onClick={() => setShowArchiveCols(!showArchiveCols)}
        >
          {showArchiveCols
            ? 'Sembunyikan Kolom Arsip di Papan'
            : 'Tampilkan Kolom Selesai di Papan'}
        </Button>
      </div>

      <div className={`scrum-board-columns cols-${columnsToRender.length}`}>
        {columnsToRender.map((col) => {
          const colTasks = getTasksForColumn(col.key);
          const isOver = dragOverCol === col.key;

          return (
            <div
              key={col.id}
              className={`scrum-column ${isOver ? 'drag-over' : ''}`}
              data-drop-zone={col.key}
            >
              {/* Column Header */}
              <div className="scrum-column-header">
                <div className="scrum-col-title-group">
                  <span className="scrum-col-indicator" style={{ backgroundColor: col.color }} />
                  <div className="scrum-col-title-text">
                    <h3 className="column-title">{col.title}</h3>
                    <small className="column-subtitle">{col.subtitle}</small>
                  </div>
                </div>
                <div className="scrum-col-header-actions">
                  <span className="scrum-count-pill">{colTasks.length}</span>
                  {col.key !== 'selesai' && col.key !== 'dibatalkan' && (
                    <Button
                      type="button"
                      className="scrum-col-add-btn"
                      onClick={() => onCreateTask(col.key)}
                      title={`Tambah tugas di ${col.title}`}
                      aria-label={`Tambah tugas di ${col.title}`}
                    >
                      <Plus size={15} strokeWidth={2.4} />
                      <span className="sr-only">Tambah tugas</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Task Cards List */}
              <div className="scrum-cards-list">
                {colTasks.length === 0 ? (
                  <div className="scrum-empty-column-placeholder">
                    <span>Belum ada tugas</span>
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const data = task.data;
                    const subtasks = Array.isArray(data.subtasks)
                      ? (data.subtasks as { title: string; done: boolean }[])
                      : [];
                    const doneSubtasks = subtasks.filter((s) => s.done).length;
                    const progressPct = taskProgress({
                      status: data.status as 'rencana' | 'proses' | 'selesai' | 'dibatalkan',
                      subtasks,
                    });

                    // Determine date range or deadline display
                    const dueDate = String(data.due_date || today());
                    const datePill = data.start_date
                      ? `${formatDate(String(data.start_date))} – ${formatDate(dueDate)}`
                      : formatDate(dueDate);

                    const isLate = dueDate < today() && isActiveTask(data.status);

                    const managerName = String(
                      workspace.organization?.[0]?.data?.manager || 'Manajer',
                    );
                    const assignee = String(data.assignee || managerName);
                    const initials =
                      assignee
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase() || 'M';

                    const project = (workspace.workstreams || []).find(
                      (w) => w.id === data.workstream_id,
                    );

                    return (
                      <article
                        key={task.id}
                        className={`scrum-task-card ${busyId === task.id ? 'card-busy' : ''}`}

                        onClick={() => onOpenTask(task)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (
                            e.target === e.currentTarget &&
                            (e.key === 'Enter' || e.key === ' ')
                          ) {
                            e.preventDefault();
                            onOpenTask(task);
                          }
                        }}
                      >
                        {/* Top Meta Strip: Task Code + Project on left, Priority + Due Date on right */}
                        <div
                          className="ui-card-move"
                          onClick={(event) => event.stopPropagation()}
                          onKeyDown={(event) => event.stopPropagation()}
                        >
                          <IconButton
                            type="button"
                            className="ui-drag-handle"
                            aria-label={'Seret ' + String(data.title)}
                            disabled={Boolean(busyId)}
                            {...dragHandle(task.id)}
                          >
                            <GripVertical />
                          </IconButton>
                        </div>
                        <div className="card-top-row">
                          <div className="card-top-left">
                            <span className="card-task-code">
                              {formatDisplayCode(String(data.code), 'work-items', task.id)}
                            </span>
                            {project && (
                              <span
                                className="card-project-pill"
                                title={String(project.data.title)}
                              >
                                <span
                                  className="project-dot"
                                  style={{
                                    backgroundColor: String(project.data.color || 'var(--brand)'),
                                  }}
                                />
                                <span className="card-project-name">
                                  {String(project.data.title)}
                                </span>
                              </span>
                            )}
                          </div>

                          <div className="card-top-right">
                            {Boolean(data.priority) && data.priority !== 'normal' && (
                              <span className={`card-priority-pill priority-${data.priority}`}>
                                {data.priority === 'tinggi' && (
                                  <Flame size={10} className="inline-icon" />
                                )}
                                {data.priority === 'mendesak' && (
                                  <AlertCircle size={10} className="inline-icon" />
                                )}
                                <span>{String(data.priority)}</span>
                              </span>
                            )}
                            <span
                              className={`card-date-pill ${isLate ? 'is-late' : ''}`}
                              title={`Tenggat: ${datePill}`}
                            >
                              {isLate ? (
                                <AlertCircle size={11} className="inline-icon" />
                              ) : (
                                <Calendar size={11} className="inline-icon" />
                              )}
                              <span>{datePill}</span>
                            </span>
                          </div>
                        </div>

                        {/* Card Title & Snippet */}
                        <div className="card-title-wrap">
                          <h4 className="card-task-title">{String(data.title)}</h4>
                          {Boolean(data.description) && (
                            <p className="card-description-snippet">
                              {String(data.description).slice(0, 80)}
                              {String(data.description).length > 80 ? '…' : ''}
                            </p>
                          )}
                        </div>

                        {/* Card Bottom Row: Assignee, Subtasks & Quick Move */}
                        <div className="card-bottom-section">
                          <div className="card-footer-left">
                            <span
                              className="scrum-assignee-pill"
                              title={`Penanggung jawab: ${assignee}`}
                            >
                              <span className={`avatar-warna avatar-mini is-${warnaOrang(assignee)}`} aria-hidden="true">{initials}</span>
                              <span className="assignee-name">{assignee}</span>
                            </span>

                            {subtasks.length > 0 && (
                              <div
                                className="card-subtasks-chip"
                                title={`${doneSubtasks} dari ${subtasks.length} subtugas selesai (${progressPct}%)`}
                              >
                                <CheckSquare size={11} className="subtask-chip-icon" />
                                <span className="subtask-chip-text">
                                  {doneSubtasks}/{subtasks.length}
                                </span>
                                <div className="subtask-mini-track">
                                  <div
                                    className="subtask-mini-fill"
                                    style={{ width: `${progressPct}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Quick Status Shift Row */}
                          <div className="card-quick-move-row" onClick={(e) => e.stopPropagation()}>
                            {data.status === 'rencana' && (
                              <Button
                                type="button"
                                className="card-quick-move-btn move-forward"
                                disabled={busyId === task.id}
                                onClick={() => void handleQuickMove(task, 'proses')}
                                title="Mulai kerjakan tugas ini"
                                aria-label="Mulai kerjakan tugas ini"
                              >
                                <span>Mulai Kerja →</span>
                              </Button>
                            )}
                            {data.status === 'proses' && (
                              <div className="card-quick-move-group">
                                <Button
                                  type="button"
                                  className="card-quick-move-btn move-back"
                                  disabled={busyId === task.id}
                                  onClick={() => void handleQuickMove(task, 'rencana')}
                                  title="Kembalikan ke rencana"
                                  aria-label="Kembalikan ke rencana"
                                >
                                  <span>← Rencana</span>
                                </Button>
                                <Button
                                  type="button"
                                  className="card-quick-move-btn move-done"
                                  disabled={busyId === task.id}
                                  onClick={() => void handleQuickMove(task, 'selesai')}
                                  title="Tandai tugas selesai"
                                  aria-label="Tandai tugas selesai"
                                >
                                  <span><Check size={14} aria-hidden="true" /> Selesai</span>
                                </Button>
                              </div>
                            )}
                            {data.status === 'selesai' && (
                              <Button
                                type="button"
                                className="card-quick-move-btn move-reopen"
                                disabled={busyId === task.id}
                                onClick={() => void handleQuickMove(task, 'proses')}
                                title="Buka kembali pekerjaan"
                                aria-label="Buka kembali pekerjaan"
                              >
                                <span>↺ Buka Lagi</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })
                )}
                {col.key === 'selesai' && (
                  <div className="scrum-col-archive-footer">
                    <Link
                      href="/tugas?status=selesai"
                      className="scrum-archive-link"
                      title="Buka arsip riwayat selesai lengkap"
                    >
                      <CheckCircle2 size={13} />
                      <span>Buka Riwayat Selesai ({completedTotalCount}) →</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Drop Targets for Quick Completion & Cancellation */}
      <div className="scrum-drop-targets-row" aria-label="Zona seret penyelesaian tugas">
        <div
          className={`scrum-drop-target drop-target-complete ${dragOverCol === 'selesai' ? 'is-drag-over' : ''} ${draggedTaskId ? 'is-active-drop' : ''}`}
          data-drop-zone={'selesai'}
        >
          <div className="drop-target-icon">
            <CheckCircle2 size={20} />
          </div>
          <div className="drop-target-text">
            <strong>Selesai</strong>
            <small>
              Seret kartu ke sini untuk menyelesaikan tugas & memindahkan ke Riwayat Selesai
            </small>
          </div>
          <Link
            href="/tugas?status=selesai"
            className="drop-target-action-link"
            onClick={(e) => e.stopPropagation()}
          >
            Riwayat Selesai ({completedTotalCount}) →
          </Link>
        </div>

        <div
          className={`scrum-drop-target drop-target-cancel ${dragOverCol === 'dibatalkan' ? 'is-drag-over' : ''} ${draggedTaskId ? 'is-active-drop' : ''}`}
          data-drop-zone={'dibatalkan'}
        >
          <div className="drop-target-icon">
            <AlertCircle size={20} />
          </div>
          <div className="drop-target-text">
            <strong>Dibatalkan</strong>
            <small>Seret kartu ke sini untuk membatalkan pengerjaan</small>
          </div>
        </div>
      </div>
    </div>
  );
}
