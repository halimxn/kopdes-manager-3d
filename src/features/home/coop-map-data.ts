import { PAGES, type PageId } from '@/components/layout/nav';
import { getFollowUps } from '@/features/notifications/follow-ups';
import { stockState } from '@/features/records/card-tone';
import type { Entity } from '@/features/records/schemas';
import { isProjectHistory } from '@/features/projects/lifecycle';
import type { Workspace } from '@/features/workspace/use-workspace';
import { addDays } from '@/lib/date';
import { cashSummary, shortRupiah } from '@/lib/ledger';
import { isActiveTask, isOverdue } from '@/lib/task-status';

/** Mendesak = sudah lewat atau harus hari ini ditangani; perlu = mendekat. */
export type MapLevel = 'urgent' | 'soon';
export type MapRecord = {
  key: string;
  entity: Entity;
  id: string;
  title: string;
  note: string;
  level: MapLevel;
  today: boolean;
  href: string;
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

  const definitions: Omit<CoopDomain, 'actions' | 'urgent' | 'soon' | 'icon'>[] = [
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
    },
    {
      id: 'kas',
      label: 'Kas',
      page: 'cash',
      world: 'kantor',
      active: caps.operations,
      note: 'Uang tercatat 7 hari terakhir, bukan saldo.',
      stats: [
        { label: 'Masuk 7 hari', value: shortRupiah(cash.incoming) },
        { label: 'Keluar 7 hari', value: shortRupiah(cash.outgoing) },
      ],
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
    },
  ];

  const followUps = getFollowUps(ws, date);
  return definitions.map((domain) => {
    const actions = followUps
      .filter((item) => DOMAIN_OF[item.id.split(':')[0] as Entity] === domain.id)
      .map((item): MapRecord => {
        const [entity, id] = item.id.split(':') as [Entity, string];
        const row = rows(entity).find((candidate) => candidate.id === id);
        return {
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
        };
      });
    return {
      ...domain,
      icon: PAGES[domain.page].icon,
      // Modul yang belum aktif tidak punya angka: ditampilkan apa adanya.
      stats: domain.active ? domain.stats : [],
      note: domain.active ? domain.note : 'Belum aktif. Database perlu diperbarui lebih dulu.',
      actions,
      urgent: actions.filter((item) => item.level === 'urgent').length,
      soon: actions.filter((item) => item.level === 'soon').length,
    };
  });
}
