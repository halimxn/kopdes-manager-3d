import { PAGES, recordLink, type PageId } from '@/components/layout/nav';
import { getFollowUps } from '@/features/notifications/follow-ups';
import { stockState } from '@/features/records/card-tone';
import type { Entity, Item } from '@/features/records/schemas';
import { isProjectHistory } from '@/features/projects/lifecycle';
import type { Workspace } from '@/features/workspace/use-workspace';
import { addDays } from '@/lib/date';
import { cashSummary, shortRupiah } from '@/lib/ledger';
import { isActiveTask, isOverdue } from '@/lib/task-status';

/** Mendesak = sudah lewat atau harus hari ini ditangani; perlu = mendekat; tenang = catatan biasa. */
export type MapLevel = 'urgent' | 'soon' | 'calm';
export type MapRecord = {
  key: string;
  entity: Entity;
  id: string;
  title: string;
  note: string;
  level: MapLevel;
  today: boolean;
  href: string;
  x: number;
  y: number;
  z: number;
  phase: number;
};
export type CoopDomain = {
  id: string;
  label: string;
  page: PageId;
  icon: string;
  /** Lokasi Dunia 3D yang memuat bidang ini. */
  world: string;
  active: boolean;
  note?: string;
  stats: { label: string; value: string }[];
  /** Titik di peta: yang perlu ditangani lebih dulu, sisanya catatan biasa sampai batas. */
  records: MapRecord[];
  /** Semua yang perlu ditangani, mendesak di depan. */
  actions: MapRecord[];
  urgent: number;
  soon: number;
};
export type MapCapabilities = {
  operations: boolean;
  logistics?: boolean;
  administration?: boolean;
};

const MAX_RECORDS = 14;
const DOMAIN_OF: Partial<Record<Entity, string>> = {
  'work-items': 'kerja',
  meetings: 'agenda',
  units: 'gerai',
  'inventory-items': 'barang',
  'stock-counts': 'barang',
  deliveries: 'barang',
  attendance: 'tim',
  trainings: 'tim',
  documents: 'dokumen',
  issues: 'dokumen',
  risks: 'dokumen',
};

/** Tiga bilangan 0–1 yang tetap untuk satu id: tata letak tidak melompat tiap kali dibuka. */
function seeds(id: string) {
  let hash = 2166136261;
  for (const letter of id) hash = Math.imul(hash ^ letter.charCodeAt(0), 16777619) >>> 0;
  const next = () => {
    hash = Math.imul(hash ^ (hash >>> 15), 2246822507) >>> 0;
    hash = Math.imul(hash ^ (hash >>> 13), 3266489909) >>> 0;
    return ((hash ^ (hash >>> 16)) >>> 0) / 4294967296;
  };
  return [next(), next(), next()] as const;
}

function placed(base: Omit<MapRecord, 'x' | 'y' | 'z' | 'phase'>): MapRecord {
  const [a, b, c] = seeds(base.key);
  // Titik mengelilingi bulatan bidang, tidak menumpuk di bawah ikonnya.
  const angle = a * Math.PI * 2;
  const lift = b * 2 - 1;
  const flat = Math.sqrt(1 - lift * lift);
  const spread = 0.21 + c * 0.17;
  return {
    ...base,
    x: Math.cos(angle) * flat * spread,
    y: lift * spread,
    z: Math.sin(angle) * flat * spread,
    phase: a * Math.PI * 2,
  };
}

/**
 * Peta Beranda: seluruh koperasi dibagi ke bidang kerjanya, tiap bidang berisi angka nyata dan daftar
 * yang perlu ditangani. Aturan "perlu ditangani" hanya dari `getFollowUps`, sama dengan lonceng.
 * Modul yang belum dimigrasi ditandai tidak aktif, bukan diberi angka nol.
 */
