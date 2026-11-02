'use client';
import Link from 'next/link';
import { useEffect, useId, useMemo, useState } from 'react';
import { ChevronDown, Plus, Trash2, UserRound, X } from 'lucide-react';
import { toast } from 'sonner';
import { catalog, formatChoiceLabel, references } from './catalog';
import { schemas, type Entity, type Item } from './schemas';
import { fieldKind, choicesFor, initialValues, isRequired, fieldErrors } from './fields';
import { entityTitle, fieldLabel } from './related';
import { assigneeOptions } from './assignees';
import { autoTitle } from './auto-title';
import { isProjectHistory } from '@/features/projects/lifecycle';
import type { Workspace } from '@/features/workspace/use-workspace';
import { organizationInfo } from '@/features/workspace/use-loaded-workspace';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { DateField, TimeField } from '@/components/ui/date-time-field';
import { Check } from '@/components/ui/check';
import { Avatar } from '@/components/ui/avatar';
import { PageIcon } from '@/components/ui/icon';
import { PAGES, entityHome } from '@/components/layout/nav';
import { useConfirm } from '@/components/ui/confirm';
import { api } from '@/lib/client';
import { rupiah } from '@/lib/ledger';
import { today } from '@/lib/date';
import { TONE_SWATCH, TONES } from '@/lib/tones';
import { cn } from '@/lib/utils';

type Values = Record<string, unknown>;

/** Kolom yang diisi paling sering tampil besar di atas formulir. */
const HERO_FIELDS = ['title', 'amount'];

/** Kolom yang ditampilkan dulu; sisanya ada di "Rincian lainnya" agar formulir pendek. */
const PRIMARY: Partial<Record<Entity, string[]>> = {
  'work-items': [
    'title',
    'description',
    'workstream_id',
    'assignee',
    'due_date',
    'priority',
    'status',
    'subtasks',
  ],
  members: ['title', 'member_number', 'date', 'contact', 'address', 'status'],
  'cash-entries': ['title', 'date', 'direction', 'amount', 'category', 'account'],
  'inventory-items': [
    'title',
    'sku',
    'price',
    'measurement',
    'book_quantity',
    'minimum_quantity',
    'unit_id',
  ],
  staff: ['title', 'role', 'unit_id', 'status', 'section', 'workplace', 'work_hours'],
  deliveries: [
    'title',
    'direction',
    'status',
    'stakeholder_id',
    'unit_id',
    'planned_date',
    'arrival_time',
    'items',
  ],
  workstreams: [
    'title',
    'code',
    'description',
    'assignee',
    'status',
    'priority',
    'start_date',
    'target_date',
    'color',
  ],
};
const STAKEHOLDER_PRESETS = [
  'Agrinas',
  'PIC lapangan / Babinsa',
  'Pengurus dan pengawas koperasi',
  'Pemerintah desa',
];
const SCORE_LABELS: Record<string, string[]> = {
  probability: ['Sangat jarang', 'Jarang', 'Kadang', 'Sering', 'Hampir pasti'],
  impact: ['Sangat ringan', 'Ringan', 'Sedang', 'Berat', 'Fatal'],
  influence: ['Sangat kecil', 'Kecil', 'Sedang', 'Besar', 'Sangat besar'],
  interest: ['Sangat rendah', 'Rendah', 'Sedang', 'Tinggi', 'Sangat tinggi'],
};
const HEADINGS: Partial<Record<Entity, string>> = {
  'work-items': 'tugas',
  workstreams: 'proyek',
  stakeholders: 'mitra atau kontak',
  meetings: 'agenda',
  'cash-entries': 'transaksi kas',
};
const draftKey = (entity: Entity, id?: string) => `kopdes-draft:${entity}:${id || 'new'}`;
const readDraft = (key: string): Values | null => {
  try {
    const text = sessionStorage.getItem(key);
    return text ? (JSON.parse(text) as Values) : null;
  } catch {
    return null;
  }
};

/** Kolom yang tidak relevan untuk isian lain disembunyikan (dan dikosongkan saat disimpan). */
function hiddenFields(entity: Entity, values: Values): string[] {
  if (entity === 'meetings') {
    if (values.mode === 'tatap muka') return ['meeting_url'];
    if (values.mode === 'online') return ['location'];
  }
  return [];
}

