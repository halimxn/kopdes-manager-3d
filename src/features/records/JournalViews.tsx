'use client';
// Tampilan Kegiatan (papan, linimasa, tabel) untuk halaman catatan jurnal.
import { useDragSort } from '@/components/ui/useDragSort';
import { DragOverlay } from '@/components/ui/DragOverlay';
import { Button, IconButton } from '@/components/ui/Button';
import Link from 'next/link';
import { useState } from 'react';
import { type Item } from './schemas';
import type { Workspace } from '../workspace/useWorkspace';
import { api } from '@/lib/client';
import { today, addDays, formatDate } from '@/lib/date';
import { Select } from '@/components/ui/Select';
import { GripVertical, Calendar, Plus, Building2, Handshake, BookOpen, FileText, Video, CheckSquare, ArrowUpRight } from 'lucide-react';
import { meetingJoinUrl } from '../meetings/meeting';
import { formatDisplayCode } from '../tasks/task-code';
import { EmptyState } from '@/components/ui/EmptyState';

export function JournalBoardView({
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

export function JournalTimelineView({
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

export function JournalTableView({
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