export function buildCoopMap(
  ws: Workspace,
  date: string,
  caps: MapCapabilities,
  more: Partial<Record<Entity, unknown>> = {},
): CoopDomain[] {
  const rows = (entity: Entity) => ws[entity] || [];
  // Daftar yang masih punya halaman berikutnya ditandai "+", karena jumlahnya belum lengkap.
  const count = (entity: Entity, value = rows(entity).length) =>
    `${value}${more[entity] !== undefined ? '+' : ''}`;
  const week = addDays(date, -6);
  const cashWeek = rows('cash-entries').filter(
    (row) => String(row.data.date) >= week && String(row.data.date) <= date,
  );
  const cash = cashSummary(cashWeek);
  const salesWeek = rows('sales').filter(
    (row) => String(row.data.date) >= week && String(row.data.date) <= date,
  );
  const upcoming = rows('meetings').filter(
    (row) =>
      row.data.status !== 'dibatalkan' &&
      String(row.data.date) >= date &&
      String(row.data.date) <= addDays(date, 7),
  );
  const tasks = rows('work-items');
  const staff = rows('staff').filter((row) => row.data.status !== 'nonaktif');
  const attendanceToday = rows('attendance').filter((row) => row.data.date === date);
  const present = attendanceToday.filter((row) =>
    ['hadir', 'terlambat'].includes(String(row.data.status)),
  );
  const openRisks = rows('risks').filter((row) => row.data.status !== 'ditutup');
  const openIssues = rows('issues').filter((row) => row.data.status !== 'ditutup');

  const definitions: (Omit<CoopDomain, 'records' | 'actions' | 'urgent' | 'soon' | 'icon'> & {
    base: { entity: Entity; rows: Item[] }[];
  })[] = [
    {
      id: 'kerja',
      label: 'Tugas & proyek',
      page: 'tasks',
      world: 'kantor',
      active: true,
      stats: [
        {
          label: 'Tugas aktif',
          value: count('work-items', tasks.filter((t) => isActiveTask(t.data.status)).length),
        },
        {
          label: 'Terlambat',
          value: count('work-items', tasks.filter((t) => isOverdue(t.data, date)).length),
        },
        {
          label: 'Proyek berjalan',
          value: count(
            'workstreams',
            rows('workstreams').filter((p) => !isProjectHistory(p)).length,
          ),
        },
      ],
      base: [{ entity: 'work-items', rows: tasks.filter((t) => isActiveTask(t.data.status)) }],
    },
    {
      id: 'agenda',
      label: 'Agenda',
      page: 'agenda',
      world: 'kantor',
      active: true,
      stats: [
        { label: 'Hari ini', value: String(upcoming.filter((m) => m.data.date === date).length) },
        { label: '7 hari ke depan', value: String(upcoming.length) },
      ],
      base: [{ entity: 'meetings', rows: upcoming }],
    },
    {
      id: 'gerai',
      label: 'Gerai',
      page: 'store',
      world: 'gerai',
      active: true,
      note: caps.administration ? 'Omzet bukan laba.' : undefined,
      stats: [
        {
          label: 'Gerai aktif',
          value: `${rows('units').filter((u) => u.data.status === 'aktif').length} dari ${rows('units').length}`,
        },
        ...(caps.administration
          ? [
              {
                label: 'Omzet 7 hari',
                value: shortRupiah(
                  salesWeek.reduce((total, row) => total + Number(row.data.amount || 0), 0),
                ),
              },
            ]
          : []),
      ],
      base: [{ entity: 'units', rows: rows('units') }],
    },
    {
      id: 'barang',
      label: 'Barang & stok',
      page: 'goods',
      world: 'gudang',
      active: caps.operations,
      stats: [
        { label: 'Jenis barang', value: count('inventory-items') },
        {
          label: 'Menipis atau habis',
          value: count(
            'inventory-items',
            rows('inventory-items').filter((row) => stockState(row) !== 'aman').length,
          ),
        },
      ],
      base: [{ entity: 'inventory-items', rows: rows('inventory-items') }],
    },
    {
      id: 'kas',
      label: 'Kas',
      page: 'cash',
      world: 'kantor',
      active: caps.operations,
      note: 'Uang tercatat 7 hari terakhir, bukan saldo.',
      stats: [
        { label: 'Uang masuk', value: shortRupiah(cash.incoming) },
        { label: 'Uang keluar', value: shortRupiah(cash.outgoing) },
      ],
      base: [{ entity: 'cash-entries', rows: cashWeek }],
    },
    {
      id: 'anggota',
      label: 'Anggota',
      page: 'members',
      world: 'kantor',
      active: caps.operations,
      stats: [
        { label: 'Tercatat', value: count('members') },
        {
          label: 'Aktif',
          value: count(
            'members',
            rows('members').filter((row) => row.data.status !== 'nonaktif').length,
          ),
        },
      ],
      base: [{ entity: 'members', rows: rows('members') }],
    },
    {
      id: 'tim',
      label: 'Tim',
      page: 'team',
      world: 'kantor',
      active: true,
      stats: [
        { label: 'Tim aktif', value: count('staff', staff.length) },
        ...(caps.administration
          ? [
              {
                label: 'Hadir hari ini',
                value: attendanceToday.length
                  ? `${present.length} dari ${attendanceToday.length}`
                  : 'Belum ada jadwal',
              },
            ]
          : []),
      ],
      base: [{ entity: 'staff', rows: staff }],
    },
    {
      id: 'dokumen',
      label: 'Dokumen & risiko',
      page: 'documents',
      world: 'kantor',
      active: true,
      stats: [
        { label: 'Dokumen', value: count('documents') },
        { label: 'Risiko terbuka', value: count('risks', openRisks.length) },
        { label: 'Kendala terbuka', value: count('issues', openIssues.length) },
      ],
      base: [
        { entity: 'documents', rows: rows('documents') },
        { entity: 'risks', rows: openRisks },
        { entity: 'issues', rows: openIssues },
      ],
    },
  ];

  const followUps = getFollowUps(ws, date);
  return definitions.map(({ base, ...domain }) => {
    const actions = followUps
      .filter((item) => DOMAIN_OF[item.id.split(':')[0] as Entity] === domain.id)
      .map((item) => {
        const [entity, id] = item.id.split(':') as [Entity, string];
        const row = rows(entity).find((candidate) => candidate.id === id);
        return placed({
          key: item.id,
          entity,
          id,
          title: item.title,
          note: item.reason,
          level: item.urgent ? 'urgent' : 'soon',
          today:
            row?.data.due_date === date ||
            row?.data.date === date ||
            row?.data.planned_date === date,
          href: item.href,
        });
      });
    const known = new Set(actions.map((item) => item.key));
    const calm = base.flatMap(({ entity, rows: list }) =>
      list
        .filter((row) => !known.has(`${entity}:${row.id}`))
        .map((row) =>
          placed({
            key: `${entity}:${row.id}`,
            entity,
            id: row.id,
            title: String(row.data.title || PAGES[domain.page].label),
            note: domain.label,
            level: 'calm',
            today: row.data.due_date === date || row.data.date === date,
            href: recordLink(entity, row.id),
          }),
        ),
    );
    return {
      ...domain,
      icon: PAGES[domain.page].icon,
      // Modul yang belum aktif tidak punya angka: ditampilkan apa adanya.
      stats: domain.active ? domain.stats : [],
      note: domain.active ? domain.note : 'Belum aktif. Database perlu diperbarui lebih dulu.',
      actions,
      records: [...actions, ...calm].slice(0, MAX_RECORDS),
      urgent: actions.filter((item) => item.level === 'urgent').length,
      soon: actions.filter((item) => item.level === 'soon').length,
    };
  });
}
