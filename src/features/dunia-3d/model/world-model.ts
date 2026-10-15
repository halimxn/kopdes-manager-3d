import { z } from 'zod';
import { addDays, today } from '@/lib/date';
import type { Workspace } from '../../workspace/useWorkspace';
import { allBuildings, lots } from './district';
import type { Item } from '../../records/schemas';

export const worldPreferencesSchema = z.object({
  version: z.literal(1).default(1),
  weather: z.enum(['otomatis', 'cerah', 'berawan', 'hujan']).default('otomatis'),
  // Bawaan siang seperti video; waktu otomatis WIB tetap dapat dipilih di Suasana.
  time: z.enum(['otomatis', 'pagi', 'siang', 'senja', 'malam']).default('siang'),
  outfit: z.enum(['biru', 'lavender', 'hijau']).default('biru'),
  // Rupa avatar manajer (preferensi perangkat); belum diisi = sosok netral bertopi KDMP.
  look_head: z
    .enum(['belum diisi', 'tidak ada', 'hijab', 'peci', 'topi KDMP'])
    .default('belum diisi'),
  look_hair: z.enum(['belum diisi', 'pendek', 'panjang', 'ikal']).default('belum diisi'),
  look_skin: z.enum(['belum diisi', 'terang', 'sawo matang', 'gelap']).default('belum diisi'),
  look_glasses: z.enum(['tidak', 'ya']).default('tidak'),
  quality: z.enum(['otomatis', 'tinggi', 'sedang', 'hemat']).default('otomatis'),
});
/**
 * luar: distrik; dalam: interior kantor; balai: interior balai desa; gudang: interior gudang
 * logistik; pendingin: interior cold storage; gerai:<id bangunan>: interior gerai (sembako, …).
 */
export type WorldLocation = 'luar' | 'dalam' | 'balai' | 'gudang' | 'pendingin' | `gerai:${string}`;
export type CharacterActivity = 'idle' | 'work' | 'meeting' | 'gym';

export function getWorldModel(data: Workspace, now: Date, previousTrucks: TruckSpot[] = []) {
  const date = today(now);
  const units = [...(data.units || [])].sort(
    (a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id),
  );
  const tasks = (data['work-items'] || []).filter(
    (row) => !['selesai', 'dibatalkan'].includes(String(row.data.status)),
  );
  const meetings = (data.meetings || []).filter((row) => row.data.date === date);
  const currentMeeting = meetings.find((row) => {
    const start = Date.parse(`${date}T${row.data.time || '09:00'}:00+07:00`);
    return (
      now.getTime() >= start && now.getTime() < start + Number(row.data.duration || 60) * 60000
    );
  });
  const activities = (data.journal || []).filter((row) => row.data.date === date);
  // Pelatihan bertanggal hari ini juga sebuah kegiatan (dunia 3D: figur stafnya ke Gym).
  const trainings = (data.trainings || []).filter((row) => row.data.date === date);
  const activity: CharacterActivity = currentMeeting
    ? 'meeting'
    : activities.length || trainings.length
      ? 'gym'
      : tasks.some((row) => row.data.status === 'proses')
        ? 'work'
        : 'idle';
  return {
    units,
    tasks,
    meetings,
    activities,
    trainings,
    currentMeeting,
    activity,
    ...placeUnits(units),
    inventory: summarizeInventory(data['inventory-items'] || []),
    deliveries: data.deliveries || [],
    staff: data.staff || [],
    members: data.members || [],
    notices: noticeBoard(data.decisions || [], data.documents || [], date),
    trucks: placeTrucks(data.deliveries || [], 4, 3, previousTrucks),
    // Riwayat 7 hari (WIB) untuk mini grafik KPI; hanya dari tanggal yang tercatat.
    week: {
      meetings: weekCounts(data.meetings || [], (row) => String(row.data.date || ''), date),
      deliveries: weekCounts(
        data.deliveries || [],
        (row) => String(row.data.arrived_date || row.data.planned_date || ''),
        date,
      ),
      tasks: weekCounts(data['work-items'] || [], (row) => row.created_at.slice(0, 10), date),
    },
    title: String(data.organization?.[0]?.data.title || 'Koperasi'),
    manager: String(data.organization?.[0]?.data.manager || 'Manajer'),
  };
}
export type WorldModel = ReturnType<typeof getWorldModel>;

