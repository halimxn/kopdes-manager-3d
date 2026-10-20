'use client';
// Kartu catatan per jenis entitas dan kartu tugas, dipakai daftar/papan di halaman catatan.
import { LihatDiDunia } from '@/components/ui/LihatDiDunia';
import { ringkasan } from './terkait';
import { Ikon3D } from '@/components/ui/Ikon3D';
import { AppIcon } from '@/components/ui/AppIcon';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import React from 'react';
import { labels, options, formatChoiceLabel } from './catalog';
import { schemas, type Entity, type Item } from './schemas';
import type { Workspace } from '../workspace/useWorkspace';
import { api } from '@/lib/client';
import Link from 'next/link';
import { today, addDays, formatDate } from '@/lib/date';
import { selectTaskStatus, taskStatusChange, isActiveTask, type TaskStatus } from '@/lib/task-status';
import { readiness, subtaskProgress } from '@/lib/progress';
import { Meter } from '@/components/charts/Charts';
import { ReadinessRadar } from '@/components/charts/ReadinessRadar';
import { Select } from '@/components/ui/Select';
import { Calendar, ChevronDown, Shield, Landmark, Scale, Users2, Building2, Wheat, Handshake, CircleDot, Clock, MapPin, Users, BookOpen, FileText, Phone, CheckCircle2, Video, AlertCircle, ShieldCheck, CheckSquare, Check, RotateCcw, ExternalLink, Flame, MoreHorizontal, Trash2, NotebookPen } from 'lucide-react';
import { downloadMeeting, meetingJoinUrl } from '../meetings/meeting';
import { INFO_JENIS, catatHasilHref, jenisDari } from '../meetings/jenis';
import { formatDisplayCode } from '../tasks/task-code';

// Dibutuhkan kartu dari halaman catatan; disediakan oleh Records.
export type KonteksKartu = {
  entity: Entity;
  workspace: Workspace;
  refresh: () => Promise<void>;
  busy: boolean;
  setBusy: (busy: boolean) => void;
  setError: (message: string) => void;
  setDetailTask: (item: Item | null) => void;
  setLihat: (item: Item | null) => void;
  update: (item: Item, changes: Record<string, unknown>) => Promise<void>;
};

export function getStakeholderCategoryClass(category: string) {
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

export function getStakeholderCategoryIcon(category: string): React.ReactElement {
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

export function kartuTugasKalender(row: Item, k: KonteksKartu) {
  const { entity, workspace, refresh, busy, setBusy, setError, setDetailTask, update } = k;
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
}

export function kartuCatatan(row: Item, k: KonteksKartu) {
  const { entity, workspace, refresh, busy, setBusy, setError, setDetailTask, setLihat, update } = k;
  if ((entity as string) === 'work-items') {
    return kartuTugasKalender(row, k);
  }
  return (
    <article className={`record card ${entity === 'units' ? 'unit-record' : ''} ${entity === 'meetings' ? 'meeting-record' : ''}`} key={row.id} data-jenis={entity === 'meetings' ? jenisDari(row) : undefined}>
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
          <span className={'badge ' + (['selesai', 'hadir', 'diterima'].includes(String(row.data.status)) ? 'ok' : row.data.status === 'alpa' ? 'late' : '')}>
            {formatChoiceLabel(String(row.data.status), `${entity}.status`)}
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
            {(() => {
              const { label, Ikon } = INFO_JENIS[jenisDari(row)];
              return (
                <span className="cip-jenis">
                  <Ikon size={12} aria-hidden="true" /> {label}
                </span>
              );
            })()}
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
                  <strong>Peserta: </strong>
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
                {/* Agenda yang sudah tiba atau lewat: hasilnya dicatat sebagai catatan kegiatan yang tertaut. */}
                {String(row.data.date || '') <= today() && (
                  <Link className="button meeting-join btn-catat-hasil" href={catatHasilHref(row, today())}>
                    <NotebookPen size={13} aria-hidden="true" />
                    Catat hasil
                  </Link>
                )}
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
}
