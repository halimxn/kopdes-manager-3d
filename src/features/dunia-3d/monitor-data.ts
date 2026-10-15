// Turunan data kartu monitoring (murni, diuji). Hanya membaca catatan web; angka yang tidak
// tersedia ditandai oleh pemanggil, bukan diganti nol.
import { addDays, formatDate } from '@/lib/date';
import type { Entity, Item } from '../records/schemas';
import {
  activeDeliveries,
  deliverySteps,
  isBelowMinimum,
  meetingTimeline,
  truckWaitingNote,
  type TruckSpot,
  type WorldModel,
} from './model/world-model';
import { staffTasks } from './model/schedule';
import { cashSummary, rupiah } from '../operations/ledger';
import { ACTION_LABEL, type CharacterAction, type CharacterPlan } from './character-plan';
import type { Bidang } from './bidang';

export type Nada = 'biru' | 'hijau' | 'kuning' | 'merah' | 'abu';
export type Cuaca = 'cerah' | 'berawan' | 'hujan';
export type Suasana = { cuaca: Cuaca; fase: 'pagi' | 'siang' | 'senja' | 'malam' };
export function suasanaJam(now: Date, cuaca: Cuaca): Suasana {
  const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', hourCycle: 'h23' }).format(now));
  return { cuaca, fase: h < 5 || h >= 19 ? 'malam' : h < 10 ? 'pagi' : h < 16 ? 'siang' : 'senja' };
}
export type Baris = {
  key: string;
  entity: Entity;
  item: Item;
  note: string;
  pill: string;
  nada: Nada;
};
export type Statistik = { label: string; value: string; bar?: number };
export type Konteks = {
  model: WorldModel;
  date: string;
  now: Date;
  documents: Item[];
  plans: CharacterPlan[];
  operations?: boolean;
  logistics?: boolean;
  /** Catatan pendukung Ruang manajer dan Anggota & kas; kosong bila belum dimuat. */
  decisions?: Item[];
  risks?: Item[];
  members?: Item[];
  cash?: Item[];
};

export const DELIVERY_LABEL: Record<string, string> = {
  dipesan: 'Dipesan',
  dikirim: 'Dikirim',
  tiba: 'Tiba',
  diperiksa: 'Diperiksa',
  selesai: 'Selesai',
};
export const ACTION_NADA: Record<CharacterAction, Nada> = {
  rest: 'abu',
  plan: 'kuning',
  work: 'biru',
  meeting: 'hijau',
  gym: 'kuning',
  manage: 'biru',
  serve: 'hijau',
};

export const isLate = (task: Item, date: string) =>
  Boolean(task.data.due_date && String(task.data.due_date) < date);

const qty = (item: Item) =>
  `${String(item.data.book_quantity ?? '—')} ${String(item.data.measurement || '')}`.trim();

export function taskRow(task: Item, date: string): Baris {
  const late = isLate(task, date);
  return {
    key: `task-${task.id}`,
    entity: 'work-items',
    item: task,
    note: `${String(task.data.assignee || 'Belum ditugaskan')}${task.data.due_date ? ` · ${formatDate(String(task.data.due_date))}` : ''}`,
    pill: late ? 'Lewat tenggat' : task.data.status === 'proses' ? 'Dikerjakan' : 'Terbuka',
    nada: late ? 'merah' : task.data.status === 'proses' ? 'biru' : 'abu',
  };
}

export function itemRow(item: Item): Baris {
  const low = isBelowMinimum(item);
  return {
    key: `item-${item.id}`,
    entity: 'inventory-items',
    item,
    note: `Stok ${qty(item)} · minimum ${String(item.data.minimum_quantity ?? '—')}`,
    pill: low ? 'Stok rendah' : 'Tersedia',
    nada: low ? 'kuning' : 'hijau',
  };
}

export function deliveryRow(delivery: Item): Baris {
  const dock = String(delivery.data.dock || '');
  return {
    key: `delivery-${delivery.id}`,
    entity: 'deliveries',
    item: delivery,
    note: [
      delivery.data.direction === 'keluar' ? 'Keluar' : 'Masuk',
      dock && dock !== 'belum ditentukan' ? `Dok ${dock}` : 'Dok belum ditentukan',
      delivery.data.arrival_time ? `${String(delivery.data.arrival_time)} WIB` : '',
    ]
      .filter(Boolean)
      .join(' · '),
    pill: DELIVERY_LABEL[String(delivery.data.status)] || 'Tercatat',
    nada: ['tiba', 'diperiksa'].includes(String(delivery.data.status)) ? 'hijau' : 'biru',
  };
}