/** Bentuk akhir data sebelum divalidasi: aturan per jenis catatan yang dulu ada di tiap formulir. */
function finalize(entity: Entity, values: Values, workspace: Workspace, original?: Item): Values {
  const data: Values = { ...(original?.data || {}), ...values };
  for (const field of hiddenFields(entity, values)) data[field] = '';
  if (entity === 'work-items') {
    if (data.recurrence === 'tidak') {
      data.recurrence_time = '09:00';
      data.recurrence_end_date = '';
    }
    data.completed_at =
      data.status === 'selesai' ? String(original?.data.completed_at || '') || today() : '';
  }
  const title = autoTitle(entity, data, workspace);
  if (title) data.title = title;
  return data;
}

export function RecordFormSheet({
  open,
  entity,
  item,
  prefill,
  workspace,
  refresh,
  onClose,
  onSaved,
}: {
  open: boolean;
  entity: Entity;
  item?: Item;
  prefill?: Values;
  workspace: Workspace;
  refresh: () => Promise<void> | void;
  onClose: () => void;
  onSaved?: (item: Item) => void;
}) {
  const formId = useId();
  const confirm = useConfirm();
  const key = draftKey(entity, item?.id);
  const start = useMemo(
    () => (item ? { ...initialValues(entity), ...item.data } : initialValues(entity, prefill)),
    [entity, item, prefill],
  );
  const [values, setValues] = useState<Values>(start);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<Values | null>(null);
  const [showMore, setShowMore] = useState(false);
  const dirty = JSON.stringify(values) !== JSON.stringify(start);

  // Setiap kali laci dibuka untuk catatan lain, isian dimulai ulang (pola penyesuaian saat render).
  const session = open ? `${key}:${JSON.stringify(prefill ?? {})}` : '';
  const [openedFor, setOpenedFor] = useState('');
  if (session !== openedFor) {
    setOpenedFor(session);
    if (session) {
      setValues(start);
      setErrors({});
      setShowMore(Boolean(item) && entity !== 'work-items');
      setDraft(readDraft(key));
    }
  }
  useEffect(() => {
    if (!open || !dirty) return;
    try {
      sessionStorage.setItem(key, JSON.stringify(values));
    } catch {
      /* Penyimpanan sesi bisa ditolak; formulir tetap berjalan. */
    }
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [open, dirty, values, key]);

  const set = (field: string, value: unknown) =>
    setValues((current) => {
      const next = { ...current, [field]: value };
      // Milestone harus dari proyek yang sama; ganti proyek = kosongkan milestone.
      if (field === 'workstream_id' && current.milestone_id) next.milestone_id = '';
      // Stok buku opname diambil dari barang terpilih, tidak diketik.
      if (entity === 'stock-counts' && field === 'item_id') {
        const product = workspace['inventory-items']?.find((row) => row.id === value);
        next.book_quantity = product ? Number(product.data.book_quantity || 0) : '';
        if (!current.title && product) next.title = `Opname ${String(product.data.title)}`;
      }
      return next;
    });

  const close = async () => {
    if (
      dirty &&
      !(await confirm({
        title: 'Tutup tanpa menyimpan?',
        description: 'Perubahan belum disimpan ke database.',
        confirmLabel: 'Tutup',
        danger: true,
      }))
    )
      return;
    try {
      sessionStorage.removeItem(key);
    } catch {}
    onClose();
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const data = finalize(entity, values, workspace, item);
    const parsed = schemas[entity].safeParse(data);
    if (!parsed.success) {
      const next = fieldErrors(parsed.error);
      setErrors(next);
      setShowMore(true);
      toast.error('Periksa isian yang ditandai.');
      return;
    }
    setBusy(true);
    try {
      const saved = await api<Item>(entity, { id: item?.id, data: parsed.data });
      try {
        sessionStorage.removeItem(key);
      } catch {}
      toast.success(item ? 'Perubahan tersimpan' : `${entityTitle(entity)} tersimpan`);
      await refresh();
      onSaved?.(saved);
      onClose();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const hidden = hiddenFields(entity, values);
  const fields = catalog[entity].fields.filter((field) => !hidden.includes(field));
  const primary = PRIMARY[entity];
  const main = primary ? fields.filter((field) => primary.includes(field)) : fields;
  const more = primary ? fields.filter((field) => !primary.includes(field)) : [];
  const heading = `${item ? 'Ubah' : entity === 'meetings' ? 'Jadwalkan' : 'Tambah'} ${HEADINGS[entity] || entityTitle(entity).toLowerCase()}`;

  const renderField = (field: string) => (
    <FieldControl
      key={field}
      entity={entity}
      field={field}
      values={values}
      set={set}
      error={errors[field]}
      workspace={workspace}
      refresh={refresh}
      item={item}
    />
  );
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => !next && void close()}
      title={heading}
      description={catalog[entity].description}
      footer={
        <>
          <Button variant="ghost" onClick={() => void close()}>
            Batal
          </Button>
          <Button
            variant="primary"
            type="submit"
            form={formId}
            busy={busy}
            className="ml-auto min-w-36"
          >
            {item ? 'Simpan perubahan' : 'Simpan'}
          </Button>
        </>
      }
    >
      {draft && JSON.stringify(draft) !== JSON.stringify(values) && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl bg-warn p-3 text-sm font-semibold text-warn-ink">
          <span className="flex-1">Ada isian yang belum disimpan dari sebelumnya.</span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setValues({ ...start, ...draft });
              setDraft(null);
            }}
          >
            Lanjutkan draf
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              try {
                sessionStorage.removeItem(key);
              } catch {}
              setDraft(null);
            }}
          >
            Abaikan
          </Button>
        </div>
      )}
      <form id={formId} onSubmit={submit} className="flex flex-col gap-4" noValidate>
        {main
          .filter((field) => HERO_FIELDS.includes(field))
          .map((field) => (
            <div key={field} className="form-hero">
              {renderField(field)}
            </div>
          ))}
        {main.some((field) => !HERO_FIELDS.includes(field)) && (
          <div className="form-group">
            {main.filter((field) => !HERO_FIELDS.includes(field)).map(renderField)}
          </div>
        )}
        {more.length > 0 && (
          <div className="form-group">
            <button
              type="button"
              aria-expanded={showMore}
              onClick={() => setShowMore((open) => !open)}
              className="flex min-h-13 w-full items-center justify-between px-4 text-sm font-medium text-ink-2 transition-colors hover:text-ink"
            >
              Rincian lainnya
              <ChevronDown
                className={cn('size-4 transition-transform duration-300', showMore && 'rotate-180')}
              />
            </button>
            {showMore && more.map(renderField)}
          </div>
        )}
      </form>
    </Sheet>
  );
}

