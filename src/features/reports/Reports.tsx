'use client';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { DateInput } from '@/components/ui/DateField';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useCallback, useEffect, useState } from 'react';
import {
  Printer,
  Share2,
  CheckCircle2,
  Flag,
  AlertTriangle,
  Lightbulb,
  ShieldAlert,
  Calendar,
  FileText,
  Check,
  Building2,
  Trash2,
  FilePenLine,
  Sparkles,
  Wallet,
  Info,
} from 'lucide-react';
import { api } from '@/lib/client';
import { today, addDays, formatDate, monthRange } from '@/lib/date';
import { rupiah } from '../operations/ledger';
import type { ReportSnapshot } from './report-snapshot';

export type Report = {
  id: string;
  title: string;
  period_start: string;
  period_end: string;
  snapshot: ReportSnapshot;
  created_at?: string;
};

type Periode = 'pekan' | 'bulan-ini' | 'bulan-lalu';
// Preset bulanan menyiapkan laporan untuk rapat pengurus; isi tetap dihitung server dari catatan periode itu.
function isiPeriode(periode: Periode, hari = today()) {
  if (periode === 'pekan')
    return { title: 'Laporan kerja mingguan', start: addDays(hari, -6), end: hari };
  const bulan = monthRange(hari, periode === 'bulan-lalu' ? -1 : 0);
  return { title: `Laporan kerja bulanan ${bulan.label}`, start: bulan.start, end: bulan.end };
}
const pilihanPeriode: { id: Periode; label: string }[] = [
  { id: 'pekan', label: '7 hari' },
  { id: 'bulan-ini', label: 'Bulan ini' },
  { id: 'bulan-lalu', label: 'Bulan lalu' },
];

const sectionMeta = {
  completed: {
    title: 'Pekerjaan selesai',
    Icon: CheckCircle2,
    color: 'section-success',
    emptyText: 'Nihil pada periode ini.',
  },
  milestones: {
    title: 'Target penting',
    Icon: Flag,
    color: 'section-primary',
    emptyText: 'Nihil.',
  },
  decisions: {
    title: 'Keputusan rapat',
    Icon: Lightbulb,
    color: 'section-warning',
    emptyText: 'Tidak ada keputusan baru.',
  },
  next: {
    title: 'Rencana Kerja 7 Hari Mendatang',
    Icon: Calendar,
    color: 'section-info',
    emptyText: 'Belum ada agenda lanjutan.',
  },
  overdue: {
    title: 'Kendala & Tugas Terlambat',
    Icon: AlertTriangle,
    color: 'section-danger',
    emptyText: 'Nihil (semua tugas tepat waktu).',
  },
  risks: {
    title: 'Risiko yang belum ditutup',
    Icon: ShieldAlert,
    color: 'section-danger',
    emptyText: 'Nihil (tidak ada risiko terbuka).',
  },
} as const;

