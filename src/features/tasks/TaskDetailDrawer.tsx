'use client';
import { DialogSurface } from '@/components/ui/Modal';
import { DaftarTerkait } from '../records/RecordDrawer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Input';
import { DateInput } from '@/components/ui/DateField';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  Check,
  Repeat,
  ChevronLeft,
  ChevronRight,
  X,
  Edit2,
  Plus,
  Send,
  Trash2,
  Flag,
  ExternalLink,
  Link2,
  Copy,
  CheckCheck,
} from 'lucide-react';
import { schemas, type Item } from '../records/schemas';
import type { Workspace } from '../workspace/useWorkspace';
import { api } from '@/lib/client';
import { subtaskProgress } from '@/lib/progress';
import { formatDate, formatDateTime, today } from '@/lib/date';
import { toggleTaskStatus, selectTaskStatus, type TaskStatus } from '@/lib/task-status';
import { RecursiveScheduleModal } from './RecursiveScheduleModal';
import { meetingJoinUrl } from '../meetings/meeting';
import { formatDisplayCode } from './task-code';
import { SubtaskToggle } from './SubtaskToggle';
import { Select } from '@/components/ui/Select';

type ActivityItem = {
  id: string;
  user: string;
  role?: string;
  text: string;
  created_at: string;
  type: 'log' | 'comment' | 'status_change' | 'creation';
};