function documentRow(doc: Item, date: string): Baris {
  const until = doc.data.expires_date ? String(doc.data.expires_date) : '';
  const expired = !!until && until < date;
  const soon = !!until && !expired && until <= addDays(date, 30);
  return {
    key: `doc-${doc.id}`,
    entity: 'documents',
    item: doc,
    note: until ? `Berlaku sampai ${formatDate(until)}` : 'Tanpa tanggal kedaluwarsa',
    pill: expired ? 'Kedaluwarsa' : soon ? 'Segera habis' : until ? 'Berlaku' : 'Tanpa batas',
    nada: expired ? 'merah' : soon ? 'kuning' : until ? 'hijau' : 'abu',
  };
}

function stafRuang(id: Bidang, ctx: Konteks): Baris[] {
  return ctx.model.staff.flatMap((staff) => {
    const plan = ctx.plans.find((p) => p.id === staff.id);
    if (plan?.area !== id) return [];
    return {
      key: `staff-${staff.id}`,
      entity: 'staff' as Entity,
      item: staff,
      note: `${String(staff.data.role || staff.data.section || 'Peran belum diisi')} · ${staffTasks(ctx.model.tasks, String(staff.data.title)).length} tugas terbuka`,
      pill: ACTION_LABEL[plan.action],
      nada: ACTION_NADA[plan.action],
    };
  });
}

/** Tugas terbuka: terlambat lebih dulu, lalu tenggat terdekat; bisa disaring per anggota. */
export function taskRows(ctx: Konteks, filter: { lateOnly?: boolean; person?: string } = {}): Baris[] {
  const { model, date } = ctx;
  const tasks = filter.person ? staffTasks(model.tasks, filter.person) : model.tasks;
  return tasks
    .filter((row) => !filter.lateOnly || isLate(row, date))
    .sort(
      (a, b) =>
        Number(isLate(b, date)) - Number(isLate(a, date)) ||
        String(a.data.due_date || '9999').localeCompare(String(b.data.due_date || '9999')),
    )
    .map((task) => taskRow(task, date));
}

/** Catatan meja manajer: dokumen dan risiko belum ditutup (keputusan ada di ruang Rapat). */
function manajerRows(ctx: Konteks): Baris[] {
  return [
    ...[...ctx.documents]
      .sort((a, b) => String(a.data.expires_date || '9999').localeCompare(String(b.data.expires_date || '9999')))
      .map((doc) => documentRow(doc, ctx.date)),
    ...(ctx.risks || [])
      .filter((r) => r.data.status !== 'ditutup')
      .map((r): Baris => ({
        key: `risk-${r.id}`,
        entity: 'risks',
        item: r,
        note: `Risiko · ${String(r.data.assignee || 'Belum ada penanggung jawab')}`,
        pill: r.data.status === 'ditangani' ? 'Ditangani' : 'Terbuka',
        nada: r.data.status === 'ditangani' ? 'biru' : 'kuning',
      })),
  ];
}

/** Catatan kas terbaru dan anggota; hanya uang masuk/keluar tercatat (bukan saldo atau laba). */
export function kasRows(ctx: Konteks): Baris[] {
  if (ctx.operations === false) return [];
  return [
    ...[...(ctx.cash || [])]
      .sort((a, b) => String(b.data.date || '').localeCompare(String(a.data.date || '')))
      .slice(0, 8)
      .map((c): Baris => ({
        key: `cash-${c.id}`,
        entity: 'cash-entries',
        item: c,
        note: `${c.data.direction === 'masuk' ? 'Masuk' : 'Keluar'} ${rupiah(Number(c.data.amount) || 0)} · ${formatDate(String(c.data.date || ''))}`,
        pill: c.data.direction === 'masuk' ? 'Masuk' : 'Keluar',
        nada: c.data.direction === 'masuk' ? 'hijau' : 'kuning',
      })),
    ...[...(ctx.members || [])]
      .sort((a, b) => String(b.data.date || '').localeCompare(String(a.data.date || '')))
      .slice(0, 10)
      .map((m): Baris => ({
        key: `member-${m.id}`,
        entity: 'members',
        item: m,
        note: `Anggota · No. ${String(m.data.member_number || '—')}`,
        pill: m.data.status === 'nonaktif' ? 'Nonaktif' : 'Aktif',
        nada: m.data.status === 'nonaktif' ? 'abu' : 'hijau',
      })),
  ];
}

