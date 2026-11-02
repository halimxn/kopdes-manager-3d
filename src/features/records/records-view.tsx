'use client';
import { Pill, statusTone } from '@/components/ui/pill';
import { useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence } from 'motion/react';
import { Download, FileUp, LayoutGrid, Plus, Rows3, X } from 'lucide-react';
import { catalog, formatChoiceLabel } from './catalog';
import type { Entity, Item } from './schemas';
import { choicesFor, fieldKind } from './fields-meta';
import { displayValue, entityTitle, fieldLabel } from './related';
import { PEOPLE_ENTITIES, RecordCard, RecordDetailSheet } from './record-card';
import { CsvImportSheet, RecordFormSheet } from './lazy';
import { useRecordParams } from './use-record-params';
import type { Workspace } from '@/features/workspace/use-workspace';
import { Button } from '@/components/ui/button';
import { SearchField, Select, TOOLBAR_CONTROL } from '@/components/ui/field';
import { EmptyState, Notice } from '@/components/ui/states';
import { downloadCsv } from '@/lib/ledger';
import { today } from '@/lib/date';
import { cn } from '@/lib/utils';

export type QuickFilter = { id: string; label: string; test: (row: Item) => boolean };

/** Bulan yang muncul di saringan: 12 bulan terakhir, 2 bulan ke depan, dan bulan yang ada di data. */
function monthOptions(rows: Item[]) {
  const now = today().slice(0, 7);
  const months = new Set<string>();
  const base = new Date(now + '-15T12:00:00Z');
  for (let i = -12; i <= 2; i++) {
    const date = new Date(base);
    date.setUTCMonth(base.getUTCMonth() + i);
    months.add(date.toISOString().slice(0, 7));
  }
  for (const row of rows) months.add(String(row.data.date || row.created_at).slice(0, 7));
  return [...months]
    .filter((m) => /^\d{4}-\d{2}$/.test(m))
    .sort()
    .reverse();
}
const monthLabel = (month: string) =>
  new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(month + '-15T12:00:00Z'),
  );

/**
 * Daftar umum untuk satu jenis catatan: cari, saring, kartu atau tabel, ekspor/impor CSV,
 * laci detail, dan formulir. Halaman khusus (tugas, proyek) memakai komponen sendiri.
 */
/** Kolom yang nilainya status: tampil sebagai lencana agar bisa dipindai sekilas. */
const STATUS_FIELDS = ['status', 'condition'];

