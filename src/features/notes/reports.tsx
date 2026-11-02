'use client';
import { useEffect, useState } from 'react';
import {
  CircleCheck,
  ClipboardCopy,
  FileCheck2,
  Flag,
  Printer,
  ShieldAlert,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ReportSnapshot } from './report-snapshot';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/field';
import { DateField } from '@/components/ui/date-time-field';
import { Tabs } from '@/components/ui/tabs';
import { StatGrid, StatTile } from '@/components/ui/stat';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { useConfirm } from '@/components/ui/confirm';
import { api } from '@/lib/client';
import { rupiah } from '@/lib/ledger';
import { addDays, formatDate, monthRange, today } from '@/lib/date';
import { cn } from '@/lib/utils';

type Report = {
  id: string;
  title: string;
  period_start: string;
  period_end: string;
  snapshot: ReportSnapshot;
  status?: string;
  created_at: string;
};
const statusOf = (report: Report) => (report.snapshot?.status === 'draft' ? 'draft' : 'final');

const SECTIONS: { key: keyof ReportSnapshot; title: string; empty: string }[] = [
  { key: 'completed', title: 'Tugas selesai', empty: 'Belum ada tugas selesai pada periode ini.' },
  { key: 'milestones', title: 'Milestone tercapai', empty: 'Belum ada milestone tercapai.' },
  { key: 'decisions', title: 'Keputusan rapat', empty: 'Tidak ada keputusan tercatat.' },
  { key: 'overdue', title: 'Perlu perhatian (terlambat)', empty: 'Tidak ada tugas terlambat.' },
  { key: 'risks', title: 'Risiko terbuka', empty: 'Tidak ada risiko terbuka.' },
  { key: 'next', title: 'Rencana 7 hari ke depan', empty: 'Belum ada tugas terjadwal.' },
];

function whatsappText(report: Report) {
  const s = report.snapshot;
  const list = (items: string[]) =>
    items.length ? items.map((item) => `- ${item}`).join('\n') : '(Nihil)';
  const lines = [
    `*${report.title}*${statusOf(report) === 'draft' ? ' (draf)' : ''}`,
    `${String(s.organization)} · ${formatDate(report.period_start)} – ${formatDate(report.period_end)}`,
    '',
    `Tugas selesai: ${s.completed.length} · Milestone: ${s.milestones.length} · Terlambat: ${s.overdue.length} · Risiko terbuka: ${s.risks.length}`,
  ];
  if (s.cash.count > 0)
    lines.push(
      `Kas tercatat: masuk ${rupiah(s.cash.in)}, keluar ${rupiah(s.cash.out)} (bukan saldo)`,
    );
  if (s.notes) lines.push('', `Catatan: ${s.notes}`);
  for (const section of SECTIONS)
    lines.push('', `*${section.title}*`, list(s[section.key] as string[]));
  return lines.join('\n');
}