export function TaskDetailDrawer({
  task,
  workspace,
  onClose,
  onUpdated,
  onPrev,
  onNext,
  onFullEdit,
  onDelete,
}: {
  task: Item;
  workspace: Workspace;
  onClose: () => void;
  onUpdated: () => Promise<void>;
  onPrev?: () => void;
  onNext?: () => void;
  onFullEdit?: (task: Item) => void;
  onDelete?: (task: Item) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => node?.close();
  }, []);

  const [taskData, setTaskData] = useState(task.data);
  const [sourceData, setSourceData] = useState(task.data);
  const data = taskData;
  const isComplete = data.status === 'selesai';

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(String(data.title || ''));
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [description, setDescription] = useState(String(data.description || ''));
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingSubtask, setPendingSubtask] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [isEditingLink, setIsEditingLink] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [submissionLink, setSubmissionLink] = useState(String(data.link || ''));
  if (sourceData !== task.data) {
    setSourceData(task.data);
    setTaskData(task.data);
    setTitle(String(task.data.title || ''));
    setDescription(String(task.data.description || ''));
    setSubmissionLink(String(task.data.link || ''));
    setIsEditingTitle(false);
    setIsEditingDesc(false);
    setIsEditingLink(false);
    setError('');
  }

  const subtasks = Array.isArray(data.subtasks)
    ? (data.subtasks as { title: string; done: boolean; code?: string }[])
    : [];

  const completedSubtasks = subtasks.filter((s) => s.done).length;
  const subtasksPercent = subtaskProgress(subtasks);

  // Activities & coordination comments
  const activities: ActivityItem[] =
    Array.isArray(data.activities) && data.activities.length > 0
      ? (data.activities as ActivityItem[])
      : [];

  const project = workspace.workstreams?.find((w) => w.id === data.workstream_id);
  const stakeholder = workspace.stakeholders?.find((row) => row.id === data.stakeholder_id);
  const document = workspace.documents?.find((row) => row.id === data.document_id);
  const meeting = workspace.meetings?.find((row) => row.id === data.meeting_id);
  const joinUrl = meetingJoinUrl(meeting);
  const managerName = String(workspace.organization?.[0]?.data?.manager || 'Manajer');

  function handleCopySubmissionLink() {
    if (!data.link) return;
    void navigator.clipboard?.writeText(String(data.link));
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  async function handleRemoveSubmissionLink() {
    if (!window.confirm('Hapus link pengumpulan dari tugas ini?')) return;
    setSubmissionLink('');
    await saveChanges({ link: '' }, 'menghapus link pengumpulan');
  }

  async function handleDelete() {
    if (onDelete) {
      /* Confirmation and persistence handled in parent via onDelete prop */
      onDelete(task);
    } else {
      if (
        !window.confirm(
          `Hapus tugas "${data.title || 'ini'}"? Tindakan ini tidak dapat dibatalkan.`,
        )
      )
        return;
      setBusy(true);
      setError('');
      try {
        /* Mark as dibatalkan as fallback if no delete handler provided */
        const parsed = schemas['work-items'].parse({ ...data, status: 'dibatalkan' });
        await api('work-items', { id: task.id, data: parsed });
        await onUpdated();
        onClose();
      } catch (err) {
        setError((err as Error).message || 'Gagal membatalkan tugas.');
      } finally {
        setBusy(false);
      }
    }
  }

  async function saveChanges(changes: Record<string, unknown>, activityMsg?: string) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const updatedActivities = [...activities];
      if (activityMsg) {
        updatedActivities.push({
          id: crypto.randomUUID(),
          user: managerName,
          role: 'Pelaksana Utama',
          text: activityMsg,
          created_at: new Date().toISOString(),
          type: activityMsg.startsWith('menambahkan catatan:') ? 'comment' : 'status_change',
        });
      }

      const updatedPayload = {
        ...data,
        ...changes,
        activities: updatedActivities,
      };

      const parsed = schemas['work-items'].parse(updatedPayload);
      await api('work-items', { id: task.id, data: parsed });
      setTaskData(parsed);
      if ('link' in changes) setSubmissionLink(String(parsed.link || ''));
      await onUpdated();
      return true;
    } catch (err) {
      setError((err as Error).message || 'Gagal memperbarui tugas.');
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function toggleComplete() {
    const change = toggleTaskStatus(data.status);
    await saveChanges(
      change,
      change.status === 'selesai'
        ? 'telah menandai tugas ini selesai'
        : 'membuka kembali status tugas',
    );
  }

  async function handleAddSubtask(e: React.FormEvent) {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    const nextSubtasks = [...subtasks, { title: newSubtaskTitle.trim(), done: false }];
    setNewSubtaskTitle('');
    await saveChanges(
      { subtasks: nextSubtasks },
      `menambahkan subtugas: "${newSubtaskTitle.trim()}"`,
    );
  }

  async function toggleSubtask(index: number) {
    if (busy) return;
    setPendingSubtask(index);
    const nextSubtasks = subtasks.map((s, idx) => (idx === index ? { ...s, done: !s.done } : s));
    try {
      await saveChanges({ subtasks: nextSubtasks });
    } finally {
      setPendingSubtask(null);
    }
  }

  async function removeSubtask(index: number) {
    const nextSubtasks = subtasks.filter((_, idx) => idx !== index);
    await saveChanges({ subtasks: nextSubtasks });
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    const msg = `menambahkan catatan: "${newCommentText.trim()}"`;
    if (await saveChanges({}, msg)) setNewCommentText('');
  }

  return (
    <DialogSurface
      ref={dialog}
      className="task-detail-drawer"
      aria-label="Detail Tugas"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === dialog.current) onClose();
      }}
    >
      <div className="task-detail-backdrop" onClick={onClose} />
      <div className="task-detail-panel">
        {/* Mobile Pull Handle */}
        <div className="drawer-mobile-handle" aria-hidden="true" />

        {/* Top Control Bar */}
        <div className="drawer-top-bar">
          <div className="left-controls">
            <Button
              type="button"
              className={`btn-mark-complete ${isComplete ? 'completed' : ''}`}
              onClick={toggleComplete}
              disabled={busy}
            >
              <Check size={15} />
              <span>{isComplete ? 'Selesai' : 'Tandai Selesai'}</span>
            </Button>
            <Button
              type="button"
              className="btn-drawer-action"
              title="Atur Jadwal Berkala"
              onClick={() => setShowScheduleModal(true)}
            >
              <Repeat size={14} />
              <span>Jadwal</span>
            </Button>
            {onFullEdit && (
              <Button
                type="button"
                className="btn-drawer-action"
                title="Buka formulir lengkap untuk mengubah semua data"
                onClick={() => {
                  onClose();
                  onFullEdit(task);
                }}
              >
                <Edit2 size={13} />
                <span>Formulir</span>
              </Button>
            )}
          </div>

          <div className="right-controls">
            {(onPrev || onNext) && (
              <div className="drawer-nav-group" role="group" aria-label="Navigasi tugas">
                {onPrev && (
                  <Button
                    type="button"
                    className="btn-icon btn-nav-prev"
                    title="Tugas Sebelumnya"
                    onClick={onPrev}
                    disabled={busy}
                  >
                    <ChevronLeft size={16} />
                  </Button>
                )}
                {onNext && (
                  <Button
                    type="button"
                    className="btn-icon btn-nav-next"
                    title="Tugas Berikutnya"
                    onClick={onNext}
                    disabled={busy}
                  >
                    <ChevronRight size={16} />
                  </Button>
                )}
              </div>
            )}
            <Button
              type="button"
              className="btn-drawer-action btn-danger-action"
              title="Hapus tugas ini"
              onClick={handleDelete}
              disabled={busy}
            >
              <Trash2 size={14} />
              <span>Hapus</span>
            </Button>
            <Button
              type="button"
              className="btn-icon close-drawer-btn"
              title="Tutup"
              onClick={onClose}
            >
              <X size={18} />
            </Button>
          </div>
        </div>

        {error && (
          <div className="drawer-error" role="alert">
            {error}
          </div>
        )}

        {/* Task Title & Code Header */}
        <div className="drawer-header-section">
          {/* Eyebrow: Task Code & Project Badge */}
          <div className="drawer-eyebrow-row">
            <span
              className="task-code-badge"
              title="Kode tugas dibuat otomatis saat tugas disimpan"
            >
              {formatDisplayCode(String(data.code), 'work-items', task.id)}
            </span>
            {project && (
              <Link
                href={`/proyek?id=${project.id}`}
                className="project-badge project-badge-link"
                title={`Buka proyek ${String(project.data.title)}`}
              >
                <span
                  className="project-color-dot"
                  aria-hidden="true"
                  style={{ background: String(project.data.color || 'var(--line-strong)') }}
                />
                {String(project.data.title)}
              </Link>
            )}
          </div>

          {/* Title */}
          {isEditingTitle ? (
            <div className="title-edit-form">
              <Input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (!title.trim()) return;
                    setIsEditingTitle(false);
                    if (title.trim() !== data.title) {
                      await saveChanges(
                        { title: title.trim() },
                        `mengubah judul menjadi "${title.trim()}"`,
                      );
                    }
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    setTitle(String(data.title));
                    setIsEditingTitle(false);
                  }
                }}
                autoFocus
                className="title-input-field"
              />
              <div className="inline-actions">
                <Button
                  type="button"
                  className="btn-tiny-cancel"
                  onClick={() => {
                    setTitle(String(data.title));
                    setIsEditingTitle(false);
                  }}
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  className="btn-tiny-save"
                  disabled={busy || !title.trim()}
                  onClick={async () => {
                    if (!title.trim()) return;
                    setIsEditingTitle(false);
                    if (title.trim() !== data.title) {
                      await saveChanges(
                        { title: title.trim() },
                        `mengubah judul menjadi "${title.trim()}"`,
                      );
                    }
                  }}
                >
                  Simpan
                </Button>
              </div>
            </div>
          ) : (
            <h2 className="task-detail-title" onClick={() => setIsEditingTitle(true)}>
              <span>{String(data.title)}</span>
              <Button type="button" className="inline-edit-icon" title="Ubah Judul">
                <Edit2 size={16} />
              </Button>
            </h2>
          )}

          {/* Linear/Notion-style Unified Properties Grid */}
          <div className="drawer-properties-grid">
            {/* Status */}
            <div className="drawer-prop-row">
              <span className="drawer-prop-label">Status</span>
              <div className="drawer-prop-control">
                <Select
                  className={`drawer-status-select-wrap status-${data.status || 'rencana'}`}
                  value={String(data.status || 'rencana')}
                  disabled={busy}
                  onChange={async (nextVal) => {
                    const nextStatus = nextVal as TaskStatus;
                    const statusChanges = selectTaskStatus(nextStatus);
                    const labelMap: Record<string, string> = {
                      rencana: 'Rencana',
                      proses: 'Dikerjakan',
                      selesai: 'Selesai',
                      dibatalkan: 'Dibatalkan',
                    };
                    await saveChanges(
                      statusChanges,
                      `mengubah status tugas menjadi "${labelMap[nextStatus] || nextStatus}"`,
                    );
                  }}
                  options={[
                    { value: 'rencana', label: 'Rencana' },
                    { value: 'proses', label: 'Dikerjakan' },
                    { value: 'selesai', label: 'Selesai' },
                    { value: 'dibatalkan', label: 'Dibatalkan' },
                  ]}
                  ariaLabel="Ubah status tugas"
                />
              </div>
            </div>

            {/* Prioritas */}
            <div className="drawer-prop-row">
              <span className="drawer-prop-label">Prioritas</span>
              <div className="drawer-prop-control">
                <Select
                  className={`drawer-priority-select-wrap priority-${data.priority || 'normal'}`}
                  value={String(data.priority || 'normal')}
                  disabled={busy}
                  onChange={async (nextPriority) => {
                    await saveChanges(
                      { priority: nextPriority },
                      `mengubah prioritas menjadi "${nextPriority}"`,
                    );
                  }}
                  options={[
                    { value: 'rendah', label: 'Rendah', icon: <Flag size={12} className="priority-flag-icon" /> },
                    { value: 'normal', label: 'Normal', icon: <Flag size={12} className="priority-flag-icon" /> },
                    { value: 'tinggi', label: 'Tinggi', icon: <Flag size={12} className="priority-flag-icon" /> },
                    { value: 'mendesak', label: 'Mendesak', icon: <Flag size={12} className="priority-flag-icon" /> },
                  ]}
                  ariaLabel="Ubah prioritas tugas"
                />
              </div>
            </div>

            {/* Tenggat */}
            <div className="drawer-prop-row">
              <span className="drawer-prop-label">Tenggat</span>
              <div className="drawer-prop-control date-prop-editable" title="Ubah tanggal tenggat tugas">
                <DateInput
                  aria-label="Tenggat tugas"
                  className="drawer-date-inline-input"
                  value={String(data.due_date || today())}
                  disabled={busy}
                  onValueChange={async (value) => {
                    const nextDate = value;
                    if (!nextDate) return;
                    await saveChanges(
                      { due_date: nextDate },
                      `memperbarui tenggat menjadi ${formatDate(nextDate)}`,
                    );
                  }}
                />
              </div>
            </div>

            {/* Penanggung Jawab */}
            <div className="drawer-prop-row">
              <span className="drawer-prop-label">Penanggung jawab</span>
              <div className="drawer-prop-control prop-user-chip">
                <span className="prop-avatar prop-avatar-assignee">
                  {String(data.assignee || managerName).charAt(0).toUpperCase()}
                </span>
                <span className="prop-user-name">{String(data.assignee || managerName)}</span>
                <span className="prop-user-role">Pelaksana Utama</span>
              </div>
            </div>

            {/* Dibuat Oleh */}
            <div className="drawer-prop-row">
              <span className="drawer-prop-label">Dibuat oleh</span>
              <div className="drawer-prop-control prop-user-chip">
                <span className="prop-avatar prop-avatar-creator">{managerName.charAt(0).toUpperCase()}</span>
                <span className="prop-user-name">{managerName}</span>
                <span className="prop-user-role">Catatan pribadi</span>
              </div>
            </div>

            {/* Perulangan jika ada */}
            {Boolean(data.recurrence && data.recurrence !== 'tidak') && (
              <div className="drawer-prop-row">
                <span className="drawer-prop-label">Perulangan</span>
                <div className="drawer-prop-control prop-text-badge">
                  <Repeat size={12} />
                  <span>{String(data.recurrence)}</span>
                </div>
              </div>
            )}

            {/* Mitra jika ada */}
            {stakeholder && (
              <div className="drawer-prop-row">
                <span className="drawer-prop-label">Mitra / Kontak</span>
                <div className="drawer-prop-control prop-text-badge">
                  <span>{String(stakeholder.data.title)}</span>
                </div>
              </div>
            )}

            {/* Dokumen jika ada */}
            {document && (
              <div className="drawer-prop-row">
                <span className="drawer-prop-label">Dokumen</span>
                <div className="drawer-prop-control">
                  <a href={`/dokumen?record=${encodeURIComponent(document.id)}`} className="prop-link">
                    <ExternalLink size={13} /> {String(document.data.title)}
                  </a>
                </div>
              </div>
            )}

            {/* Rapat jika ada */}
            {joinUrl && (
              <div className="drawer-prop-row">
                <span className="drawer-prop-label">Rapat</span>
                <div className="drawer-prop-control">
                  <a href={joinUrl} target="_blank" rel="noreferrer" className="prop-link">
                    <ExternalLink size={13} /> {String(meeting?.data.title || 'Rapat online')}
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Description Section */}
          <div className="drawer-description-box">
            <div className="box-title-row">
              <span className="section-label">Deskripsi</span>
              {!isEditingDesc && (
                <Button
                  type="button"
                  className="edit-pencil-btn"
                  onClick={() => setIsEditingDesc(true)}
                  title="Ubah Deskripsi"
                >
                  <Edit2 size={13} />
                </Button>
              )}
            </div>
            {isEditingDesc ? (
              <div className="desc-edit-form">
                <Textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tambahkan detail tugas..."
                  className="desc-textarea-field"
                />
                <div className="inline-actions">
                  <Button
                    type="button"
                    className="btn-tiny-cancel"
                    onClick={() => {
                      setDescription(String(data.description || ''));
                      setIsEditingDesc(false);
                    }}
                  >
                    Batal
                  </Button>
                  <Button
                    type="button"
                    className="btn-tiny-save"
                    disabled={busy}
                    onClick={async () => {
                      setIsEditingDesc(false);
                      if (description !== data.description) {
                        await saveChanges({ description });
                      }
                    }}
                  >
                    Simpan
                  </Button>
                </div>
              </div>
            ) : (
              <p className="task-desc-text" onClick={() => setIsEditingDesc(true)}>
                {String(data.description || 'Klik di sini untuk menambahkan deskripsi tugas.')}
              </p>
            )}
          </div>
        </div>
        {/* Link Pengumpulan & Bukti Hasil Tugas */}
        {/* Link Pengumpulan & Bukti Hasil Tugas */}
        <div className="task-submission-card">
          <div className="submission-card-head">
            <div className="submission-title-group">
              <div className="submission-icon-badge" aria-hidden="true">
                <Link2 size={15} />
              </div>
              <span className="submission-section-title">Link Pengumpulan & Bukti Hasil</span>
            </div>
            {data.link ? (
              <span className="submission-status-pill is-connected">
                <Check size={11} strokeWidth={2.8} />
                <span>Terpasang</span>
              </span>
            ) : (
              <span className="submission-status-pill is-empty">Belum Ada Tautan</span>
            )}
          </div>

          {isEditingLink ? (
            <div className="submission-edit-wrap">
              <Input
                type="url"
                value={submissionLink}
                onChange={(e) => setSubmissionLink(e.target.value)}
                placeholder="https://... (contoh: folder Google Drive, dokumen hasil, portal tugas)"
                className="submission-url-input"
                autoFocus
              />
              <div className="inline-actions">
                <Button
                  type="button"
                  className="btn-tiny-cancel"
                  onClick={() => {
                    setSubmissionLink(String(data.link || ''));
                    setIsEditingLink(false);
                  }}
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  className="btn-tiny-save"
                  disabled={busy}
                  onClick={async () => {
                    setIsEditingLink(false);
                    if (submissionLink.trim() !== String(data.link || '')) {
                      await saveChanges(
                        { link: submissionLink.trim() },
                        submissionLink.trim()
                          ? `memperbarui link pengumpulan`
                          : `menghapus link pengumpulan`,
                      );
                    }
                  }}
                >
                  Simpan Tautan
                </Button>
              </div>
            </div>
          ) : data.link ? (
            <div className="submission-link-display">
              <a
                href={String(data.link)}
                target="_blank"
                rel="noreferrer"
                className="submission-open-btn"
                title="Buka link pengumpulan di tab baru"
              >
                <ExternalLink size={14} />
                <span className="submission-url-text">{String(data.link)}</span>
                <span className="submission-open-badge">Buka Hasil ↗</span>
              </a>
              <div className="submission-quick-actions">
                <Button
                  type="button"
                  className="btn-tiny-copy"
                  onClick={handleCopySubmissionLink}
                  title="Salin tautan bukti hasil"
                >
                  {copiedLink ? <CheckCheck size={13} /> : <Copy size={13} />}
                  <span>{copiedLink ? 'Tersalin' : 'Salin'}</span>
                </Button>
                <Button
                  type="button"
                  className="btn-tiny-edit"
                  onClick={() => setIsEditingLink(true)}
                  title="Ubah tautan pengumpulan"
                >
                  <Edit2 size={13} />
                  <span>Ubah</span>
                </Button>
                <Button
                  type="button"
                  className="btn-tiny-delete"
                  onClick={handleRemoveSubmissionLink}
                  title="Hapus tautan pengumpulan"
                >
                  <Trash2 size={13} />
                  <span>Hapus</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="submission-empty-box">
              <p className="submission-empty-text">
                Belum ada link pengumpulan terpasang. Tautkan Google Drive, lembar kerja, foto, atau
                portal hasil tugas.
              </p>
              <Button
                type="button"
                className="btn-add-submission-quick"
                onClick={() => setIsEditingLink(true)}
              >
                <Plus size={14} />
                <span>Pasang Link Pengumpulan</span>
              </Button>
            </div>
          )}
        </div>

        {/* Catatan terkait: proyek, rapat, gerai, penanggung jawab, kegiatan, prasyarat. */}
        <div className="subtasks-section task-terkait">
          <div className="subtasks-header">
            <h4>Terkait</h4>
          </div>
          <DaftarTerkait entity="work-items" row={task} workspace={workspace} onNavigate={onClose} />
        </div>

        {/* Subtasks Section with Tree & Checklist */}
        <div className="subtasks-section">
          <div className="subtasks-header">
            <h4>
              Subtugas ({completedSubtasks}/{subtasks.length})
            </h4>
            {subtasks.length > 0 && (
              <span className="subtasks-progress-badge">{subtasksPercent}%</span>
            )}
          </div>

          {subtasks.length > 0 && (
            <div className="subtasks-progress-bar">
              <div className="bar-fill" style={{ width: `${subtasksPercent}%` }} />
            </div>
          )}

          <div className="subtasks-tree-list">
            {subtasks.map((sub, idx) => (
              <div key={idx} className={`subtask-tree-row ${sub.done ? 'completed' : ''}`}>
                <SubtaskToggle
                  done={Boolean(sub.done)}
                  title={sub.title}
                  disabled={busy}
                  busy={pendingSubtask === idx}
                  onClick={() => void toggleSubtask(idx)}
                />
                {sub.code && <span className="subtask-code-pill">{sub.code}</span>}
                <span className="subtask-title-text" onClick={() => toggleSubtask(idx)}>
                  {sub.title}
                </span>
                <Button
                  type="button"
                  className="subtask-delete-btn"
                  title="Hapus Subtugas"
                  aria-label={`Hapus subtugas: ${sub.title}`}
                  disabled={busy}
                  onClick={() => removeSubtask(idx)}
                >
                  <Trash2 size={13} />
                </Button>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddSubtask} className="add-subtask-form">
            <Plus size={15} />
            <Input
              type="text"
              value={newSubtaskTitle}
              aria-label="Judul subtugas baru"
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              placeholder="Tambah subtugas baru, lalu tekan Enter…"
              className="inline-subtask-input"
            />
            {newSubtaskTitle.trim() && (
              <Button type="submit" className="btn-add-subtask">
                Tambah
              </Button>
            )}
          </form>
        </div>

        {/* Summary & Activity Timeline */}
        <div className="activity-summary-section">
          <h4>Catatan dan riwayat tugas</h4>
          <div className="timeline-feed">
            {activities.map((act) => (
              <div key={act.id} className="timeline-event">
                <span className="event-avatar">{act.user.charAt(0).toUpperCase()}</span>
                <div className="event-content">
                  <p className="event-text">
                    <strong>{act.user}</strong> {act.text}
                  </p>
                  <span className="event-time">
                    {formatDateTime(act.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Rich Message / Comment Editor */}
        <div className="comment-composer-box">
          <form onSubmit={handleAddComment} className="composer-input-row">
            <Input
              aria-label="Catatan tugas"
              type="text"
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Tulis catatan tugas…"
              className="composer-input-field"
            />
            <Button
              type="submit"
              disabled={busy || !newCommentText.trim()}
              className="btn-send-comment"
            >
              <Send size={15} />
              <span>Simpan catatan</span>
            </Button>
          </form>
        </div>
      </div>

      {showScheduleModal && (
        <RecursiveScheduleModal
          currentType={String(data.recurrence || 'tidak')}
          currentTime={String(data.recurrence_time || '09:00')}
          currentEndDate={String(data.recurrence_end_date || '')}
          onClose={() => setShowScheduleModal(false)}
          onSave={async (sched) => {
            await saveChanges(sched, `memperbarui jadwal berkala: ${sched.recurrence}`);
          }}
        />
      )}
    </DialogSurface>
  );
}