/**
 * Isi papan pengumuman: tiga keputusan terbaru dan dokumen yang kedaluwarsa atau akan
 * kedaluwarsa dalam 30 hari. Hanya dari catatan; tanpa catatan papan kosong.
 */
export function noticeBoard(decisions: Item[], documents: Item[], date: string) {
  const limit = addDays(date, 30);
  return {
    decisions: [...decisions]
      .sort((a, b) => String(b.data.date).localeCompare(String(a.data.date)))
      .slice(0, 3),
    documents: documents
      .filter((row) => row.data.expires_date && String(row.data.expires_date) <= limit)
      .sort((a, b) => String(a.data.expires_date).localeCompare(String(b.data.expires_date)))
      .slice(0, 3),
  };
}

export const deliverySteps = ['dipesan', 'dikirim', 'tiba', 'diperiksa', 'selesai'] as const;

/** Pengiriman aktif: yang sedang di dok dulu, lalu dalam perjalanan, lalu yang dipesan. */
export function activeDeliveries(deliveries: Item[]) {
  const order = ['diperiksa', 'tiba', 'dikirim', 'dipesan'];
  return deliveries
    .filter((row) => order.includes(String(row.data.status)))
    .sort((a, b) => order.indexOf(String(a.data.status)) - order.indexOf(String(b.data.status)));
}
export type TruckSpot = { delivery: Item; place: 'dok' | 'antre'; index: number };

/**
 * Truk hanya muncul dari pengiriman masuk berstatus dikirim (parkir antre) atau
 * tiba/diperiksa (di dok). Dok mengikuti catatan; penghuni tetap mendapat prioritas.
 * Kelebihan truk tidak digambar agar tidak menumpuk; daftar tetap menampilkannya.
 */
export function placeTrucks(deliveries: Item[], docks = 4, queue = 3, previous: TruckSpot[] = []): TruckSpot[] {
  const incoming = deliveries
    .filter((row) => row.data.direction !== 'keluar')
    .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
  const occupants = new Map(previous.filter((s) => s.place === 'dok').map((s) => [s.delivery.id, s.index]));
  const atDock = incoming.filter((row) => ['tiba', 'diperiksa'].includes(String(row.data.status)))
    .sort((a, b) => Number(occupants.get(b.id) === requestedDock(b)) - Number(occupants.get(a.id) === requestedDock(a)));
  const used = new Set<number>();
  const spots: TruckSpot[] = [];
  for (const delivery of atDock) {
    const index = requestedDock(delivery);
    if (index === null || index >= docks || used.has(index)) continue;
    used.add(index);
    spots.push({ delivery, place: 'dok', index });
  }
  incoming
    .filter((row) => ['dikirim', 'tiba', 'diperiksa'].includes(String(row.data.status)) && !spots.some((s) => s.delivery.id === row.id))
    .slice(0, queue)
    .forEach((delivery, index) => spots.push({ delivery, place: 'antre', index }));
  return spots;
}

export function requestedDock(delivery: Item): number | null {
  const match = /^D([1-4])$/.exec(String(delivery.data.dock || ''));
  return match ? Number(match[1]) - 1 : null;
}
export function truckWaitingNote(delivery: Item, spots: TruckSpot[]) {
  const dock = requestedDock(delivery);
  if (dock === null) return 'Dok belum ditentukan';
  if (spots.some((s) => s.place === 'dok' && s.index === dock && s.delivery.id !== delivery.id)) return `Dok D${dock + 1} penuh`;
  return delivery.data.status === 'dikirim' ? `Menunggu status tiba · D${dock + 1}` : `Menunggu masuk D${dock + 1}`;
}

