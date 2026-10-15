'use client';
// Arsip tugas selesai dikelompokkan per tanggal penyelesaian.
import { Button } from '@/components/ui/Button';
import { formatChoiceLabel } from './catalog';
import { type Item } from './schemas';
import type { Workspace } from '../workspace/useWorkspace';
import { today, addDays, formatDate } from '@/lib/date';
import { Calendar, CheckCircle2, User, CheckSquare, Flag } from 'lucide-react';
import { formatDisplayCode } from '../tasks/task-code';
import { EmptyState } from '@/components/ui/EmptyState';

export function CompletedTimelineView({
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