function FieldControl({
  entity,
  field,
  values,
  set,
  error,
  workspace,
  refresh,
  item,
}: {
  entity: Entity;
  field: string;
  values: Values;
  set: (field: string, value: unknown) => void;
  error?: string;
  workspace: Workspace;
  refresh: () => Promise<void> | void;
  item?: Item;
}) {
  const kind = fieldKind(entity, field);
  const label = fieldLabel(entity, field);
  const required = isRequired(entity, field);
  const value = values[field];
  const text = value === undefined || value === null ? '' : String(value);
  const common = { 'aria-invalid': Boolean(error) || undefined };
  const recurrenceOff =
    entity === 'work-items' &&
    ['recurrence_time', 'recurrence_end_date'].includes(field) &&
    values.recurrence === 'tidak';

  if (kind === 'subtasks')
    return (
      <SubtaskEditor
        value={(value as { title: string; done: boolean }[]) || []}
        onChange={(next) => set(field, next)}
        error={error}
      />
    );
  if (kind === 'dependencies') {
    const selected = (value as string[]) || [];
    const tasks = (workspace['work-items'] || []).filter(
      (row) => row.id !== item?.id && row.data.status !== 'dibatalkan',
    );
    return (
      <Field label={label} error={error} hint="Tugas yang harus selesai lebih dulu.">
        <div className="field-wide max-h-44 overflow-y-auto rounded-xl border border-line p-1">
          {!tasks.length && <p className="p-2 text-sm text-ink-3">Belum ada tugas lain.</p>}
          {tasks.map((task) => (
            <span
              key={task.id}
              className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-2"
            >
              <Check
                size="sm"
                checked={selected.includes(task.id)}
                label={String(task.data.title)}
                onChange={() =>
                  set(
                    field,
                    selected.includes(task.id)
                      ? selected.filter((id) => id !== task.id)
                      : [...selected, task.id],
                  )
                }
              />
              {String(task.data.title)}
            </span>
          ))}
        </div>
      </Field>
    );
  }
  if (kind === 'boolean')
    return (
      <span className="flex min-h-13 items-center gap-3 px-4 text-sm font-medium text-ink-2">
        <Check checked={Boolean(value)} onChange={() => set(field, !value)} label={label} />
        {label}
      </span>
    );
  if (kind === 'assignee') {
    const manager = organizationInfo(workspace).manager;
    const people = assigneeOptions(workspace.staff || [], manager, text);
    return (
      <Field
        label={label}
        error={error}
        hint={
          !(workspace.staff || []).length ? (
            <Link className="font-semibold text-accent-ink underline" href="/team?new=1">
              Tambah anggota Tim
            </Link>
          ) : undefined
        }
      >
        {/* Kisi dua kolom yang sama lebar: nama dan jabatan sejajar, mudah dipindai. */}
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={label}>
          {[{ name: '', role: '' }, ...people].map((person) => {
            const active = text.toLowerCase() === person.name.toLowerCase();
            return (
              <button
                key={person.name || 'none'}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => set(field, person.name)}
                className={cn(
                  'flex h-13 min-w-0 items-center gap-2.5 rounded-full pr-3 pl-2 text-left text-sm font-medium ring-1 transition active:scale-[0.98]',
                  active
                    ? 'bg-accent text-accent-ink ring-accent-strong'
                    : 'text-ink-2 ring-line hover:bg-surface-2',
                )}
              >
                {person.name ? (
                  <Avatar name={person.name} className="size-8 ring-0" />
                ) : (
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-3 text-ink-3">
                    <UserRound className="size-4" />
                  </span>
                )}
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate">{person.name || 'Belum ada'}</span>
                  {person.role && (
                    <span className="truncate text-[11px] font-medium opacity-70">
                      {person.role}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </Field>
    );
  }
  if (kind === 'color')
    return (
      <Field label="Warna kartu" error={error}>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Warna kartu">
          {TONES.map((tone) => (
            <button
              key={tone}
              type="button"
              role="radio"
              aria-checked={text.toLowerCase() === TONE_SWATCH[tone]}
              aria-label={tone}
              data-tone={tone}
              onClick={() => set(field, TONE_SWATCH[tone])}
              className="grid size-11 place-items-center rounded-2xl bg-tone ring-offset-2 ring-offset-surface transition aria-checked:ring-2 aria-checked:ring-tone-bar"
            >
              <span className="size-4 rounded-full bg-tone-bar" />
            </button>
          ))}
        </div>
      </Field>
    );
  if (kind === 'ref')
    return (
      <RefField
        entity={entity}
        field={field}
        label={label}
        value={text}
        values={values}
        set={set}
        error={error}
        required={required}
        workspace={workspace}
        refresh={refresh}
      />
    );
  if (kind === 'choice' || kind === 'score') {
    const choices = kind === 'score' ? ['1', '2', '3', '4', '5'] : choicesFor(entity, field);
    if (choices.length <= 5 && kind !== 'score')
      return (
        <Field label={label} error={error} required={required}>
          <div
            className="flex flex-wrap gap-1 rounded-full bg-surface-2 p-1 ring-1 ring-line"
            role="radiogroup"
            aria-label={label}
          >
            {choices.map((choice) => (
              <button
                key={choice}
                type="button"
                role="radio"
                aria-checked={text === choice}
                onClick={() => set(field, choice)}
                className="h-9 flex-1 rounded-full px-3.5 text-[13px] font-medium whitespace-nowrap text-ink-2 transition aria-checked:bg-action aria-checked:text-on-action"
              >
                {formatChoiceLabel(choice, `${entity}.${field}`)}
              </button>
            ))}
          </div>
        </Field>
      );
    return (
      <Field label={label} error={error} required={required}>
        <Select value={text} onChange={(event) => set(field, event.target.value)} {...common}>
          {choices.map((choice) => (
            <option key={choice} value={choice}>
              {kind === 'score'
                ? `${choice} · ${SCORE_LABELS[field]?.[Number(choice) - 1] || ''}`
                : formatChoiceLabel(choice, `${entity}.${field}`)}
            </option>
          ))}
        </Select>
      </Field>
    );
  }
  if (entity === 'stakeholders' && field === 'category')
    return (
      <Field label={label} error={error}>
        <Input value={text} onChange={(event) => set(field, event.target.value)} {...common} />
        <span className="flex flex-wrap gap-1.5">
          {STAKEHOLDER_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => set(field, preset)}
              className="rounded-full bg-surface-3 px-3 py-1.5 text-xs font-semibold text-ink-2 hover:bg-accent hover:text-accent-ink"
            >
              {preset}
            </button>
          ))}
        </span>
      </Field>
    );
  if (kind === 'longtext')
    return (
      <Field label={label} error={error} required={required}>
        <Textarea
          value={text}
          onChange={(event) => set(field, event.target.value)}
          rows={field === 'minutes' || field === 'notes' ? 4 : 3}
          {...common}
        />
      </Field>
    );
  if (kind === 'money')
    return (
      <Field
        label={label}
        error={error}
        required={required}
        hint={Number(text) > 0 ? rupiah(Number(text)) : undefined}
      >
        <span className="relative block">
          <span className="money-prefix pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-sm font-medium text-ink-3">
            Rp
          </span>
          <Input
            inputMode="numeric"
            className="money-input tabular pl-10"
            value={text === '0' ? '' : text}
            placeholder="0"
            onChange={(event) => set(field, event.target.value.replace(/\D/g, ''))}
            {...common}
          />
        </span>
      </Field>
    );
  if (kind === 'date' || kind === 'time') {
    const Picker = kind === 'date' ? DateField : TimeField;
    return (
      <Field
        label={label}
        error={error}
        required={required && !recurrenceOff}
        hint={recurrenceOff ? 'Aktif bila tugas berulang.' : undefined}
      >
        <Picker
          aria-label={label}
          value={text}
          disabled={recurrenceOff}
          clearable={!required}
          onChange={(next) => set(field, next)}
          className={error ? 'border-late-ink' : undefined}
        />
      </Field>
    );
  }
  const readOnly = entity === 'stock-counts' && field === 'book_quantity';
  return (
    <Field
      label={label}
      error={error}
      required={required && !recurrenceOff}
      hint={
        readOnly
          ? 'Diambil dari stok buku barang terpilih.'
          : recurrenceOff
            ? 'Aktif bila tugas berulang.'
            : undefined
      }
    >
      <Input
        type={kind === 'link' ? 'url' : 'text'}
        inputMode={kind === 'integer' ? 'numeric' : undefined}
        value={text}
        readOnly={readOnly}
        disabled={recurrenceOff}
        maxLength={field === 'title' ? 200 : undefined}
        placeholder={kind === 'link' ? 'https://' : undefined}
        onChange={(event) =>
          set(
            field,
            kind === 'integer' ? event.target.value.replace(/\D/g, '') : event.target.value,
          )
        }
        {...common}
      />
    </Field>
  );
}

const INLINE_DEFAULTS: Partial<Record<Entity, (title: string, values: Values) => Values>> = {
  workstreams: (title) => ({
    title,
    code: title
      .replace(/[^A-Za-z0-9]/g, '')
      .slice(0, 6)
      .toUpperCase()
      .padEnd(2, 'X'),
    status: 'aktif',
    priority: 'normal',
  }),
  stakeholders: (title) => ({ title, influence: 3, interest: 3 }),
  meetings: (title) => ({ title, date: today(), time: '09:00', duration: 60 }),
  documents: (title) => ({ title, status: 'tersedia', number: '-' }),
  milestones: (title, values) => ({
    title,
    workstream_id: values.workstream_id || '',
    due_date: today(),
  }),
};

function RefField({
  entity,
  field,
  label,
  value,
  values,
  set,
  error,
  required,
  workspace,
  refresh,
}: {
  entity: Entity;
  field: string;
  label: string;
  value: string;
  values: Values;
  set: (field: string, value: unknown) => void;
  error?: string;
  required: boolean;
  workspace: Workspace;
  refresh: () => Promise<void> | void;
}) {
  const target = references[field];
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  let rows = workspace[target] || [];
  if (target === 'workstreams')
    rows = rows.filter((row) => !isProjectHistory(row) || row.id === value);
  if (field === 'milestone_id')
    rows = rows.filter((row) => row.data.workstream_id === values.workstream_id);
  const disabled = field === 'milestone_id' && !values.workstream_id;
  const empty =
    target === 'workstreams' && entity === 'work-items'
      ? 'Tugas mandiri (tanpa proyek)'
      : 'Tidak ada';
  const create = INLINE_DEFAULTS[target];
  return (
    <Field
      label={label}
      error={error}
      required={required}
      hint={disabled ? 'Pilih proyek dulu.' : undefined}
    >
      <span className="flex gap-2">
        <span className="min-w-0 flex-1">
          <Select
            value={value}
            disabled={disabled}
            icon={<PageIcon name={PAGES[entityHome(target).page].icon} />}
            onChange={(event) => set(field, event.target.value)}
            aria-invalid={Boolean(error) || undefined}
          >
            <option value="">{required ? 'Pilih…' : empty}</option>
            {rows.map((row) => (
              <option key={row.id} value={row.id}>
                {String(row.data.title)}
                {target === 'workstreams' && isProjectHistory(row) ? ' (riwayat)' : ''}
              </option>
            ))}
          </Select>
        </span>
        {create && !disabled && (
          <Button
            size="icon"
            variant="secondary"
            aria-label={`Buat ${label.toLowerCase()} baru`}
            onClick={() => setCreating((open) => !open)}
            className="size-11"
          >
            {creating ? <X /> : <Plus />}
          </Button>
        )}
      </span>
      {creating && create && (
        <span className="flex gap-2 rounded-2xl bg-surface-2 p-2">
          <Input
            autoFocus
            value={title}
            placeholder={`Nama ${label.toLowerCase()} baru`}
            onChange={(event) => setTitle(event.target.value)}
          />
          <Button
            variant="primary"
            busy={busy}
            disabled={!title.trim()}
            onClick={async () => {
              setBusy(true);
              try {
                const saved = await api<Item>(target, { data: create(title.trim(), values) });
                await refresh();
                set(field, saved.id);
                setCreating(false);
                setTitle('');
                toast.success(`${entityTitle(target)} dibuat`);
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Buat
          </Button>
        </span>
      )}
    </Field>
  );
}

function SubtaskEditor({
  value,
  onChange,
  error,
}: {
  value: { title: string; done: boolean }[];
  onChange: (next: { title: string; done: boolean }[]) => void;
  error?: string;
}) {
  const [text, setText] = useState('');
  const add = () => {
    if (!text.trim()) return;
    onChange([...value, { title: text.trim().slice(0, 200), done: false }]);
    setText('');
  };
  return (
    <Field label="Subtugas" error={error}>
      <div className="flex flex-col gap-1">
        {value.map((subtask, index) => (
          <span
            key={index}
            className="group flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-surface-2"
          >
            <Check
              size="sm"
              checked={subtask.done}
              label={subtask.title}
              onChange={() =>
                onChange(value.map((s, i) => (i === index ? { ...s, done: !s.done } : s)))
              }
            />
            <span className={cn('flex-1 text-sm', subtask.done && 'text-ink-3 line-through')}>
              {subtask.title}
            </span>
            <button
              type="button"
              aria-label={`Hapus ${subtask.title}`}
              onClick={() => onChange(value.filter((_, i) => i !== index))}
              className="grid size-8 place-items-center rounded-lg text-ink-3 opacity-0 transition group-hover:opacity-100 hover:bg-late hover:text-late-ink focus:opacity-100 max-md:opacity-100"
            >
              <Trash2 className="size-4" />
            </button>
          </span>
        ))}
        <Input
          value={text}
          placeholder="Tambah subtugas lalu tekan Enter"
          icon={<Plus />}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              add();
            }
          }}
          onBlur={add}
        />
      </div>
    </Field>
  );
}
