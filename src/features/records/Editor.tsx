'use client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { IntegerInput } from '@/components/ui/IntegerInput';
import { judulOtomatis } from './judul-otomatis';
import { Field } from '@/components/ui/Field';
import { Textarea } from '@/components/ui/Input';
import { DateInput } from '@/components/ui/DateField';
import { useEffect, useId, useRef, useState } from 'react';
import {
  X,
  FolderKanban,
  Sparkles,
  Users,
  Video,
  FilePlus,
  CheckSquare,
} from 'lucide-react';
import { schemas, type Entity, type Item } from './schemas';
import { catalog, formatChoiceLabel, labels, options, references } from './catalog';
import type { Workspace } from '../workspace/useWorkspace';
import { today } from '@/lib/date';
import { api } from '@/lib/client';
import { ZodError } from 'zod';
import { DateField } from '@/components/ui/DateField';
import { Select } from '@/components/ui/Select';
import { EntryGuide } from '../workspace/EntryGuide';
import { Ikon3D } from '@/components/ui/Ikon3D';
import { IKON_HALAMAN } from '@/components/ui/IkonHalaman';
import { pages } from './catalog';

const STAKEHOLDER_PRESETS = [
  {
    label: 'Agrinas',
    title: '',
    category: 'Agrinas',
    influence: 3,
    interest: 3,
    follow_up: '',
  },
  {
    label: 'PIC / Babinsa',
    title: '',
    category: 'PIC lapangan / Babinsa',
    influence: 3,
    interest: 3,
    follow_up: '',
  },
  {
    label: 'Pengurus / Pengawas',
    title: '',
    category: 'Pengurus dan pengawas koperasi',
    influence: 3,
    interest: 3,
    follow_up: '',
  },
  {
    label: 'Pemerintah desa',
    title: '',
    category: 'Pemerintah desa',
    influence: 3,
    interest: 3,
    follow_up: '',
  },
] as const;
const BASIC_TASK_FIELDS = [
  'workstream_id',
  'title',
  'due_date',
  'status',
  'priority',
  'assignee',
  'unit_id',
  'description',
];