export const rackIds = ['A', 'B', 'C', 'D', 'E', 'F'] as const;
export type RackId = (typeof rackIds)[number];
/** Rak pendingin di cold storage (kolom Rak barang C1–C3). */
export const coldRackIds = ['C1', 'C2', 'C3'] as const;
export type ColdRackId = (typeof coldRackIds)[number];

/** Stok buku di bawah batas minimum; batas 0 atau kosong berarti tidak dipantau. */
export function isBelowMinimum(item: Item) {
  const stock = Number(item.data.book_quantity);
  const minimum = Number(item.data.minimum_quantity);
  return Number.isFinite(stock) && Number.isFinite(minimum) && minimum > 0 && stock < minimum;
}

/**
 * Kelompokkan barang menurut rak gudang. Barang tanpa rak yang ditempatkan di gerai
 * dianggap berada di gerai; sisanya menunggu penempatan di area staging.
 */
export function summarizeInventory(items: Item[]) {
  const racks = Object.fromEntries(rackIds.map((id) => [id, [] as Item[]])) as Record<
    RackId,
    Item[]
  >;
  const coldRacks = Object.fromEntries(coldRackIds.map((id) => [id, [] as Item[]])) as Record<
    ColdRackId,
    Item[]
  >;
  const staging: Item[] = [];
  const atUnits: Item[] = [];
  for (const item of items) {
    const rack = String(item.data.rack || '');
    if (rackIds.includes(rack as RackId)) racks[rack as RackId].push(item);
    else if (coldRackIds.includes(rack as ColdRackId)) coldRacks[rack as ColdRackId].push(item);
    else if (item.data.unit_id) atUnits.push(item);
    else staging.push(item);
  }
  return { items, racks, coldRacks, staging, atUnits, low: items.filter(isBelowMinimum) };
}

export type MeetingStep = {
  row: Item;
  /** Jam mulai WIB "HH:MM"; rapat tanpa jam dianggap 09:00 seperti aturan rapat aktif. */
  time: string;
  end: string;
  state: 'selesai' | 'berlangsung' | 'nanti';
};
/** Rapat hari ini berurutan jam mulai beserta keadaannya terhadap waktu sekarang. */
export function meetingTimeline(meetings: Item[], now: Date): MeetingStep[] {
  const date = today(now);
  return meetings
    .map((row) => {
      const time = String(row.data.time || '09:00');
      const start = Date.parse(`${date}T${time}:00+07:00`);
      const finish = start + Number(row.data.duration || 60) * 60000;
      const end = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).format(finish);
      const state: MeetingStep['state'] =
        now.getTime() >= finish ? 'selesai' : now.getTime() >= start ? 'berlangsung' : 'nanti';
      return { row, time, end, state, start };
    })
    .sort((a, b) => a.start - b.start)
    .map(({ row, time, end, state }) => ({ row, time, end, state }));
}

/** Bangunan distrik yang bisa diisi Gerai: unit KDMP berjenis tetap, lalu kavling gerai tambahan. */
const unitBuildings = allBuildings().filter((b) => b.id !== 'kantor' && b.id !== 'gudang');
const extraBuildings = unitBuildings.filter((b) => !b.kinds.length);
const matchesKind = (unit: Item, kinds: string[]) => {
  const kind = String(unit.data.kind || '').toLowerCase();
  return kinds.some((word) => kind.includes(word));
};

/**
 * Gerai menempati bangunan sesuai Jenis (sembako, apotek, klinik, simpan pinjam, cold storage);
 * jenis lain mengisi kavling gerai tambahan menurut kolom Lahan (1–3) lalu urutan dibuat.
 * Gerai berjenis logistik menjadi catatan gudang. Bangunan tanpa gerai tampil sebagai rencana.
 * Gerai lebih banyak dari kavling tetap ada di daftar Gerai (overflow).
 */
