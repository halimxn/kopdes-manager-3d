'use client';
import { GrafikRingkasan, grafikLokasi } from './grafik-lokasi';
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
import { today, formatDate } from '@/lib/date';
import { planProgress } from '@/lib/progress';
import { isProjectHistory } from '../projects/project-lifecycle';
import {
  activeDeliveries,
  coldRackIds,
  deliverySteps,
  getWorldModel,
  isBelowMinimum,
  meetingTimeline,
  rackIds,
} from './model/world-model';
import type { Workspace } from '../workspace/useWorkspace';
import { recordHref } from '../workspace/workspace-navigation';
import type { Entity, Item, Task } from '../records/schemas';
import { BIDANG, type Bidang, type LokasiMonitoring } from './bidang';
import { ACTION_LABEL, MAX_FIGURES, isOffice, monitoringPlans, type Area } from './character-plan';
import { GERAI, infoGerai, type GeraiId } from './gerai';
import { geraiView, ikonGerai } from './gerai-cards';
import {
  ACTION_NADA,
  DELIVERY_LABEL,
  deliveryInfo,
  deliveryRow,
  deliveryStage,
  dockList,
  isLate,
  itemRow,
  rackItems,
  roomRows,
  roomStats,
  searchRecords,
  taskRow,
  truckNote,
  suasanaJam,
  type Baris,
  type Cuaca,
  type Konteks,
  type Nada,
  type Suasana,
} from './monitor-data';
import {
  IconTile,
  KpiCard,
  Links,
  LokasiPicker,
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
import type { PinPeta } from './monitoring-scene';
import { Ikon3D, thumbBarang, type Ikon3DKind } from '@/components/ui/Ikon3D';
import { tujuanTautan } from './tautan';
import { ManagerActionModal } from '@/components/layout/ManagerActionModal';
import './monitoring.css';

const Stage = dynamic(() => import('./MonitoringStage').then((m) => m.MonitoringStage), {
  ssr: false,
  loading: () => <div className="mt-stage mt-fallback">Menyiapkan kantor…</div>,
});

const ROOM_3D: Record<Bidang, Ikon3DKind> = {
  kerja: 'meja',
  rapat: 'kalender',
  gym: 'dumbel',
  manajer: 'dokumen',
  karyawan: 'toko',
  stok: 'kotak',
  kas: 'dompet',
  istirahat: 'kopi',
};
const ENTITY_3D: Partial<Record<Entity, Ikon3DKind>> = {
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
const ROOM_LINKS: Record<Bidang, { href: string; label: string; baru?: boolean }[]> = {
  kerja: [
    { href: '/tugas?baru=1', label: 'Tugas baru', baru: true },
    { href: '/tugas', label: 'Tugas' },
  ],
  rapat: [
    { href: '/rapat?baru=1', label: 'Jadwalkan rapat', baru: true },
    { href: '/rapat', label: 'Rapat' },
    { href: '/rapat?bagian=decisions', label: 'Keputusan' },
  ],
  gym: [
    { href: '/jurnal?baru=1', label: 'Catat kegiatan', baru: true },
    { href: '/jurnal', label: 'Kegiatan' },
  ],
  manajer: [
    { href: '/risiko?baru=1', label: 'Catat risiko', baru: true },
    { href: '/dokumen', label: 'Dokumen' },
    { href: '/risiko', label: 'Risiko' },
  ],
  karyawan: [
    { href: '/tim?baru=1', label: 'Tambah staf', baru: true },
    { href: '/gerai', label: 'Halaman Gerai' },
  ],
  stok: [
    { href: '/barang?baru=1', label: 'Tambah barang', baru: true },
    { href: '/stok-opname?baru=1', label: 'Catat opname', baru: true },
    { href: '/barang', label: 'Barang' },
  ],
  kas: [
    { href: '/keuangan?baru=1&arah=masuk', label: 'Kas masuk', baru: true },
    { href: '/keuangan?baru=1&arah=keluar', label: 'Kas keluar', baru: true },
    { href: '/anggota?baru=1', label: 'Anggota baru', baru: true },
    { href: '/keuangan', label: 'Buku kas' },
  ],
  istirahat: [{ href: '/tim', label: 'Tim' }],
};
/** Nama ruang figur: ruang kantor atau unit gerai. */
const namaArea = (area: Area) =>
  isOffice(area) ? BIDANG[area].nama : GERAI[area.slice(6) as GeraiId].nama;
const LOKASI: Record<LokasiMonitoring, { label: string; kode: string; icon: Ikon3DKind }> = {
  kantor: { label: 'Kantor', kode: 'KTR', icon: 'kantor' },
  gerai: { label: 'Gerai', kode: 'GRI', icon: 'toko' },
  gudang: { label: 'Gudang', kode: 'GDG', icon: 'gudang' },
  pendingin: { label: 'Cold storage', kode: 'CS', icon: 'salju' },
  pulau: { label: 'Pulau koperasi', kode: 'PLU', icon: 'pulau' },
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
const jam = (now: Date) =>
  new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(now);
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

const view = (rows: Baris[]): RowView[] =>
  rows.map((r) => {
    const barang = r.entity === 'inventory-items';
    return {
      key: r.key,
      title: String(r.item.data.title),
      sub: barang
        ? `Minimum ${String(r.item.data.minimum_quantity ?? '—')} · Rak ${String(r.item.data.rack || '—')}`
        : r.note,
      value: barang ? String(r.item.data.book_quantity ?? '—') : undefined,
      unit: barang ? String(r.item.data.measurement || '') : undefined,
      pill: r.pill,
      nada: r.nada,
      href: recordHref(r.entity, r.item),
      ikon: ENTITY_3D[r.entity],
      thumb: barang
        ? thumbBarang(String(r.item.data.title), String(r.item.data.measurement || ''))
        : undefined,
      avatar:
        r.entity === 'staff' ? String(r.item.data.title).slice(0, 1).toUpperCase() : undefined,
    };
  });

/** "3 / 20" dari roomStats menjadi angka dan total terpisah untuk kotak statistik. */
const statDari = (s: { label: string; value: string; bar?: number }): Stat => {
  const [value, total] = s.value.split(' / ');
  const peringatan = /tenggat|minimum|Risiko|diperbarui|Keluar/.test(s.label);
  return { label: s.label, value, total, bar: s.bar, nada: peringatan ? 'kuning' : 'hijau' };
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
  const [lokasi, setLokasi] = useState<LokasiMonitoring>('kantor');
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
  const [cuaca, setCuaca] = useState<Cuaca>('cerah');
  const [fase, setFase] = useState<Suasana['fase'] | 'otomatis'>('otomatis');
  const searchInput = useRef<HTMLInputElement>(null);
  const [aksiOpen, setAksiOpen] = useState(false);
  const params = useSearchParams();
  const [tautanDipakai, setTautanDipakai] = useState('');
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
  const suasana = useMemo(
    () => ({ ...suasanaJam(now, cuaca), ...(fase === 'otomatis' ? {} : { fase }) }),
    [now, cuaca, fase],
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
  const ctx: Konteks = {
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
  const sprintAktif = (unavailable ? [] : data.sprints || []).filter((sp) => sp.data.status === 'aktif');
  const milestoneDekat = (unavailable ? [] : data.milestones || [])
    .filter((m) => !m.data.actual_date && m.data.due_date)
    .sort((a, b) => String(a.data.due_date).localeCompare(String(b.data.due_date)))
    .slice(0, 3);
  const mitra = (unavailable ? [] : data.stakeholders || [])
    .slice()
    .sort((a, b) => String(b.data.last_contact || '').localeCompare(String(a.data.last_contact || '')));
  const pelatihan = unavailable ? [] : model.trainings;
  const mutasi = (unavailable ? [] : data['stock-movements'] || [])
    .slice()
    .sort((a, b) => String(b.data.date).localeCompare(String(a.data.date)));
  const namaBarang = (id: unknown) =>
    String((data['inventory-items'] || []).find((b) => b.id === id)?.data.title || 'Barang');
  const riwayatStok = (row: Item, jenis: 'mutasi' | 'opname'): RowView => {
    if (jenis === 'opname') {
      const selisih = Number(row.data.counted_quantity) - Number(row.data.book_quantity);
      return {
        key: row.id,
        title: `Opname ${namaBarang(row.data.item_id)}`,
        sub: `${formatDate(String(row.data.date))} · fisik ${String(row.data.counted_quantity)} dari buku ${String(row.data.book_quantity)}`,
        ikon: 'cek',
        pill: selisih ? `Selisih ${selisih > 0 ? '+' : ''}${selisih}` : 'Sesuai',
        nada: selisih ? 'kuning' : 'hijau',
        href: recordHref('stock-counts', row),
      };
    }
    const masuk = ['masuk', 'koreksi tambah'].includes(String(row.data.kind));
    return {
      key: row.id,
      title: namaBarang(row.data.item_id),
      sub: `${formatDate(String(row.data.date))} · ${String(row.data.kind)}${row.data.book_after !== undefined ? ` · stok ${String(row.data.book_after)}` : ''}`,
      ikon: 'kotak',
      pill: `${masuk ? '+' : '−'}${String(row.data.quantity)}`,
      nada: masuk ? 'hijau' : 'kuning',
      href: recordHref('stock-movements', row),
    };
  };
  // Progres proyek dihitung dari semua tugas proyek (termasuk yang selesai), sama seperti halaman Proyek.
  const proyek = (unavailable ? [] : data.workstreams || [])
    .filter((row) => !isProjectHistory(row))
    .map((row) => {
      const tugas = (data['work-items'] || [])
        .filter((t) => t.data.workstream_id === row.id)
        .map((t) => ({ status: String(t.data.status) as Task['status'] }));
      return {
        row,
        total: tugas.filter((t) => t.status !== 'dibatalkan').length,
        done: tugas.filter((t) => t.status === 'selesai').length,
        pct: planProgress(tugas),
      };
    });
  const lateTasks = model.tasks.filter((t) => isLate(t, date));
  const openRisks = risks.filter((r) => r.data.status === 'terbuka');
  const openIssues = (unavailable ? [] : data.issues || []).filter(
    (r) => r.data.status === 'terbuka',
  );
  const geraiInfo = infoGerai(model);

  const defaultFor = useCallback(
    (loc: LokasiMonitoring) =>
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
    (loc: LokasiMonitoring) => {
      setLokasi(loc);
      setSelected(defaultFor(loc));
      setLateOnly(false);
    },
    [defaultFor],
  );
  const choose = useCallback(
    (key: string) => {
      if (key.startsWith('pintu-')) return go(key.slice(6) as LokasiMonitoring);
      if (key.startsWith('orang:')) {
        const p = plans.find((p) => `orang:${p.id}` === key);
        if (p) setLokasi(isOffice(p.area) ? 'kantor' : 'gerai');
      } else if (key in BIDANG) setLokasi('kantor');
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
  const tautanKey = params?.toString() ?? '';
  if (tautanKey && tautanKey !== tautanDipakai && !unavailable && Object.keys(data).length) {
    setTautanDipakai(tautanKey);
    const t = tujuanTautan(new URLSearchParams(tautanKey), model, plans, geraiInfo);
    if (t) {
      setLokasi(t.lokasi);
      setSelected(t.pilih || defaultFor(t.lokasi));
      setPanel('detail');
    }
  }

  const dash = (n: number, active = true) => (unavailable || !active ? '—' : String(n));
  const naText = unavailable ? 'Data belum tersedia' : '';
  const person = selected.startsWith('orang:')
    ? plans.find((p) => `orang:${p.id}` === selected)
    : undefined;
  const room: Bidang =
    person && isOffice(person.area)
      ? person.area
      : selected in BIDANG
        ? (selected as Bidang)
        : 'kerja';
  const gerai =
    lokasi === 'gerai'
      ? geraiView({
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
  const bukaGerai = geraiInfo.filter((g) => g.buka && g.id !== 'kantor').length;
  const subLokasi: Record<LokasiMonitoring, string> = unavailable
    ? { kantor: naText, gerai: naText, gudang: naText, pendingin: naText, pulau: naText }
    : {
        kantor: `${Math.min(MAX_FIGURES, plans.filter((p) => isOffice(p.area)).length)} figur · ${proses} tugas proses`,
        gerai: `${bukaGerai}/${geraiInfo.length - 1} gerai buka`,
        gudang: shipping
          ? `${model.trucks.length} truk · ${model.inventory.low.length} stok minimum`
          : 'Pengiriman belum aktif',
        pendingin: stock ? `${cold.length} barang dingin` : 'Pencatatan barang belum aktif',
        pulau: '4 lokasi terhubung',
      };

  // ---------- KPI (tiga kartu seperti referensi) ----------
  let kpis: Parameters<typeof KpiCard>[0][];
  if (gerai) kpis = gerai.kpis;
  else if (lokasi === 'kantor' || lokasi === 'pulau') {
    const next = meetingTimeline(model.meetings, now).find((s) => s.state === 'nanti');
    kpis = [
      {
        icon: 'papan',
        label: 'Tugas terbuka',
        value: dash(model.tasks.length),
        chip: unavailable ? undefined : { text: `${proses} proses`, nada: 'hijau' },
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
            ? { text: 'perlu tindak', nada: 'merah' }
            : { text: 'aman', nada: 'hijau' },
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
            ? { text: 'berlangsung', nada: 'hijau' }
            : next
              ? { text: `${next.time} WIB`, nada: 'biru' }
              : undefined,
        foot:
          naText ||
          (next || model.currentMeeting ? 'rapat · ruang rapat' : 'tidak ada lagi hari ini'),
        onClick: () => choose('rapat'),
      },
    ];
  } else if (lokasi === 'gudang') {
    const dok = model.trucks.filter((t) => t.place === 'dok').length;
    const low = inRacks.filter(isBelowMinimum).length;
    kpis = [
      {
        icon: 'kotak',
        label: 'Barang di rak',
        value: dash(inRacks.length, stock),
        chip: stock && low ? { text: `${low} minimum`, nada: 'kuning' } : undefined,
        foot: naText || (stock ? 'jenis · rak A–F' : 'Pencatatan barang belum aktif'),
        onClick: () => choose('rak-A'),
      },
      {
        icon: 'truk',
        label: 'Truk di lokasi',
        value: dash(model.trucks.length, shipping),
        chip: shipping ? { text: `${dok} di dok`, nada: 'biru' } : undefined,
        foot:
          naText ||
          (shipping ? `${model.trucks.length - dok} antre · D1–D4` : 'Pengiriman belum aktif'),
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
        chip: stock && low ? { text: `${low} minimum`, nada: 'kuning' } : undefined,
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
        chip: unavailable || !stock ? undefined : { text: 'dari 3', nada: 'biru' },
        foot: naText || 'rak berisi barang tercatat',
      },
    ];
  }

  // ---------- Pin perhatian (≤5); daftar dibuat ulang hanya bila isinya berubah ----------
  const pinList: PinPeta[] = [];
  if (!unavailable) {
    if (lokasi === 'kantor') {
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
    } else if (lokasi === 'gudang') {
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
    } else if (lokasi === 'pendingin') {
      if (stock)
        for (const id of coldRackIds)
          if (model.inventory.coldRacks[id].some(isBelowMinimum))
            pinList.push({ key: `rak-${id}`, label: `Rak ${id}: stok di bawah minimum` });
    } else if (lokasi === 'gerai') {
      for (const g of geraiInfo)
        if (g.status === 'siap buka')
          pinList.push({ key: `g:${g.id}`, label: `${g.nama} siap dibuka` });
    }
  }
  const pinKey = JSON.stringify(pinList.slice(0, 5));
  const pins = useMemo(() => JSON.parse(pinKey) as PinPeta[], [pinKey]);

  // ---------- Panel detail ----------
  let panelBody: ReactNode;
  let tag = '';
  if (lokasi === 'pulau') {
    panelBody = (
      <>
        <PanelHead
          icon="pulau"
          eyebrow="PETA · DUNIA KOPERASI"
          title={model.title}
          sub="Pilih bangunan untuk masuk ke ruangan"
        />
        <div className="mt-status">
          <Pill nada="biru">Pulau melayang</Pill>
          <span>4 lokasi terhubung</span>
        </div>
        <Stats
          items={[
            {
              label: 'Gerai aktif',
              value: dash(bukaGerai),
              total: unavailable ? undefined : String(geraiInfo.length - 1),
              bar: unavailable ? undefined : bukaGerai / Math.max(1, geraiInfo.length - 1),
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
            title: LOKASI[id].label,
            sub:
              id === 'kantor'
                ? 'Ruang kerja, rapat, kas & anggota'
                : id === 'gerai'
                  ? 'Unit usaha dan kesiapan gerai'
                  : id === 'gudang'
                    ? 'Rak barang, dok dan pengiriman'
                    : 'Barang dingin di rak C1–C3',
            ikon: LOKASI[id].icon,
            pill: 'Masuk',
            nada: 'biru',
            onClick: () => go(id),
          }))}
          empty=""
        />
      </>
    );
  } else if (person && (lokasi === 'kantor' || lokasi === 'gerai')) {
    tag = `${person.name} · ${ACTION_LABEL[person.action]}`;
    const rows = roomRows('kerja', ctx, { person: person.name });
    panelBody = (
      <>
        <PanelHead
          icon="tim"
          eyebrow={`TIM · ${namaArea(person.area).toUpperCase()}`}
          title={person.name}
          sub={person.reason}
          onClose={() =>
            setSelected(isOffice(person.area) ? person.area : person.area.replace('gerai:', 'g:'))
          }
        />
        <div className="mt-status">
          <Pill nada={ACTION_NADA[person.action]}>{ACTION_LABEL[person.action]}</Pill>
          <span>Di {namaArea(person.area)}</span>
        </div>
        {person.mascot && (
          <p className="mt-note">
            Figur manajer dari nama di Pengaturan; belum tercatat sebagai anggota Tim.
          </p>
        )}
        <Stats
          items={[
            { label: 'Tugas terbuka', value: String(rows.length) },
            {
              label: 'Lewat tenggat',
              value: String(rows.filter((r) => r.nada === 'merah').length),
              nada: 'kuning',
            },
          ]}
        />
        <Section title="Tugas terbuka" meta="tenggat" />
        <Rows rows={view(rows)} empty="Tidak ada tugas terbuka untuk anggota ini." />
        <Links
          items={[
            { href: '/tim', label: 'Tim' },
            { href: '/tugas', label: 'Tugas' },
          ]}
        />
      </>
    );
  } else if (gerai) {
    tag = gerai.tag;
    panelBody = gerai.panelBody;
  } else if (lokasi === 'kantor') {
    const zone = BIDANG[room];
    const here = plans.slice(0, MAX_FIGURES).filter((p) => p.area === room).length;
    tag = `${zone.nama} · ${here} figur`;
    const rows = unavailable ? [] : roomRows(room, ctx, { lateOnly });
    const empty: Record<Bidang, string> = {
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
          title={zone.nama}
          sub={unavailable ? 'Data belum tersedia' : `${here} figur di ruangan`}
          href={zone.href}
        />
        <div className="mt-status">
          <Pill nada={!unavailable && here ? 'hijau' : 'abu'}>
            {unavailable ? 'Belum tersedia' : here ? 'Ada aktivitas' : 'Sepi'}
          </Pill>
          <span>
            {rows.length ? `${rows.length} catatan terkait` : 'Belum ada catatan terkait'}
          </span>
        </div>
        {!unavailable && <Stats items={roomStats(room, ctx).map(statDari)} />}
        {room === 'kerja' && (
          <div className="mt-seg" role="group" aria-label="Saring tugas">
            <button type="button" aria-pressed={!lateOnly} onClick={() => setLateOnly(false)}>
              Semua terbuka
            </button>
            <button type="button" aria-pressed={lateOnly} onClick={() => setLateOnly(true)}>
              Lewat tenggat
            </button>
          </div>
        )}
        {room === 'stok' && (
          <div className="mt-actions">
            <button type="button" className="mt-btn is-primary" onClick={() => go('gudang')}>
              <Warehouse size={15} /> Masuk gudang
            </button>
            <button type="button" className="mt-btn" onClick={() => go('pendingin')}>
              <Snowflake size={15} /> Cold storage
            </button>
          </div>
        )}
        {room === 'karyawan' && (
          <>
            <div className="mt-actions">
              <button type="button" className="mt-btn is-primary" onClick={() => go('gerai')}>
                <Store size={15} /> Naik ke gerai
              </button>
            </div>
            <Section title="Ringkasan gerai" meta="status" />
            <Rows
              rows={geraiInfo.map((g) => ({
                key: g.id,
                title: g.nama,
                sub:
                  g.id === 'kantor'
                    ? 'Selalu buka'
                    : g.unit
                      ? `Status ${g.status}`
                      : 'Belum tercatat di web',
                pill: g.buka ? 'Buka' : 'Terkunci',
                nada: g.buka ? 'hijau' : 'abu',
                ikon: ikonGerai(g),
                onClick: () => {
                  setLokasi('gerai');
                  setSelected(`g:${g.id}`);
                },
              }))}
              empty="Data gerai belum tersedia."
            />
          </>
        )}
        {(room === 'kas' || room === 'stok') && operations === false && (
          <p className="mt-note is-warn">{empty[room]}</p>
        )}
        {!unavailable && room === 'kerja' && (sprintAktif.length > 0 || milestoneDekat.length > 0) && (
          <>
            <Section title="Sprint & milestone" meta="tenggat" />
            <Rows
              rows={[
                ...sprintAktif.map((sp) => {
                  const tugas = (data['work-items'] || []).filter((t) => t.data.sprint_id === sp.id);
                  const selesai = tugas.filter((t) => t.data.status === 'selesai').length;
                  return {
                    key: sp.id,
                    title: String(sp.data.title),
                    sub: `${String(sp.data.goal || 'Sprint aktif')}${sp.data.end_date ? ` · sampai ${formatDate(String(sp.data.end_date))}` : ''}`,
                    ikon: 'bendera' as const,
                    bar: tugas.length ? selesai / tugas.length : 0,
                    barText: `${selesai}/${tugas.length}`,
                    nada: 'biru' as const,
                    href: '/tugas',
                  };
                }),
                ...milestoneDekat.map((m) => {
                  const sisa = Math.round((Date.parse(String(m.data.due_date)) - Date.parse(date)) / 86400000);
                  return {
                    key: m.id,
                    title: String(m.data.title),
                    sub: `Tenggat ${formatDate(String(m.data.due_date))}`,
                    ikon: 'bendera' as const,
                    pill: sisa < 0 ? 'Lewat' : sisa === 0 ? 'Hari ini' : `${sisa} hari lagi`,
                    nada: (sisa < 0 ? 'merah' : sisa <= 3 ? 'kuning' : 'biru') as Nada,
                    href: recordHref('milestones', m),
                  };
                }),
              ]}
              empty=""
            />
          </>
        )}
        {!unavailable && room === 'manajer' && mitra.length > 0 && (
          <>
            <Section title="Mitra" meta="kontak terakhir" />
            <Rows
              rows={mitra.slice(0, 5).map((m) => {
                const interaksi = (data.interactions || [])
                  .filter((i) => i.data.stakeholder_id === m.id)
                  .sort((a, b) => String(b.data.date).localeCompare(String(a.data.date)))[0];
                return {
                  key: m.id,
                  title: String(m.data.title),
                  sub: interaksi
                    ? `${String(interaksi.data.title)} · ${formatDate(String(interaksi.data.date))}`
                    : String(m.data.category || 'Belum ada interaksi'),
                  ikon: 'jabat' as const,
                  pill: m.data.follow_up ? 'Tindak lanjut' : undefined,
                  nada: 'kuning' as const,
                  href: recordHref('stakeholders', m),
                };
              })}
              empty=""
            />
          </>
        )}
        {!unavailable && room === 'gym' && pelatihan.length > 0 && (
          <>
            <Section title="Pelatihan hari ini" meta="peserta" />
            <Rows
              rows={pelatihan.map((t) => ({
                key: t.id,
                title: String(t.data.title),
                sub: String((data.staff || []).find((st) => st.id === t.data.staff_id)?.data.title || 'Peserta belum diisi'),
                ikon: 'dumbel' as const,
                pill: t.data.status === 'selesai' ? 'Selesai' : 'Berlangsung',
                nada: (t.data.status === 'selesai' ? 'hijau' : 'biru') as Nada,
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
          <p className="mt-empty">Data belum tersedia.</p>
        ) : (
          <Rows rows={view(rows)} empty={empty[room]} />
        )}
        <Links items={ROOM_LINKS[room]} />
      </>
    );
  } else {
    const isCold = lokasi === 'pendingin';
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
          <div className="mt-status">
            <Pill nada="biru">{DELIVERY_LABEL[String(delivery.data.status)] || 'Tercatat'}</Pill>
            <span>{spot ? truckNote(spot, model) : 'Belum di lokasi'}</span>
          </div>
          {stage >= 0 && (
            <div className="mt-progress">
              <span className="mt-bar is-biru" aria-hidden="true">
                <i style={{ width: `${(stage / (deliverySteps.length - 1)) * 100}%` }} />
              </span>
              <small>
                Tahap {stage + 1} dari {deliverySteps.length}
              </small>
            </div>
          )}
          <dl className="mt-kv">
            {deliveryInfo(delivery).map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <Links
            items={[
              { href: '/pengiriman?baru=1', label: 'Pengiriman baru', baru: true },
              { href: '/pengiriman', label: 'Pengiriman' },
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
            href="/pengiriman"
          />
          <div className="mt-status">
            <Pill nada="hijau">Tersedia</Pill>
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
            href="/barang"
          />
          {stock ? (
            <>
              <div className="mt-status">
                <Pill nada={!items.length ? 'abu' : low ? 'kuning' : 'hijau'}>
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
                    nada: low ? 'kuning' : 'hijau',
                  },
                ]}
              />
              <Section title="Isi rak" meta="satuan" />
              <Rows rows={view(items.map(itemRow))} empty="Belum ada barang tercatat di rak ini." />
              {(() => {
                const ids = new Set(items.map((i) => i.id));
                const riwayat = [
                  ...(data['stock-movements'] || []).filter((m) => ids.has(String(m.data.item_id))).map((m) => ({ row: m, jenis: 'mutasi' as const })),
                  ...(data['stock-counts'] || []).filter((c) => ids.has(String(c.data.item_id))).map((c) => ({ row: c, jenis: 'opname' as const })),
                ]
                  .sort((a, b) => String(b.row.data.date).localeCompare(String(a.row.data.date)))
                  .slice(0, 5);
                if (!riwayat.length) return null;
                return (
                  <>
                    <Section title="Riwayat stok" meta="mutasi & opname" />
                    <Rows rows={riwayat.map(({ row, jenis }) => riwayatStok(row, jenis))} empty="" />
                  </>
                );
              })()}
            </>
          ) : (
            <p className="mt-empty">
              {unavailable ? 'Data belum tersedia.' : 'Pencatatan barang belum aktif di server.'}
            </p>
          )}
          <Links
            items={[
              { href: '/barang', label: 'Barang' },
              { href: '/stok-opname', label: 'Stok opname' },
            ]}
          />
        </>
      );
    }
  }

  // ---------- Pelacak (kiri bawah) ----------
  let tracker: ReactNode;
  const trackerLabel =
    lokasi === 'gerai'
      ? 'Kesiapan'
      : lokasi === 'kantor' || lokasi === 'pulau'
        ? 'Agenda'
        : 'Pengiriman';
  if (gerai) tracker = gerai.tracker;
  else if (lokasi === 'kantor' || lokasi === 'pulau') {
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
      <section className="mt-card mt-tracker" aria-label="Agenda rapat hari ini">
        <header>
          <IconTile icon="kalender" size={24} />
          <h2>Agenda rapat</h2>
          <small>{formatDate(date)} · Ruang rapat</small>
        </header>
        {unavailable ? (
          <p className="mt-empty">Data belum tersedia.</p>
        ) : !steps.length ? (
          <p className="mt-empty">Belum ada rapat hari ini.</p>
        ) : (
          <div className="mt-tracker-body">
            <Stepper steps={steps} label="Urutan rapat" />
            {focus && (
              <Link className="mt-mini" href={recordHref('meetings', focus.row)}>
                <span className="mt-mini-art" aria-hidden="true">
                  <Ikon3D kind="kalender" size={44} />
                </span>
                <span>
                  <strong>{String(focus.row.data.title)}</strong>
                  <small>
                    {String(focus.row.data.location || focus.row.data.mode || 'Ruang rapat')}
                  </small>
                  <Pill nada={focus.state === 'berlangsung' ? 'hijau' : 'biru'}>
                    {focus.state === 'berlangsung' ? 'Berlangsung' : 'Berikutnya'}
                  </Pill>
                  <small>
                    {focus.time}–{focus.end} WIB
                  </small>
                </span>
                <ChevronRight size={16} className="mt-mini-go" aria-hidden="true" />
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
      if (lokasi === 'gudang' && model.trucks.some((t) => t.delivery.id === id))
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
      <section className="mt-card mt-tracker" aria-label="Pelacak pengiriman">
        <header>
          <IconTile icon="truk" size={24} />
          <h2>Pelacak pengiriman</h2>
          {d ? <small>{String(d.data.license_plate || d.data.title)}</small> : null}
          <Pager index={index} total={deliveries.length} onMove={move} label="Pengiriman" />
        </header>
        {!shipping ? (
          <p className="mt-empty">
            {unavailable ? 'Data belum tersedia.' : 'Pengiriman belum aktif di server.'}
          </p>
        ) : !d ? (
          <p className="mt-empty">Tidak ada pengiriman aktif.</p>
        ) : (
          <div className="mt-tracker-body">
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
            <Link className="mt-mini" href={recordHref('deliveries', d)}>
              <span className="mt-mini-art" aria-hidden="true">
                <Ikon3D kind="truk" size={44} />
              </span>
              <span>
                <strong>{String(d.data.title)}</strong>
                <small>
                  {String(d.data.driver_name || d.data.vehicle || 'Pengemudi belum diisi')}
                </small>
                <Pill nada={deliveryRow(d).nada}>{deliveryRow(d).pill}</Pill>
                <small>{deliveryRow(d).note}</small>
              </span>
              <ChevronRight size={16} className="mt-mini-go" aria-hidden="true" />
            </Link>
          </div>
        )}
      </section>
    );
  }

  // ---------- Daftar bertab (kanan bawah) ----------
  let tabs: Tab[];
  let tabTitle: string;
  if (gerai) {
    tabTitle = 'Kawasan gerai';
    tabs = gerai.tabs;
  } else if (lokasi === 'kantor' || lokasi === 'pulau') {
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
          sub: `${namaArea(p.area)} · ${p.reason}`,
          pill: ACTION_LABEL[p.action],
          nada: ACTION_NADA[p.action],
          avatar: p.name.slice(0, 1).toUpperCase(),
          active: selected === `orang:${p.id}`,
          onClick: () => choose(`orang:${p.id}`),
        })),
      },
      {
        id: 'ruang',
        label: 'Ruang',
        count: String(Object.keys(BIDANG).length),
        empty: '',
        rows: (Object.keys(BIDANG) as Bidang[]).map((id) => {
          const n = plans.slice(0, MAX_FIGURES).filter((p) => p.area === id).length;
          return {
            key: id,
            title: BIDANG[id].nama,
            sub: unavailable ? 'Data belum tersedia' : `${n} figur`,
            ikon: ROOM_3D[id],
            pill: n ? 'Aktif' : 'Sepi',
            nada: n ? 'hijau' : 'abu',
            active: lokasi === 'kantor' && selected === id,
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
        count: dash(proyek.length),
        empty: unavailable ? 'Data belum tersedia.' : 'Belum ada proyek berjalan.',
        rows: proyek.map(({ row, done, total, pct }) => ({
          key: row.id,
          title: String(row.data.title),
          sub: `${done}/${total} tugas selesai${row.data.target_date ? ` · target ${formatDate(String(row.data.target_date))}` : ''}`,
          ikon: 'folder' as const,
          bar: pct / 100,
          barText: `${pct}%`,
          nada: pct >= 100 ? 'hijau' : 'biru',
          href: `/proyek?id=${encodeURIComponent(row.id)}`,
        })),
      },
    ];
  } else if (lokasi === 'gudang') {
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
          nada: low ? 'kuning' : items.length ? 'hijau' : 'abu',
          bar: items.length ? (items.length - low) / items.length : 0,
          barText: `${items.length - low}/${items.length}`,
          ikon: 'rak',
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
              nada: dk.spot ? 'biru' : 'hijau',
              ikon: dk.spot ? 'truk' : 'gudang',
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
              nada: s.place === 'dok' ? 'biru' : 'kuning',
              ikon: 'truk',
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
        count: dash(mutasi.length, shipping),
        empty: shipping ? 'Belum ada mutasi stok tercatat.' : 'Pengiriman belum aktif.',
        rows: shipping ? mutasi.slice(0, 20).map((m) => riwayatStok(m, 'mutasi')) : [],
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
                nada: n ? 'kuning' : items.length ? 'hijau' : 'abu',
                bar: items.length ? (items.length - n) / items.length : 0,
                barText: `${items.length - n}/${items.length}`,
                ikon: 'salju',
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
        ...openRisks.map((r): Baris => ({
          key: `risk-${r.id}`,
          entity: 'risks',
          item: r,
          note: String(r.data.assignee || 'Belum ada penanggung jawab'),
          pill: 'Risiko terbuka',
          nada: 'kuning',
        })),
        ...openIssues.map((r): Baris => ({
          key: `issue-${r.id}`,
          entity: 'issues',
          item: r,
          note: `${String(r.data.assignee || 'Belum ada penanggung jawab')}${r.data.due_date ? ` · ${formatDate(String(r.data.due_date))}` : ''}`,
          pill: 'Isu terbuka',
          nada: 'merah',
        })),
      ]);
  return (
    <main
      className="mt-root"
      data-lokasi={lokasi}
      data-fase={suasana.fase}
      data-cuaca={suasana.cuaca}
      data-panel={panel ?? undefined}
      suppressHydrationWarning
    >
      <Stage
        lokasi={lokasi}
        input={input}
        plans={plans}
        selected={selected}
        tag={tag}
        suasana={suasana}
        pins={pins}
        onPick={choose}
      />
      <header className="mt-top" data-search={searchOpen || undefined}>
        <Link className="mt-brand" href="/beranda" aria-label="Kembali ke Beranda">
          <Ikon3D kind="kotak" size={34} />
          <span>
            <strong>Dunia Koperasi</strong>
            {(DEMO || preview) && (
              <small className="mt-demo">{DEMO ? 'Mode demo' : 'Pratinjau'}</small>
            )}
          </span>
        </Link>
        <div className="mt-search">
          <Search size={17} aria-hidden="true" />
          <input
            ref={searchInput}
            aria-label="Cari catatan"
            placeholder="Cari tugas, rapat, barang, pengiriman…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd aria-hidden="true">/</kbd>
          <button
            type="button"
            className="mt-search-close"
            aria-label="Tutup pencarian"
            onClick={() => {
              setSearchOpen(false);
              setQuery('');
            }}
          >
            <X size={16} />
          </button>
          {query.trim() && (
            <ul className="mt-card mt-results" aria-label="Hasil pencarian">
              {results.length ? (
                results.map((r) => (
                  <li key={r.key}>
                    <Link href={recordHref(r.entity, r.item)}>
                      <strong>{String(r.item.data.title)}</strong>
                      <small>{r.kind}</small>
                    </Link>
                  </li>
                ))
              ) : (
                <li className="mt-empty">Tidak ada catatan yang cocok.</li>
              )}
            </ul>
          )}
        </div>
        <button
          type="button"
          className="mt-icon-btn mt-search-open"
          aria-label="Buka pencarian"
          onClick={() => {
            setSearchOpen(true);
            requestAnimationFrame(() => searchInput.current?.focus());
          }}
        >
          <Search size={18} />
        </button>
        <LokasiPicker
          value={lokasi}
          onChange={(id) => go(id as LokasiMonitoring)}
          options={(Object.keys(LOKASI) as LokasiMonitoring[]).map((id) => ({
            id,
            kode: LOKASI[id].kode,
            label: LOKASI[id].label,
            sub: subLokasi[id],
          }))}
        />
        <button
          type="button"
          className="mt-icon-btn mt-add"
          aria-label="Tambah catatan"
          title="Tambah tugas, rapat, kas, atau barang"
          onClick={() => setAksiOpen(true)}
        >
          <Plus size={18} />
        </button>
        <span className="mt-live" title="Waktu Asia/Jakarta" suppressHydrationWarning>
          <i aria-hidden="true" /> {jam(now)} <small>WIB</small>
        </span>
        <div className="mt-menu" ref={bellRoot}>
          <button
            ref={bellTrigger}
            type="button"
            className="mt-icon-btn mt-bell"
            aria-label={notif.length ? `Perlu perhatian: ${notif.length}` : 'Perlu perhatian'}
            aria-expanded={bellOpen}
            onClick={() => setBellOpen(!bellOpen)}
          >
            <Bell size={18} />
            {notif.length > 0 && <b>{notif.length > 9 ? '9+' : notif.length}</b>}
          </button>
          {bellOpen && (
            <div className="mt-card mt-pop mt-bell-pop" role="dialog" aria-label="Perlu perhatian">
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
        <div className="mt-menu" ref={userRoot}>
          <button
            ref={userTrigger}
            type="button"
            className="mt-user"
            aria-label={`Menu ${model.manager}`}
            aria-expanded={userOpen}
            onClick={() => setUserOpen(!userOpen)}
          >
            <span className="mt-avatar" aria-hidden="true">
              {model.manager.slice(0, 1).toUpperCase()}
            </span>
            <span className="mt-user-text">
              <strong>{model.manager}</strong>
              <small>Manajer</small>
            </span>
            <ChevronDown size={16} aria-hidden="true" />
          </button>
          {userOpen && (
            <div className="mt-card mt-pop mt-user-pop" role="dialog" aria-label="Menu pengguna">
              <p className="mt-pop-title">
                <strong>{model.manager}</strong>
                <small>{model.title}</small>
              </p>
              {refresh && (
                <button
                  type="button"
                  className="mt-pop-item"
                  onClick={() => void reload()}
                  disabled={busy}
                  aria-busy={busy}
                >
                  <RefreshCw size={16} /> {busy ? 'Memuat…' : 'Muat ulang data'}
                </button>
              )}
              <label className="mt-pop-field">
                <span>Cuaca simulasi</span>
                <select
                  aria-label="Cuaca simulasi"
                  value={cuaca}
                  onChange={(e) => setCuaca(e.target.value as Cuaca)}
                >
                  <option value="cerah">Cerah</option>
                  <option value="berawan">Berawan</option>
                  <option value="hujan">Hujan</option>
                </select>
              </label>
              <label className="mt-pop-field">
                <span>Suasana waktu</span>
                <select
                  aria-label="Suasana waktu"
                  value={fase}
                  onChange={(e) => setFase(e.target.value as typeof fase)}
                >
                  <option value="otomatis">Ikuti jam WIB</option>
                  <option value="pagi">Pagi</option>
                  <option value="siang">Siang</option>
                  <option value="senja">Senja</option>
                  <option value="malam">Malam</option>
                </select>
              </label>
              <Link className="mt-pop-item" href="/pengaturan">
                <Settings size={16} /> Pengaturan
              </Link>
              <Link className="mt-pop-item" href="/beranda">
                <Home size={16} /> Kembali ke Beranda
              </Link>
            </div>
          )}
        </div>
      </header>
      <section className="mt-left" aria-label="Status data">
        {(error || refreshError) && (
          <p className="mt-card mt-alert" role="alert">
            {error || refreshError}
          </p>
        )}
        {loading && (
          <p className="mt-card mt-alert" role="status">
            Memuat data kantor…
          </p>
        )}
        {partial && (
          <div className="mt-card mt-alert">
            <p>Ringkasan baru mencakup data yang sudah dimuat.</p>
            {(Object.keys(more) as Entity[]).map((entity) => (
              <button
                key={entity}
                type="button"
                className="mt-btn"
                disabled={!!fetching}
                onClick={() => void loadMore?.(entity)}
              >
                Muat lanjutan {ENTITY_LABEL[entity] || entity}
              </button>
            ))}
          </div>
        )}
      </section>
      {aksiOpen && <ManagerActionModal open onClose={() => setAksiOpen(false)} />}
      <nav className="mt-dock mt-card" aria-label="Panel dunia" ref={dock}>
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
          >
            <Ikon3D kind={t.icon} size={28} />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
      <section
        id="world-inspector"
        className="mt-card mt-inspector"
        hidden={!panel}
        aria-label="Informasi dunia"
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            closePanel();
          }
        }}
      >
        <header className="mt-inspector-head">
          <strong>
            {panel === 'ringkasan'
              ? 'Ringkasan'
              : panel === 'daftar'
                ? 'Daftar'
                : panel === 'agenda'
                  ? trackerLabel
                  : 'Detail pilihan'}{' '}
            · {LOKASI[lokasi].label}
          </strong>
          <button
            type="button"
            className="mt-icon-btn"
            onClick={closePanel}
            aria-label="Tutup panel informasi"
          >
            <X size={18} />
          </button>
        </header>
        <div className="mt-inspector-body">
          <div hidden={panel !== 'detail'}>
            <aside className="mt-panel" aria-label="Detail pilihan">
              {panelBody}
            </aside>
          </div>
          <div hidden={panel !== 'ringkasan'}>
            <div className="mt-kpis">
              {kpis.map((k) => (
                <KpiCard key={k.label} {...k} />
              ))}
            </div>
            {panel === 'ringkasan' && (
              <GrafikRingkasan grafik={grafikLokasi({ lokasi, data, model, hari: date, stock, shipping, unavailable })} />
            )}
          </div>
          <div hidden={panel !== 'agenda'}>{tracker}</div>
          <div hidden={panel !== 'daftar'}>
            <TabsCard
              key={lokasi}
              icon={lokasi === 'kantor' ? 'tim' : LOKASI[lokasi].icon}
              title={tabTitle}
              tabs={tabs}
              label={`Daftar ${LOKASI[lokasi].label.toLowerCase()}`}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
