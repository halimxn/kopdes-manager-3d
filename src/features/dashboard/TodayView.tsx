'use client';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { useEffect, useState } from 'react';
import { Toast } from '@/components/ui/Toast';
import { Ikon3D } from '@/components/ui/Ikon3D';
import { useSwipeAction } from '@/components/ui/useSwipeAction';
import {
  CalendarDays,
  Check,
  Clock,
  Plus,
  AlertTriangle,
  ExternalLink,
  Download,
  CalendarCheck,
  Video,
  MapPin,
  Globe,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import type { Workspace } from '../workspace/useWorkspace';
import { schemas, type Item } from '../records/schemas';
import { addDays, formatDate, today } from '@/lib/date';
import { toggleTaskStatus } from '@/lib/task-status';
import { api } from '@/lib/client';
import { TaskDetailDrawer } from '../tasks/TaskDetailDrawer';
import { Editor } from '../records/Editor';
import { downloadMeeting } from '../meetings/meeting';

export function TodayView({
  workspace,
  refresh,
}: {
  workspace: Workspace;
  refresh: () => Promise<void>;
}) {
  const now = today();
  const tasks = (workspace['work-items'] || []).map((row) => ({
    ...row,
    parsed: schemas['work-items'].safeParse(row.data),
  }));

  const [detailTask, setDetailTask] = useState<Item | null>(null);
  const [editTask, setEditTask] = useState<Item | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [undo, setUndo] = useState<{ task: Item; fields: 'status' | 'date' } | null>(null);
  useEffect(() => {
    if (!undo) return;
    const timeout = setTimeout(() => setUndo(null), 5000);
    return () => clearTimeout(timeout);
  }, [undo]);

  // 1. Overdue tasks
  const overdueTasks = tasks.filter(
    (t) =>
      !['selesai', 'dibatalkan'].includes(String(t.data.status)) && String(t.data.due_date) < now,
  );

  // 2. Today's tasks
  const todayTasks = tasks
    .filter((t) => String(t.data.due_date) === now && t.data.status !== 'dibatalkan')
    .sort((a, b) => Number(a.data.status === 'selesai') - Number(b.data.status === 'selesai'));

  // 3. Upcoming tasks (next 7 days)
  const next7Days = addDays(now, 7);
  const upcomingTasks = tasks
    .filter(
      (t) =>
        !['selesai', 'dibatalkan'].includes(String(t.data.status)) &&
        String(t.data.due_date) > now &&
        String(t.data.due_date) <= next7Days,
    )
    .sort((a, b) => String(a.data.due_date).localeCompare(String(b.data.due_date)));

  // 4. Today's meetings
  const todayMeetings = (workspace.meetings || []).filter(
    (m) => String(m.data.date) === now && m.data.status !== 'dibatalkan',
  );

  const projects = workspace.workstreams || [];

  async function toggleComplete(task: Item, e?: React.MouseEvent) {
    e?.stopPropagation();
    if (busyId) return;
    setBusyId(task.id);
    setError('');
    try {
      const change = toggleTaskStatus(task.data.status, { completedAt: now });
      await api('work-items', {
        id: task.id,
        data: {
          ...task.data,
          ...change,
        },
      });
      setUndo({ task, fields: 'status' });
      await refresh();
    } catch (err) {
      setError((err as Error).message || 'Gagal memperbarui status tugas.');
    } finally {
      setBusyId(null);
    }
  }

  async function rescheduleToToday(task: Item, e: React.MouseEvent) {
    e.stopPropagation();
    if (busyId) return;
    setBusyId(task.id);
    setError('');
    try {
      await api('work-items', {
        id: task.id,
        data: {
          ...task.data,
          due_date: now,
        },
      });
      setUndo({ task, fields: 'date' });
      await refresh();
    } catch (err) {
      setError((err as Error).message || 'Gagal memindahkan tenggat tugas.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!quickTitle.trim() || busyId) return;
    setBusyId('quick-add');
    setError('');
    try {
      await api('work-items', {
        data: schemas['work-items'].parse({
          title: quickTitle.trim(),
          due_date: now,
        }),
      });
      setQuickTitle('');
      await refresh();
    } catch (err) {
      setError((err as Error).message || 'Gagal menambahkan tugas.');
    } finally {
      setBusyId(null);
    }
  }

  const completedTodayCount = todayTasks.filter((t) => t.data.status === 'selesai').length;
  async function undoChange() {
    if (!undo || busyId) return;
    const previous = undo;
    const current = (workspace['work-items'] || []).find((task) => task.id === previous.task.id);
    if (!current) { setUndo(null); setError('Tugas belum dimuat. Muat ulang sebelum membatalkan.'); return; }
    setBusyId(current.id);
    setError('');
    try {
      const restored = previous.fields === 'status'
        ? { status: previous.task.data.status, completed_at: previous.task.data.completed_at || '' }
        : { due_date: previous.task.data.due_date };
      await api('work-items', { id: current.id, data: { ...current.data, ...restored } });
      setUndo(null);
      await refresh();
    } catch (error) { setError(error instanceof Error ? error.message : 'Gagal membatalkan perubahan.'); }
    finally { setBusyId(null); }
  }
  const swipe = useSwipeAction((id) => {
    const task = tasks.find((task) => task.id === id);
    if (task && !['selesai', 'dibatalkan'].includes(String(task.data.status))) void toggleComplete(task);
  }, (id) => {
    const task = tasks.find((task) => task.id === id);
    if (task) setEditTask(task);
  }, Boolean(busyId));

  return (
    <div className="today-view-wrapper" {...swipe}>
      {undo && <Toast message={undo.fields === 'status' ? 'Status tugas tersimpan.' : 'Tenggat dipindahkan ke hari ini.'} action={{ label: 'Batalkan', onClick: () => { void undoChange(); } }} busy={Boolean(busyId)} />}
      {/* Top Hero & Date Header */}
      <header className="today-header-card">
        <div className="today-header-meta">
          <span className="today-date-badge">
            <CalendarDays size={14} />
            {formatDate(now)}
          </span>
          <h2 className="judul-halaman">
            <Ikon3D kind="matahari" size={30} />
            Fokus kerja hari ini
          </h2>
          <p>Tugas, tenggat, dan rapat hari ini.</p>
        </div>

        {/* Quick Stats Grid */}
        <div className="today-stats-grid">
          <div className="today-stat-pill">
            <span className="stat-label">Hari Ini</span>
            <strong>
              {completedTodayCount} / {todayTasks.length} selesai
            </strong>
          </div>
          {overdueTasks.length > 0 && (
            <div className="today-stat-pill ui-stat-alert">
              <span className="stat-label">Perlu Diperhatikan</span>
              <strong>{overdueTasks.length} terlambat</strong>
            </div>
          )}
          <div className="today-stat-pill">
            <span className="stat-label">Agenda Rapat</span>
            <strong>{todayMeetings.length} rapat</strong>
          </div>
          <div className="today-stat-pill">
            <span className="stat-label">Menyusul 7 Hari</span>
            <strong>{upcomingTasks.length} tugas</strong>
          </div>
        </div>
      </header>

      {/* Quick Add Task Input Card */}
      <form className="today-quick-add-card" onSubmit={handleQuickAdd}>
        <div className="quick-add-input-wrap">
          <Plus size={18} className="quick-add-icon" />
          <Input
            type="text"
            aria-label="Judul tugas baru hari ini"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder="Tambah tugas baru untuk hari ini, lalu tekan Enter…"
            disabled={busyId === 'quick-add'}
          />
        </div>
        <div className="quick-add-actions">
          <Button
            type="submit"
            className="btn-quick-submit"
            disabled={!quickTitle.trim() || busyId === 'quick-add'}
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>{busyId === 'quick-add' ? 'Menyimpan…' : 'Tambah'}</span>
          </Button>
          <Button
            type="button"
            className="btn-open-full-modal"
            onClick={() => setShowCreateModal(true)}
            title="Buka formulir lengkap dengan rincian dan subtugas"
          >
            Form lengkap
          </Button>
        </div>
      </form>

      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}

      {/* 2-Column Responsive Layout */}
      <div className="today-grid-layout">
        {/* Left Primary Column: Today's Tasks & Overdue */}
        <main className="today-main-column">
          {/* Overdue Alert Section (Shown prominently when tasks are late) */}
          {overdueTasks.length > 0 && (
            <section className="today-card-section">
              <div className="section-title-row">
                <div className="title-left">
                  <span className="section-alert-icon">
                    <AlertTriangle size={17} />
                  </span>
                  <h2>Tugas Terlambat</h2>
                </div>
                <Badge tone="danger">{overdueTasks.length} tugas</Badge>
              </div>
              <p className="section-subtitle">
                Tugas dengan tenggat yang sudah terlewat. Jadwalkan ulang ke hari ini atau
                selesaikan.
              </p>

              <div className="today-task-cards-list">
                {overdueTasks.map((task) => {
                  const project = projects.find((p) => p.id === task.data.workstream_id);
                  const isBusy = busyId === task.id;
                  return (
                    <div
                      key={task.id}
                      className={`ui-task-row ${isBusy ? 'is-busy' : ''}`}
                      data-swipe-task={task.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setDetailTask(task)}
                      onKeyDown={(e) => {
                        if (e.target !== e.currentTarget) return;
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setDetailTask(task);
                        }
                      }}
                    >
                      <Button
                        iconOnly
                        type="button"
                        className="today-check-circle"
                        onClick={(e) => toggleComplete(task, e)}
                        title="Tandai selesai"
                        aria-label={`Tandai ${String(task.data.title)} selesai`}
                      >
                        <Check size={14} className="check-mark" />
                      </Button>

                      <div className="task-info-content">
                        <div className="task-title-row">
                          <strong className="task-title-text">{String(task.data.title)}</strong>
                          <Badge tone="danger">
                            Lewat: {formatDate(String(task.data.due_date))}
                          </Badge>
                        </div>
                        <div className="task-tags-row">
                          {project && (
                            <span className="task-project-pill">
                              <span
                                className="project-color-dot"
                                style={{
                                  backgroundColor: String(project.data.color || 'var(--brand)'),
                                }}
                              />
                              {String(project.data.title)}
                            </span>
                          )}
                          <span
                            className={`task-priority-tag priority-${task.data.priority || 'sedang'}`}
                          >
                            {String(task.data.priority || 'sedang')}
                          </span>
                        </div>
                      </div>

                      <div className="task-actions-right">
                        <Button
                          type="button"
                          className="btn-reschedule-today"
                          onClick={(e) => rescheduleToToday(task, e)}
                          title="Pindahkan tenggat ke hari ini"
                        >
                          <RotateCcw size={13} />
                          <span>Ke Hari Ini</span>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Today Tasks Section */}
          <section className="today-card-section">
            <div className="section-title-row">
              <div className="title-left">
                <span className="section-icon-pill">
                  <CalendarCheck size={18} />
                </span>
                <h2>Tugas Hari Ini</h2>
              </div>
              <span className="today-count-badge">
                {completedTodayCount} dari {todayTasks.length} selesai
              </span>
            </div>

            {todayTasks.length === 0 ? (
              <EmptyState ikon="kalender" title="Belum ada tugas untuk hari ini"
                description="Tambahkan tugas atau jadwalkan tugas yang sudah ada."
                action={{ label: 'Tambah tugas baru', onClick: () => setShowCreateModal(true) }} />
            ) : (
              <div className="today-task-cards-list">
                {todayTasks.map((task) => {
                  const isDone = task.data.status === 'selesai';
                  const project = projects.find((p) => p.id === task.data.workstream_id);
                  const subtasks = Array.isArray(task.data.subtasks)
                    ? (task.data.subtasks as { title: string; done: boolean }[])
                    : [];
                  const isBusy = busyId === task.id;

                  return (
                    <div
                      key={task.id}
                      className={`today-task-card priority-${task.data.priority || 'sedang'} ${isDone ? 'is-completed' : ''} ${isBusy ? 'is-busy' : ''}`}
                      data-swipe-task={task.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setDetailTask(task)}
                      onKeyDown={(e) => {
                        if (e.target !== e.currentTarget) return;
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setDetailTask(task);
                        }
                      }}
                    >
                      <Button
                        iconOnly
                        type="button"
                        className={`today-check-circle ${isDone ? 'checked' : ''}`}
                        onClick={(e) => toggleComplete(task, e)}
                        title={isDone ? 'Tandai belum selesai' : 'Tandai selesai'}
                        aria-label={`${isDone ? 'Tandai belum selesai' : 'Tandai selesai'}: ${String(task.data.title)}`}
                      >
                        <Check size={17} className="check-mark" />
                      </Button>

                      <div className="task-info-content">
                        <div className="task-title-row">
                          <strong className="task-title-text">{String(task.data.title)}</strong>
                        </div>
                        <div className="task-tags-row">
                          {project && (
                            <span className="task-project-pill">
                              <span
                                className="project-color-dot"
                                style={{
                                  backgroundColor: String(project.data.color || 'var(--brand)'),
                                }}
                              />
                              {String(project.data.title)}
                            </span>
                          )}
                          <span
                            className={`task-priority-tag priority-${task.data.priority || 'sedang'}`}
                          >
                            {String(task.data.priority || 'sedang')}
                          </span>
                          {subtasks.length > 0 && (
                            <span className="subtasks-summary-pill">
                              {subtasks.filter((s) => s.done).length}/{subtasks.length} subtugas
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="task-actions-right">
                        <ChevronRight size={18} className="chevron-open" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </main>

        {/* Right Sidebar Column: Meetings & Upcoming */}
        <aside className="today-side-column">
          {/* Today Meetings Section */}
          <section className="today-card-section meetings-section">
            <div className="section-title-row">
              <div className="title-left">
                <span className="section-icon-pill">
                  <Clock size={17} />
                </span>
                <h2>Rapat Hari Ini</h2>
              </div>
              <span className="meeting-count-badge">{todayMeetings.length}</span>
            </div>

            {todayMeetings.length === 0 ? (
              <EmptyState compact ikon="kalender" title="Tidak ada jadwal rapat untuk hari ini."
                action={{ label: 'Lihat rapat', href: '/rapat' }} />
            ) : (
              <div className="today-meetings-list">
                {todayMeetings.map((meeting) => {
                  const mData = meeting.data;
                  const modeStr = String(mData.mode || 'tatap muka').toLowerCase();
                  const isOnline = modeStr === 'online';
                  const isHybrid = modeStr === 'hybrid';
                  const showLocation =
                    (modeStr === 'tatap muka' || isHybrid) && Boolean(mData.location);
                  const showOnlineLink = (isOnline || isHybrid) && Boolean(mData.meeting_url);
                  return (
                    <div key={meeting.id} className="today-meeting-card">
                      <div className="meeting-time-row">
                        <span className="meeting-time-pill">
                          <Clock size={12} />
                          {String(mData.time || 'Waktu belum diisi')} WIB
                        </span>
                        <span className="meeting-mode-pill">
                          {isOnline ? (
                            <Video size={12} />
                          ) : isHybrid ? (
                            <Globe size={12} />
                          ) : (
                            <MapPin size={12} />
                          )}
                          {isOnline ? 'Online' : isHybrid ? 'Hybrid' : 'Tatap muka'}
                        </span>
                      </div>

                      <strong className="meeting-title">{String(mData.title)}</strong>

                      {showLocation && (
                        <p className="meeting-location-text">
                          <MapPin size={13} /> {String(mData.location)}
                        </p>
                      )}

                      <div className="meeting-card-actions">
                        {showOnlineLink && (
                          <a
                            href={String(mData.meeting_url)}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-join-meeting"
                          >
                            <ExternalLink size={13} /> Masuk Rapat
                          </a>
                        )}
                        <Button
                          type="button"
                          className="btn-download-ics"
                          onClick={() => downloadMeeting(meeting)}
                          title="Unduh jadwal (.ics) ke kalender perangkat"
                        >
                          <Download size={13} /> Unduh (.ics)
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Upcoming 7 Days Tasks Section */}
          <section className="today-card-section upcoming-section">
            <div className="section-title-row">
              <div className="title-left">
                <span className="section-icon-pill">
                  <CalendarDays size={17} />
                </span>
                <h2>Menyusul (7 Hari)</h2>
              </div>
              <span className="upcoming-count-badge">{upcomingTasks.length}</span>
            </div>

            {upcomingTasks.length === 0 ? (
              <EmptyState compact ikon="jam" title="Tidak ada tugas berjadwal dalam 7 hari ke depan."
                action={{ label: 'Lihat tugas', href: '/tugas' }} />
            ) : (
              <div className="upcoming-tasks-mini-list">
                {upcomingTasks.map((task) => {
                  const project = projects.find((p) => p.id === task.data.workstream_id);
                  return (
                    <div
                      key={task.id}
                      className="upcoming-mini-item"
                      role="button"
                      tabIndex={0}
                      onClick={() => setDetailTask(task)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setDetailTask(task);
                        }
                      }}
                    >
                      <span className="upcoming-date-tag">
                        {formatDate(String(task.data.due_date))}
                      </span>
                      <strong className="upcoming-task-title">{String(task.data.title)}</strong>
                      {project && (
                        <span className="upcoming-project-tag">{String(project.data.title)}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </aside>
      </div>

      {/* Task Detail Drawer */}
      {detailTask && (
        <TaskDetailDrawer
          key={detailTask.id}
          task={
            (workspace['work-items'] || []).find((item) => item.id === detailTask.id) || detailTask
          }
          workspace={workspace}
          onClose={() => setDetailTask(null)}
          onUpdated={refresh}
          onFullEdit={(task) => {
            setDetailTask(null);
            setEditTask(task);
          }}
          onDelete={async (task) => {
            if (!window.confirm(`Hapus tugas "${task.data.title || 'ini'}"? Tindakan ini tidak dapat dibatalkan.`)) return;
            setDetailTask(null);
            await api('work-items', { id: task.id, data: { ...task.data, status: 'dibatalkan' } });
            await refresh();
          }}
        />
      )}

      {/* Full Editor (for onFullEdit) */}
      {editTask && (
        <Editor
          entity="work-items"
          workspace={workspace}
          item={editTask}
          onClose={() => setEditTask(null)}
          onSaved={async () => { setEditTask(null); await refresh(); }}
        />
      )}

      {/* Modal Add Task */}
      {showCreateModal && (
        <Editor
          entity="work-items"
          workspace={workspace}
          item={{
            id: '',
            created_at: '',
            updated_at: '',
            data: {
              ...schemas['work-items'].parse({
                title: 'Tugas baru',
                due_date: now,
              }),
              title: '',
            },
          }}
          onClose={() => setShowCreateModal(false)}
          onSaved={refresh}
        />
      )}
      {/* Mobile Floating Action Button */}
      <Button
        type="button"
        className="fab-today-add"
        onClick={() => setShowCreateModal(true)}
        title="Tambah tugas baru hari ini"
        aria-label="Tambah tugas baru hari ini"
      >
        <Plus size={20} strokeWidth={2.5} />
        <span className="fab-today-label">Tugas Baru</span>
      </Button>
    </div>
  );
}