export function Reports({ previewReports }: { previewReports?: Report[] } = {}) {
  const [reports, setReports] = useState<Report[]>(previewReports || []);
  const [selected, setSelected] = useState<Report | null>(previewReports?.[0] || null);
  const [filterTab, setFilterTab] = useState<'all' | 'draft' | 'final'>('all');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(!previewReports);
  const [hasMore, setHasMore] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [periode, setPeriode] = useState<Periode | null>('pekan');
  const [isian, setIsian] = useState(() => isiPeriode('pekan'));

  const loadReports = useCallback(async (append = false, offset = 0) => {
    setLoading(true);
    setError('');
    try {
      const page = await api<Report[]>(
        append ? `reports?offset=${offset}` : 'reports',
        undefined,
        'GET',
        { bypassCache: true },
      );
      setReports((previous) =>
        append
          ? [
              ...previous,
              ...page.filter((row) => !previous.some((existing) => existing.id === row.id)),
            ]
          : page,
      );
      setHasMore(page.length === 100);
      setSelected((previous) =>
        append
          ? previous || page[0] || null
          : page.find((row) => row.id === previous?.id) || page[0] || null,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (previewReports) return;
    // Initial synchronization with the reports API completes asynchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadReports();
  }, [previewReports, loadReports]);

  const handleDelete = async (id: string) => {
    setBusy(true);
    setError('');
    try {
      await api('reports?id=' + encodeURIComponent(id), { id }, 'DELETE');
      setReports((prev) => prev.filter((r) => r.id !== id));
      if (selected?.id === id) {
        const remaining = reports.filter((r) => r.id !== id);
        setSelected(remaining.length ? remaining[0] : null);
      }
      setDeleteConfirmId(null);
      setNotice('Laporan berhasil dihapus.');
      setTimeout(() => setNotice(''), 3000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handlePublishDraft = async (report: Report) => {
    setBusy(true);
    setError('');
    try {
      const updated = await api<Report>(
        'reports',
        {
          id: report.id,
          status: 'final',
        },
        'PATCH',
      );
      setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setSelected(updated);
      setNotice('Draf berhasil diterbitkan menjadi Laporan Resmi.');
      setTimeout(() => setNotice(''), 3000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const draftReports = reports.filter((r) => r.snapshot?.status === 'draft');
  const finalReports = reports.filter((r) => r.snapshot?.status !== 'draft');
  const displayedReports =
    filterTab === 'draft' ? draftReports : filterTab === 'final' ? finalReports : reports;

  const isCurrentDraft = selected?.snapshot?.status === 'draft';

  return (
    <>
      {/* ── Workflow Guide & Creation Card ────────────────────────── */}
      <section className="card report-creator-card no-print">
        <div className="section-head">
          <div>
            <h2>Susun Laporan Kerja</h2>
            <p>
              Perekaman capaian, tindak lanjut, dan keuangan periode. Simpan sebagai draf atau
              terbitkan langsung.
            </p>
          </div>
        </div>

        <form
          className="report-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError('');
            setNotice('');
            const form = new FormData(e.currentTarget);
            const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
            const targetStatus = submitter?.value === 'draft' ? 'draft' : 'final';

            try {
              const newReport = await api<Report>('reports', {
                title: form.get('title'),
                start: form.get('start'),
                end: form.get('end'),
                notes: form.get('notes'),
                status: targetStatus,
              });
              setReports([newReport, ...reports]);
              setSelected(newReport);
              setNotice(
                targetStatus === 'draft'
                  ? 'Draf laporan berhasil disimpan. Anda dapat meninjau atau menghapusnya kapan saja.'
                  : 'Laporan resmi berhasil diterbitkan.',
              );
              setTimeout(() => setNotice(''), 4000);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <SegmentedControl
            label="Periode laporan"
            className="report-periode"
            value={periode ?? ''}
            options={pilihanPeriode.map((pilihan) => ({ value: pilihan.id, label: pilihan.label }))}
            onChange={(nilai) => {
              setPeriode(nilai as Periode);
              setIsian(isiPeriode(nilai as Periode));
            }}
          />
          <div className="form-grid">
            <label className="field-item">
              <span className="field-caption">Judul Laporan</span>
              <Input
                className="field-input"
                name="title"
                value={isian.title}
                onChange={(event) => setIsian({ ...isian, title: event.target.value })}
                required
              />
            </label>
            <label className="field-item">
              <span className="field-caption">Dari Tanggal</span>
              <DateInput
                aria-label="Awal periode laporan"
                className="field-input"
                name="start"
                value={isian.start}
                onValueChange={(start) => {
                  setPeriode(null);
                  setIsian({ ...isian, start });
                }}
                required
              />
            </label>
            <label className="field-item">
              <span className="field-caption">Sampai Tanggal</span>
              <DateInput
                aria-label="Akhir periode laporan"
                className="field-input"
                name="end"
                value={isian.end}
                onValueChange={(end) => {
                  setPeriode(null);
                  setIsian({ ...isian, end });
                }}
                required
              />
            </label>
            <label className="field-item field-wide wide">
              <span className="field-caption">Catatan manajer</span>
              <Textarea
                className="field-textarea"
                name="notes"
                rows={3}
                placeholder="Tulis hasil kerja, kendala, dan bantuan yang dibutuhkan…"
              />
            </label>
          </div>

          <div className="report-form-actions-split">
            <div className="action-hint">
              <Info size={14} />
              <small>
                Pilih <strong>Simpan Draf</strong> untuk draf sementara, atau{' '}
                <strong>Jadikan final</strong> untuk dokumen berkop.
              </small>
            </div>
            <div className="action-buttons-group">
              <Button
                type="submit"
                name="action"
                value="draft"
                className="btn-draft-action"
                disabled={busy}
                title="Simpan sebagai draf sementara (bisa diedit/dihapus kapan saja)"
              >
                <FilePenLine size={15} />
                <span>{busy ? 'Menyimpan…' : 'Simpan sebagai Draf'}</span>
              </Button>
              <Button
                type="submit"
                name="action"
                value="final"
                className="primary btn-publish-action"
                disabled={busy}
                title="Terbitkan sebagai dokumen resmi berkop KDMP"
              >
                <Sparkles size={15} />
                <span>{busy ? 'Menerbitkan…' : 'Simpan laporan final'}</span>
              </Button>
            </div>
          </div>
        </form>

        {notice && (
          <p className="notice success mt-3" role="status">
            {notice}
          </p>
        )}
        {error && (
          <p className="notice error mt-3" role="alert">
            {error}
          </p>
        )}
        {loading && (
          <p role="status" className="mt-3">
            Memuat laporan…
          </p>
        )}
        {!loading && !error && !reports.length && (
          <p role="status" className="mt-3">
            Belum ada laporan tersimpan. Susun laporan pertama melalui formulir ini.
          </p>
        )}
        {error && (
          <Button type="button" disabled={loading || busy} onClick={() => void loadReports()}>
            Coba muat laporan lagi
          </Button>
        )}
      </section>

      {/* ── Report Archive Tabs & Filters ────────────────────────── */}
      {reports.length > 0 && (
        <section className="report-history-container no-print">
          <div className="history-filter-bar">
            <div className="history-filter-tabs">
              <Button
                type="button"
                className={`filter-tab ${filterTab === 'all' ? 'active' : ''}`}
                onClick={() => setFilterTab('all')}
              >
                Semua Arsip <span className="tab-count">{reports.length}</span>
              </Button>
              <Button
                type="button"
                className={`filter-tab ${filterTab === 'draft' ? 'active' : ''}`}
                onClick={() => setFilterTab('draft')}
              >
                Draf <span className="tab-count count-draft">{draftReports.length}</span>
              </Button>
              <Button
                type="button"
                className={`filter-tab ${filterTab === 'final' ? 'active' : ''}`}
                onClick={() => setFilterTab('final')}
              >
                Laporan final <span className="tab-count count-final">{finalReports.length}</span>
              </Button>
            </div>
          </div>

          <div className="history-chips-scroll">
            {displayedReports.map((report) => {
              const isDraft = report.snapshot?.status === 'draft';
              const isCurrent = selected?.id === report.id;
              return (
                <div
                  key={report.id}
                  className={`history-card-item ${isCurrent ? 'active' : ''} ${isDraft ? 'is-draft-card' : ''}`}
                  onClick={() => setSelected(report)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelected(report);
                    }
                  }}
                >
                  <div className="chip-head">
                    <span className={`chip-status-tag ${isDraft ? 'tag-draft' : 'tag-final'}`}>
                      {isDraft ? 'Draf' : 'Resmi'}
                    </span>
                    <small className="chip-date">{formatDate(report.period_end)}</small>
                  </div>
                  <strong className="chip-title">{report.title}</strong>
                  <div className="chip-sub">
                    <span>
                      {formatDate(report.period_start)} — {formatDate(report.period_end)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          {hasMore && (
            <Button
              type="button"
              disabled={loading || busy}
              onClick={() => void loadReports(true, reports.length)}
            >
              {loading ? 'Memuat…' : 'Muat laporan lebih lama'}
            </Button>
          )}
        </section>
      )}

      {/* ── Document View Sheet ──────────────────────────────────── */}
      {selected && (
        <article className="official-report-sheet">
          {/* Status Alert Banner */}
          {isCurrentDraft ? (
            <div className="draft-banner no-print">
              <div className="draft-banner-text">
                <FilePenLine size={18} />
                <div>
                  <strong>Status: Draf Sementara</strong>
                  <p>Dokumen belum diterbitkan resmi.</p>
                </div>
              </div>
              <div className="draft-banner-actions">
                <Button
                  type="button"
                  className="btn-banner-publish"
                  onClick={() => handlePublishDraft(selected)}
                  disabled={busy}
                  title="Jadikan laporan ini resmi"
                >
                  <Sparkles size={14} />
                  <span>Jadikan final</span>
                </Button>
                <Button
                  type="button"
                  className="btn-banner-delete"
                  onClick={() => setDeleteConfirmId(selected.id)}
                  disabled={busy}
                  title="Hapus draf ini dari arsip"
                >
                  <Trash2 size={14} />
                  <span>Hapus Draf</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="official-verified-banner no-print">
              <div className="verified-text">
                <Building2 size={16} />
                <span>Laporan final Manajer KDMP — Telah Diterbitkan</span>
              </div>
              <Button
                type="button"
                className="btn-delete-report-subtle"
                onClick={() => setDeleteConfirmId(selected.id)}
                disabled={busy}
                title="Hapus laporan ini dari arsip"
              >
                <Trash2 size={13} />
                <span>Hapus Laporan</span>
              </Button>
            </div>
          )}

          {/* Action Toolbar */}
          <div className="report-toolbar no-print">
            <Button className="btn-toolbar-print" onClick={() => window.print()}>
              <Printer size={16} />
              <span>Cetak / PDF Resmi</span>
            </Button>
            <Button
              className="btn-toolbar-wa"
              onClick={async () => {
                try {
                  const text = [
                    `*${selected.title.toUpperCase()}*`,
                    `Koperasi: *${String(selected.snapshot.organization || 'Koperasi')}*`,
                    `Status: *${isCurrentDraft ? 'DRAF KERJA' : 'DOKUMEN RESMI'}*`,
                    `Periode: ${formatDate(selected.period_start)} — ${formatDate(selected.period_end)}`,
                    ``,
                    `*RINGKASAN EKSEKUTIF*`,
                    `• Capaian Tugas Selesai: ${selected.snapshot.completed.length}`,
                    `• Milestone Tercapai: ${selected.snapshot.milestones.length}`,
                    `• Tugas Terlambat/Kendala: ${selected.snapshot.overdue.length}`,
                    `• Risiko Terbuka Dipantau: ${selected.snapshot.risks.length}`,
                    ...(selected.snapshot.cash && selected.snapshot.cash.count > 0
                      ? [
                          `• Arus Kas Periode: Masuk ${rupiah(selected.snapshot.cash.in)} | Keluar ${rupiah(selected.snapshot.cash.out)}`,
                        ]
                      : []),
                    ``,
                    ...(selected.snapshot.notes
                      ? [`*CATATAN MANAJER:*\n${selected.snapshot.notes}`, ``]
                      : []),
                    `*CAPAIAN SELESAI:*`,
                    ...(selected.snapshot.completed.length
                      ? selected.snapshot.completed.map((line) => `• ${line}`)
                      : ['(Nihil)']),
                    ``,
                    `*MILESTONE TERCAPAI:*`,
                    ...(selected.snapshot.milestones.length
                      ? selected.snapshot.milestones.map((line) => `• ${line}`)
                      : ['(Nihil)']),
                    ``,
                    `*RENCANA 7 HARI MENDATANG:*`,
                    ...(selected.snapshot.next.length
                      ? selected.snapshot.next.map((line) => `• ${line}`)
                      : ['(Nihil)']),
                    ``,
                    `*KENDALA / TUGAS TERLAMBAT:*`,
                    ...(selected.snapshot.overdue.length
                      ? selected.snapshot.overdue.map((line) => `• ${line}`)
                      : ['(Nihil - aman)']),
                  ].join('\n');

                  await navigator.clipboard.writeText(text);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 3000);
                } catch {
                  setError('Tidak dapat mengakses clipboard. Silakan gunakan tombol cetak.');
                }
              }}
            >
              {copied ? <Check size={16} className="text-green" /> : <Share2 size={16} />}
              <span>{copied ? 'Format WhatsApp Tersalin!' : 'Salin Teks Ringkas (WhatsApp)'}</span>
            </Button>
          </div>

          {/* Delete Confirmation Modal / Banner */}
          {deleteConfirmId && (
            <Modal
              className="delete-confirm-box no-print"
              aria-labelledby="delete-report-title"
              onDismiss={() => {
                if (!busy) setDeleteConfirmId(null);
              }}
            >
              <div className="confirm-icon-wrap">
                <AlertTriangle size={24} />
              </div>
              <div className="confirm-content">
                <strong id="delete-report-title">
                  Hapus {isCurrentDraft ? 'Draf Laporan' : 'Laporan'} Ini?
                </strong>
                <p>
                  Tindakan ini akan menghapus laporan {selected.title} secara permanen dari basis
                  data. Data tugas, buku kas, dan catatan koperasi tidak akan terpengaruh.
                </p>
                <div className="confirm-actions">
                  <Button
                    type="button"
                    className="btn-danger-confirm"
                    onClick={() => handleDelete(deleteConfirmId)}
                    disabled={busy}
                  >
                    <Trash2 size={14} />
                    <span>Ya, Hapus {isCurrentDraft ? 'Draf' : 'Laporan'}</span>
                  </Button>
                  <Button
                    type="button"
                    className="btn-cancel"
                    onClick={() => setDeleteConfirmId(null)}
                    disabled={busy}
                  >
                    Batal
                  </Button>
                </div>
              </div>
            </Modal>
          )}

          {/* Official Kop Surat Koperasi */}
          <header className="report-official-kop">
            <div className="kop-emblem">
              <Building2 size={36} />
            </div>
            <div className="kop-text">
              <span className="kop-instansi">
                {String(selected.snapshot.organization || 'Koperasi')}
              </span>
              <div className="kop-divider" />
              <h1 className="kop-doc-title">
                {isCurrentDraft
                  ? 'LEMBAR DRAF LAPORAN OPERASIONAL & PERKEMBANGAN'
                  : 'LEMBAR LAPORAN PERKEMBANGAN & OPERASIONAL'}
              </h1>
            </div>
          </header>

          {/* Document Metadata Bar */}
          <div className="report-meta-banner">
            <div className="meta-item">
              <span className="meta-label">Nomor Dokumen:</span>
              <strong className="meta-val">
                KDMP/{isCurrentDraft ? 'DRAF-MGR' : 'LAP-MGR'}/
                {selected.period_end.replace(/-/g, '')}
              </strong>
            </div>
            <div className="meta-item">
              <span className="meta-label">Periode Evaluasi:</span>
              <strong className="meta-val">
                {formatDate(selected.period_start)} — {formatDate(selected.period_end)}
              </strong>
            </div>
            <div className="meta-item">
              <span className="meta-label">Sifat Dokumen:</span>
              <span className={isCurrentDraft ? 'meta-badge-draft' : 'meta-badge-official'}>
                {isCurrentDraft ? 'Draf Internal' : 'Laporan final Manajer'}
              </span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Diterbitkan:</span>
              <strong className="meta-val">{formatDate(selected.period_end)}</strong>
            </div>
          </div>

          {/* Executive Financial & Operations Snapshot (If Available) */}
          {selected.snapshot.cash && selected.snapshot.cash.count > 0 && (
            <div className="report-cash-summary-card">
              <div className="cash-head">
                <Wallet size={18} />
                <strong>
                  Rekapitulasi Arus Kas Tercatat ({selected.snapshot.cash.count} transaksi)
                </strong>
              </div>
              <div className="cash-grid">
                <div className="cash-item item-in">
                  <small>Kas Masuk</small>
                  <strong>{rupiah(selected.snapshot.cash.in)}</strong>
                </div>
                <div className="cash-item item-out">
                  <small>Kas Keluar</small>
                  <strong>{rupiah(selected.snapshot.cash.out)}</strong>
                </div>
                <div className="cash-item item-net">
                  <small>Selisih Arus Kas</small>
                  <strong
                    className={selected.snapshot.cash.net >= 0 ? 'text-green' : 'text-danger'}
                  >
                    {rupiah(selected.snapshot.cash.net)}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* Executive KPI Summary Cards */}
          <div className="report-kpi-grid">
            <div className="report-kpi-card kpi-success">
              <div className="kpi-icon-wrap">
                <CheckCircle2 size={24} />
              </div>
              <div className="kpi-info">
                <span className="kpi-count">{selected.snapshot.completed.length}</span>
                <span className="kpi-name">Tugas Rampung</span>
              </div>
            </div>

            <div className="report-kpi-card kpi-primary">
              <div className="kpi-icon-wrap">
                <Flag size={24} />
              </div>
              <div className="kpi-info">
                <span className="kpi-count">{selected.snapshot.milestones.length}</span>
                <span className="kpi-name">Milestone Tercapai</span>
              </div>
            </div>

            <div className="report-kpi-card kpi-warning">
              <div className="kpi-icon-wrap">
                <AlertTriangle size={24} />
              </div>
              <div className="kpi-info">
                <span className="kpi-count">{selected.snapshot.overdue.length}</span>
                <span className="kpi-name">Perlu Perhatian</span>
              </div>
            </div>

            <div className="report-kpi-card kpi-danger">
              <div className="kpi-icon-wrap">
                <ShieldAlert size={24} />
              </div>
              <div className="kpi-info">
                <span className="kpi-count">{selected.snapshot.risks.length}</span>
                <span className="kpi-name">Risiko Terbuka</span>
              </div>
            </div>
          </div>

          {/* Manager's Executive Memo */}
          {selected.snapshot.notes && (
            <div className="report-memo-box">
              <div className="memo-header">
                <FileText size={18} />
                <strong>Catatan & Pernyataan Manajer Operasional:</strong>
              </div>
              <blockquote className="memo-content">{selected.snapshot.notes}</blockquote>
            </div>
          )}

          {/* Structured Detailed Sections */}
          <div className="report-sections-grid">
            {(
              Object.entries(sectionMeta) as [
                keyof typeof sectionMeta,
                (typeof sectionMeta)[keyof typeof sectionMeta],
              ][]
            ).map(([key, meta]) => {
              const list = selected.snapshot[key] || [];
              return (
                <section key={key} className={`report-section-card ${meta.color}`}>
                  <div className="section-card-head">
                    <div className="section-card-title">
                      <meta.Icon size={18} />
                      <h3>{meta.title}</h3>
                    </div>
                    <span className="section-count-badge">{list.length} item</span>
                  </div>

                  <div className="section-card-body">
                    {list.length > 0 ? (
                      <ul className="report-item-list">
                        {list.map((item, index) => (
                          <li key={index} className="report-item-row">
                            <span className="bullet-dot" />
                            <span className="item-text">{item}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="report-empty-notice">{meta.emptyText}</p>
                    )}
                  </div>
                </section>
              );
            })}
          </div>

          {/* Formal Cooperative Signatures Block */}
          <footer className="report-signature-block">
            <div className="signature-col">
              <p className="sig-pre">Mengetahui,</p>
              <strong className="sig-role">Pengurus & Badan Pengawas</strong>
              <span className="sig-org">
                {String(selected.snapshot.organization || 'Koperasi')}
              </span>
              <div className="sig-space" />
              <div className="sig-line">
                ( ..................................................................... )
              </div>
              <span className="sig-desc">Ketua Pengurus / Pengawas</span>
            </div>

            <div className="signature-col">
              <p className="sig-pre">{formatDate(selected.period_end)}</p>
              <strong className="sig-role">Disusun & Dilaporkan Oleh,</strong>
              <span className="sig-org">Manajer Operasional Koperasi</span>
              <div className="sig-space" />
              <div className="sig-line">
                ( ..................................................................... )
              </div>
              <span className="sig-desc">
                Manajer {String(selected.snapshot.organization || 'Koperasi')}
              </span>
            </div>
          </footer>
        </article>
      )}
    </>
  );
}