export function Editor({
  entity,
  item,
  workspace,
  onClose,
  onSaved,
  quick = false,
  draftScope,
}: {
  entity: Entity;
  item?: Item;
  workspace: Workspace;
  onClose: () => void;
  onSaved: () => Promise<void>;
  quick?: boolean;
  draftScope?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [dirty, setDirty] = useState(false);
  const [savedDraft, setSavedDraft] = useState<Record<string, unknown> | null>(null);
  const [restoredDraft, setRestoredDraft] = useState<Record<string, unknown> | null>(null);
  const [formVersion, setFormVersion] = useState(0);
  const [draftNotice, setDraftNotice] = useState('');
  const draftKey = 'hub-draft:' + (draftScope ? draftScope + ':' : '') + entity + ':' + (item?.id || 'new');
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(draftKey);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          // Restore only after the manager chooses to use this browser-tab draft.
          Promise.resolve().then(() => setSavedDraft(parsed as Record<string, unknown>));
        }
      }
    } catch {
      /* Drafts are optional when browser storage is unavailable. */
    }
  }, [draftKey]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  function captureValues(form: HTMLFormElement) {
    const input = new FormData(form);
    const result: Record<string, unknown> = { ...item?.data };
    for (const field of fields) {
      if (field === 'required') result[field] = input.get(field) === 'on';
      else if (field === 'dependencies') result[field] = input.getAll(field);
      else if (field === 'subtasks')
        result[field] = String(input.get(field) || '')
          .split('\n')
          .filter(Boolean)
          .map((line) => ({ title: line.replace(/^\[x\]\s*/i, ''), done: /^\[x\]/i.test(line) }));
      else result[field] = input.get(field) ?? '';
    }
    return result;
  }
  function saveLocalDraft() {
    if (!formRef.current || savedDraft) return;
    try {
      sessionStorage.setItem(draftKey, JSON.stringify(captureValues(formRef.current)));
      setDraftNotice('Draf tersimpan di tab ini. Belum masuk ke database.');
    } catch {
      setDraftNotice('Draf tidak dapat disimpan di browser. Simpan formulir sebelum menutup.');
    }
  }
  function requestClose() {
    if (busy) return;
    if (!dirty || window.confirm('Perubahan belum disimpan ke database. Tutup formulir?')) {
      if (dirty) saveLocalDraft();
      onClose();
    }
  }
  const headingId = useId();
  const [stockItem, setStockItem] = useState(String(item?.data.item_id || ''));
  const [meetingMode, setMeetingMode] = useState<string>(() =>
    String(item?.data.mode || 'tatap muka'),
  );
  const [recurrence, setRecurrence] = useState(String(item?.data.recurrence || 'tidak'));
  const [projectId, setProjectId] = useState(String(item?.data.workstream_id || ''));
  const [showTaskDetails, setShowTaskDetails] = useState(Boolean(item?.id));
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const [stakeholderPreset, setStakeholderPreset] = useState<
    (typeof STAKEHOLDER_PRESETS)[number] | null
  >(null);
  const [createdItems, setCreatedItems] = useState<Partial<Record<Entity, Item[]>>>({});
  const [selectedRefs, setSelectedRefs] = useState<Record<string, string>>({});
  const [inlineCreator, setInlineCreator] = useState<
    'meetings' | 'documents' | 'work-items' | 'workstreams' | 'stakeholders' | 'milestones' | null
  >(null);
  const [inlineTitle, setInlineTitle] = useState('');
  const [inlineCode, setInlineCode] = useState('');
  const [inlineContact, setInlineContact] = useState('');
  const [inlineCategory, setInlineCategory] = useState('Mitra');
  const [inlineDate, setInlineDate] = useState(today());
  const [inlineTime, setInlineTime] = useState('09:00');
  const [inlineMode, setInlineMode] = useState<'online' | 'tatap muka' | 'hybrid'>('online');
  const [inlineUrl, setInlineUrl] = useState('');
  const [inlineDocNumber, setInlineDocNumber] = useState('');
  const [inlineDocKind, setInlineDocKind] = useState('kontrak');
  const [inlinePriority, setInlinePriority] = useState('normal');
  const [inlineBusy, setInlineBusy] = useState(false);
  const [inlineNotice, setInlineNotice] = useState('');
  useEffect(() => {
    const node = dialog.current;
    const previous = document.activeElement;
    node?.showModal();
    return () => {
      node?.close();
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);
  const fields = quick
    ? ['workstream_id', 'title', 'due_date', 'assignee', 'unit_id']
    : entity === 'work-items' && !showTaskDetails
      ? BASIC_TASK_FIELDS
      : catalog[entity].fields;
  const defaults = restoredDraft ||
    item?.data || {
      due_date: today(),
      date: today(),
      start_date: today(),
      title: '',
    };
  const optionalFields = fields.filter((field) => ['members', 'cash-entries', 'inventory-items'].includes(entity) && ['member_id','item_id','unit_id','workstream_id','reference_number','link','notes','contact','address','price'].includes(field) && !(entity === 'inventory-items' && ['unit_id', 'price'].includes(field)));
  // Tim: rupa dan kedudukan hanya dipakai karakter Dunia Koperasi, dikelompokkan terpisah.
  const worldFields =
    entity === 'staff'
      ? fields.filter((field) => field === 'position' || field === 'outfit' || field.startsWith('look_'))
      : [];
  const primaryFields = fields.filter(
    (field) => !optionalFields.includes(field) && !worldFields.includes(field),
  );
  const renderField = (field: string) => {
            if (entity === 'meetings' && field === 'meeting_url' && meetingMode === 'tatap muka') {
              return null;
            }
            if (entity === 'meetings' && field === 'location' && meetingMode === 'online') {
              return null;
            }
            const presetVal =
              entity === 'stakeholders' && stakeholderPreset
                ? stakeholderPreset[field as keyof typeof stakeholderPreset]
                : undefined;
            const value =
                presetVal !== undefined
                  ? presetVal
                  : entity === 'stock-counts' &&
                      field === 'book_quantity' &&
                      stockItem &&
                      stockItem !== item?.data.item_id
                    ? workspace['inventory-items']?.find((row) => row.id === stockItem)?.data
                        .book_quantity
                    : defaults[field as keyof typeof defaults],
              choices = options[entity + '.' + field] || options[field],
              reference = references[field];
            const selectedValue =
              entity === 'work-items' &&
              field === 'milestone_id' &&
              projectId !== String(defaults.workstream_id || '')
                ? ''
                : value;
            const label =
              entity === 'members' && field === 'date'
                ? 'Tanggal bergabung'
                : entity === 'members' && field === 'title'
                  ? 'Nama anggota'
                  : entity === 'workstreams' && field === 'target_date'
                    ? 'Target selesai'
                    : entity === 'stakeholders' && field === 'title'
                      ? 'Nama orang atau lembaga'
                      : entity === 'stakeholders' && field === 'contact'
                        ? 'Nomor WhatsApp / Kontak telepon'
                        : entity === 'stakeholders' && field === 'influence'
                          ? 'Tingkat wewenang / pengaruh (1–5)'
                          : entity === 'stakeholders' && field === 'interest'
                            ? 'Tingkat kepentingan / keterlibatan (1–5)'
                            : entity === 'meetings' && field === 'title'
                              ? 'Nama / Topik Rapat'
                              : entity === 'meetings' && field === 'mode'
                                ? 'Format Rapat'
                                : entity === 'meetings' && field === 'location'
                                  ? 'Ruangan / Tempat Rapat'
                                  : entity === 'meetings' && field === 'meeting_url'
                                    ? 'Tautan Rapat Online'
                                    : entity === 'meetings' && field === 'participants'
                                      ? 'Daftar Peserta Rapat'
                                      : entity === 'meetings' && field === 'duration'
                                        ? 'Estimasi Durasi (menit)'
                                        : entity === 'meetings' && field === 'time'
                                          ? 'Jam Mulai (WIB)'
                                          : entity === 'meetings' && field === 'agenda'
                                            ? 'Agenda Pembahasan'
                                            : entity === 'meetings' && field === 'minutes'
                                              ? 'Notulen & Ringkasan Keputusan'
                                              : labels[`${entity}.${field}`] || labels[field] || field;

            if (field.endsWith('_date') || field === 'date' || field === 'last_contact')
              return (
                <div key={field} className="field-item">
                  <DateField
                    name={field}
                    label={label}
                    defaultValue={String(value || '')}
                    required={
                      ['due_date', 'date'].includes(field) ||
                      (entity === 'organization' && field === 'start_date')
                    }
                    disabled={
                      entity === 'work-items' &&
                      field === 'recurrence_end_date' &&
                      recurrence === 'tidak'
                    }
                  />
                </div>
              );
            if (field === 'required')
              return (
                <label key={field} className="check field-item field-check">
                  <Input type="checkbox" name={field} defaultChecked={value !== false} />
                  <span className="field-caption-check">Wajib diselesaikan</span>
                </label>
              );
            if (field === 'dependencies')
              return (
                <fieldset key={field} className="dependency-picker wide field-item field-wide">
                  <legend>
                    <span className="field-caption">{label}</span>
                  </legend>
                  <div className="dependency-checkboxes">
                    {((value || []) as string[])
                      .filter((id) => !(workspace['work-items'] || []).some((row) => row.id === id))
                      .map((id) => (
                        <label className="check" key={id}>
                          <Input type="checkbox" name={field} value={id} defaultChecked />
                          <span>Tugas terkait di halaman lain ({id.slice(0, 8)})</span>
                        </label>
                      ))}
                    {(workspace['work-items'] || [])
                      .filter((row) => row.id !== item?.id)
                      .map((row) => (
                        <label className="check" key={row.id}>
                          <Input
                            type="checkbox"
                            name={field}
                            value={row.id}
                            defaultChecked={((value || []) as string[]).includes(row.id)}
                          />
                          <span>{String(row.data.title)}</span>
                        </label>
                      ))}
                  </div>
                  <small className="field-helper">
                    {(workspace['work-items'] || []).some((row) => row.id !== item?.id)
                      ? 'Pilih tugas yang harus selesai lebih dahulu.'
                      : 'Belum ada tugas lain untuk dipilih.'}
                  </small>
                </fieldset>
              );
            if (entity === 'stakeholders' && (field === 'influence' || field === 'interest')) {
              return (
                <label key={field} className="field-item">
                  <span className="field-caption">{label}</span>
                  <Select
                    key={stakeholderPreset ? field + String(presetVal) : field}
                    name={field} ariaLabel={label} defaultValue={String(value ?? 3)}
                    options={(field === 'influence' ? [
                      'Sangat Tinggi (Kepala Desa / Pembuat Kebijakan)',
                      'Tinggi (Babinsa, Bhabinkamtibmas, Pengawas)',
                      'Sedang (Pengurus Bidang, Mitra Utama)',
                      'Terbatas (Kelompok Warga, Pemasok Berkala)', 'Rendah (Pemantau Umum)',
                    ] : [
                      'Sangat Tinggi (Sangat Aktif & Terdampak Langsung)',
                      'Tinggi (Pengawasan Rutin & Koordinasi Berkala)',
                      'Sedang (Perlu Laporan & Update Periodik)',
                      'Rendah (Cukup Diinformasikan Saat Perlu)', 'Minimal (Hanya Bila Diperlukan)',
                    ]).map((title, index) => ({ value: String(5 - index), label: String(5 - index) + ' — ' + title }))}
                  />
                  <small className="field-helper">
                    {field === 'influence'
                      ? 'Wewenang atau pengaruh tokoh ini terhadap perizinan & kelancaran koperasi.'
                      : 'Tingkat keterlibatan atau kebutuhan koordinasi rutin.'}
                  </small>
                </label>
              );
            }
            if (entity === 'meetings' && field === 'mode') {
              return (
                <label key={field} className="field-item">
                  <span className="field-caption">{label}</span>
                  <Select name={field} ariaLabel={label} value={meetingMode} onChange={setMeetingMode}
                    options={[
                      { value: 'tatap muka', label: 'Tatap Muka (Pertemuan Langsung di Lokasi)' },
                      { value: 'online', label: 'Online Penuh (Google Meet / Zoom)' },
                      { value: 'hybrid', label: 'Hybrid (Fisik di Lokasi + Tautan Online)' },
                    ]} />
                  <small className="field-helper">
                    {meetingMode === 'tatap muka'
                      ? 'Rapat berlangsung secara fisik di balai desa, kantor, atau gerai koperasi.'
                      : meetingMode === 'online'
                        ? 'Rapat daring. Tautan video conference wajib dapat diakses peserta.'
                        : 'Rapat gabungan: ada kehadiran langsung di lokasi dan akses online bagi peserta jauh.'}
                  </small>
                </label>
              );
            }
            if (choices || reference) {
              const allChoices = choices
                ? [
                    ...(value && !choices.includes(String(value)) ? [String(value)] : []),
                    ...choices,
                  ]
                : undefined;
              const refItems = reference
                ? [
                    ...(createdItems[reference as Entity] || []),
                    ...(workspace[reference] || []),
                  ]
                : [];
              return (
                <div key={field} className="field-item">
                  <div className="field-caption-row">
                    <span className="field-caption">{label}</span>
                    {reference === 'workstreams' && (
                      <Button
                        type="button"
                        className="field-inline-create-btn"
                        onClick={() => {
                          setInlineCreator(inlineCreator === 'workstreams' ? null : 'workstreams');
                          setInlineTitle('');
                          setInlineCode('');
                          setInlineDate(today());
                          setInlineNotice('');
                        }}
                      >
                        {inlineCreator === 'workstreams' ? 'Tutup Form' : '+ Proyek Baru'}
                      </Button>
                    )}
                    {reference === 'stakeholders' && (
                      <Button
                        type="button"
                        className="field-inline-create-btn"
                        onClick={() => {
                          setInlineCreator(inlineCreator === 'stakeholders' ? null : 'stakeholders');
                          setInlineTitle('');
                          setInlineContact('');
                          setInlineCategory('Mitra');
                          setInlineNotice('');
                        }}
                      >
                        {inlineCreator === 'stakeholders' ? 'Tutup Form' : '+ Mitra Baru'}
                      </Button>
                    )}
                    {reference === 'milestones' && Boolean(projectId) && (
                      <Button
                        type="button"
                        className="field-inline-create-btn"
                        onClick={() => {
                          setInlineCreator(inlineCreator === 'milestones' ? null : 'milestones');
                          setInlineTitle('');
                          setInlineDate(today());
                          setInlineNotice('');
                        }}
                      >
                        {inlineCreator === 'milestones' ? 'Tutup Form' : '+ Milestone Baru'}
                      </Button>
                    )}
                    {reference === 'meetings' && (
                      <Button
                        type="button"
                        className="field-inline-create-btn"
                        onClick={() => {
                          setInlineCreator(inlineCreator === 'meetings' ? null : 'meetings');
                          setInlineTitle('');
                          setInlineUrl('');
                          setInlineNotice('');
                        }}
                      >
                        {inlineCreator === 'meetings' ? 'Tutup Form' : '+ Rapat Baru'}
                      </Button>
                    )}
                    {reference === 'documents' && (
                      <Button
                        type="button"
                        className="field-inline-create-btn"
                        onClick={() => {
                          setInlineCreator(inlineCreator === 'documents' ? null : 'documents');
                          setInlineTitle('');
                          setInlineUrl('');
                          setInlineDocNumber('');
                          setInlineNotice('');
                        }}
                      >
                        {inlineCreator === 'documents' ? 'Tutup Form' : '+ Dokumen Baru'}
                      </Button>
                    )}
                    {entity === 'journal' && field === 'work_item_id' && (
                      <Button
                        type="button"
                        className="field-inline-create-btn"
                        onClick={() => {
                          setInlineCreator(inlineCreator === 'work-items' ? null : 'work-items');
                          setInlineTitle('');
                          setInlineNotice('');
                        }}
                      >
                        {inlineCreator === 'work-items' ? 'Tutup Form' : '+ Tugas Baru'}
                      </Button>
                    )}
                  </div>
                  <Select
                    key={field === 'category' && stakeholderPreset ? field + stakeholderPreset.category : entity === 'work-items' && field === 'milestone_id' ? field + projectId : field}
                    name={field} ariaLabel={label}
                    required={entity === 'stock-counts' && field === 'item_id'}
                    disabled={entity === 'work-items' && field === 'milestone_id' && !projectId}
                    value={selectedRefs[field] ?? String(selectedValue ?? allChoices?.[0] ?? '')}
                    onChange={(next) => {
                      setSelectedRefs((prev) => ({ ...prev, [field]: next }));
                      if (field === 'item_id') setStockItem(next);
                      else if (entity === 'work-items' && field === 'workstream_id') {
                        setProjectId(next);
                        setSelectedRefs((previous) => ({ ...previous, milestone_id: '' }));
                      }
                      else if (entity === 'work-items' && field === 'recurrence') setRecurrence(next);
                    }}
                    options={[
                      ...(reference ? [{ value: '', label: (['stock-counts', 'stock-movements'].includes(entity) && field === 'item_id') || (entity === 'attendance' && field === 'staff_id') || (entity === 'sales' && field === 'unit_id') || (entity === 'savings' && field === 'member_id') ? `Pilih ${label.toLowerCase()} (wajib)` : entity === 'work-items' && field === 'workstream_id' ? 'Tugas mandiri (tanpa proyek)' : 'Tidak terkait (opsional)' }] : []),
                      ...(reference && selectedValue && !refItems.some((row) => row.id === selectedValue)
                        ? [{ value: String(selectedValue), label: 'Catatan terkait yang belum dimuat (' + String(selectedValue).slice(0, 8) + ')' }] : []),
                      ...(allChoices ? allChoices.map((choice) => ({ value: choice, label: formatChoiceLabel(choice, entity + '.' + field) }))
                        : refItems.filter((row) => (entity !== 'work-items' || field !== 'milestone_id' || row.data.workstream_id === projectId) && (entity !== 'work-items' || field !== 'workstream_id' || !['selesai', 'diarsipkan'].includes(String(row.data.status)) || row.id === selectedValue))
                          .map((row) => ({ value: row.id, label: String(row.data.title) + (
                            reference === 'workstreams'
                              ? (['selesai', 'diarsipkan'].includes(String(row.data.status)) ? ' (Riwayat/Selesai)' : row.data.code ? ' [' + String(row.data.code) + ']' : '')
                              : reference === 'members' && row.data.member_number ? ' (No: ' + String(row.data.member_number) + ')'
                              : reference === 'inventory-items' ? ' [Stok: ' + Number(row.data.book_quantity || 0) + ' ' + String(row.data.measurement || 'unit') + ']'
                              : reference === 'meetings' && row.data.mode ? ' [' + String(row.data.mode).toUpperCase() + (row.data.meeting_url ? ' · Tautan Online' : '') + ']' : ''
                          ) }))),
                    ]}
                  />

                  {/* Inline Quick Creators */}
                  {inlineCreator === 'meetings' && reference === 'meetings' && (
                    <div className="inline-quick-creator-card">
                      <div className="inline-creator-head">
                        <Video size={16} />
                        <strong>Tambah dan tautkan rapat</strong>
                      </div>
                      <div className="inline-creator-grid">
                        <label className="inline-creator-field">
                          <span>Nama / Agenda Rapat *</span>
                          <Input
                            type="text"
                            value={inlineTitle}
                            onChange={(e) => setInlineTitle(e.target.value)}
                            placeholder="Contoh: Rapat Koordinasi Online Mitra"
                            autoFocus
                          />
                        </label>
                        <div className="inline-creator-row">
                          <label className="inline-creator-field">
                            <span>Mode Rapat</span>
                            <Select
                              value={inlineMode}
                              onChange={(val) => {
                                if (val === 'online' || val === 'tatap muka' || val === 'hybrid')
                                  setInlineMode(val);
                              }}
                              options={[
                                { value: 'online', label: 'Online' },
                                { value: 'tatap muka', label: 'Tatap muka' },
                                { value: 'hybrid', label: 'Hybrid' },
                              ]}
                              ariaLabel="Mode Rapat"
                            />
                          </label>
                          <label className="inline-creator-field">
                            <span>Tautan Daring (URL Rapat)</span>
                            <Input
                              type="url"
                              value={inlineUrl}
                              onChange={(e) => setInlineUrl(e.target.value)}
                              placeholder="https://meet.google.com/..."
                            />
                          </label>
                        </div>
                        <div className="inline-creator-row">
                          <label className="inline-creator-field">
                            <span>Tanggal</span>
                            <DateInput
                              aria-label="Tanggal rapat baru"
                              value={inlineDate}
                              onValueChange={(value) => setInlineDate(value)}
                            />
                          </label>
                          <label className="inline-creator-field">
                            <span>Waktu Mulai</span>
                            <Input
                              type="time"
                              value={inlineTime}
                              onChange={(e) => setInlineTime(e.target.value)}
                            />
                          </label>
                        </div>
                      </div>
                      {inlineNotice && <p className="inline-creator-notice">{inlineNotice}</p>}
                      <div className="inline-creator-actions">
                        <Button type="button" onClick={() => setInlineCreator(null)}>
                          Batal
                        </Button>
                        <Button
                          type="button"
                          className="primary"
                          disabled={inlineBusy || !inlineTitle.trim()}
                          onClick={async () => {
                            setInlineBusy(true);
                            setInlineNotice('');
                            try {
                              const payload = schemas.meetings.parse({
                                title: inlineTitle.trim(),
                                date: inlineDate,
                                time: inlineTime,
                                mode: inlineMode,
                                meeting_url: inlineUrl.trim(),
                                location: inlineMode === 'online' ? 'Google Meet / Online' : 'Gerai KDMP',
                                status: 'rencana',
                                participants: '',
                                agenda: '',
                                minutes: '',
                                duration: 60,
                              });
                              const res = await api<Item>('meetings', { data: payload });
                              setCreatedItems((prev) => ({
                                ...prev,
                                meetings: [res, ...(prev.meetings || [])],
                              }));
                              setSelectedRefs((prev) => ({ ...prev, [field]: res.id }));
                              setInlineCreator(null);
                            } catch (err) {
                              setInlineNotice((err as Error).message);
                            } finally {
                              setInlineBusy(false);
                            }
                          }}
                        >
                          {inlineBusy ? 'Menyimpan…' : 'Simpan & Pilih Rapat'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {inlineCreator === 'documents' && reference === 'documents' && (
                    <div className="inline-quick-creator-card">
                      <div className="inline-creator-head">
                        <FilePlus size={16} />
                        <strong>Buat & Tautkan Dokumen / Berkas</strong>
                      </div>
                      <div className="inline-creator-grid">
                        <label className="inline-creator-field">
                          <span>Judul Dokumen *</span>
                          <Input
                            type="text"
                            value={inlineTitle}
                            onChange={(e) => setInlineTitle(e.target.value)}
                            placeholder="Contoh: Perjanjian Kerja Sama Pasokan Beras"
                            autoFocus
                          />
                        </label>
                        <div className="inline-creator-row">
                          <label className="inline-creator-field">
                            <span>Nomor Dokumen</span>
                            <Input
                              type="text"
                              value={inlineDocNumber}
                              onChange={(e) => setInlineDocNumber(e.target.value)}
                              placeholder="014/KDMP/X/2026"
                            />
                          </label>
                          <label className="inline-creator-field">
                            <span>Jenis Dokumen</span>
                            <Select
                              value={inlineDocKind}
                              onChange={(val) => setInlineDocKind(val)}
                              options={[
                                { value: 'kontrak', label: 'Perjanjian / Kontrak' },
                                { value: 'legalitas', label: 'Legalitas / Izin' },
                                { value: 'laporan', label: 'Laporan / Notulen' },
                                { value: 'lainnya', label: 'Lainnya' },
                              ]}
                              ariaLabel="Jenis Dokumen"
                            />
                          </label>
                        </div>
                        <label className="inline-creator-field">
                          <span>Tautan Berkas (Google Drive / URL)</span>
                          <Input
                            type="url"
                            value={inlineUrl}
                            onChange={(e) => setInlineUrl(e.target.value)}
                            placeholder="https://drive.google.com/..."
                          />
                        </label>
                      </div>
                      {inlineNotice && <p className="inline-creator-notice">{inlineNotice}</p>}
                      <div className="inline-creator-actions">
                        <Button type="button" onClick={() => setInlineCreator(null)}>
                          Batal
                        </Button>
                        <Button
                          type="button"
                          className="primary"
                          disabled={inlineBusy || !inlineTitle.trim()}
                          onClick={async () => {
                            setInlineBusy(true);
                            setInlineNotice('');
                            try {
                              const payload = schemas.documents.parse({
                                title: inlineTitle.trim(),
                                kind: inlineDocKind,
                                number: inlineDocNumber.trim() || '-',
                                link: inlineUrl.trim(),
                                status: 'tersedia',
                                notes: '',
                              });
                              const res = await api<Item>('documents', { data: payload });
                              setCreatedItems((prev) => ({
                                ...prev,
                                documents: [res, ...(prev.documents || [])],
                              }));
                              setSelectedRefs((prev) => ({ ...prev, [field]: res.id }));
                              setInlineCreator(null);
                            } catch (err) {
                              setInlineNotice((err as Error).message);
                            } finally {
                              setInlineBusy(false);
                            }
                          }}
                        >
                          {inlineBusy ? 'Menyimpan…' : 'Simpan & Pilih Dokumen'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {inlineCreator === 'work-items' && entity === 'journal' && field === 'work_item_id' && (
                    <div className="inline-quick-creator-card">
                      <div className="inline-creator-head">
                        <CheckSquare size={16} />
                        <strong>Buat & Tautkan Tugas Tindak Lanjut</strong>
                      </div>
                      <div className="inline-creator-grid">
                        <label className="inline-creator-field">
                          <span>Nama Tugas *</span>
                          <Input
                            type="text"
                            value={inlineTitle}
                            onChange={(e) => setInlineTitle(e.target.value)}
                            placeholder="Contoh: Tindak lanjut koordinasi ketersediaan rak"
                            autoFocus
                          />
                        </label>
                        <div className="inline-creator-row">
                          <label className="inline-creator-field">
                            <span>Tenggat Waktu</span>
                            <DateInput
                              value={inlineDate}
                              onValueChange={(value) => setInlineDate(value)}
                            />
                          </label>
                          <label className="inline-creator-field">
                            <span>Prioritas</span>
                            <Select
                              value={inlinePriority}
                              onChange={(val) => setInlinePriority(val)}
                              options={[
                                { value: 'rendah', label: 'Rendah' },
                                { value: 'normal', label: 'Normal' },
                                { value: 'tinggi', label: 'Tinggi' },
                                { value: 'mendesak', label: 'Mendesak' },
                              ]}
                              ariaLabel="Prioritas"
                            />
                          </label>
                        </div>
                      </div>
                      {inlineNotice && <p className="inline-creator-notice">{inlineNotice}</p>}
                      <div className="inline-creator-actions">
                        <Button type="button" onClick={() => setInlineCreator(null)}>
                          Batal
                        </Button>
                        <Button
                          type="button"
                          className="primary"
                          disabled={inlineBusy || !inlineTitle.trim()}
                          onClick={async () => {
                            setInlineBusy(true);
                            setInlineNotice('');
                            try {
                              const payload = schemas['work-items'].parse({
                                title: inlineTitle.trim(),
                                due_date: inlineDate,
                                priority: inlinePriority,
                                status: 'rencana',
                                workstream_id: projectId || '',
                              });
                              const res = await api<Item>('work-items', { data: payload });
                              setCreatedItems((prev) => ({
                                ...prev,
                                'work-items': [res, ...(prev['work-items'] || [])],
                              }));
                              setSelectedRefs((prev) => ({ ...prev, [field]: res.id }));
                              setInlineCreator(null);
                            } catch (err) {
                              setInlineNotice((err as Error).message);
                            } finally {
                              setInlineBusy(false);
                            }
                          }}
                        >
                          {inlineBusy ? 'Menyimpan…' : 'Simpan & Pilih Tugas'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {inlineCreator === 'workstreams' && reference === 'workstreams' && (
                    <div className="inline-quick-creator-card">
                      <div className="inline-creator-head">
                        <FolderKanban size={16} />
                        <strong>Buat & Tautkan Proyek Baru</strong>
                      </div>
                      <div className="inline-creator-grid">
                        <label className="inline-creator-field">
                          <span>Nama / Judul Proyek *</span>
                          <Input
                            type="text"
                            value={inlineTitle}
                            onChange={(e) => setInlineTitle(e.target.value)}
                            placeholder="Contoh: Digitalisasi Gerai & PPOB"
                            autoFocus
                          />
                        </label>
                        <div className="inline-creator-row">
                          <label className="inline-creator-field">
                            <span>Kode Singkat (Opsional)</span>
                            <Input
                              type="text"
                              value={inlineCode}
                              onChange={(e) => setInlineCode(e.target.value)}
                              placeholder="Contoh: PPOB"
                              maxLength={12}
                            />
                          </label>
                          <label className="inline-creator-field">
                            <span>Target Selesai</span>
                            <DateInput
                              value={inlineDate}
                              onValueChange={(value) => setInlineDate(value)}
                            />
                          </label>
                        </div>
                      </div>
                      {inlineNotice && <p className="inline-creator-notice">{inlineNotice}</p>}
                      <div className="inline-creator-actions">
                        <Button type="button" onClick={() => setInlineCreator(null)}>
                          Batal
                        </Button>
                        <Button
                          type="button"
                          className="primary"
                          disabled={inlineBusy || !inlineTitle.trim()}
                          onClick={async () => {
                            setInlineBusy(true);
                            setInlineNotice('');
                            try {
                              const payload = schemas.workstreams.parse({
                                title: inlineTitle.trim(),
                                target_date: inlineDate,
                                code: inlineCode.trim() || undefined,
                                status: 'aktif',
                                priority: 'normal',
                                notes: '',
                              });
                              const res = await api<Item>('workstreams', { data: payload });
                              setCreatedItems((prev) => ({
                                ...prev,
                                workstreams: [res, ...(prev.workstreams || [])],
                              }));
                              setSelectedRefs((prev) => ({ ...prev, [field]: res.id }));
                              setProjectId(res.id);
                              setInlineCreator(null);
                            } catch (err) {
                              setInlineNotice((err as Error).message);
                            } finally {
                              setInlineBusy(false);
                            }
                          }}
                        >
                          {inlineBusy ? 'Menyimpan…' : 'Simpan & Pilih Proyek'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {inlineCreator === 'stakeholders' && reference === 'stakeholders' && (
                    <div className="inline-quick-creator-card">
                      <div className="inline-creator-head">
                        <Users size={16} />
                        <strong>Tambah & Tautkan Kontak / Mitra Baru</strong>
                      </div>
                      <div className="inline-creator-grid">
                        <label className="inline-creator-field">
                          <span>Nama Orang atau Lembaga *</span>
                          <Input
                            type="text"
                            value={inlineTitle}
                            onChange={(e) => setInlineTitle(e.target.value)}
                            placeholder="Contoh: Bpk. Sugeng (Penyedia Rak) atau Babinsa"
                            autoFocus
                          />
                        </label>
                        <div className="inline-creator-row">
                          <label className="inline-creator-field">
                            <span>Kategori</span>
                            <Select
                              value={inlineCategory}
                              onChange={(val) => setInlineCategory(val)}
                              options={[
                                { value: 'Agrinas', label: 'Agrinas' },
                                { value: 'PIC lapangan / Babinsa', label: 'PIC lapangan / Babinsa' },
                                { value: 'Pengurus dan pengawas koperasi', label: 'Pengurus dan pengawas koperasi' },
                                { value: 'Pemerintah desa', label: 'Pemerintah desa' },
                                { value: 'Mitra', label: 'Mitra / Rekanan Usaha' },
                                { value: 'Warga / Petani', label: 'Warga / Petani' },
                              ]}
                              ariaLabel="Kategori pihak terkait"
                            />
                          </label>
                          <label className="inline-creator-field">
                            <span>Kontak (WA / Telepon)</span>
                            <Input
                              type="tel"
                              value={inlineContact}
                              onChange={(e) => setInlineContact(e.target.value)}
                              placeholder="0812-xxxx-xxxx"
                            />
                          </label>
                        </div>
                      </div>
                      {inlineNotice && <p className="inline-creator-notice">{inlineNotice}</p>}
                      <div className="inline-creator-actions">
                        <Button type="button" onClick={() => setInlineCreator(null)}>
                          Batal
                        </Button>
                        <Button
                          type="button"
                          className="primary"
                          disabled={inlineBusy || !inlineTitle.trim()}
                          onClick={async () => {
                            setInlineBusy(true);
                            setInlineNotice('');
                            try {
                              const payload = schemas.stakeholders.parse({
                                title: inlineTitle.trim(),
                                category: inlineCategory,
                                contact: inlineContact.trim(),
                                influence: 3,
                                interest: 3,
                                follow_up: '',
                              });
                              const res = await api<Item>('stakeholders', { data: payload });
                              setCreatedItems((prev) => ({
                                ...prev,
                                stakeholders: [res, ...(prev.stakeholders || [])],
                              }));
                              setSelectedRefs((prev) => ({ ...prev, [field]: res.id }));
                              setInlineCreator(null);
                            } catch (err) {
                              setInlineNotice((err as Error).message);
                            } finally {
                              setInlineBusy(false);
                            }
                          }}
                        >
                          {inlineBusy ? 'Menyimpan…' : 'Simpan & Pilih Mitra'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {inlineCreator === 'milestones' && reference === 'milestones' && (
                    <div className="inline-quick-creator-card">
                      <div className="inline-creator-head">
                        <Sparkles size={16} />
                        <strong>Tambah & Tautkan Milestone Proyek</strong>
                      </div>
                      <div className="inline-creator-grid">
                        <label className="inline-creator-field">
                          <span>Judul Milestone *</span>
                          <Input
                            type="text"
                            value={inlineTitle}
                            onChange={(e) => setInlineTitle(e.target.value)}
                            placeholder="Contoh: Pengadaan Rak & Perlengkapan Gerai Siap"
                            autoFocus
                          />
                        </label>
                        <label className="inline-creator-field">
                          <span>Tenggat Target Milestone</span>
                          <DateInput
                            value={inlineDate}
                            onValueChange={(value) => setInlineDate(value)}
                          />
                        </label>
                      </div>
                      {inlineNotice && <p className="inline-creator-notice">{inlineNotice}</p>}
                      <div className="inline-creator-actions">
                        <Button type="button" onClick={() => setInlineCreator(null)}>
                          Batal
                        </Button>
                        <Button
                          type="button"
                          className="primary"
                          disabled={inlineBusy || !inlineTitle.trim()}
                          onClick={async () => {
                            setInlineBusy(true);
                            setInlineNotice('');
                            try {
                              const payload = schemas.milestones.parse({
                                title: inlineTitle.trim(),
                                workstream_id: projectId,
                                due_date: inlineDate,
                                notes: '',
                              });
                              const res = await api<Item>('milestones', { data: payload });
                              setCreatedItems((prev) => ({
                                ...prev,
                                milestones: [res, ...(prev.milestones || [])],
                              }));
                              setSelectedRefs((prev) => ({ ...prev, [field]: res.id }));
                              setInlineCreator(null);
                            } catch (err) {
                              setInlineNotice((err as Error).message);
                            } finally {
                              setInlineBusy(false);
                            }
                          }}
                        >
                          {inlineBusy ? 'Menyimpan…' : 'Simpan & Pilih Milestone'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {field === 'meeting_id' && (
                    <small className="field-helper">
                      Pilih rapat untuk menampilkan tombol gabung rapat daring secara otomatis.
                    </small>
                  )}
                  {entity === 'work-items' && field === 'recurrence' && (
                    <small className="field-helper">
                      Tugas berikutnya dibuat setelah tugas ini ditandai selesai.
                    </small>
                  )}
                  {entity === 'work-items' && field === 'milestone_id' && !projectId && (
                    <small className="field-helper">
                      Pilih proyek lebih dulu untuk memilih milestone.
                    </small>
                  )}
                  {entity === 'work-items' && field === 'milestone_id' && projectId && (
                    <small className="field-helper">
                      Hanya milestone dari proyek ini yang ditampilkan.
                    </small>
                  )}
                  {entity === 'stock-counts' && field === 'item_id' && (
                    <small className="field-helper">
                      Pilih barang sebelum mencatat hasil hitung.
                    </small>
                  )}
                  {entity === 'journal' && field === 'work_item_id' && (
                    <small className="field-helper">
                      Pilih tugas yang ditindaklanjuti dari kegiatan ini (opsional).
                    </small>
                  )}
                  {entity === 'journal' && field === 'stakeholder_id' && (
                    <small className="field-helper">
                      Pilih mitra atau tokoh yang ditemui di lapangan (opsional).
                    </small>
                  )}
                  {entity === 'journal' && field === 'unit_id' && (
                    <small className="field-helper">
                      Pilih gerai atau unit koperasi terkait jika ada (opsional).
                    </small>
                  )}
                </div>
              );
            }
            if (
              [
                'description',
                'notes',
                'evidence',
                'minutes',
                'agenda',
                'mitigation',
                'subtasks',
              ].includes(field)
            )
              return (
                <Field className="wide field-item field-wide" key={field} id={`${headingId}-${field}`} label={label}>
                  <Textarea
                    id={`${headingId}-${field}`}
                    name={field}
                    rows={field === 'subtasks' ? 4 : 3}
                    className="field-textarea"
                    placeholder={
                      field === 'subtasks'
                        ? 'Tulis subtugas, misal:\nCek kelengkapan berkas\n[x] Survei lokasi gerai'
                        : entity === 'meetings' && field === 'agenda'
                          ? 'Tulis pokok bahasan atau agenda rapat yang akan dibahas…'
                          : entity === 'meetings' && field === 'minutes'
                            ? 'Tulis notulen, risalah hasil musyawarah, dan kesepakatan rapat…'
                            : `Tulis ${label.toLowerCase()}…`
                    }
                    defaultValue={
                      field === 'subtasks'
                        ? ((value || []) as { title: string; done: boolean }[])
                            .map((row) => (row.done ? '[x] ' : '') + row.title)
                            .join('\n')
                        : String(value || '')
                    }
                  />
                  {field === 'subtasks' && (
                    <small className="field-helper">
                      Satu subtugas per baris. Awali [x] jika sudah selesai.
                    </small>
                  )}
                </Field>
              );
            const score = ['probability', 'impact', 'interest', 'influence'].includes(field);
            const quantity = [
              'book_quantity',
              'minimum_quantity',
              'counted_quantity',
              'quantity',
              'transactions',
            ].includes(field);
            const money = ['amount', 'price', 'budget', 'value', 'total'].includes(field);
            // Nilai nol sah: aset hibah, gerai tutup, pembelian yang belum dihitung.
            const zeroAllowed = ['price', 'budget', 'value', 'total', 'transactions'].includes(field) || (entity === 'sales' && field === 'amount');
            const numeric = score || quantity || money || field === 'duration';
            const FieldInput = quantity || money ? IntegerInput : Input;
            return (
              <Field key={field} className="field-item" id={`${headingId}-${field}`} label={label}>
                <FieldInput
                  id={`${headingId}-${field}`}
                  key={
                    field === 'book_quantity'
                      ? stockItem
                      : stakeholderPreset
                        ? `${field}-${stakeholderPreset.label}`
                        : field
                  }
                  name={field}
                  className="field-input"
                  list={field === 'assignee' ? `${headingId}-team` : undefined}
                  aria-label={label}
                  placeholder={
                    entity === 'stakeholders' && field === 'title'
                      ? 'Contoh: Sertu Joko (Babinsa) atau Bpk. Mulyono (Kepala Desa)'
                      : entity === 'stakeholders' && field === 'contact'
                        ? 'Contoh: 0812-3456-7890 (WhatsApp / Telepon)'
                        : entity === 'meetings' && field === 'title'
                          ? 'Contoh: Rapat Evaluasi Bulanan & Koordinasi Gerai'
                          : entity === 'meetings' && field === 'location'
                            ? 'Contoh: Ruang rapat kantor koperasi'
                            : entity === 'meetings' && field === 'meeting_url'
                              ? 'https://meet.google.com/abc-defg-hij atau tautan Zoom'
                              : entity === 'meetings' && field === 'participants'
                                ? 'Contoh: Kepala Desa, Seluruh Pengurus, Babinsa'
                                : entity === 'work-items' && field === 'link'
                                  ? 'https://... (tautan Google Drive, dokumen hasil, portal pengumpulan)'
                                  : entity === 'deliveries' && field === 'driver_name'
                                    ? 'Contoh: Budi Santoso'
                                    : entity === 'deliveries' && field === 'license_plate'
                                      ? 'Contoh: AD 8123 KP'
                                      : entity === 'deliveries' && field === 'vehicle'
                                        ? 'Contoh: Truk boks / Pickup L300'
                                        : entity === 'journal' && field === 'title'
                                          ? 'Contoh: Koordinasi Pengadaan Pupuk Bersama Gapoktan'
                                    : undefined
                  }
                  type={
                    field.endsWith('_date') || field === 'date' || field === 'last_contact'
                      ? 'date'
                      : field.endsWith('_time') || field === 'time' || field === 'recurrence_time'
                        ? 'time'
                        : field === 'link' || field === 'meeting_url'
                          ? 'url'
                          : field === 'color'
                            ? 'color'
                            : numeric
                              ? 'number'
                              : 'text'
                  }
                  min={field === 'duration' ? 15 : field === 'quantity' ? 1 : quantity || zeroAllowed ? 0 : numeric ? 1 : undefined}
                  max={
                    field === 'duration'
                      ? 480
                      : score
                        ? 5
                        : money
                          ? 1_000_000_000_000
                          : quantity
                            ? 1_000_000_000
                            : undefined
                  }
                  step={numeric ? 1 : undefined}
                  maxLength={field === 'title' ? 200 : 5000}
                  disabled={
                    (entity === 'work-items' &&
                      field === 'recurrence_time' &&
                      recurrence === 'tidak') ||
                    (entity === 'stock-counts' &&
                      ['book_quantity', 'counted_quantity'].includes(field) &&
                      !stockItem)
                  }
                  readOnly={entity === 'stock-counts' && field === 'book_quantity'}
                  required={
                    [
                      'title',
                      'due_date',
                      'date',
                      'code',
                      'member_number',
                      'amount',
                      'sku',
                      'measurement',
                      'book_quantity',
                      'minimum_quantity',
                      'counted_quantity',
                      'quantity',
                    ].includes(field) ||
                    (entity === 'work-items' &&
                      field === 'recurrence_time' &&
                      recurrence !== 'tidak') ||
                    (entity === 'organization' && field === 'start_date')
                  }
                  defaultValue={String(
                    value ??
                      (score
                        ? 3
                        : field === 'duration'
                          ? 60
                          : field === 'recurrence_time'
                            ? '09:00'
                            : field === 'color'
                              ? schemas.workstreams.shape.color.parse(undefined)
                              : field === 'time'
                                ? '09:00'
                                : ''),
                  )}
                />
                {entity === 'stakeholders' && field === 'contact' && (
                  <small className="field-helper">
                    Nomor telepon atau WhatsApp untuk koordinasi cepat.
                  </small>
                )}
                {entity === 'stakeholders' && field === 'follow_up' && (
                  <small className="field-helper">
                    Rencana koordinasi berikutnya atau catatan penting.
                  </small>
                )}
                {entity === 'deliveries' && field === 'arrival_time' && (
                  <small className="field-helper">
                    Estimasi jam tiba armada di dok gudang (WIB).
                  </small>
                )}
                {entity === 'deliveries' && field === 'license_plate' && (
                  <small className="field-helper">
                    Nomor plat polisi kendaraan, misalnya AD 8123 KP.
                  </small>
                )}
                {entity === 'work-items' && field === 'document_id' && (
                  <small className="field-helper">
                    Pilih kontrak yang sudah dicatat di Dokumen. Kode tugas dibuat otomatis saat
                    disimpan.
                  </small>
                )}
                {entity === 'work-items' && field === 'recurrence_time' && (
                  <small className="field-helper">
                    Jam ini hanya catatan. Belum ada pengingat otomatis.
                  </small>
                )}
                {entity === 'work-items' && field === 'link' && (
                  <small className="field-helper">
                    Tautan Google Drive, spreadsheet, atau portal bukti hasil pengumpulan tugas.
                  </small>
                )}
                {field === 'code' && (
                  <small className="field-helper">Kode singkat proyek, misalnya OPS.</small>
                )}
                {entity === 'meetings' && field === 'location' && (
                  <small className="field-helper">
                    Nama ruangan, balai pertemuan, atau alamat gerai tempat berkumpul.
                  </small>
                )}
                {entity === 'meetings' && field === 'meeting_url' && (
                  <small className="field-helper">
                    Tempel tautan Google Meet atau Zoom agar peserta dapat bergabung langsung.
                  </small>
                )}
                {entity === 'meetings' && field === 'participants' && (
                  <small className="field-helper">
                    Pihak atau pejabat yang diundang mengikuti rapat ini.
                  </small>
                )}
                {!['meetings'].includes(entity) && field === 'meeting_url' && (
                  <small className="field-helper">
                    Tempel tautan Google Meet, Zoom, atau layanan rapat yang Anda gunakan.
                  </small>
                )}
                {entity === 'stock-counts' && field === 'book_quantity' && (
                  <small className="field-helper">
                    Diambil dari stok buku barang saat dipilih. Tidak mengubah stok pada daftar
                    barang.
                  </small>
                )}
              </Field>
            );

  };

  return (
    <dialog
      ref={dialog}
      className="editor"
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      aria-labelledby={headingId}
      onClick={(e) => {
        if (e.target === dialog.current) requestClose();
      }}
    >
      <form
        key={formVersion}
        ref={formRef}
        onChange={() => {
          setDirty(true);
          saveLocalDraft();
        }}
        onBlur={() => {
          if (dirty) saveLocalDraft();
        }}
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError('');
          try {
            const form = new FormData(event.currentTarget),
              values: Record<string, unknown> = { ...item?.data };
            for (const field of fields) {
              if (field === 'required') values[field] = form.get(field) === 'on';
              else if (field === 'subtasks')
                values[field] = String(form.get(field) || '')
                  .split('\n')
                  .filter(Boolean)
                  .map((line) => ({
                    title: line.replace(/^\[x\]\s*/i, ''),
                    done: /^\[x\]/i.test(line),
                  }));
              else if (field === 'dependencies') values[field] = form.getAll(field);
              else values[field] = form.get(field) ?? '';
            }
            if (entity === 'work-items')
              values.completed_at =
                values.status === 'selesai' ? item?.data.completed_at || today() : '';
            if (entity === 'work-items' && values.recurrence === 'tidak') {
              values.recurrence_time = '09:00';
              values.recurrence_end_date = '';
            }
            if (entity === 'meetings') {
              if (meetingMode === 'tatap muka') {
                values.meeting_url = '';
              } else if (meetingMode === 'online') {
                values.location = '';
              }
            }
            const judul = judulOtomatis(entity, values, workspace);
            if (judul) values.title = judul;
            const parsed = schemas[entity].parse(values);
            await api(entity, { id: item?.id || undefined, data: parsed });
            try {
              sessionStorage.removeItem(draftKey);
            } catch {
              /* Optional browser storage. */
            }
            setDirty(false);
            await onSaved();
            onClose();
          } catch (e) {
            setError(
              e instanceof ZodError
                ? e.issues
                    .map((issue) => `${labels[String(issue.path[0])] || 'Isian'}: ${issue.message}`)
                    .join(' · ')
                : (e as Error).message,
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="section-head editor-modal-head">
          <div className="editor-title-wrap">
            <span className="eyebrow editor-badge-eyebrow">
              <Ikon3D kind={IKON_HALAMAN['/' + (Object.keys(pages).find(slug => pages[slug].includes(entity)) ?? '')] ?? 'dokumen'} size={34}/>
              {catalog[entity].title}
            </span>
            <h2 id={headingId}>
              {item?.id
                ? String(item.data.title)
                : entity === 'work-items'
                  ? 'Tambah tugas'
                  : entity === 'workstreams'
                    ? 'Tambah proyek'
                    : entity === 'stakeholders'
                      ? 'Tambah mitra atau kontak'
                      : entity === 'meetings'
                        ? 'Jadwalkan rapat'
                        : `Tambah ${catalog[entity].title}`}
            </h2>
          </div>
          <Button
            type="button"
            className="editor-close-btn"
            aria-label="Tutup formulir"
            title="Tutup formulir (Esc)"
            onClick={requestClose}
          >
            <X size={20} strokeWidth={2.25} />
          </Button>
        </div>
        <div className="editor-form-scroll">
          {savedDraft && (
          <div className="draft-notice">
            <p>Draf belum disimpan ditemukan di tab ini.</p>
            <Button
              type="button"
              onClick={() => {
                setRestoredDraft(savedDraft);
                setMeetingMode(String(savedDraft.mode || 'tatap muka'));
                setStockItem(String(savedDraft.item_id || ''));
                setRecurrence(String(savedDraft.recurrence || 'tidak'));
                setProjectId(String(savedDraft.workstream_id || ''));
                setShowTaskDetails(true);
                setFormVersion((value) => value + 1);
                setSavedDraft(null);
                setDirty(true);
                setDraftNotice('Draf dibuka. Periksa isian sebelum menyimpan.');
              }}
            >
              Lanjutkan draf
            </Button>
            <Button
              type="button"
              onClick={() => {
                try {
                  sessionStorage.removeItem(draftKey);
                } catch {}
                setSavedDraft(null);
              }}
            >
              Abaikan draf
            </Button>
          </div>
        )}
        {draftNotice && (
          <p className="draft-status" role="status">
            {draftNotice}
          </p>
        )}
        {entity === 'stakeholders' && !item?.id && (
          <div className="stakeholder-preset-banner">
            <div className="preset-label">
              <Sparkles size={14} />
              <strong>Jenis kontak</strong>
            </div>
            <div className="preset-buttons">
              {STAKEHOLDER_PRESETS.map((p) => (
                <Button
                  key={p.label}
                  type="button"
                  className={`preset-chip ${stakeholderPreset?.label === p.label ? 'active' : ''}`}
                  onClick={() => setStakeholderPreset(p)}
                >
                  {p.label}
                </Button>
              ))}
            </div>
            <small className="preset-hint">
              Pilih jenis, lalu isi nama orang atau lembaga sesuai data Anda.
            </small>
          </div>
        )}
          {entity === 'work-items' && !quick && !showTaskDetails && (
            <div className="task-form-intro">
              <p>Isian utama terlebih dahulu. Tambahkan milestone, mitra, dokumen atau pengulangan bila diperlukan.</p>
              <Button
                type="button"
                className="btn-toggle-task-details"
                title="Opsi lanjutan, kendala dan subtugas"
                onClick={() => setShowTaskDetails(true)}
              >
                Detail lainnya
              </Button>
            </div>
          )}
        <EntryGuide entity={entity} />
        <datalist id={`${headingId}-team`}>{(workspace.staff || []).map(person => <option key={person.id} value={String(person.data.title)} />)}</datalist>
        {['work-items', 'staff', 'inventory-items', 'deliveries', 'meetings'].includes(entity) && <details className="editor-world-note"><summary><Ikon3D kind="pulau" size={28}/>Terhubung dengan dunia 3D</summary><p>{entity === 'inventory-items' ? 'Gerai dan rak menentukan lokasi barang di dunia 3D. Rak C1–C3 berada di cold storage.' : entity === 'staff' ? 'Seksi dan gerai menghubungkan figur dengan ruang kerjanya. Atur rupa pada bagian Tampilan di Dunia Koperasi.' : entity === 'deliveries' ? 'Status, pintu dok, dan kendaraan tampil di gudang 3D.' : entity === 'meetings' ? 'Nama peserta yang sesuai data Tim menempatkan figur di ruang rapat saat rapat berlangsung.' : 'Pilih penanggung jawab dari Tim agar tugas terhubung dengan figur di dunia 3D. Nama lain tetap dapat diketik.'}</p></details>}
        <div className="form-grid">
{primaryFields.map(renderField)}
          {optionalFields.length > 0 && <details className="entry-related-fields field-wide" open={optionalFields.some((field) => Boolean(defaults[field as keyof typeof defaults]))}><summary>Hubungan dan rincian opsional</summary><p className="field-helper">Isi hanya bila terkait. Tidak perlu membuat anggota, barang atau gerai untuk setiap transaksi.</p><div className="form-grid">{optionalFields.map(renderField)}</div></details>}
          {worldFields.length > 0 && (
            <details className="entry-related-fields field-wide">
              <summary>Tampilan di Dunia Koperasi</summary>
              <p className="field-helper">
                Opsional. Dipakai untuk karakter di Dunia Koperasi dan tidak memengaruhi data lain.
                Bila rupa belum diisi, karakter tampil sebagai sosok netral bertopi KDMP.
              </p>
              <div className="form-grid">{worldFields.map(renderField)}</div>
            </details>
          )}
          </div>
        </div>
        {error && (
          <p role="alert" className="notice error">
            {error}
          </p>
        )}
        <div className="form-actions editor-form-actions">
          <Button type="button" className="btn-editor-cancel" onClick={requestClose}>
            Batal
          </Button>
          <Button className="primary btn-editor-submit" disabled={busy}>
            {busy ? 'Menyimpan…' : 'Simpan'}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
