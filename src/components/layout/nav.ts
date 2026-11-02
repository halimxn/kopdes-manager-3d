import type { Entity } from '@/features/records/schemas';

export type PageId =
  | 'home'
  | 'tasks'
  | 'projects'
  | 'agenda'
  | 'notes'
  | 'documents'
  | 'contacts'
  | 'store'
  | 'goods'
  | 'assets'
  | 'members'
  | 'cash'
  | 'team'
  | 'world'
  | 'settings'
  | 'help';

export type PageTab = { id: string; label: string; entity?: Entity };
export type PageInfo = { id: PageId; label: string; icon: string; tabs?: PageTab[] };

/** Satu sumber menu: sidebar, dok HP, menu lengkap, palet Ctrl K, dan judul halaman membaca daftar ini. */
export const PAGES: Record<PageId, PageInfo> = {
  home: { id: 'home', label: 'Beranda', icon: 'house' },
  tasks: { id: 'tasks', label: 'Tugas', icon: 'list-checks' },
  projects: {
    id: 'projects',
    label: 'Proyek',
    icon: 'folder-kanban',
    tabs: [
      { id: 'list', label: 'Proyek', entity: 'workstreams' },
      { id: 'risks', label: 'Risiko', entity: 'risks' },
      { id: 'issues', label: 'Kendala', entity: 'issues' },
    ],
  },
  agenda: {
    id: 'agenda',
    label: 'Agenda',
    icon: 'calendar-days',
    tabs: [
      { id: 'meetings', label: 'Agenda', entity: 'meetings' },
      { id: 'decisions', label: 'Keputusan', entity: 'decisions' },
    ],
  },
  notes: {
    id: 'notes',
    label: 'Catatan',
    icon: 'notebook-pen',
    tabs: [
      { id: 'journal', label: 'Kegiatan', entity: 'journal' },
      { id: 'reports', label: 'Laporan kerja' },
    ],
  },
  documents: {
    id: 'documents',
    label: 'Dokumen',
    icon: 'file-text',
    tabs: [{ id: 'documents', label: 'Dokumen', entity: 'documents' }],
  },
  contacts: {
    id: 'contacts',
    label: 'Kontak',
    icon: 'book-user',
    tabs: [
      { id: 'contacts', label: 'Kontak', entity: 'stakeholders' },
      { id: 'interactions', label: 'Riwayat interaksi', entity: 'interactions' },
    ],
  },
  store: {
    id: 'store',
    label: 'Gerai',
    icon: 'store',
    tabs: [
      { id: 'units', label: 'Gerai', entity: 'units' },
      { id: 'readiness', label: 'Kesiapan', entity: 'checklist' },
      { id: 'sales', label: 'Penjualan', entity: 'sales' },
    ],
  },
  goods: {
    id: 'goods',
    label: 'Barang',
    icon: 'package',
    tabs: [
      { id: 'items', label: 'Barang', entity: 'inventory-items' },
      { id: 'counts', label: 'Stok opname', entity: 'stock-counts' },
      { id: 'deliveries', label: 'Pengiriman', entity: 'deliveries' },
      { id: 'movements', label: 'Mutasi stok', entity: 'stock-movements' },
      { id: 'purchases', label: 'Pembelian', entity: 'purchase-orders' },
    ],
  },
  assets: {
    id: 'assets',
    label: 'Aset',
    icon: 'armchair',
    tabs: [{ id: 'assets', label: 'Aset', entity: 'assets' }],
  },
  members: {
    id: 'members',
    label: 'Anggota',
    icon: 'users',
    tabs: [
      { id: 'members', label: 'Anggota', entity: 'members' },
      { id: 'savings', label: 'Simpanan', entity: 'savings' },
    ],
  },
  cash: {
    id: 'cash',
    label: 'Kas',
    icon: 'wallet',
    tabs: [{ id: 'cash', label: 'Buku kas', entity: 'cash-entries' }],
  },
  team: {
    id: 'team',
    label: 'Tim',
    icon: 'briefcase',
    tabs: [
      { id: 'staff', label: 'Tim', entity: 'staff' },
      { id: 'attendance', label: 'Absensi', entity: 'attendance' },
      { id: 'trainings', label: 'Pelatihan', entity: 'trainings' },
    ],
  },
  world: { id: 'world', label: 'Dunia 3D', icon: 'box' },
  settings: { id: 'settings', label: 'Pengaturan', icon: 'settings' },
  help: { id: 'help', label: 'Bantuan', icon: 'circle-help' },
};

export const NAV_GROUPS: { label: string; pages: PageId[] }[] = [
  { label: 'Kerja', pages: ['home', 'tasks', 'projects', 'agenda'] },
  { label: 'Catatan', pages: ['notes', 'documents', 'contacts'] },
  { label: 'Usaha', pages: ['store', 'goods', 'assets'] },
  { label: 'Koperasi', pages: ['members', 'cash', 'team'] },
];
export const NAV_FOOTER: PageId[] = ['world', 'settings', 'help'];

/** Kelompok tempat sebuah halaman berada; Pengaturan dan Bantuan jatuh ke kelompok pertama. */
export const navGroupOf = (page?: PageId) =>
  NAV_GROUPS.find((group) => page && group.pages.includes(page)) ?? NAV_GROUPS[0];
export const DOCK: PageId[] = ['home', 'tasks', 'agenda'];

export const pageHref = (id: PageId, tab?: string) => `/${id}${tab ? `?tab=${tab}` : ''}`;

/** Halaman dan tab tempat sebuah jenis catatan ditampilkan; dipakai tautan dari dunia, notifikasi, dan pencarian. */
export function entityHome(entity: Entity): { page: PageId; tab?: string } {
  if (entity === 'work-items' || entity === 'sprints') return { page: 'tasks' };
  if (entity === 'workstreams' || entity === 'milestones') return { page: 'projects' };
  if (entity === 'organization') return { page: 'settings' };
  for (const page of Object.values(PAGES))
    for (const tab of page.tabs || [])
      if (tab.entity === entity) return { page: page.id, tab: tab.id };
  return { page: 'home' };
}

export function recordLink(entity: Entity, id: string) {
  if (entity === 'work-items') return `/tasks?task=${id}`;
  if (entity === 'workstreams') return `/projects/${id}`;
  const { page, tab } = entityHome(entity);
  return `/${page}?${tab ? `tab=${tab}&` : ''}record=${id}`;
}