export function RecordsView({
  entity,
  ws,
  refresh,
  ready = true,
  notReadyText,
  metrics,
  details,
  header,
  tabs,
  quickFilters = [],
  columns,
  cardExtra,
  actions,
  more,
  onLoadMore,
  loadingMore,
  defaultSort = 'date',
}: {
  entity: Entity;
  ws: Workspace;
  refresh: () => Promise<void> | void;
  ready?: boolean;
  notReadyText?: string;
  metrics?: (rows: Item[]) => ReactNode;
  details?: (rows: Item[]) => ReactNode;
  /** Kepala halaman; dibangun di sini karena angkanya mengikuti saringan. */
  header?: (stats: ReactNode) => ReactNode;
  /** Tab halaman: satu baris dengan tombol aksi, supaya Tambah selalu di tempat yang sama. */
  tabs?: ReactNode;
  quickFilters?: QuickFilter[];
  columns?: string[];
  cardExtra?: (row: Item) => ReactNode;
  actions?: ReactNode;
  more?: boolean;
  onLoadMore?: () => void;
  loadingMore?: boolean;
  defaultSort?: 'date' | 'title';
}) {
  const { record, isNew, edit, prefill, clear } = useRecordParams();
  const rows = useMemo(() => ws[entity] || [], [ws, entity]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [quick, setQuick] = useState('');
  const [month, setMonth] = useState('');
  // Tabel di layar lebar untuk buku yang punya kolom; kartu di HP dan tablet.
  const [view, setView] = useState<'cards' | 'table'>(() =>
    typeof window !== 'undefined' &&
    window.innerWidth >= 1280 &&
    columns &&
    !PEOPLE_ENTITIES.includes(entity)
      ? 'table'
      : 'cards',
  );
  const [form, setForm] = useState<{ item?: Item; prefill?: Record<string, unknown> } | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  // Tautan ?new=1 / ?record=id membuka formulir atau laci sekali saat halaman siap.
  const linkKey = `${isNew}:${record}:${edit}:${ready}:${rows.some((row) => row.id === record)}`;
  const [handledLink, setHandledLink] = useState('');
  if (linkKey !== handledLink) {
    setHandledLink(linkKey);
    if (isNew && ready) setForm({ prefill });
    else if (record && rows.some((row) => row.id === record)) {
      if (edit) setForm({ item: rows.find((row) => row.id === record) });
      else setDetail(record);
    }
  }

  const statusField = catalog[entity].fields.includes('status')
    ? 'status'
    : catalog[entity].fields.includes('condition')
      ? 'condition'
      : '';
  const statusChoices = statusField ? choicesFor(entity, statusField) : [];
  const hasDate = catalog[entity].fields.includes('date');
  const filtered = useMemo(() => {
    const words = search.toLocaleLowerCase('id').split(/\s+/).filter(Boolean);
    const quickTest = quickFilters.find((filter) => filter.id === quick)?.test;
    return rows
      .filter((row) => {
        if (statusField && status && row.data[statusField] !== status) return false;
        if (quickTest && !quickTest(row)) return false;
        if (month && !String(row.data.date || row.created_at).startsWith(month)) return false;
        if (!words.length) return true;
        const text = JSON.stringify(row.data).toLocaleLowerCase('id');
        return words.every((word) => text.includes(word));
      })
      .sort((a, b) =>
        defaultSort === 'title'
          ? String(a.data.title).localeCompare(String(b.data.title), 'id')
          : String(b.data.date || b.updated_at).localeCompare(String(a.data.date || a.updated_at)),
      );
  }, [rows, search, status, quick, month, quickFilters, statusField, defaultSort]);
  const tableColumns =
    columns ||
    catalog[entity].fields
      .filter(
        (field) =>
          !['notes', 'description', 'subtasks', 'dependencies', 'activities'].includes(field),
      )
      .slice(0, 6);
  const activeFilters =
    Number(Boolean(status)) +
    Number(Boolean(quick)) +
    Number(Boolean(month)) +
    Number(Boolean(search));
  const openRow = rows.find((row) => row.id === detail);

  const exportCsv = () =>
    downloadCsv(
      `${entity}-${today()}.csv`,
      tableColumns.map((field) => fieldLabel(entity, field)),
      filtered.map((row) =>
        tableColumns.map((field) => displayValue(entity, field, row.data[field], ws)),
      ),
    );

  const finder = (
    <>
      <SearchField
        value={search}
        onChange={setSearch}
        label={`Cari ${entityTitle(entity).toLowerCase()}`}
        placeholder={`Cari ${entityTitle(entity).toLowerCase()}…`}
        className="flex-1 basis-52"
      />
      {hasDate && entity !== 'inventory-items' && (
        <Select
          value={month}
          onChange={(event) => setMonth(event.target.value)}
          aria-label="Saring bulan"
          className={`${TOOLBAR_CONTROL} w-44`}
        >
          <option value="">Semua bulan</option>
          {monthOptions(rows).map((m) => (
            <option key={m} value={m}>
              {monthLabel(m)}
              {m === today().slice(0, 7) ? ' (bulan ini)' : ''}
            </option>
          ))}
        </Select>
      )}
    </>
  );
  const controls = (
    <>
      <div
        className="flex h-11 items-center gap-0.5 rounded-full bg-surface-2 p-1 ring-1 ring-line"
        role="group"
        aria-label="Cara melihat"
      >
        <button
          type="button"
          aria-pressed={view === 'cards'}
          onClick={() => setView('cards')}
          className="grid size-9 place-items-center rounded-full text-ink-3 transition-colors hover:text-ink aria-pressed:bg-accent aria-pressed:text-accent-ink"
          aria-label="Kartu"
        >
          <LayoutGrid className="size-4" />
        </button>
        <button
          type="button"
          aria-pressed={view === 'table'}
          onClick={() => setView('table')}
          className="grid size-9 place-items-center rounded-full text-ink-3 transition-colors hover:text-ink aria-pressed:bg-accent aria-pressed:text-accent-ink"
          aria-label="Tabel"
        >
          <Rows3 className="size-4" />
        </button>
      </div>
      <Button
        variant="secondary"
        size="icon"
        className="size-11"
        onClick={exportCsv}
        aria-label="Unduh CSV"
        title="Unduh CSV"
      >
        <Download />
      </Button>
      {entity !== 'stock-movements' && (
        <Button
          variant="secondary"
          size="icon"
          className="size-11"
          onClick={() => setImporting(true)}
          disabled={!ready}
          aria-label="Impor CSV"
          title="Impor CSV"
        >
          <FileUp />
        </Button>
      )}
      {actions}
      <Button variant="primary" onClick={() => setForm({})} disabled={!ready}>
        <Plus />
        Tambah
      </Button>
    </>
  );

  const filters = (statusChoices.length > 0 || quickFilters.length > 0) && (
    <div className="scrollbar-none flex max-w-full gap-2 overflow-x-auto p-px">
      {[{ id: '', label: 'Semua' }, ...quickFilters.map((f) => ({ id: f.id, label: f.label }))].map(
        (filter) => {
          const count = filter.id
            ? rows.filter(quickFilters.find((f) => f.id === filter.id)!.test).length
            : rows.length;
          const active = quick === filter.id && (filter.id !== '' || !status);
          return (
            <button
              key={filter.id || 'all'}
              type="button"
              aria-pressed={active}
              onClick={() => {
                setQuick(filter.id);
                if (!filter.id) setStatus('');
              }}
              className="flex h-9 shrink-0 items-center gap-2 rounded-full bg-surface-2 px-3.5 text-[13px] font-medium text-ink-2 ring-1 ring-line transition aria-pressed:bg-action aria-pressed:text-on-action"
            >
              {filter.label}
              <span className="tabular text-xs opacity-70">{count}</span>
            </button>
          );
        },
      )}
      {statusChoices.map((choice) => (
        <button
          key={choice}
          type="button"
          aria-pressed={status === choice}
          onClick={() => setStatus(status === choice ? '' : choice)}
          className="flex h-9 shrink-0 items-center gap-2 rounded-full bg-surface-2 px-3.5 text-[13px] font-medium text-ink-2 ring-1 ring-line transition aria-pressed:bg-action aria-pressed:text-on-action"
        >
          {formatChoiceLabel(choice, `${entity}.${statusField}`)}
          <span className="tabular text-xs opacity-70">
            {rows.filter((row) => row.data[statusField] === choice).length}
          </span>
        </button>
      ))}
    </div>
  );

  return (
    <section className="flex flex-col gap-5">
      {header?.(metrics && ready ? metrics(filtered) : null)}
      {!ready && (
        <Notice>
          {notReadyText ||
            'Pencatatan ini belum aktif. Database perlu diperbarui (migrasi) sebelum data bisa dicatat.'}
        </Notice>
      )}
      {!header && metrics && ready && metrics(filtered)}
      {tabs ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {tabs}
            <div className="flex flex-wrap items-center gap-2 sm:ml-auto">{controls}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {finder}
            {filters}
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {finder}
            {controls}
          </div>
          {filters}
        </>
      )}
      {details && ready && details(filtered)}
      {filtered.length === 0 ? (
        rows.length ? (
          <EmptyState
            title="Tidak ada data yang cocok"
            description="Ubah kata pencarian atau saringan."
            action={
              <Button
                onClick={() => {
                  setSearch('');
                  setStatus('');
                  setQuick('');
                  setMonth('');
                }}
              >
                <X />
                Hapus saringan
              </Button>
            }
          />
        ) : (
          <EmptyState
            title={`Belum ada ${entityTitle(entity).toLowerCase()}`}
            description={catalog[entity].description}
            action={
              ready ? (
                <Button variant="primary" onClick={() => setForm({})}>
                  <Plus />
                  Tambah {entityTitle(entity).toLowerCase()}
                </Button>
              ) : undefined
            }
          />
        )
      ) : view === 'cards' ? (
        <div className="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3 2xl:grid-cols-4">
          <AnimatePresence initial={false}>
            {filtered.map((row, index) => (
              <div key={row.id} className="min-w-0">
                <RecordCard
                  entity={entity}
                  row={row}
                  ws={ws}
                  index={index}
                  onOpen={() => setDetail(row.id)}
                  extra={cardExtra?.(row)}
                />
              </div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-card)] bg-surface shadow-card ring-1 ring-line">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b border-line text-xs text-ink-3">
              <tr>
                {tableColumns.map((field) => (
                  <th
                    key={field}
                    scope="col"
                    className={cn(
                      'px-4 py-3 font-normal whitespace-nowrap',
                      fieldKind(entity, field) === 'money' && 'text-right',
                    )}
                  >
                    {fieldLabel(entity, field)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => setDetail(row.id)}
                  className="cursor-pointer transition-colors hover:bg-surface-2"
                >
                  {tableColumns.map((field, index) => {
                    const value = displayValue(entity, field, row.data[field], ws);
                    return (
                      <td
                        key={field}
                        className={cn(
                          'px-4 py-3',
                          index === 0 ? 'text-ink' : 'text-ink-2',
                          !value && 'text-ink-3',
                          fieldKind(entity, field) === 'money' &&
                            'tabular text-right whitespace-nowrap',
                          fieldKind(entity, field) === 'date' && 'tabular whitespace-nowrap',
                        )}
                      >
                        {index === 0 ? (
                          <button
                            type="button"
                            className="text-left font-medium"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetail(row.id);
                            }}
                          >
                            {value || '—'}
                          </button>
                        ) : STATUS_FIELDS.includes(field) && value ? (
                          <Pill tone={statusTone(row.data[field])}>{value}</Pill>
                        ) : (
                          value || '—'
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {activeFilters > 0 && filtered.length > 0 && (
        <p className="text-xs text-ink-3">
          Menampilkan {filtered.length} dari {rows.length} catatan yang dimuat.
        </p>
      )}
      {more && onLoadMore && (
        <Button className="self-center" onClick={onLoadMore} busy={loadingMore}>
          Muat 50 catatan lagi
        </Button>
      )}
      <RecordDetailSheet
        entity={entity}
        row={openRow}
        ws={ws}
        open={Boolean(openRow)}
        refresh={refresh}
        onClose={() => {
          setDetail(null);
          clear();
        }}
        onEdit={() => {
          setForm({ item: openRow });
          setDetail(null);
        }}
      />
      <RecordFormSheet
        open={Boolean(form)}
        entity={entity}
        item={form?.item}
        prefill={form?.prefill}
        workspace={ws}
        refresh={refresh}
        onClose={() => {
          setForm(null);
          clear();
        }}
      />
      <CsvImportSheet
        entity={entity}
        open={importing}
        onClose={() => setImporting(false)}
        refresh={refresh}
      />
    </section>
  );
}
