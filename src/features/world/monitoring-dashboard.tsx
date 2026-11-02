'use client';
import { ChartList, siteCharts } from './site-charts';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Bell,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Home,
  Plus,
  PackageCheck,
  RefreshCw,
  Search,
  Settings,
  Snowflake,
  Store,
  Truck,
  Users,
  Warehouse,
  X,
  type LucideIcon,
} from 'lucide-react';
import { today, formatDate, jakartaTime } from '@/lib/date';
import { cn } from '@/lib/utils';
import { isOverdue } from '@/lib/task-status';
import { planProgress } from '@/lib/progress';
import { isProjectHistory } from '@/features/projects/lifecycle';
import {
  activeDeliveries,
  coldRackIds,
  deliverySteps,
  getWorldModel,
  isBelowMinimum,
  meetingTimeline,
  rackIds,
} from './model/world-model';
import type { Workspace } from '@/features/workspace/use-workspace';
import { recordHref } from '@/features/notifications/follow-ups';
import type { Entity, Item, Task } from '../records/schemas';
import { OFFICE_ROOMS, type OfficeRoom, type WorldSite } from './office-rooms';
import { ACTION_LABEL, MAX_FIGURES, isOffice, monitoringPlans, type Area } from './character-plan';
import { STORES, storeInfo, type StoreId } from './store';
import { storeView, storeIcon } from './store-cards';
import {
  ACTION_TONE,
  DELIVERY_LABEL,
  deliveryInfo,
  deliveryRow,
  deliveryStage,
  dockList,
  itemRow,
  rackItems,
  roomRows,
  roomStats,
  searchRecords,
  taskRow,
  truckNote,
  ambienceAt,
  type RecordRow,
  type Weather,
  type RoomContext,
  type Tone,
  type Ambience,
} from './monitor-data';
import {
  ACTIONS,
  BTN,
  BTN_PRIMARY,
  Bar,
  CARD,
  EMPTY,
  HEAD_NOTE,
  HEAD_TILE,
  ICON_BTN,
  IconTile,
  KpiCard,
  NOTE,
  POP,
  STAGE,
  STATUS,
  TRACKER_BODY,
  TRACKER_HEAD,
  TRACKER_TITLE,
  Links,
  SitePicker,
  PanelHead,
  Pager,
  Pill,
  Rows,
  Section,
  Stats,
  Stepper,
  TabsCard,
  usePopover,
  type RowView,
  type Stat,
  type Step,
  type Tab,
} from './monitor-cards';
import type { AttentionPin } from './monitoring-scene';
import { Icon3D, itemThumbKind, type Icon3DKind } from '@/features/world/icon-3d';
import { linkTarget } from './link-target';
import { Sheet } from '@/components/ui/sheet';
import { Highlight } from '@/components/ui/highlight';
import { Kbd } from '@/components/ui/kbd';
import { QuickActionsPanel } from '@/components/layout/quick-actions';

const ROOT =
  'group/root fixed inset-0 z-30 overflow-hidden [background:var(--ground)] font-sans text-[13px] leading-[1.4] text-ink antialiased [--mt-gap:20px] [--mt-top:64px] max-xl:[--mt-gap:14px] max-md:[--mt-gap:12px] max-md:[--mt-top:56px] [&_:focus-visible]:outline-[3px] [&_:focus-visible]:outline-offset-2 [&_:focus-visible]:outline-accent-strong [&_:is(small,em)]:not-italic [:where(&)_button]:cursor-pointer [:where(&)_button]:touch-manipulation';
const TOP_BAR =
  'group/top absolute top-0 right-0 left-0 z-5 flex h-(--mt-top) items-center gap-3.5 border-b border-line bg-[color-mix(in_srgb,var(--surface)_90%,transparent)] px-(--mt-gap) max-xl:gap-2.5 max-md:gap-1.5 max-md:pr-[max(10px,env(safe-area-inset-right))] max-md:pl-[max(10px,env(safe-area-inset-left))]';
/** Kotak cari; di ponsel tersembunyi sampai tombol cari dibuka, lalu menutupi bilah atas. */
const SEARCH =
  'relative ml-[18px] flex h-10 min-w-0 flex-[0_1_380px] items-center gap-2 rounded-xl border border-field-line bg-field pr-2 pl-3 text-ink-3 transition-[border-color,background-color,box-shadow] focus-within:border-accent-strong focus-within:bg-surface focus-within:text-accent-strong focus-within:ring-4 focus-within:ring-accent max-xl:ml-1.5 max-xl:basis-[260px] max-md:hidden max-md:group-data-[search]/top:absolute max-md:group-data-[search]/top:inset-[8px_10px] max-md:group-data-[search]/top:z-2 max-md:group-data-[search]/top:m-0 max-md:group-data-[search]/top:flex max-md:group-data-[search]/top:h-auto';
const POP_ITEM =
  'flex min-h-11 items-center gap-2.5 rounded-xl border-0 bg-transparent px-2 text-left font-semibold text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink [&_svg]:text-ink-3';
// Peringatan berupa <p> tidak berjarak dalam (direset seperti paragraf lain di dunia); kotak
// berisi tombol memakai ALERT_BOX.
const ALERT = cn(
  CARD,
  'flex max-w-[720px] flex-wrap items-center gap-2 border-[color:color-mix(in_srgb,var(--warn-ink)_25%,transparent)] bg-warn',
);
const ALERT_BOX = cn(ALERT, 'px-3 py-2.5 max-md:mx-3');
const SEGMENT =
  'min-h-[34px] rounded-xl border-0 bg-transparent px-3 text-[12px] font-semibold text-ink-3 transition-colors hover:text-ink aria-pressed:bg-accent aria-pressed:text-accent-ink';
const MINI =
  'flex min-w-0 flex-none items-center gap-3 rounded-2xl border border-line bg-surface-2 px-3 py-2.5 hover:border-line-strong hover:bg-surface';
const MINI_ART = 'grid size-14 shrink-0 place-items-center rounded-xl bg-surface max-xl:size-11';
const MINI_TEXT = 'flex min-w-0 flex-1 flex-col items-start gap-[3px]';
const MINI_STRONG = 'max-w-full truncate text-[13px]';
const MINI_SMALL = 'max-w-full truncate text-[11px] text-ink-3';

const Stage = dynamic(() => import('./monitoring-stage').then((m) => m.MonitoringStage), {
  ssr: false,
  loading: () => (
    <div className={cn(STAGE, 'flex flex-col items-center justify-center gap-3 p-6 text-ink-3')}>
      Menyiapkan kantor…
    </div>
  ),
});

const ROOM_3D: Record<OfficeRoom, Icon3DKind> = {
  kerja: 'meja',
  rapat: 'kalender',
  gym: 'dumbel',
  manajer: 'dokumen',
  karyawan: 'toko',
  stok: 'kotak',
  kas: 'dompet',
  istirahat: 'kopi',
};
const ENTITY_3D: Partial<Record<Entity, Icon3DKind>> = {
  'work-items': 'papan',
  meetings: 'kalender',
  documents: 'dokumen',
  'inventory-items': 'kotak',
  deliveries: 'truk',
  journal: 'dumbel',
  risks: 'perisai',
  issues: 'peringatan',
  decisions: 'cek',
  members: 'kartu',
  'cash-entries': 'dompet',
};
/** Tautan halaman operasional per ruang kantor. */
const ROOM_LINKS: Record<OfficeRoom, { href: string; label: string; isNew?: boolean }[]> = {
  kerja: [
    { href: '/tasks?new=1', label: 'Tugas baru', isNew: true },
    { href: '/tasks', label: 'Tugas' },
  ],
  rapat: [
    { href: '/agenda?new=1', label: 'Jadwalkan rapat', isNew: true },
    { href: '/agenda', label: 'Rapat' },
    { href: '/agenda?tab=decisions', label: 'Keputusan' },
  ],
  gym: [
    { href: '/notes?new=1', label: 'Catat kegiatan', isNew: true },
    { href: '/notes', label: 'Kegiatan' },
  ],
  manajer: [
    { href: '/projects?tab=risks&new=1', label: 'Catat risiko', isNew: true },
    { href: '/documents', label: 'Dokumen' },
    { href: '/projects?tab=risks', label: 'Risiko' },
  ],
  karyawan: [
    { href: '/team?new=1', label: 'Tambah staf', isNew: true },
    { href: '/store', label: 'Halaman Gerai' },
  ],
  stok: [
    { href: '/goods?new=1', label: 'Tambah barang', isNew: true },
    { href: '/goods?tab=counts&new=1', label: 'Catat opname', isNew: true },
    { href: '/goods', label: 'Barang' },
  ],
  kas: [
    { href: '/cash?new=1&direction=masuk', label: 'Kas masuk', isNew: true },
    { href: '/cash?new=1&direction=keluar', label: 'Kas keluar', isNew: true },
    { href: '/members?new=1', label: 'Anggota baru', isNew: true },
    { href: '/cash', label: 'Buku kas' },
  ],
  istirahat: [{ href: '/team', label: 'Tim' }],
};
/** Nama ruang figur: ruang kantor atau unit gerai. */
const areaName = (area: Area) =>
  isOffice(area) ? OFFICE_ROOMS[area].name : STORES[area.slice(6) as StoreId].name;