export function placeUnits(units: Item[]) {
  const taken = new Map<string, Item>();
  const waiting: Item[] = [];
  let warehouseUnit: Item | undefined;
  for (const unit of units) {
    if (!warehouseUnit && matchesKind(unit, allBuildings().find((b) => b.id === 'gudang')!.kinds)) {
      warehouseUnit = unit;
      continue;
    }
    const fixed = unitBuildings.find(
      (b) => b.kinds.length && !taken.has(b.id) && matchesKind(unit, b.kinds),
    );
    if (fixed) taken.set(fixed.id, unit);
    else waiting.push(unit);
  }
  const rest: Item[] = [];
  for (const unit of waiting) {
    const chosen = extraBuildings[Number(unit.data.slot) - 1];
    if (chosen && !taken.has(chosen.id)) taken.set(chosen.id, unit);
    else rest.push(unit);
  }
  for (const building of extraBuildings)
    if (!taken.has(building.id) && rest.length) taken.set(building.id, rest.shift()!);
  return {
    plots: unitBuildings.map((building) => ({
      id: building.id,
      name: building.name,
      lotName: lots.find((lot) => lot.buildings.includes(building))!.name,
      building,
      unit: taken.get(building.id),
    })),
    warehouseUnit,
    overflow: rest.length,
  };
}

export type ZoneSummary = { note: string; value?: number; total?: number };

/**
 * Ringkasan per zona untuk pemilih zona (pola dropdown situs pada video): angka hanya dari
 * data — gerai tercatat per kavling, dok terisi dari pengiriman, tugas dan rapat hari ini.
 */
export function zoneSummaries(
  model: WorldModel,
): Record<'semua' | 'gudang' | 'kantor' | 'kesehatan' | 'gerai' | 'lahan', ZoneSummary> {
  const recorded = (ids: string[]) =>
    model.plots.filter((plot) => ids.includes(plot.id) && plot.unit).length;
  const atDock = model.trucks.filter((spot) => spot.place === 'dok').length;
  const queued = model.trucks.length - atDock;
  const working = model.tasks.filter((row) => row.data.status === 'proses').length;
  const niaga = model.plots.filter((plot) => plot.id === 'sembako' || plot.id.startsWith('gerai-'));
  return {
    semua: {
      note: `${model.plots.filter((plot) => plot.unit).length}/${model.plots.length} gerai tercatat · ${model.trucks.length} truk`,
      value: model.plots.filter((plot) => plot.unit).length,
      total: model.plots.length,
    },
    gudang: {
      note: `${atDock}/4 dok terisi · ${queued} antre · ${recorded(['cold-storage']) ? 'cold storage tercatat' : 'cold storage rencana'}`,
      value: atDock,
      total: 4,
    },
    kantor: {
      note: `${model.meetings.length} rapat hari ini · ${model.tasks.length} tugas terbuka`,
      value: working,
      total: model.tasks.length,
    },
    kesehatan: {
      note: `${recorded(['klinik', 'apotek'])}/2 unit tercatat`,
      value: recorded(['klinik', 'apotek']),
      total: 2,
    },
    gerai: {
      note: `${niaga.filter((plot) => plot.unit).length}/${niaga.length} gerai tercatat`,
      value: niaga.filter((plot) => plot.unit).length,
      total: niaga.length,
    },
    lahan: { note: 'Enam petak · data lahan belum dicatat' },
  };
}

/** Jumlah catatan per hari selama 7 hari terakhir sampai `date` (lama → baru). */
export function weekCounts(rows: Item[], dateOf: (row: Item) => string, date: string) {
  const days = [6, 5, 4, 3, 2, 1, 0].map((back) => addDays(date, -back));
  return days.map((day) => rows.filter((row) => dateOf(row) === day).length);
}