/** Daftar catatan per ruang; `person` dan `lateOnly` menyaring tugas di Ruang kerja. */
export function roomRows(
  id: Bidang,
  ctx: Konteks,
  filter: { lateOnly?: boolean; person?: string } = {},
): Baris[] {
  const { model, now } = ctx;
  if (id === 'kerja') return taskRows(ctx, filter);
  if (id === 'istirahat' || id === 'karyawan') return stafRuang(id, ctx);
  if (id === 'manajer') return manajerRows(ctx);
  if (id === 'rapat')
    return [
      ...meetingTimeline(model.meetings, now).map(
        (step): Baris => ({
          key: `meeting-${step.row.id}`,
          entity: 'meetings',
          item: step.row,
          note: `${step.time}–${step.end} WIB`,
          pill: { selesai: 'Selesai', berlangsung: 'Berlangsung', nanti: 'Mendatang' }[step.state],
          nada: ({ selesai: 'abu', berlangsung: 'hijau', nanti: 'biru' } as const)[step.state],
        }),
      ),
      ...[...(ctx.decisions || [])]
        .sort((a, b) => String(b.data.date || '').localeCompare(String(a.data.date || '')))
        .slice(0, 5)
        .map((d): Baris => ({
          key: `decision-${d.id}`,
          entity: 'decisions',
          item: d,
          note: d.data.date ? `Keputusan · ${formatDate(String(d.data.date))}` : 'Keputusan',
          pill: 'Keputusan',
          nada: 'abu',
        })),
    ];
  if (id === 'gym')
    return model.activities.map((row) => {
      const task = model.tasks.find((t) => t.id === row.data.work_item_id);
      return {
        key: `journal-${row.id}`,
        entity: 'journal',
        item: row,
        note: task ? `Tugas: ${String(task.data.title)}` : String(row.data.notes || 'Jurnal hari ini').slice(0, 80),
        pill: 'Hari ini',
        nada: 'kuning',
      };
    });
  if (id === 'stok')
    return [
      ...(ctx.operations === false ? [] : model.inventory.low.map(itemRow)),
      ...(ctx.logistics === false ? [] : activeDeliveries(model.deliveries).map(deliveryRow)),
    ];
  return kasRows(ctx);
}

const persen = (a: number, b: number) => (b ? a / b : 0);

/** Dua angka ringkas per ruang; `—` bila kemampuan server belum aktif. */
export function roomStats(id: Bidang, ctx: Konteks): Statistik[] {
  const { model, date } = ctx;
  if (id === 'kerja') {
    const busy = model.tasks.filter((t) => t.data.status === 'proses').length;
    return [
      { label: 'Dikerjakan', value: `${busy} / ${model.tasks.length}`, bar: persen(busy, model.tasks.length) },
      { label: 'Lewat tenggat', value: String(model.tasks.filter((t) => isLate(t, date)).length) },
    ];
  }
  if (id === 'istirahat')
    return [
      { label: 'Tanpa tugas/kegiatan', value: String(ctx.plans.filter((p) => p.action === 'rest').length) },
      { label: 'Tim tercatat', value: String(model.staff.length) },
    ];
  if (id === 'rapat') {
    const steps = meetingTimeline(model.meetings, ctx.now);
    const done = steps.filter((s) => s.state === 'selesai').length;
    return [
      { label: 'Rapat hari ini', value: String(steps.length) },
      { label: 'Selesai', value: `${done} / ${steps.length}`, bar: persen(done, steps.length) },
    ];
  }
  if (id === 'manajer') {
    const docs = ctx.documents.map((d) => documentRow(d, date));
    return [
      { label: 'Dokumen perlu diperbarui', value: String(docs.filter((r) => r.nada === 'merah' || r.nada === 'kuning').length) },
      { label: 'Risiko terbuka', value: String((ctx.risks || []).filter((r) => r.data.status === 'terbuka').length) },
    ];
  }
  if (id === 'gym')
    return [
      { label: 'Kegiatan hari ini', value: String(model.activities.length) },
      { label: 'Figur ikut', value: String(ctx.plans.filter((p) => p.action === 'gym').length) },
    ];
  if (id === 'karyawan')
    return [
      { label: 'Melayani gerai', value: String(ctx.plans.filter((p) => p.action === 'serve').length) },
      { label: 'Di ruang karyawan', value: String(ctx.plans.filter((p) => p.area === 'karyawan').length) },
    ];
  if (id === 'stok') {
    if (ctx.operations === false)
      return [
        { label: 'Barang tercatat', value: '—' },
        { label: 'Di bawah minimum', value: '—' },
      ];
    return [
      { label: 'Barang tercatat', value: String(model.inventory.items.length) },
      { label: 'Di bawah minimum', value: String(model.inventory.low.length) },
    ];
  }
  if (ctx.operations === false)
    return [
      { label: 'Anggota aktif', value: '—' },
      { label: 'Kas tercatat', value: '—' },
    ];
  const kas = cashSummary(ctx.cash || []);
  return [
    { label: 'Masuk tercatat', value: rupiah(kas.incoming) },
    { label: 'Keluar tercatat', value: rupiah(kas.outgoing) },
  ];
}