const SITES: Record<WorldSite, { label: string; code: string; icon: Icon3DKind }> = {
  kantor: { label: 'Kantor', code: 'KTR', icon: 'kantor' },
  gerai: { label: 'Gerai', code: 'GRI', icon: 'toko' },
  gudang: { label: 'Gudang', code: 'GDG', icon: 'gudang' },
  pendingin: { label: 'Cold storage', code: 'CS', icon: 'salju' },
  pulau: { label: 'Pulau koperasi', code: 'PLU', icon: 'pulau' },
};
const ENTITY_LABEL: Partial<Record<Entity, string>> = {
  'work-items': 'tugas',
  staff: 'tim',
  documents: 'dokumen',
  meetings: 'rapat',
  'inventory-items': 'barang',
  deliveries: 'pengiriman',
  journal: 'kegiatan',
};
// Jam di bilah dunia memakai titik ala penulisan Indonesia (19.30).
const clockTime = (now: Date) => jakartaTime(now).replace(':', '.');
const DEMO = process.env.NEXT_PUBLIC_MODE_DEMO === '1';

type Props = {
  data: Workspace;
  loading?: boolean;
  error?: string;
  preview?: boolean;
  refresh?: () => Promise<void>;
  operations?: boolean;
  logistics?: boolean;
  more?: Partial<Record<Entity, number>>;
  loadMore?: (entity: Entity) => Promise<void>;
  fetching?: Entity | null;
};

const view = (rows: RecordRow[]): RowView[] =>
  rows.map((r) => {
    const isGoods = r.entity === 'inventory-items';
    return {
      key: r.key,
      title: String(r.item.data.title),
      sub: isGoods
        ? `Minimum ${String(r.item.data.minimum_quantity ?? '—')} · Rak ${String(r.item.data.rack || '—')}`
        : r.note,
      value: isGoods ? String(r.item.data.book_quantity ?? '—') : undefined,
      unit: isGoods ? String(r.item.data.measurement || '') : undefined,
      pill: r.pill,
      tone: r.tone,
      href: recordHref(r.entity, r.item),
      icon: ENTITY_3D[r.entity],
      thumb: isGoods
        ? itemThumbKind(String(r.item.data.title), String(r.item.data.measurement || ''))
        : undefined,
      avatar:
        r.entity === 'staff' ? String(r.item.data.title).slice(0, 1).toUpperCase() : undefined,
    };
  });

/** "3 / 20" dari roomStats menjadi angka dan total terpisah untuk kotak statistik. */
const toStat = (s: { label: string; value: string; bar?: number }): Stat => {
  const [value, total] = s.value.split(' / ');
  const warn = /tenggat|minimum|Risiko|diperbarui|Keluar/.test(s.label);
  return { label: s.label, value, total, bar: s.bar, tone: warn ? 'kuning' : 'hijau' };
};