/** Laporan kerja berkala: isi dihitung server dari tugas, keputusan, risiko, milestone, dan kas. */
export function Reports() {
  const confirm = useConfirm();
  const date = today();
  const [reports, setReports] = useState<Report[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: 'Laporan kerja mingguan',
    start: addDays(date, -6),
    end: date,
    notes: '',
  });
  const load = async (offset = 0) => {
    try {
      const rows = await api<Report[]>(`reports?offset=${offset}`, undefined, 'GET', {
        bypassCache: true,
      });
      setReports((current) => (offset ? [...current, ...rows] : rows));
      setHasMore(rows.length === 100);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    let live = true;
    api<Report[]>('reports?offset=0', undefined, 'GET', { bypassCache: true })
      .then((rows) => {
        if (!live) return;
        setReports(rows);
        setHasMore(rows.length === 100);
      })
      .catch((e: Error) => live && setError(e.message))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, []);
  const preset = (kind: 'week' | 'month' | 'last') => {
    if (kind === 'week')
      return setForm((f) => ({
        ...f,
        title: 'Laporan kerja mingguan',
        start: addDays(date, -6),
        end: date,
      }));
    const range = monthRange(
      date,
      kind === 'month' ? 0 : -1,
      kind === 'month' ? date : '9999-12-31',
    );
    setForm((f) => ({
      ...f,
      title: `Laporan kerja bulanan ${range.label}`,
      start: range.start,
      end: range.end,
    }));
  };
  const save = async (status: 'draft' | 'final') => {
    setBusy(true);
    try {
      const saved = await api<Report>('reports', { ...form, status });
      toast.success(status === 'draft' ? 'Draf laporan tersimpan' : 'Laporan final tersimpan');
      await load();
      setSelected(saved.id);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const visible = reports.filter((report) => filter === 'all' || statusOf(report) === filter);
  const report = reports.find((r) => r.id === selected) || visible[0];
  return (
    <div className="grid gap-5 xl:grid-cols-[22rem_minmax(0,1fr)]">
      <div className="no-print flex flex-col gap-5">
        <section className="flex flex-col gap-4 rounded-[var(--radius-card)] bg-surface p-5 shadow-card">
          <h2 className="text-lg font-extrabold">Susun laporan</h2>
          <div className="flex flex-wrap gap-1.5">
            <Button size="sm" variant="soft" onClick={() => preset('week')}>
              7 hari
            </Button>
            <Button size="sm" variant="soft" onClick={() => preset('month')}>
              Bulan ini
            </Button>
            <Button size="sm" variant="soft" onClick={() => preset('last')}>
              Bulan lalu
            </Button>
          </div>
          <Field label="Judul" required>
            <Input
              value={form.title}
              maxLength={200}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Dari">
              <DateField
                aria-label="Dari"
                value={form.start}
                onChange={(value) => setForm({ ...form, start: value })}
              />
            </Field>
            <Field label="Sampai">
              <DateField
                aria-label="Sampai"
                value={form.end}
                onChange={(value) => setForm({ ...form, end: value })}
              />
            </Field>
          </div>
          <Field label="Catatan manajer">
            <Textarea
              value={form.notes}
              maxLength={10000}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button busy={busy} disabled={!form.title.trim()} onClick={() => void save('draft')}>
              Simpan draf
            </Button>
            <Button
              variant="primary"
              busy={busy}
              disabled={!form.title.trim()}
              onClick={() => void save('final')}
            >
              Simpan final
            </Button>
          </div>
        </section>
        <section className="flex flex-col gap-3">
          <Tabs
            label="Arsip laporan"
            value={filter}
            onChange={setFilter}
            items={[
              { id: 'all', label: 'Semua', count: reports.length },
              {
                id: 'draft',
                label: 'Draf',
                count: reports.filter((r) => statusOf(r) === 'draft').length,
              },
              {
                id: 'final',
                label: 'Final',
                count: reports.filter((r) => statusOf(r) === 'final').length,
              },
            ]}
          />
          {error && <ErrorState message={error} onRetry={() => void load()} />}
          {visible.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelected(r.id)}
              aria-pressed={report?.id === r.id}
              className={cn(
                'rounded-2xl bg-surface p-4 text-left shadow-card transition hover:-translate-y-0.5 aria-pressed:ring-2 aria-pressed:ring-accent-strong',
              )}
            >
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[11px] font-bold',
                  statusOf(r) === 'draft' ? 'bg-warn text-warn-ink' : 'bg-done text-done-ink',
                )}
              >
                {statusOf(r) === 'draft' ? 'Draf' : 'Final'}
              </span>
              <span className="mt-2 block font-bold">{r.title}</span>
              <span className="text-xs text-ink-3">
                {formatDate(r.period_start)} – {formatDate(r.period_end)}
              </span>
            </button>
          ))}
          {hasMore && (
            <Button onClick={() => void load(reports.length)}>Muat laporan lebih lama</Button>
          )}
        </section>
      </div>
      {loading ? null : report ? (
        <ReportDocument
          report={report}
          onFinal={async () => {
            await api('reports', { id: report.id, status: 'final' }, 'PATCH');
            toast.success('Laporan dijadikan final');
            await load();
          }}
          onDelete={async () => {
            if (
              !(await confirm({
                title: `Hapus ${statusOf(report) === 'draft' ? 'draf' : 'laporan'} ini?`,
                description: 'Hanya laporan yang dihapus. Data tugas dan kas tidak berubah.',
                confirmLabel: 'Hapus',
                danger: true,
              }))
            )
              return;
            await api(`reports?id=${report.id}`, undefined, 'DELETE');
            setSelected(null);
            toast.success('Laporan dihapus');
            await load();
          }}
        />
      ) : (
        <EmptyState
          icon={<FileCheck2 />}
          title="Belum ada laporan"
          description="Pilih periode lalu simpan. Isinya dihitung otomatis dari tugas, keputusan, risiko, milestone, dan kas yang tercatat."
        />
      )}
    </div>
  );
}