export function rackItems(model: WorldModel, rack: string): Item[] {
  const racks = model.inventory.racks as Record<string, Item[]>;
  const cold = model.inventory.coldRacks as Record<string, Item[]>;
  return racks[rack] || cold[rack] || [];
}

/** Dok D1–D4 beserta truk yang menempatinya dan truk yang menunggu dok itu. */
export function dockList(model: WorldModel) {
  return [0, 1, 2, 3].map((index) => {
    const id = `D${index + 1}`;
    const spot = model.trucks.find((t) => t.place === 'dok' && t.index === index);
    const waiting = model.trucks.filter(
      (t) => t.place === 'antre' && String(t.delivery.data.dock) === id,
    );
    return { id, spot, waiting };
  });
}

export function truckNote(spot: TruckSpot, model: WorldModel) {
  return spot.place === 'dok'
    ? `Di dok D${spot.index + 1}`
    : truckWaitingNote(spot.delivery, model.trucks);
}

/** Tahap 0–4 pada urutan dipesan → selesai; −1 bila status tidak dikenal. */
export function deliveryStage(delivery: Item) {
  return deliverySteps.indexOf(String(delivery.data.status) as (typeof deliverySteps)[number]);
}

/** Rincian pengiriman yang tercatat saja; kolom kosong tidak ditampilkan. */
export function deliveryInfo(delivery: Item): [string, string][] {
  const d = delivery.data;
  const dock = String(d.dock || '');
  return (
    [
      ['Arah', d.direction === 'keluar' ? 'Barang keluar' : 'Barang masuk'],
      ['Dok', dock && dock !== 'belum ditentukan' ? dock : 'Belum ditentukan'],
      ['Jadwal', d.planned_date ? formatDate(String(d.planned_date)) : ''],
      ['Tiba', d.arrival_time ? `${String(d.arrival_time)} WIB` : ''],
      ['Kendaraan', String(d.vehicle || '')],
      ['Plat', String(d.license_plate || '')],
      ['Sopir', String(d.driver_name || '')],
      ['Muatan', String(d.items || '')],
    ] as [string, string][]
  ).filter(([, v]) => v);
}

export type HasilCari = { key: string; entity: Entity; item: Item; kind: string };
/** Pencarian lintas catatan yang sudah dimuat; paling banyak delapan hasil. */
export function searchRecords(ctx: Konteks, query: string): HasilCari[] {
  const q = query.trim().toLocaleLowerCase('id');
  if (!q) return [];
  const { model } = ctx;
  const sources: [Entity, string, Item[]][] = [
    ['work-items', 'Tugas', model.tasks],
    ['meetings', 'Rapat', model.meetings],
    ['staff', 'Tim', model.staff],
    ['documents', 'Dokumen', ctx.documents],
    ['journal', 'Kegiatan', model.activities],
    ['members', 'Anggota', ctx.members || []],
    ...(ctx.operations === false ? [] : [['inventory-items', 'Barang', model.inventory.items] as [Entity, string, Item[]]]),
    ...(ctx.logistics === false ? [] : [['deliveries', 'Pengiriman', model.deliveries] as [Entity, string, Item[]]]),
  ];
  const hasil: HasilCari[] = [];
  for (const [entity, kind, rows] of sources)
    for (const item of rows)
      if (String(item.data.title || '').toLocaleLowerCase('id').includes(q))
        hasil.push({ key: `${entity}-${item.id}`, entity, item, kind });
  return hasil.slice(0, 8);
}