export function MonitoringDashboard({
  data,
  loading = false,
  error = '',
  preview = false,
  refresh,
  operations,
  logistics,
  more = {},
  loadMore,
  fetching,
}: Props) {
  const [site, setSite] = useState<WorldSite>('kantor');
  const [selected, setSelected] = useState('kerja');
  const [lateOnly, setLateOnly] = useState(false);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [trackIndex, setTrackIndex] = useState(0);
  const [panel, setPanel] = useState<'detail' | 'ringkasan' | 'daftar' | 'agenda' | null>(null);
  const dock = useRef<HTMLElement>(null);
  function closePanel() {
    setPanel(null);
    dock.current?.querySelector<HTMLButtonElement>('button[aria-expanded="true"]')?.focus();
  }
  const [busy, setBusy] = useState(false);
  const [refreshError, setRefreshError] = useState('');
  const [now, setNow] = useState(() => new Date());
  const [weather, setWeather] = useState<Weather>('cerah');
  const [phase, setPhase] = useState<Ambience['phase'] | 'otomatis'>('otomatis');
  const searchInput = useRef<HTMLInputElement>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const params = useSearchParams();
  const [appliedLink, setAppliedLink] = useState('');
  const {
    open: bellOpen,
    setOpen: setBellOpen,
    root: bellRoot,
    trigger: bellTrigger,
  } = usePopover();
  const {
    open: userOpen,
    setOpen: setUserOpen,
    root: userRoot,
    trigger: userTrigger,
  } = usePopover();
  const ambience = useMemo(
    () => ({ ...ambienceAt(now, weather), ...(phase === 'otomatis' ? {} : { phase }) }),
    [now, weather, phase],
  );
  useEffect(() => {
    const tick = () => {
      if (!document.hidden) setNow(new Date());
    };
    const timer = window.setInterval(tick, 60000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);
  // "/" memfokuskan pencarian seperti referensi, kecuali saat sedang mengetik.
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key !== '/' || t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))
        return;
      e.preventDefault();
      setSearchOpen(true);
      requestAnimationFrame(() => searchInput.current?.focus());
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, []);

  const unavailable = loading || !!error;
  const model = useMemo(
    () => getWorldModel(unavailable ? {} : data, now),
    [data, now, unavailable],
  );
  const plans = useMemo(() => monitoringPlans(model), [model]);
  const date = today(now);
  const documents = useMemo(() => (unavailable ? [] : data.documents || []), [data, unavailable]);
  const risks = useMemo(() => (unavailable ? [] : data.risks || []), [data, unavailable]);
  const stock = operations !== false && !unavailable;
  const shipping = logistics !== false && !unavailable;
  const input = useMemo(() => ({ model, stock, deliveries: shipping }), [model, stock, shipping]);
  const ctx: RoomContext = {
    model,
    date,
    now,
    documents,
    plans,
    operations,
    logistics,
    decisions: unavailable ? [] : data.decisions || [],
    risks,
    members: unavailable ? [] : data.members || [],
    cash: unavailable ? [] : data['cash-entries'] || [],
  };
  const deliveries = shipping ? activeDeliveries(model.deliveries) : [];
  // Domain web lain yang ikut tampil di dunia: sprint, milestone, mitra, pelatihan, mutasi stok.
  const activeSprints = (unavailable ? [] : data.sprints || []).filter(
    (sp) => sp.data.status === 'aktif',
  );
  const upcomingMilestones = (unavailable ? [] : data.milestones || [])
    .filter((m) => !m.data.actual_date && m.data.due_date)
    .sort((a, b) => String(a.data.due_date).localeCompare(String(b.data.due_date)))
    .slice(0, 3);
  const partners = (unavailable ? [] : data.stakeholders || [])
    .slice()
    .sort((a, b) =>
      String(b.data.last_contact || '').localeCompare(String(a.data.last_contact || '')),
    );
  const trainings = unavailable ? [] : model.trainings;
  const movements = (unavailable ? [] : data['stock-movements'] || [])
    .slice()
    .sort((a, b) => String(b.data.date).localeCompare(String(a.data.date)));
  const itemName = (id: unknown) =>
    String((data['inventory-items'] || []).find((b) => b.id === id)?.data.title || 'Barang');
  const stockHistoryRow = (row: Item, kind: 'mutasi' | 'opname'): RowView => {
    if (kind === 'opname') {
      const diff = Number(row.data.counted_quantity) - Number(row.data.book_quantity);
      return {
        key: row.id,
        title: `Opname ${itemName(row.data.item_id)}`,
        sub: `${formatDate(String(row.data.date))} · fisik ${String(row.data.counted_quantity)} dari buku ${String(row.data.book_quantity)}`,
        icon: 'cek',
        pill: diff ? `Selisih ${diff > 0 ? '+' : ''}${diff}` : 'Sesuai',
        tone: diff ? 'kuning' : 'hijau',
        href: recordHref('stock-counts', row),
      };
    }
    const incoming = ['masuk', 'koreksi tambah'].includes(String(row.data.kind));
    return {
      key: row.id,
      title: itemName(row.data.item_id),
      sub: `${formatDate(String(row.data.date))} · ${String(row.data.kind)}${row.data.book_after !== undefined ? ` · stok ${String(row.data.book_after)}` : ''}`,
      icon: 'kotak',
      pill: `${incoming ? '+' : '−'}${String(row.data.quantity)}`,
      tone: incoming ? 'hijau' : 'kuning',
      href: recordHref('stock-movements', row),
    };
  };
  // Progres proyek dihitung dari semua tugas proyek (termasuk yang selesai), sama seperti halaman Proyek.
  const projects = (unavailable ? [] : data.workstreams || [])
    .filter((row) => !isProjectHistory(row))
    .map((row) => {
      const projectTasks = (data['work-items'] || [])
        .filter((t) => t.data.workstream_id === row.id)
        .map((t) => ({ status: String(t.data.status) as Task['status'] }));
      return {
        row,
        total: projectTasks.filter((t) => t.status !== 'dibatalkan').length,
        done: projectTasks.filter((t) => t.status === 'selesai').length,
        pct: planProgress(projectTasks),
      };
    });
  const lateTasks = model.tasks.filter((t) => isOverdue(t.data, date));
  const openRisks = risks.filter((r) => r.data.status === 'terbuka');
  const openIssues = (unavailable ? [] : data.issues || []).filter(
    (r) => r.data.status === 'terbuka',
  );
  const stores = storeInfo(model);

  const defaultFor = useCallback(
    (loc: WorldSite) =>
      loc === 'pulau'
        ? ''
        : loc === 'kantor'
          ? 'kerja'
          : loc === 'gerai'
            ? 'g:sembako'
            : loc === 'pendingin'
              ? 'rak-C1'
              : model.trucks.find((t) => t.place === 'dok')
                ? `kirim-${model.trucks.find((t) => t.place === 'dok')!.delivery.id}`
                : 'rak-A',
    [model],
  );
  const go = useCallback(
    (loc: WorldSite) => {
      setSite(loc);
      setSelected(defaultFor(loc));
      setLateOnly(false);
    },
    [defaultFor],
  );
  const choose = useCallback(
    (key: string) => {
      if (key.startsWith('pintu-')) return go(key.slice(6) as WorldSite);
      if (key.startsWith('orang:')) {
        const p = plans.find((p) => `orang:${p.id}` === key);
        if (p) setSite(isOffice(p.area) ? 'kantor' : 'gerai');
      } else if (key in OFFICE_ROOMS) setSite('kantor');
      setSelected(key);
      setLateOnly(false);
      // Ponsel: pilihan baru membuka lembar detail setengah layar.
      setPanel('detail');
    },
    [go, plans],
  );

  async function reload() {
    if (!refresh) return;
    setBusy(true);
    setRefreshError('');
    try {
      await refresh();
      setNow(new Date());
    } catch {
      setRefreshError('Pembaruan gagal. Coba lagi.');
    } finally {
      setBusy(false);
    }
  }

  // Tautan dari halaman operasional (mis. ?barang=…) diterapkan sekali setelah data termuat.
  const linkKey = params?.toString() ?? '';
  if (linkKey && linkKey !== appliedLink && !unavailable && Object.keys(data).length) {
    setAppliedLink(linkKey);
    const t = linkTarget(new URLSearchParams(linkKey), model, plans, stores);
    if (t) {
      setSite(t.site);
      setSelected(t.pick || defaultFor(t.site));
      setPanel('detail');
    }
  }

  const dash = (n: number, active = true) => (unavailable || !active ? '—' : String(n));
  const naText = unavailable ? 'Data belum tersedia' : '';
  const person = selected.startsWith('orang:')
    ? plans.find((p) => `orang:${p.id}` === selected)
    : undefined;
  const room: OfficeRoom =
    person && isOffice(person.area)
      ? person.area
      : selected in OFFICE_ROOMS
        ? (selected as OfficeRoom)
        : 'kerja';
  const storeCards =
    site === 'gerai'
      ? storeView({
          model,
          plans,
          selected,
          unavailable,
          stock,
          choose,
          go,
          checklist: unavailable ? [] : data.checklist || [],
        })
      : null;

  // ---------- Ringkasan per lokasi (pemilih lokasi) ----------
  const inRacks = rackIds.flatMap((id) => model.inventory.racks[id]);
  const cold = coldRackIds.flatMap((id) => model.inventory.coldRacks[id]);
  const proses = model.tasks.filter((t) => t.data.status === 'proses').length;
  const openStores = stores.filter((g) => g.open && g.id !== 'kantor').length;
  const siteSubtitle: Record<WorldSite, string> = unavailable
    ? { kantor: naText, gerai: naText, gudang: naText, pendingin: naText, pulau: naText }
    : {
        kantor: `${Math.min(MAX_FIGURES, plans.filter((p) => isOffice(p.area)).length)} figur · ${proses} tugas proses`,
        gerai: `${openStores}/${stores.length - 1} gerai buka`,
        gudang: shipping
          ? `${model.trucks.length} truk · ${model.inventory.low.length} stok minimum`
          : 'Pengiriman belum aktif',
        pendingin: stock ? `${cold.length} barang dingin` : 'Pencatatan barang belum aktif',
        pulau: '4 lokasi terhubung',
      };

  // ---------- KPI (tiga kartu seperti referensi) ----------
  let kpis: Parameters<typeof KpiCard>[0][];
  if (storeCards) kpis = storeCards.kpis;
  else if (site === 'kantor' || site === 'pulau') {
    const next = meetingTimeline(model.meetings, now).find((s) => s.state === 'nanti');
    kpis = [
      {
        icon: 'papan',
        label: 'Tugas terbuka',
        value: dash(model.tasks.length),
        chip: unavailable ? undefined : { text: `${proses} proses`, tone: 'hijau' },
        foot: naText || 'tugas · kantor',
        onClick: () => choose('kerja'),
      },
      {
        icon: 'jam',
        label: 'Lewat tenggat',
        value: dash(lateTasks.length),
        chip: unavailable
          ? undefined
          : lateTasks.length
            ? { text: 'perlu tindak', tone: 'merah' }
            : { text: 'aman', tone: 'hijau' },
        foot: naText || `per ${formatDate(date)}`,
        onClick: () => {
          choose('kerja');
          setLateOnly(true);
        },
      },
      {
        icon: 'kalender',
        label: 'Rapat hari ini',
        value: dash(model.meetings.length),
        chip: unavailable
          ? undefined
          : model.currentMeeting
            ? { text: 'berlangsung', tone: 'hijau' }
            : next
              ? { text: `${next.time} WIB`, tone: 'biru' }
              : undefined,
        foot:
          naText ||
          (next || model.currentMeeting ? 'rapat · ruang rapat' : 'tidak ada lagi hari ini'),
        onClick: () => choose('rapat'),
      },
    ];
  } else if (site === 'gudang') {
    const docked = model.trucks.filter((t) => t.place === 'dok').length;
    const low = inRacks.filter(isBelowMinimum).length;
    kpis = [
      {
        icon: 'kotak',
        label: 'Barang di rak',
        value: dash(inRacks.length, stock),
        chip: stock && low ? { text: `${low} minimum`, tone: 'kuning' } : undefined,
        foot: naText || (stock ? 'jenis · rak A–F' : 'Pencatatan barang belum aktif'),
        onClick: () => choose('rak-A'),
      },
      {
        icon: 'truk',
        label: 'Truk di lokasi',
        value: dash(model.trucks.length, shipping),
        chip: shipping ? { text: `${docked} di dok`, tone: 'biru' } : undefined,
        foot:
          naText ||
          (shipping ? `${model.trucks.length - docked} antre · D1–D4` : 'Pengiriman belum aktif'),
        onClick: () => model.trucks[0] && choose(`kirim-${model.trucks[0].delivery.id}`),
      },
      {
        icon: 'jam',
        label: 'Pengiriman aktif',
        value: dash(deliveries.length, shipping),
        foot: naText || 'belum berstatus selesai',
      },
    ];
  } else {
    const low = cold.filter(isBelowMinimum).length;
    kpis = [
      {
        icon: 'salju',
        label: 'Barang dingin',
        value: dash(cold.length, stock),
        chip: stock && low ? { text: `${low} minimum`, tone: 'kuning' } : undefined,
        foot: naText || (stock ? 'jenis · rak C1–C3' : 'Pencatatan barang belum aktif'),
        onClick: () => choose('rak-C1'),
      },
      {
        icon: 'peringatan',
        label: 'Di bawah minimum',
        value: dash(low, stock),
        foot: naText || 'barang cold storage',
      },
      {
        icon: 'rak',
        label: 'Rak terisi',
        value:
          unavailable || !stock
            ? '—'
            : String(coldRackIds.filter((id) => model.inventory.coldRacks[id].length).length),
        chip: unavailable || !stock ? undefined : { text: 'dari 3', tone: 'biru' },
        foot: naText || 'rak berisi barang tercatat',
      },
    ];
  }

  // ---------- Pin perhatian (≤5); daftar dibuat ulang hanya bila isinya berubah ----------
  const pinList: AttentionPin[] = [];
  if (!unavailable) {
    if (site === 'kantor') {
      if (lateTasks.length)
        pinList.push({
          key: 'kerja',
          label: `Ruang kerja: ${lateTasks.length} tugas lewat tenggat`,
        });
      if (model.currentMeeting) pinList.push({ key: 'rapat', label: 'Rapat sedang berlangsung' });
      if (stock && model.inventory.low.length)
        pinList.push({
          key: 'stok',
          label: `${model.inventory.low.length} barang di bawah minimum`,
        });
      if (openRisks.length)
        pinList.push({ key: 'manajer', label: `${openRisks.length} risiko terbuka` });
    } else if (site === 'gudang') {
      if (stock)
        for (const id of rackIds)
          if (model.inventory.racks[id].some(isBelowMinimum))
            pinList.push({ key: `rak-${id}`, label: `Rak ${id}: stok di bawah minimum` });
      if (shipping)
        for (const t of model.trucks.filter((t) => t.place === 'dok'))
          pinList.push({
            key: `kirim-${t.delivery.id}`,
            label: `${String(t.delivery.data.license_plate || t.delivery.data.title)} di dok`,
          });
    } else if (site === 'pendingin') {
      if (stock)
        for (const id of coldRackIds)
          if (model.inventory.coldRacks[id].some(isBelowMinimum))
            pinList.push({ key: `rak-${id}`, label: `Rak ${id}: stok di bawah minimum` });
    } else if (site === 'gerai') {
      for (const g of stores)
        if (g.status === 'siap buka')
          pinList.push({ key: `g:${g.id}`, label: `${g.name} siap dibuka` });
    }
  }
  const pinKey = JSON.stringify(pinList.slice(0, 5));
  const pins = useMemo(() => JSON.parse(pinKey) as AttentionPin[], [pinKey]);

  // ---------- Panel detail ----------
  let panelBody: ReactNode;
  let tag = '';
  if (site === 'pulau') {
    panelBody = (
      <>
        <PanelHead
          icon="pulau"
          eyebrow="PETA · DUNIA KOPERASI"
          title={model.title}
          sub="Pilih bangunan untuk masuk ke ruangan"
        />
        <div className={STATUS}>
          <Pill tone="biru">Pulau melayang</Pill>
          <span>4 lokasi terhubung</span>
        </div>
        <Stats
          items={[
            {
              label: 'Gerai aktif',
              value: dash(openStores),
              total: unavailable ? undefined : String(stores.length - 1),
              bar: unavailable ? undefined : openStores / Math.max(1, stores.length - 1),
            },
            { label: 'Tim tercatat', value: dash(model.staff.length) },
            { label: 'Barang tercatat', value: dash(model.inventory.items.length, stock) },
            { label: 'Pengiriman aktif', value: dash(deliveries.length, shipping) },
          ]}
        />
        <Section title="Masuk ruangan" />
        <Rows
          rows={(['kantor', 'gerai', 'gudang', 'pendingin'] as const).map((id) => ({
            key: id,
            title: SITES[id].label,
            sub:
              id === 'kantor'
                ? 'Ruang kerja, rapat, kas & anggota'
                : id === 'gerai'
                  ? 'Unit usaha dan kesiapan gerai'
                  : id === 'gudang'
                    ? 'Rak barang, dok dan pengiriman'
                    : 'Barang dingin di rak C1–C3',
            icon: SITES[id].icon,
            pill: 'Masuk',
            tone: 'biru',
            onClick: () => go(id),
          }))}
          empty=""
        />
      </>
    );
  } else if (person && (site === 'kantor' || site === 'gerai')) {
    tag = `${person.name} · ${ACTION_LABEL[person.action]}`;
    const rows = roomRows('kerja', ctx, { person: person.name });
    panelBody = (
      <>
        <PanelHead
          icon="tim"
          eyebrow={`TIM · ${areaName(person.area).toUpperCase()}`}
          title={person.name}
          sub={person.reason}
          onClose={() =>
            setSelected(isOffice(person.area) ? person.area : person.area.replace('gerai:', 'g:'))
          }
        />
        <div className={STATUS}>
          <Pill tone={ACTION_TONE[person.action]}>{ACTION_LABEL[person.action]}</Pill>
          <span>Di {areaName(person.area)}</span>
        </div>
        {person.mascot && (
          <p className={NOTE}>
            Figur manajer dari nama di Pengaturan; belum tercatat sebagai anggota Tim.
          </p>
        )}
        <Stats
          items={[
            { label: 'Tugas terbuka', value: String(rows.length) },
            {
              label: 'Lewat tenggat',
              value: String(rows.filter((r) => r.tone === 'merah').length),
              tone: 'kuning',
            },
          ]}
        />
        <Section title="Tugas terbuka" meta="tenggat" />
        <Rows rows={view(rows)} empty="Tidak ada tugas terbuka untuk anggota ini." />
        <Links
          items={[
            { href: '/team', label: 'Tim' },
            { href: '/tasks', label: 'Tugas' },
          ]}
        />
      </>
    );
  } else if (storeCards) {
    tag = storeCards.tag;
    panelBody = storeCards.panelBody;
  } else if (site === 'kantor') {
    const zone = OFFICE_ROOMS[room];
    const here = plans.slice(0, MAX_FIGURES).filter((p) => p.area === room).length;
    tag = `${zone.name} · ${here} figur`;
    const rows = unavailable ? [] : roomRows(room, ctx, { lateOnly });
    const empty: Record<OfficeRoom, string> = {
      kerja: lateOnly ? 'Tidak ada tugas lewat tenggat.' : 'Tidak ada tugas terbuka.',
      istirahat: 'Semua anggota sedang punya tugas atau kegiatan.',
      rapat: 'Belum ada rapat hari ini atau keputusan tercatat.',
      manajer: 'Belum ada dokumen atau risiko tercatat.',
      gym: 'Belum ada kegiatan (jurnal) hari ini.',
      karyawan: 'Tidak ada karyawan gerai yang sedang di ruang ini.',
      stok:
        operations === false
          ? 'Pencatatan barang belum aktif di server.'
          : 'Tidak ada stok minimum atau pengiriman aktif.',
      kas:
        operations === false
          ? 'Pencatatan anggota dan kas belum aktif di server.'
          : 'Belum ada anggota atau catatan kas.',
    };
    panelBody = (
      <>
        <PanelHead
          icon={ROOM_3D[room]}
          eyebrow="RUANG · KANTOR"
          title={zone.name}
          sub={unavailable ? 'Data belum tersedia' : `${here} figur di ruangan`}
          href={zone.href}
        />
        <div className={STATUS}>
          <Pill tone={!unavailable && here ? 'hijau' : 'abu'}>
            {unavailable ? 'Belum tersedia' : here ? 'Ada aktivitas' : 'Sepi'}
          </Pill>
          <span>
            {rows.length ? `${rows.length} catatan terkait` : 'Belum ada catatan terkait'}
          </span>
        </div>
        {!unavailable && <Stats items={roomStats(room, ctx).map(toStat)} />}
        {room === 'kerja' && (
          <div
            className="mt-3 inline-flex gap-1 rounded-2xl bg-surface-2 p-1"
            role="group"
            aria-label="Saring tugas"
          >
            <button
              type="button"
              className={SEGMENT}
              aria-pressed={!lateOnly}
              onClick={() => setLateOnly(false)}
            >
              Semua terbuka
            </button>
            <button
              type="button"
              className={SEGMENT}
              aria-pressed={lateOnly}
              onClick={() => setLateOnly(true)}
            >
              Lewat tenggat
            </button>
          </div>
        )}
        {room === 'stok' && (
          <div className={ACTIONS}>
            <button type="button" className={BTN_PRIMARY} onClick={() => go('gudang')}>
              <Warehouse size={15} /> Masuk gudang
            </button>
            <button type="button" className={BTN} onClick={() => go('pendingin')}>
              <Snowflake size={15} /> Cold storage
            </button>
          </div>
        )}
        {room === 'karyawan' && (
          <>
            <div className={ACTIONS}>
              <button type="button" className={BTN_PRIMARY} onClick={() => go('gerai')}>
                <Store size={15} /> Naik ke gerai
              </button>
            </div>
            <Section title="Ringkasan gerai" meta="status" />
            <Rows
              rows={stores.map((g) => ({
                key: g.id,
                title: g.name,
                sub:
                  g.id === 'kantor'
                    ? 'Selalu buka'
                    : g.unit
                      ? `Status ${g.status}`
                      : 'Belum tercatat di web',
                pill: g.open ? 'Buka' : 'Terkunci',
                tone: g.open ? 'hijau' : 'abu',
                icon: storeIcon(g),
                onClick: () => {
                  setSite('gerai');
                  setSelected(`g:${g.id}`);
                },
              }))}
              empty="Data gerai belum tersedia."
            />
          </>
        )}
        {(room === 'kas' || room === 'stok') && operations === false && (
          <p className={cn(NOTE, 'bg-warn text-warn-ink')}>{empty[room]}</p>
        )}
        {!unavailable &&
          room === 'kerja' &&
          (activeSprints.length > 0 || upcomingMilestones.length > 0) && (
            <>
              <Section title="Sprint & milestone" meta="tenggat" />
              <Rows
                rows={[
                  ...activeSprints.map((sp) => {
                    const projectTasks = (data['work-items'] || []).filter(
                      (t) => t.data.sprint_id === sp.id,
                    );
                    const doneCount = projectTasks.filter(
                      (t) => t.data.status === 'selesai',
                    ).length;
                    return {
                      key: sp.id,
                      title: String(sp.data.title),
                      sub: `${String(sp.data.goal || 'Sprint aktif')}${sp.data.end_date ? ` · sampai ${formatDate(String(sp.data.end_date))}` : ''}`,
                      icon: 'bendera' as const,
                      bar: projectTasks.length ? doneCount / projectTasks.length : 0,
                      barText: `${doneCount}/${projectTasks.length}`,
                      tone: 'biru' as const,
                      href: '/tasks',
                    };
                  }),
                  ...upcomingMilestones.map((m) => {
                    const daysLeft = Math.round(
                      (Date.parse(String(m.data.due_date)) - Date.parse(date)) / 86400000,
                    );
                    return {
                      key: m.id,
                      title: String(m.data.title),
                      sub: `Tenggat ${formatDate(String(m.data.due_date))}`,
                      icon: 'bendera' as const,
                      pill:
                        daysLeft < 0
                          ? 'Lewat'
                          : daysLeft === 0
                            ? 'Hari ini'
                            : `${daysLeft} hari lagi`,
                      tone: (daysLeft < 0 ? 'merah' : daysLeft <= 3 ? 'kuning' : 'biru') as Tone,
                      href: recordHref('milestones', m),
                    };
                  }),
                ]}
                empty=""
              />
            </>
          )}
        {!unavailable && room === 'manajer' && partners.length > 0 && (
          <>
            <Section title="Mitra" meta="kontak terakhir" />
            <Rows
              rows={partners.slice(0, 5).map((m) => {
                const lastInteraction = (data.interactions || [])
                  .filter((i) => i.data.stakeholder_id === m.id)
                  .sort((a, b) => String(b.data.date).localeCompare(String(a.data.date)))[0];
                return {
                  key: m.id,
                  title: String(m.data.title),
                  sub: lastInteraction
                    ? `${String(lastInteraction.data.title)} · ${formatDate(String(lastInteraction.data.date))}`
                    : String(m.data.category || 'Belum ada interaksi'),
                  icon: 'jabat' as const,
                  pill: m.data.follow_up ? 'Tindak lanjut' : undefined,
                  tone: 'kuning' as const,
                  href: recordHref('stakeholders', m),
                };
              })}
              empty=""
            />
          </>
        )}
        {!unavailable && room === 'gym' && trainings.length > 0 && (
          <>
            <Section title="Pelatihan hari ini" meta="peserta" />
            <Rows
              rows={trainings.map((t) => ({
                key: t.id,
                title: String(t.data.title),
                sub: String(
                  (data.staff || []).find((st) => st.id === t.data.staff_id)?.data.title ||
                    'Peserta belum diisi',
                ),
                icon: 'dumbel' as const,
                pill: t.data.status === 'selesai' ? 'Selesai' : 'Berlangsung',
                tone: (t.data.status === 'selesai' ? 'hijau' : 'biru') as Tone,
                href: recordHref('trainings', t),
              }))}
              empty=""
            />
          </>
        )}
        <Section
          title={
            room === 'kerja'
              ? 'Tugas terbuka'
              : room === 'istirahat' || room === 'karyawan'
                ? 'Anggota tim'
                : 'Catatan'
          }
          meta={room === 'stok' ? 'stok' : undefined}
        />
        {unavailable ? (
          <p className={EMPTY}>Data belum tersedia.</p>
        ) : (
          <Rows rows={view(rows)} empty={empty[room]} />
        )}
        <Links items={ROOM_LINKS[room]} />
      </>
    );
  } else {
    const isCold = site === 'pendingin';
    const where = isCold ? 'COLD STORAGE' : 'GUDANG';
    const dock = selected.startsWith('dok-')
      ? dockList(model).find((d) => `dok-${d.id}` === selected)
      : undefined;
    const deliveryId = selected.startsWith('kirim-') ? selected.slice(6) : dock?.spot?.delivery.id;
    const delivery = deliveryId ? model.deliveries.find((d) => d.id === deliveryId) : undefined;
    if (delivery && !isCold) {
      const stage = deliveryStage(delivery);
      const spot = model.trucks.find((t) => t.delivery.id === delivery.id);
      tag = `${String(delivery.data.license_plate || delivery.data.title)} · ${DELIVERY_LABEL[String(delivery.data.status)] || ''}`;
      panelBody = (
        <>
          <PanelHead
            icon="truk"
            eyebrow={`PENGIRIMAN · ${delivery.data.direction === 'keluar' ? 'KELUAR' : 'MASUK'}`}
            title={String(delivery.data.title)}
            sub={[delivery.data.vehicle, delivery.data.license_plate]
              .filter(Boolean)
              .map(String)
              .join(' · ')}
            href={recordHref('deliveries', delivery)}
          />
          <div className={STATUS}>
            <Pill tone="biru">{DELIVERY_LABEL[String(delivery.data.status)] || 'Tercatat'}</Pill>
            <span>{spot ? truckNote(spot, model) : 'Belum di lokasi'}</span>
          </div>
          {stage >= 0 && (
            <div className="mt-3 flex items-center gap-2.5">
              <Bar
                className="flex-1"
                tone="biru"
                width={`${(stage / (deliverySteps.length - 1)) * 100}%`}
              />
              <small className="text-[11px] whitespace-nowrap text-ink-3">
                Tahap {stage + 1} dari {deliverySteps.length}
              </small>
            </div>
          )}
          <dl>
            {deliveryInfo(delivery).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 border-b border-line py-[9px]">
                <dt className="text-ink-3">{k}</dt>
                <dd className="text-right font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
          <Links
            items={[
              { href: '/goods?tab=deliveries&new=1', label: 'Pengiriman baru', isNew: true },
              { href: '/goods?tab=deliveries', label: 'Pengiriman' },
            ]}
          />
        </>
      );
    } else if (dock && !isCold) {
      tag = `Dok ${dock.id} · Tersedia`;
      panelBody = (
        <>
          <PanelHead
            icon="gudang"
            eyebrow="DOK · GUDANG"
            title={`Dok ${dock.id}`}
            sub="Tidak ada truk tercatat di dok ini"
            href="/goods?tab=deliveries"
          />
          <div className={STATUS}>
            <Pill tone="hijau">Tersedia</Pill>
            <span>{dock.waiting.length} truk menunggu dok ini</span>
          </div>
          <Rows
            rows={dock.waiting.map((s) => ({
              ...view([deliveryRow(s.delivery)])[0],
              sub: truckNote(s, model),
            }))}
            empty="Tidak ada truk antre untuk dok ini."
          />
        </>
      );
    } else {
      const rack = selected.startsWith('rak-') ? selected.slice(4) : isCold ? 'C1' : 'A';
      const items = rackItems(model, rack);
      const low = items.filter(isBelowMinimum).length;
      tag = `Rak ${rack} · ${items.length} jenis`;
      panelBody = (
        <>
          <PanelHead
            icon={isCold ? 'salju' : 'rak'}
            eyebrow={`RAK · ${where}`}
            title={`Rak ${rack}`}
            sub={stock ? `${items.length} jenis barang` : naText || 'Pencatatan barang belum aktif'}
            href="/goods"
          />
          {stock ? (
            <>
              <div className={STATUS}>
                <Pill tone={!items.length ? 'abu' : low ? 'kuning' : 'hijau'}>
                  {!items.length ? 'Kosong' : low ? `${low} di bawah minimum` : 'Stok aman'}
                </Pill>
                <span>{isCold ? 'Rak pendingin' : 'Rak gudang'}</span>
              </div>
              <Stats
                items={[
                  { label: 'Jenis barang', value: String(items.length) },
                  {
                    label: 'Stok aman',
                    value: String(items.length - low),
                    total: String(items.length),
                    bar: items.length ? (items.length - low) / items.length : 0,
                    tone: low ? 'kuning' : 'hijau',
                  },
                ]}
              />
              <Section title="Isi rak" meta="satuan" />
              <Rows rows={view(items.map(itemRow))} empty="Belum ada barang tercatat di rak ini." />
              {(() => {
                const ids = new Set(items.map((i) => i.id));
                const history = [
                  ...(data['stock-movements'] || [])
                    .filter((m) => ids.has(String(m.data.item_id)))
                    .map((m) => ({ row: m, kind: 'mutasi' as const })),
                  ...(data['stock-counts'] || [])
                    .filter((c) => ids.has(String(c.data.item_id)))
                    .map((c) => ({ row: c, kind: 'opname' as const })),
                ]
                  .sort((a, b) => String(b.row.data.date).localeCompare(String(a.row.data.date)))
                  .slice(0, 5);
                if (!history.length) return null;
                return (
                  <>
                    <Section title="Riwayat stok" meta="mutasi & opname" />
                    <Rows
                      rows={history.map(({ row, kind }) => stockHistoryRow(row, kind))}
                      empty=""
                    />
                  </>
                );
              })()}
            </>
          ) : (
            <p className={EMPTY}>
              {unavailable ? 'Data belum tersedia.' : 'Pencatatan barang belum aktif di server.'}
            </p>
          )}
          <Links
            items={[
              { href: '/goods', label: 'Barang' },
              { href: '/goods?tab=counts', label: 'Stok opname' },
            ]}
          />
        </>
      );
    }
  }

  // ---------- Pelacak (kiri bawah) ----------
  let tracker: ReactNode;
  const trackerLabel =
    site === 'gerai' ? 'Kesiapan' : site === 'kantor' || site === 'pulau' ? 'Agenda' : 'Pengiriman';
  if (storeCards) tracker = storeCards.tracker;
  else if (site === 'kantor' || site === 'pulau') {
    const timeline = meetingTimeline(model.meetings, now);
    const start = Math.max(0, timeline.findIndex((s) => s.state !== 'selesai') - 2);
    const shown = (
      timeline.some((s) => s.state !== 'selesai') ? timeline.slice(start) : timeline.slice(-5)
    ).slice(0, 5);
    const focus =
      timeline.find((s) => s.state === 'berlangsung') || timeline.find((s) => s.state === 'nanti');
    const steps: Step[] = shown.map((s) => ({
      key: s.row.id,
      label: String(s.row.data.title),
      sub: `${s.time} WIB`,
      state: s.state === 'selesai' ? 'done' : s.state === 'berlangsung' ? 'now' : 'next',
      icon: Users,
    }));
    tracker = (
      <section aria-label="Agenda rapat hari ini">
        <header className={TRACKER_HEAD}>
          <IconTile icon="kalender" size={24} className={HEAD_TILE} />
          <h2 className={TRACKER_TITLE}>Agenda rapat</h2>
          <small className={HEAD_NOTE}>{formatDate(date)} · Ruang rapat</small>
        </header>
        {unavailable ? (
          <p className={EMPTY}>Data belum tersedia.</p>
        ) : !steps.length ? (
          <p className={EMPTY}>Belum ada rapat hari ini.</p>
        ) : (
          <div className={TRACKER_BODY}>
            <Stepper steps={steps} label="Urutan rapat" />
            {focus && (
              <Link className={MINI} href={recordHref('meetings', focus.row)}>
                <span className={MINI_ART} aria-hidden="true">
                  <Icon3D kind="kalender" size={44} />
                </span>
                <span className={MINI_TEXT}>
                  <strong className={MINI_STRONG}>{String(focus.row.data.title)}</strong>
                  <small className={MINI_SMALL}>
                    {String(focus.row.data.location || focus.row.data.mode || 'Ruang rapat')}
                  </small>
                  <Pill tone={focus.state === 'berlangsung' ? 'hijau' : 'biru'}>
                    {focus.state === 'berlangsung' ? 'Berlangsung' : 'Berikutnya'}
                  </Pill>
                  <small className={MINI_SMALL}>
                    {focus.time}–{focus.end} WIB
                  </small>
                </span>
                <ChevronRight size={16} className="shrink-0 text-ink-3" aria-hidden="true" />
              </Link>
            )}
          </div>
        )}
      </section>
    );
  } else {
    const fromSelected = deliveries.findIndex((d) => selected === `kirim-${d.id}`);
    const index =
      fromSelected >= 0 ? fromSelected : Math.min(trackIndex, Math.max(0, deliveries.length - 1));
    const d = deliveries[index];
    const move = (step: number) => {
      const next = (index + step + deliveries.length) % deliveries.length;
      setTrackIndex(next);
      const id = deliveries[next].id;
      if (site === 'gudang' && model.trucks.some((t) => t.delivery.id === id))
        setSelected(`kirim-${id}`);
      else if (selected.startsWith('kirim-')) setSelected('rak-A');
    };
    const stage = d ? deliveryStage(d) : -1;
    const icons: LucideIcon[] = [ClipboardCheck, Truck, Warehouse, Search, PackageCheck];
    const subFor = (i: number) => {
      if (i === 0 && d?.data.planned_date) return formatDate(String(d.data.planned_date));
      if (i === 2 && d?.data.arrival_time) return `${String(d.data.arrival_time)} WIB`;
      return i < stage ? 'Selesai' : i === stage ? 'Sekarang' : 'Menunggu';
    };
    tracker = (
      <section aria-label="Pelacak pengiriman">
        <header className={TRACKER_HEAD}>
          <IconTile icon="truk" size={24} className={HEAD_TILE} />
          <h2 className={TRACKER_TITLE}>Pelacak pengiriman</h2>
          {d ? (
            <small className={HEAD_NOTE}>{String(d.data.license_plate || d.data.title)}</small>
          ) : null}
          <Pager index={index} total={deliveries.length} onMove={move} label="Pengiriman" />
        </header>
        {!shipping ? (
          <p className={EMPTY}>
            {unavailable ? 'Data belum tersedia.' : 'Pengiriman belum aktif di server.'}
          </p>
        ) : !d ? (
          <p className={EMPTY}>Tidak ada pengiriman aktif.</p>
        ) : (
          <div className={TRACKER_BODY}>
            <Stepper
              label="Tahap pengiriman"
              steps={deliverySteps.map((s, i) => ({
                key: s,
                label: DELIVERY_LABEL[s],
                sub: subFor(i),
                state: i < stage ? 'done' : i === stage ? 'now' : 'next',
                icon: icons[i],
              }))}
            />
            <Link className={MINI} href={recordHref('deliveries', d)}>
              <span className={MINI_ART} aria-hidden="true">
                <Icon3D kind="truk" size={44} />
              </span>
              <span className={MINI_TEXT}>
                <strong className={MINI_STRONG}>{String(d.data.title)}</strong>
                <small className={MINI_SMALL}>
                  {String(d.data.driver_name || d.data.vehicle || 'Pengemudi belum diisi')}
                </small>
                <Pill tone={deliveryRow(d).tone}>{deliveryRow(d).pill}</Pill>
                <small className={MINI_SMALL}>{deliveryRow(d).note}</small>
              </span>
              <ChevronRight size={16} className="shrink-0 text-ink-3" aria-hidden="true" />
            </Link>
          </div>
        )}
      </section>
    );
  }

  // ---------- Daftar bertab (kanan bawah) ----------
  let tabs: Tab[];
  let tabTitle: string;
  if (storeCards) {
    tabTitle = 'Kawasan gerai';
    tabs = storeCards.tabs;
  } else if (site === 'kantor' || site === 'pulau') {
    tabTitle = model.title;
    tabs = [
      {
        id: 'tim',
        label: 'Tim',
        count: dash(plans.length),
        empty: unavailable ? 'Data belum tersedia.' : 'Belum ada anggota tim tercatat.',
        rows: plans.map((p) => ({
          key: p.id,
          title: p.name,
          sub: `${areaName(p.area)} · ${p.reason}`,
          pill: ACTION_LABEL[p.action],
          tone: ACTION_TONE[p.action],
          avatar: p.name.slice(0, 1).toUpperCase(),
          active: selected === `orang:${p.id}`,
          onClick: () => choose(`orang:${p.id}`),
        })),
      },
      {
        id: 'ruang',
        label: 'Ruang',
        count: String(Object.keys(OFFICE_ROOMS).length),
        empty: '',
        rows: (Object.keys(OFFICE_ROOMS) as OfficeRoom[]).map((id) => {
          const n = plans.slice(0, MAX_FIGURES).filter((p) => p.area === id).length;
          return {
            key: id,
            title: OFFICE_ROOMS[id].name,
            sub: unavailable ? 'Data belum tersedia' : `${n} figur`,
            icon: ROOM_3D[id],
            pill: n ? 'Aktif' : 'Sepi',
            tone: n ? 'hijau' : 'abu',
            active: site === 'kantor' && selected === id,
            onClick: () => choose(id),
          };
        }),
      },
      {
        id: 'tugas',
        label: 'Tugas',
        count: dash(model.tasks.length),
        empty: unavailable ? 'Data belum tersedia.' : 'Tidak ada tugas terbuka.',
        rows: view(model.tasks.map((t) => taskRow(t, date))),
      },
      {
        id: 'proyek',
        label: 'Proyek',
        count: dash(projects.length),
        empty: unavailable ? 'Data belum tersedia.' : 'Belum ada proyek berjalan.',
        rows: projects.map(({ row, done, total, pct }) => ({
          key: row.id,
          title: String(row.data.title),
          sub: `${done}/${total} tugas selesai${row.data.target_date ? ` · target ${formatDate(String(row.data.target_date))}` : ''}`,
          icon: 'folder' as const,
          bar: pct / 100,
          barText: `${pct}%`,
          tone: pct >= 100 ? 'hijau' : 'biru',
          href: `/projects/${encodeURIComponent(row.id)}`,
        })),
      },
    ];
  } else if (site === 'gudang') {
    tabTitle = 'Gudang';
    const rackRows = (ids: readonly string[]): RowView[] =>
      ids.map((id) => {
        const items = rackItems(model, id);
        const low = items.filter(isBelowMinimum).length;
        return {
          key: id,
          title: `Rak ${id}`,
          sub: `${items.length} jenis barang`,
          pill: low ? `${low} minimum` : items.length ? 'Aman' : 'Kosong',
          tone: low ? 'kuning' : items.length ? 'hijau' : 'abu',
          bar: items.length ? (items.length - low) / items.length : 0,
          barText: `${items.length - low}/${items.length}`,
          icon: 'rak',
          active: selected === `rak-${id}`,
          onClick: () => choose(`rak-${id}`),
        };
      });
    tabs = [
      {
        id: 'dok',
        label: 'Dok',
        count: shipping ? `${model.trucks.filter((t) => t.place === 'dok').length}/4` : '—',
        empty: 'Pengiriman belum aktif.',
        rows: shipping
          ? dockList(model).map((dk) => ({
              key: dk.id,
              title: `Dok ${dk.id}`,
              sub: dk.spot
                ? String(dk.spot.delivery.data.license_plate || dk.spot.delivery.data.title)
                : 'Tidak ada truk',
              pill: dk.spot ? DELIVERY_LABEL[String(dk.spot.delivery.data.status)] : 'Tersedia',
              tone: dk.spot ? 'biru' : 'hijau',
              icon: dk.spot ? 'truk' : 'gudang',
              active:
                selected === `dok-${dk.id}` ||
                (!!dk.spot && selected === `kirim-${dk.spot.delivery.id}`),
              onClick: () => choose(`dok-${dk.id}`),
            }))
          : [],
      },
      {
        id: 'truk',
        label: 'Truk',
        count: dash(model.trucks.length, shipping),
        empty: shipping ? 'Tidak ada truk tiba atau dalam perjalanan.' : 'Pengiriman belum aktif.',
        rows: shipping
          ? model.trucks.map((s) => ({
              key: s.delivery.id,
              title: String(s.delivery.data.license_plate || s.delivery.data.title),
              sub: `${String(s.delivery.data.title)} · ${truckNote(s, model)}`,
              pill: DELIVERY_LABEL[String(s.delivery.data.status)],
              tone: s.place === 'dok' ? 'biru' : 'kuning',
              icon: 'truk',
              active: selected === `kirim-${s.delivery.id}`,
              onClick: () => choose(`kirim-${s.delivery.id}`),
            }))
          : [],
      },
      {
        id: 'rak',
        label: 'Rak',
        count: '6',
        empty: 'Pencatatan barang belum aktif.',
        rows: stock ? rackRows(rackIds) : [],
      },
      {
        id: 'mutasi',
        label: 'Mutasi',
        count: dash(movements.length, shipping),
        empty: shipping ? 'Belum ada mutasi stok tercatat.' : 'Pengiriman belum aktif.',
        rows: shipping ? movements.slice(0, 20).map((m) => stockHistoryRow(m, 'mutasi')) : [],
      },
    ];
  } else {
    tabTitle = 'Cold storage';
    const low = cold.filter(isBelowMinimum);
    tabs = [
      {
        id: 'rak',
        label: 'Rak',
        count: '3',
        empty: 'Pencatatan barang belum aktif.',
        rows: stock
          ? coldRackIds.map((id) => {
              const items = rackItems(model, id);
              const n = items.filter(isBelowMinimum).length;
              return {
                key: id,
                title: `Rak ${id}`,
                sub: `${items.length} jenis barang`,
                pill: n ? `${n} minimum` : items.length ? 'Aman' : 'Kosong',
                tone: n ? 'kuning' : items.length ? 'hijau' : 'abu',
                bar: items.length ? (items.length - n) / items.length : 0,
                barText: `${items.length - n}/${items.length}`,
                icon: 'salju',
                active: selected === `rak-${id}`,
                onClick: () => choose(`rak-${id}`),
              } as RowView;
            })
          : [],
      },
      {
        id: 'minimum',
        label: 'Stok minimum',
        count: dash(low.length, stock),
        empty: stock
          ? 'Tidak ada barang dingin di bawah minimum.'
          : 'Pencatatan barang belum aktif.',
        rows: stock ? view(low.map(itemRow)) : [],
      },
    ];
  }

  const results = unavailable ? [] : searchRecords(ctx, query);
  const partial = Object.keys(more).length > 0;
  // Lonceng hanya menghitung data nyata: tugas lewat tenggat, risiko dan isu lapangan terbuka.
  const notif: RowView[] = unavailable
    ? []
    : view([
        ...lateTasks.map((t) => taskRow(t, date)),
        ...openRisks.map((r): RecordRow => ({
          key: `risk-${r.id}`,
          entity: 'risks',
          item: r,
          note: String(r.data.assignee || 'Belum ada penanggung jawab'),
          pill: 'Risiko terbuka',
          tone: 'kuning',
        })),
        ...openIssues.map((r): RecordRow => ({
          key: `issue-${r.id}`,
          entity: 'issues',
          item: r,
          note: `${String(r.data.assignee || 'Belum ada penanggung jawab')}${r.data.due_date ? ` · ${formatDate(String(r.data.due_date))}` : ''}`,
          pill: 'Isu terbuka',
          tone: 'merah',
        })),
      ]);
  return (
    <main className={ROOT} data-panel={panel ?? undefined} suppressHydrationWarning>
      <Stage
        site={site}
        input={input}
        plans={plans}
        selected={selected}
        tag={tag}
        ambience={ambience}
        pins={pins}
        onPick={choose}
      />
      <header className={TOP_BAR} data-search={searchOpen || undefined}>
        <Link
          className="flex min-h-11 shrink-0 items-center gap-2"
          href="/home"
          aria-label="Kembali ke Beranda"
        >
          <Icon3D kind="kotak" size={34} />
          <span>
            <strong className="block text-[18px] font-extrabold tracking-[-0.4px] whitespace-nowrap max-lg:text-[16px] max-md:hidden">
              Dunia Koperasi
            </strong>
            {(DEMO || preview) && (
              <small className="mt-px inline-block rounded-full bg-warn px-2 py-px text-[10px] font-bold text-warn-ink max-md:hidden">
                {DEMO ? 'Mode demo' : 'Pratinjau'}
              </small>
            )}
          </span>
        </Link>
        <div className={SEARCH}>
          <Search size={17} aria-hidden="true" />
          <input
            ref={searchInput}
            aria-label="Cari catatan"
            placeholder="Cari tugas, rapat, barang, pengiriman…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-[38px] min-w-0 flex-1 border-0 bg-transparent text-ink outline-none"
          />
          <Kbd aria-hidden="true" className="max-md:group-data-[search]/top:hidden">
            /
          </Kbd>
          <button
            type="button"
            className="hidden size-9 place-items-center rounded-lg border-0 bg-transparent text-ink-3 max-md:group-data-[search]/top:grid"
            aria-label="Tutup pencarian"
            onClick={() => {
              setSearchOpen(false);
              setQuery('');
            }}
          >
            <X size={16} />
          </button>
          {query.trim() && (
            <ul
              className={cn(
                CARD,
                'absolute top-[calc(100%+6px)] right-0 left-0 z-8 max-h-[320px] overflow-auto',
              )}
              aria-label="Hasil pencarian"
            >
              {results.length ? (
                results.map((r) => (
                  <li key={r.key}>
                    <Link
                      href={recordHref(r.entity, r.item)}
                      className="flex min-h-12 items-center gap-2.5 rounded-xl px-2 py-1.5 text-ink transition-colors hover:bg-surface-2 focus-visible:bg-surface-2"
                    >
                      {/* Ikon dan label jenis: tugas, rapat, barang, dan lainnya terbedakan sekilas. */}
                      <Icon3D kind={ENTITY_3D[r.entity] ?? 'tim'} size={28} />
                      <strong className="min-w-0 flex-1 truncate">
                        <Highlight text={String(r.item.data.title)} query={query} />
                      </strong>
                      <small className="shrink-0 rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-bold text-ink-2">
                        {r.kind}
                      </small>
                    </Link>
                  </li>
                ))
              ) : (
                <li className={cn(EMPTY, 'px-1 py-3.5')}>Tidak ada catatan yang cocok.</li>
              )}
            </ul>
          )}
        </div>
        <button
          type="button"
          className={cn(
            ICON_BTN,
            'hidden max-md:ml-auto max-md:inline-flex max-md:border-transparent',
          )}
          aria-label="Buka pencarian"
          onClick={() => {
            setSearchOpen(true);
            requestAnimationFrame(() => searchInput.current?.focus());
          }}
        >
          <Search size={18} />
        </button>
        <SitePicker
          value={site}
          onChange={(id) => go(id as WorldSite)}
          options={(Object.keys(SITES) as WorldSite[]).map((id) => ({
            id,
            code: SITES[id].code,
            label: SITES[id].label,
            sub: siteSubtitle[id],
          }))}
        />
        <button
          type="button"
          className={cn(
            ICON_BTN,
            'border-action bg-action text-on-action shadow-[0_6px_14px_color-mix(in_srgb,var(--accent-strong)_30%,transparent)] hover:bg-action-hover hover:text-on-action',
          )}
          aria-label="Tambah catatan"
          title="Tambah tugas, rapat, kas, atau barang"
          onClick={() => setActionsOpen(true)}
        >
          <Plus size={18} />
        </button>
        <span
          className="inline-flex h-8 items-center gap-1.5 rounded-[99px] bg-done px-[11px] font-bold whitespace-nowrap text-done-ink tabular-nums max-lg:hidden"
          title="Waktu Asia/Jakarta"
          suppressHydrationWarning
        >
          <i
            aria-hidden="true"
            className="size-[7px] rounded-[50%] bg-done-bar shadow-[0_0_0_3px_color-mix(in_srgb,var(--done-bar)_20%,transparent)]"
          />{' '}
          {clockTime(now)} <small className="font-semibold opacity-80 max-xl:hidden">WIB</small>
        </span>
        <div className="relative" ref={bellRoot}>
          <button
            ref={bellTrigger}
            type="button"
            className={cn(ICON_BTN, 'border-transparent')}
            aria-label={notif.length ? `Perlu perhatian: ${notif.length}` : 'Perlu perhatian'}
            aria-expanded={bellOpen}
            onClick={() => setBellOpen(!bellOpen)}
          >
            <Bell size={18} />
            {notif.length > 0 && (
              <b className="absolute top-[3px] right-[2px] grid h-[17px] min-w-[17px] place-items-center rounded-[99px] border-2 border-surface bg-brand px-1 text-[9px] font-extrabold text-on-brand">
                {notif.length > 9 ? '9+' : notif.length}
              </b>
            )}
          </button>
          {bellOpen && (
            <div
              className={cn(
                CARD,
                POP,
                'max-h-[min(70vh,460px)] w-[360px] overflow-auto px-3 py-2.5',
              )}
              role="dialog"
              aria-label="Perlu perhatian"
            >
              <Section
                title="Perlu perhatian"
                meta={`${lateTasks.length} tugas · ${openRisks.length} risiko · ${openIssues.length} isu`}
              />
              <Rows
                rows={notif.slice(0, 8)}
                empty={
                  unavailable
                    ? 'Data belum tersedia.'
                    : 'Tidak ada tugas lewat tenggat, risiko, atau isu terbuka.'
                }
              />
            </div>
          )}
        </div>
        <div className="relative" ref={userRoot}>
          <button
            ref={userTrigger}
            type="button"
            className="flex min-h-11 items-center gap-2.5 rounded-2xl border-0 bg-transparent py-0.5 pr-1 pl-0.5 text-left hover:bg-surface-2"
            aria-label={`Menu ${model.manager}`}
            aria-expanded={userOpen}
            onClick={() => setUserOpen(!userOpen)}
          >
            <span
              className="grid size-[38px] shrink-0 place-items-center rounded-[50%] bg-accent font-extrabold text-accent-ink shadow-[0_0_0_2px_var(--surface)] max-md:size-[34px]"
              aria-hidden="true"
            >
              {model.manager.slice(0, 1).toUpperCase()}
            </span>
            <span className="max-xl:hidden">
              <strong className="block max-w-[150px] truncate text-[13px]">{model.manager}</strong>
              <small className="block text-[11px] text-ink-3">Manajer</small>
            </span>
            <ChevronDown size={16} aria-hidden="true" className="text-ink-3 max-xl:hidden" />
          </button>
          {userOpen && (
            <div
              className={cn(CARD, POP, 'grid w-[270px] gap-1 p-2.5')}
              role="dialog"
              aria-label="Menu pengguna"
            >
              <p className="border-b border-line">
                <strong className="block text-[14px]">{model.manager}</strong>
                <small className="block text-[12px] text-ink-3">{model.title}</small>
              </p>
              {refresh && (
                <button
                  type="button"
                  className={POP_ITEM}
                  onClick={() => void reload()}
                  disabled={busy}
                  aria-busy={busy}
                >
                  <RefreshCw size={16} /> {busy ? 'Memuat…' : 'Muat ulang data'}
                </button>
              )}
              <label className="grid gap-1 px-2 py-1 text-[12px] text-ink-3">
                <span>Cuaca simulasi</span>
                <select
                  className="field-select min-h-10 rounded-xl border border-field-line bg-field px-3 text-ink"
                  aria-label="Cuaca simulasi"
                  value={weather}
                  onChange={(e) => setWeather(e.target.value as Weather)}
                >
                  <option value="cerah">Cerah</option>
                  <option value="berawan">Berawan</option>
                  <option value="hujan">Hujan</option>
                </select>
              </label>
              <label className="grid gap-1 px-2 py-1 text-[12px] text-ink-3">
                <span>Suasana waktu</span>
                <select
                  className="field-select min-h-10 rounded-xl border border-field-line bg-field px-3 text-ink"
                  aria-label="Suasana waktu"
                  value={phase}
                  onChange={(e) => setPhase(e.target.value as typeof phase)}
                >
                  <option value="otomatis">Ikuti jam WIB</option>
                  <option value="pagi">Pagi</option>
                  <option value="siang">Siang</option>
                  <option value="senja">Senja</option>
                  <option value="malam">Malam</option>
                </select>
              </label>
              <Link className={POP_ITEM} href="/settings">
                <Settings size={16} /> Pengaturan
              </Link>
              <Link className={POP_ITEM} href="/home">
                <Home size={16} /> Kembali ke Beranda
              </Link>
            </div>
          )}
        </div>
      </header>
      <section
        className="absolute top-[calc(var(--mt-top)+12px)] right-auto left-4 z-3 flex max-w-[min(520px,calc(100%-32px))] flex-col gap-2.5 empty:hidden"
        aria-label="Status data"
      >
        {(error || refreshError) && (
          <p className={ALERT} role="alert">
            {error || refreshError}
          </p>
        )}
        {loading && (
          <p className={ALERT} role="status">
            Memuat data kantor…
          </p>
        )}
        {partial && (
          <div className={ALERT_BOX}>
            <p>Ringkasan baru mencakup data yang sudah dimuat.</p>
            {(Object.keys(more) as Entity[]).map((entity) => (
              <button
                key={entity}
                type="button"
                className={BTN}
                disabled={!!fetching}
                onClick={() => void loadMore?.(entity)}
              >
                Muat lanjutan {ENTITY_LABEL[entity] || entity}
              </button>
            ))}
          </div>
        )}
      </section>
      <Sheet
        open={actionsOpen}
        onOpenChange={setActionsOpen}
        title="Tambah catatan"
        description="Pilih yang ingin dicatat"
      >
        <QuickActionsPanel onPick={() => setActionsOpen(false)} />
      </Sheet>
      <nav
        className={cn(
          CARD,
          'absolute bottom-[max(16px,env(safe-area-inset-bottom))] left-1/2 z-5 flex -translate-x-1/2 gap-1 p-1.5 max-md:bottom-[max(10px,env(safe-area-inset-bottom))] max-md:w-[calc(100%-20px)]',
        )}
        aria-label="Panel dunia"
        ref={dock}
      >
        {(
          [
            { id: 'detail', label: 'Detail', icon: 'meja' },
            { id: 'ringkasan', label: 'Ringkasan', icon: 'grafik' },
            { id: 'daftar', label: 'Daftar', icon: 'papan' },
            { id: 'agenda', label: trackerLabel, icon: 'kalender' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            aria-expanded={panel === t.id}
            aria-controls="world-inspector"
            onClick={() => setPanel(panel === t.id ? null : t.id)}
            className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl border-0 bg-transparent px-3.5 py-1 text-[13px] font-semibold text-ink-2 hover:bg-accent hover:text-accent-strong aria-expanded:bg-accent aria-expanded:text-accent-strong max-md:min-w-0 max-md:flex-1 max-md:flex-col max-md:gap-0.5 max-md:p-1 max-md:text-[11px]"
          >
            <Icon3D kind={t.icon} size={28} />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
      <section
        id="world-inspector"
        className={cn(
          CARD,
          'absolute top-[calc(var(--mt-top)+16px)] right-4 bottom-[88px] z-4 flex w-[364px] flex-col overflow-hidden max-lg:right-3 max-lg:w-[320px] max-md:top-auto max-md:right-2.5 max-md:bottom-[calc(88px+env(safe-area-inset-bottom))] max-md:left-2.5 max-md:h-[44dvh] max-md:w-auto',
        )}
        hidden={!panel}
        aria-label="Informasi dunia"
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            closePanel();
          }
        }}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-3">
          <strong className="text-[13px]">
            {panel === 'ringkasan'
              ? 'Ringkasan'
              : panel === 'daftar'
                ? 'Daftar'
                : panel === 'agenda'
                  ? trackerLabel
                  : 'Detail pilihan'}{' '}
            · {SITES[site].label}
          </strong>
          <button
            type="button"
            className={cn(ICON_BTN, 'min-h-11 min-w-11')}
            onClick={closePanel}
            aria-label="Tutup panel informasi"
          >
            <X size={18} />
          </button>
        </header>
        <div className="min-h-0 overflow-auto overscroll-contain p-[18px] max-md:p-4">
          <div hidden={panel !== 'detail'}>
            <aside className="overscroll-contain" aria-label="Detail pilihan">
              {panelBody}
            </aside>
          </div>
          <div hidden={panel !== 'ringkasan'}>
            <div className="grid gap-3">
              {kpis.map((k) => (
                <KpiCard key={k.label} {...k} />
              ))}
            </div>
            {panel === 'ringkasan' && (
              <ChartList
                charts={siteCharts({
                  site,
                  data,
                  model,
                  day: date,
                  stock,
                  shipping,
                  unavailable,
                })}
              />
            )}
          </div>
          <div hidden={panel !== 'agenda'}>{tracker}</div>
          <div hidden={panel !== 'daftar'}>
            <TabsCard
              key={site}
              icon={site === 'kantor' ? 'tim' : SITES[site].icon}
              title={tabTitle}
              tabs={tabs}
              label={`Daftar ${SITES[site].label.toLowerCase()}`}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