function ReportDocument({
  report,
  onFinal,
  onDelete,
}: {
  report: Report;
  onFinal: () => void;
  onDelete: () => void;
}) {
  const s = report.snapshot;
  const draft = statusOf(report) === 'draft';
  return (
    <article className="flex flex-col gap-5 rounded-[1.75rem] bg-surface p-6 shadow-card md:p-8 print:shadow-none">
      <div
        className={cn(
          'no-print flex flex-wrap items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold',
          draft ? 'bg-warn text-warn-ink' : 'bg-done text-done-ink',
        )}
      >
        <span className="flex-1">
          {draft
            ? 'Draf: angka dihitung saat disimpan. Jadikan final setelah diperiksa.'
            : 'Laporan final.'}
        </span>
        {draft && (
          <Button size="sm" variant="primary" onClick={onFinal}>
            Jadikan final
          </Button>
        )}
        <Button size="sm" onClick={() => window.print()}>
          <Printer />
          Cetak
        </Button>
        <Button
          size="sm"
          onClick={() =>
            void navigator.clipboard
              .writeText(whatsappText(report))
              .then(() => toast.success('Ringkasan tersalin untuk WhatsApp'))
          }
        >
          <ClipboardCopy />
          Salin untuk WhatsApp
        </Button>
        <Button size="sm" variant="danger" onClick={onDelete}>
          <Trash2 />
          Hapus
        </Button>
      </div>
      <header className="border-b-2 border-ink pb-4 text-center">
        <p className="text-sm font-bold tracking-wide uppercase">{String(s.organization)}</p>
        <h2 className="mt-1 text-2xl font-extrabold">{report.title}</h2>
        <p className="text-sm text-ink-3">
          Periode {formatDate(report.period_start)} – {formatDate(report.period_end)} · No. KDMP/
          {draft ? 'DRAF-MGR' : 'LAP-MGR'}/{report.period_end.replaceAll('-', '')}
        </p>
      </header>
      <StatGrid>
        <StatTile
          icon={<CircleCheck />}
          label="Tugas rampung"
          value={s.completed.length}
          tone="mint"
        />
        <StatTile
          icon={<Flag />}
          label="Milestone tercapai"
          value={s.milestones.length}
          tone="lavender"
        />
        <StatTile
          icon={<TriangleAlert />}
          label="Perlu perhatian"
          value={s.overdue.length}
          tone="rose"
        />
        <StatTile
          icon={<ShieldAlert />}
          label="Risiko terbuka"
          value={s.risks.length}
          tone="peach"
        />
      </StatGrid>
      {s.cash.count > 0 && (
        <div className="grid gap-3 rounded-2xl bg-surface-2 p-4 sm:grid-cols-3">
          <p>
            <span className="block text-xs font-bold text-ink-3">Kas masuk</span>
            <span className="font-extrabold">{rupiah(s.cash.in)}</span>
          </p>
          <p>
            <span className="block text-xs font-bold text-ink-3">Kas keluar</span>
            <span className="font-extrabold">{rupiah(s.cash.out)}</span>
          </p>
          <p>
            <span className="block text-xs font-bold text-ink-3">Selisih arus kas</span>
            <span className="font-extrabold">{rupiah(s.cash.net)}</span>
            <span className="block text-[11px] text-ink-3">Bukan saldo bank atau laba</span>
          </p>
        </div>
      )}
      {s.notes && (
        <section>
          <h3 className="mb-1 font-extrabold">Catatan manajer</h3>
          <p className="whitespace-pre-wrap text-ink-2">{s.notes}</p>
        </section>
      )}
      <div className="grid gap-5 md:grid-cols-2">
        {SECTIONS.map((section) => {
          const items = (s[section.key] as string[]) || [];
          return (
            <section key={section.key}>
              <h3 className="mb-2 font-extrabold">
                {section.title} <span className="text-ink-3">({items.length})</span>
              </h3>
              {items.length ? (
                <ul className="list-disc pl-5 text-sm text-ink-2">
                  {items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-3">{section.empty}</p>
              )}
            </section>
          );
        })}
      </div>
      <footer className="mt-6 grid grid-cols-2 gap-6 text-center text-sm">
        {['Pengurus / Pengawas', 'Manajer'].map((role) => (
          <div key={role}>
            <p className="font-semibold">{role}</p>
            <div className="mx-auto mt-16 w-40 border-b border-ink" />
          </div>
        ))}
      </footer>
    </article>
  );
}
