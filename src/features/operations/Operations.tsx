'use client';
import { Button } from '@/components/ui/Button';
import { AppIcon } from '@/components/ui/AppIcon';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import Link from 'next/link';
import { useState, useSyncExternalStore } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowUpRight,
  Plus,
  Users,
  User,
  Wallet,
  Package,
  ClipboardCheck,
  Download,
  Search,
  FilePenLine,
  UserCheck,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  LayoutGrid,
  List,
  Phone,
  Calendar,
} from 'lucide-react';
import { Ikon3D, ThumbBarang, thumbBarang, type Ikon3DKind } from '@/components/ui/Ikon3D';
import { IKON_HALAMAN } from '@/components/ui/IkonHalaman';
import { LihatDiDunia, tautanDunia } from '@/components/ui/LihatDiDunia';
import { RecordDrawer } from '../records/RecordDrawer';
import { isiDariQuery } from '../records/terkait';
import { Editor } from '../records/Editor';
import { catalog, labels, formatChoiceLabel } from '../records/catalog';
import { type Entity, type Item } from '../records/schemas';
import type { Workspace } from '../workspace/useWorkspace';
import { cashSummary, csvCell, rupiah, stockDifference } from './ledger';
import { formatDate, today } from '@/lib/date';
import { Select } from '@/components/ui/Select';

/** Ikon garis lama → ikon biru kilap yang senada (buku pencatatan, metrik, catatan terbaru). */
const IKON_OP = new Map<unknown, Ikon3DKind>([
  [Users, 'kartu'],
  [UserCheck, 'tim'],
  [Wallet, 'dompet'],
  [TrendingUp, 'dompet'],
  [TrendingDown, 'dompet'],
  [Package, 'kotak'],
  [ClipboardCheck, 'rak'],
  [AlertTriangle, 'peringatan'],
  [CheckCircle2, 'cek'],
]);
function IkonOp({ Icon, size }: { Icon: React.ComponentType<{ size?: number }>; size: number }) {
  const kind = IKON_OP.get(Icon);
  return kind ? <Ikon3D kind={kind} size={size} rapat /> : <Icon size={size} />;
}
const INDO_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

function getIndonesianMonthOptions(dates: string[]): { value: string; label: string }[] {
  const current = new Date();
  const monthsSet = new Set<string>();

  for (let i = 0; i < 12; i++) {
    const d = new Date(current.getFullYear(), current.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthsSet.add(key);
  }

  for (let i = 1; i <= 2; i++) {
    const d = new Date(current.getFullYear(), current.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthsSet.add(key);
  }

  dates.forEach((d) => {
    if (d && typeof d === 'string' && /^\d{4}-\d{2}/.test(d)) {
      monthsSet.add(d.slice(0, 7));
    }
  });

  const thisMonthKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
  const sorted = Array.from(monthsSet).sort().reverse();

  return [
    { value: '', label: 'Semua Bulan' },
    ...sorted.map((key) => {
      const [y, m] = key.split('-');
      const monthName = INDO_MONTHS[parseInt(m, 10) - 1] || m;
      const isCurrent = key === thisMonthKey;
      return {
        value: key,
        label: `${monthName} ${y}${isCurrent ? ' (bulan ini)' : ''}`,
      };
    }),
  ];
}

const modules = [
  {
    path: 'anggota',
    entity: 'members',
    title: 'Anggota',
    description: 'Nama, nomor anggota, dan status keanggotaan.',
    Icon: Users,
  },
  {
    path: 'keuangan',
    entity: 'cash-entries',
    title: 'Buku kas',
    description: 'Uang masuk, uang keluar, dan bukti transaksi.',
    Icon: Wallet,
  },
  {
    path: 'barang',
    entity: 'inventory-items',
    title: 'Barang',
    description: 'Kode barang, satuan, dan stok buku.',
    Icon: Package,
  },
  {
    path: 'stok-opname',
    entity: 'stock-counts',
    title: 'Stok opname',
    description: 'Hasil hitung fisik dan selisih stok.',
    Icon: ClipboardCheck,
  },
] as const;
// Ponsel, tablet, dan laptop kecil (konten < ~950 px karena sidebar) memakai kartu agar tabel lebar tidak perlu digeser.
function subscribeCompactView(callback: () => void) {
  if (typeof window.matchMedia !== 'function') return () => {};
  const query = window.matchMedia('(max-width: 1279px)');
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
}
const compactView = () => typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 1279px)').matches;
const serverCompactView = () => false;
export function Operations({
  slug,
  data,
  ready,
  refresh,
  draftScope,
}: {
  slug: string;
  data: Workspace;
  ready: boolean;
  refresh: () => Promise<void>;
  draftScope?: string;
}) {
  const book = modules.find((entry) => entry.path === slug);
  const query = useSearchParams();
  const router = useRouter();
  const [edit, setEdit] = useState<Item | null | undefined>(() => {
    const requested = book && data[book.entity]?.find((row) => row.id === query.get('record'));
    // ?record= membuka laci detail; ?ubah=1 langsung membuka form.
    if (ready && requested) return query.get('ubah') === '1' ? requested : undefined;
    const product = data['inventory-items']?.find((row) => row.id === query.get('barang'));
    if (ready && slug === 'stok-opname' && product) {
      return {
        id: '',
        created_at: '',
        updated_at: '',
        data: {
          title: `Opname ${product.data.title}`,
          item_id: product.id,
          date: today(),
          book_quantity: product.data.book_quantity,
          assignee: '',
          notes: '',
        },
      };
    }
    if (ready && book && query.get('baru') === '1') {
      return {
        id: '',
        created_at: '',
        updated_at: '',
        data: {
          title: '',
          date: today(),
          ...(book.entity === 'cash-entries'
            ? { direction: query.get('arah') === 'keluar' ? 'keluar' : 'masuk' }
            : {}),
          // Tautan saran: ?isi.<kolom>=… mengisi form baru.
          ...isiDariQuery(query),
        },
      };
    }
    return undefined;
  });

  const [lihat, setLihat] = useState<Item | null>(() => {
    const requested = book && data[book.entity]?.find((row) => row.id === query.get('record'));
    return ready && requested && query.get('ubah') !== '1' ? requested : null;
  });
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState('');
  const [filter, setFilter] = useState('');
  const [unit, setUnit] = useState('');
  const [chosenView, setViewMode] = useState<'table' | 'cards' | null>(null);
  const compact = useSyncExternalStore(subscribeCompactView, compactView, serverCompactView);
  const viewMode = chosenView ?? (compact ? 'cards' : 'table');
  const [inventoryFilter, setInventoryFilter] = useState<'' | 'aman' | 'menipis' | 'habis'>('');
  const [opnameFilter, setOpnameFilter] = useState<'' | 'sesuai' | 'selisih'>('');
  const [captureEntity, setCaptureEntity] = useState<Entity>();
  const entity = book?.entity || captureEntity;
  const recent = modules
    .flatMap((entry) => (data[entry.entity] || []).map((row) => ({ row, entry })))
    .filter(({ row, entry }) =>
      `${row.data.title} ${entry.title}`
        .toLocaleLowerCase('id')
        .includes(search.toLocaleLowerCase('id')),
    )
    .sort((a, b) => b.row.updated_at.localeCompare(a.row.updated_at))
    .slice(0, 8);
  const all = entity ? data[entity] || [] : [];
  const rows = all
    .filter((row) => {
      const matchSearch =
        !search ||
        JSON.stringify(row.data).toLocaleLowerCase('id').includes(search.toLocaleLowerCase('id'));
      if (!matchSearch) return false;

      const matchMonth =
        !month || String(row.data.date || row.data.created_at || '').startsWith(month);
      if (!matchMonth) return false;

      const matchFilter = !filter || row.data.status === filter || row.data.direction === filter;
      if (!matchFilter) return false;

      const matchUnit =
        !unit ||
        row.data.unit_id === unit ||
        data['inventory-items']?.find((item) => item.id === row.data.item_id)?.data.unit_id ===
          unit;
      if (!matchUnit) return false;

      if (entity === 'inventory-items' && inventoryFilter) {
        const qty = Number(row.data.book_quantity || 0);
        const min = Number(row.data.minimum_quantity || 0);
        if (inventoryFilter === 'habis' && qty > 0) return false;
        if (inventoryFilter === 'menipis' && (qty <= 0 || qty > min)) return false;
        if (inventoryFilter === 'aman' && qty <= min) return false;
      }

      if (entity === 'stock-counts' && opnameFilter) {
        const diff = stockDifference(row);
        if (opnameFilter === 'sesuai' && diff !== 0) return false;
        if (opnameFilter === 'selisih' && diff === 0) return false;
      }

      return true;
    })
    .sort((a, b) =>
      String(b.data.date || b.updated_at).localeCompare(String(a.data.date || a.updated_at)),
    );
  const allDates = all.map((r) => String(r.data.date || r.data.created_at || ''));
  const monthOptions = getIndonesianMonthOptions(allDates);
  const summary = cashSummary(entity === 'cash-entries' ? rows : []);

  function display(row: Item, field: string) {
    if (field === 'amount') return rupiah(Number(row.data.amount));
    if (field === 'price') return rupiah(Number(row.data.price || 0));
    if (field === 'date') return formatDate(String(row.data.date));
    if (field === 'item_id')
      return String(
        data['inventory-items']?.find((item) => item.id === row.data.item_id)?.data.title ||
          'Barang tidak ditemukan',
      );
    if (field === 'unit_id')
      return String(
        data.units?.find((item) => item.id === row.data.unit_id)?.data.title || 'Tidak ditentukan',
      );
    if (field === 'difference') return stockDifference(row).toLocaleString('id-ID');
    if (field === 'cash_summary') {
      const memberEntries = (data['cash-entries'] || []).filter((c) => c.data.member_id === row.id);
      return `${memberEntries.length} transaksi`;
    }
    if (field === 'relation') {
      const m = row.data.member_id ? data.members?.find((x) => x.id === row.data.member_id) : null;
      const i = row.data.item_id
        ? data['inventory-items']?.find((x) => x.id === row.data.item_id)
        : null;
      return (
        [m ? `Anggota: ${m.data.title}` : '', i ? `Barang: ${i.data.title}` : '']
          .filter(Boolean)
          .join('; ') || '—'
      );
    }
    if (field === 'stock_status') {
      const qty = Number(row.data.book_quantity || 0);
      const min = Number(row.data.minimum_quantity || 0);
      return qty <= 0 ? 'Habis' : qty <= min ? 'Menipis' : 'Aman';
    }
    return String(row.data[field] ?? '—');
  }

  function getColumnClass(field: string): string {
    if (
      [
        'amount',
        'book_quantity',
        'minimum_quantity',
        'counted_quantity',
        'difference',
        'price',
      ].includes(field)
    ) {
      return 'col-num';
    }
    if (['direction', 'status', 'stock_status'].includes(field)) {
      return 'col-badge';
    }
    if (field === 'date') {
      return 'col-date';
    }
    if (field === 'sku' || field === 'member_number') {
      return 'col-code';
    }
    if (field === 'cash_summary' || field === 'relation') {
      return 'col-relation';
    }
    return 'col-text';
  }

  function renderCell(row: Item, field: string) {
    if (field === 'title') {
      const member = row.data.member_id
        ? data.members?.find((m) => m.id === row.data.member_id)
        : null;
      const item = row.data.item_id
        ? data['inventory-items']?.find((i) => i.id === row.data.item_id)
        : null;
      return (
        <Button
          type="button"
          className="table-row-title-btn"
          onClick={() => setLihat(row)}
          title="Klik untuk mengubah catatan"
        >
          {entity === 'members' && (
            <span className="member-avatar-mini" aria-hidden>
              {String(row.data.title || 'A').charAt(0).toUpperCase()}
            </span>
          )}
          {entity === 'cash-entries' && (
            <span
              className={`cash-dir-mini ${row.data.direction === 'masuk' ? 'in' : 'out'}`}
              aria-hidden
            >
              {row.data.direction === 'masuk' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            </span>
          )}
          {entity === 'inventory-items' && (
            <span className="item-icon-mini item-thumb" aria-hidden>
              <ThumbBarang kind={thumbBarang(String(row.data.title), String(row.data.measurement || ''))} size={30} />
            </span>
          )}
          {entity === 'stock-counts' && (
            <span className="opname-icon-mini" aria-hidden>
              <ClipboardCheck size={13} />
            </span>
          )}
          <span className="table-title-text-group">
            <span className="table-title-main">{display(row, field)}</span>
            {entity === 'cash-entries' && (member || item) && (
              <span className="table-title-subtitle">
                {member && (
                  <span className="inline-flex items-center gap-1">
                    <User size={11} className="inline-icon" />
                    {String(member.data.title)}
                  </span>
                )}
                {member && item && ' · '}
                {item && (
                  <span className="inline-flex items-center gap-1">
                    <Package size={11} className="inline-icon" />
                    {String(item.data.title)}
                  </span>
                )}
              </span>
            )}
          </span>
        </Button>
      );
    }
    if (field === 'status' && entity === 'members') {
      const isAktif = row.data.status === 'aktif';
      return (
        <span className={`table-badge ${isAktif ? 'badge-active' : 'badge-inactive'}`}>
          {isAktif ? 'Aktif' : 'Nonaktif'}
        </span>
      );
    }
    if (field === 'cash_summary' && entity === 'members') {
      const memberEntries = (data['cash-entries'] || []).filter((c) => c.data.member_id === row.id);
      const totalIn = memberEntries
        .filter((c) => c.data.direction === 'masuk')
        .reduce((sum, c) => sum + Number(c.data.amount || 0), 0);
      return (
        <div className="table-cash-summary">
          <span className="cash-count-badge">
            {memberEntries.length ? `${memberEntries.length} transaksi` : 'Belum ada'}
          </span>
          {totalIn > 0 && <small className="cash-sum-val">{rupiah(totalIn)}</small>}
        </div>
      );
    }
    if (field === 'direction' && entity === 'cash-entries') {
      const isMasuk = row.data.direction === 'masuk';
      return (
        <span className={`table-badge ${isMasuk ? 'badge-income' : 'badge-expense'}`}>
          {isMasuk ? '+ Masuk' : '- Keluar'}
        </span>
      );
    }
    if (field === 'amount' && entity === 'cash-entries') {
      const isMasuk = row.data.direction === 'masuk';
      return (
        <span className={`table-amount ${isMasuk ? 'amount-in' : 'amount-out'}`}>
          {isMasuk ? '+ ' : '- '}
          {rupiah(Number(row.data.amount))}
        </span>
      );
    }
    if (field === 'relation' && entity === 'cash-entries') {
      const member = row.data.member_id
        ? data.members?.find((m) => m.id === row.data.member_id)
        : null;
      const item = row.data.item_id
        ? data['inventory-items']?.find((i) => i.id === row.data.item_id)
        : null;
      if (!member && !item) {
        return <span className="relation-empty">—</span>;
      }
      return (
        <div className="table-relations-pill-group">
          {member && (
            <span className="relation-pill member-pill" title={`Anggota: ${member.data.title}`}>
              <Users size={12} />
              <span>{String(member.data.title)}</span>
            </span>
          )}
          {item && (
            <span className="relation-pill item-pill" title={`Barang: ${item.data.title}`}>
              <Package size={12} />
              <span>{String(item.data.title)}</span>
            </span>
          )}
        </div>
      );
    }
    if (field === 'price' && entity === 'inventory-items') {
      const priceVal = Number(row.data.price || 0);
      return <span className="table-price-val">{priceVal > 0 ? rupiah(priceVal) : '—'}</span>;
    }
    if (field === 'stock_status' && entity === 'inventory-items') {
      const qty = Number(row.data.book_quantity || 0);
      const minQty = Number(row.data.minimum_quantity || 0);
      const lastOpname = (data['stock-counts'] || [])
        .filter((c) => c.data.item_id === row.id)
        .sort((a, b) =>
          String(b.data.date || b.updated_at).localeCompare(String(a.data.date || a.updated_at)),
        )[0];

      let statusBadge = null;
      if (qty <= 0) {
        statusBadge = <span className="table-badge badge-diff-minus">Habis (0)</span>;
      } else if (qty <= minQty) {
        statusBadge = <span className="table-badge badge-warning">Menipis (≤ {minQty})</span>;
      } else {
        statusBadge = <span className="table-badge badge-active">Aman</span>;
      }

      return (
        <div className="table-stock-status">
          {statusBadge}
          {lastOpname && (
            <small className="last-opname-hint">
              Opname:{' '}
              {stockDifference(lastOpname) === 0
                ? 'Sesuai'
                : stockDifference(lastOpname) > 0
                  ? `+${stockDifference(lastOpname)}`
                  : stockDifference(lastOpname)}
            </small>
          )}
        </div>
      );
    }
    if (field === 'item_id' && entity === 'stock-counts') {
      const product = data['inventory-items']?.find((item) => item.id === row.data.item_id);
      return (
        <div className="table-opname-item">
          <strong>{product ? String(product.data.title) : 'Barang tidak ditemukan'}</strong>
          {product && (
            <small className="opname-item-sku">
              {String(product.data.sku || '—')} · Satuan:{' '}
              {String(product.data.measurement || 'unit')}
            </small>
          )}
        </div>
      );
    }
    if (field === 'difference' && entity === 'stock-counts') {
      const diff = stockDifference(row);
      if (diff === 0) {
        return <span className="table-badge badge-diff-zero">Sesuai (0)</span>;
      }
      if (diff < 0) {
        return (
          <span className="table-badge badge-diff-minus">
            Kurang ({diff.toLocaleString('id-ID')})
          </span>
        );
      }
      return (
        <span className="table-badge badge-diff-plus">Lebih (+{diff.toLocaleString('id-ID')})</span>
      );
    }
    if (field === 'sku' || field === 'member_number') {
      return <code className="table-code">{display(row, field)}</code>;
    }
    if (['book_quantity', 'minimum_quantity', 'counted_quantity'].includes(field)) {
      const qty = Number(row.data[field] ?? 0);
      const isLowStock =
        entity === 'inventory-items' &&
        field === 'book_quantity' &&
        qty <= Number(row.data.minimum_quantity);
      return (
        <span className={`table-num ${isLowStock ? 'num-warning' : ''}`}>
          {qty.toLocaleString('id-ID')}
          {isLowStock && (
            <span className="low-stock-dot" title="Stok mencapai batas minimum">
              {' '}
              !
            </span>
          )}
        </span>
      );
    }
    if (field === 'date') {
      return <span className="table-date">{display(row, field)}</span>;
    }
    if (field === 'account') {
      return <span className="table-account-tag">{display(row, field)}</span>;
    }
    return display(row, field);
  }

  const columns =
    entity === 'members'
      ? ['title', 'member_number', 'date', 'contact', 'cash_summary', 'status']
      : entity === 'cash-entries'
        ? ['date', 'title', 'direction', 'amount', 'account', 'relation', 'unit_id']
        : entity === 'inventory-items'
          ? ['title', 'sku', 'unit_id', 'measurement', 'price', 'book_quantity', 'stock_status']
          : ['date', 'item_id', 'book_quantity', 'counted_quantity', 'difference', 'assignee'];
  function exportCsv() {
    const text = [
      columns.map((field) => csvCell(field === 'difference' ? 'Selisih' : labels[field])).join(','),
      ...rows.map((row) => columns.map((field) => csvCell(display(row, field))).join(',')),
    ].join('\r\n');
    const url = URL.createObjectURL(
      new Blob(['\uFEFF' + text], { type: 'text/csv;charset=utf-8;' }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${slug}-${today()}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      {/* Navigasi antarbuku kini lewat tab hub di bawah judul (Usaha/Koperasi). */}
      {!ready && (
        <section className="activation-notice">
          <FilePenLine size={24} />
          <div>
            <h2>Pencatatan belum diaktifkan</h2>
            <p>
              Halaman sudah tersedia. Database perlu diperbarui sebelum Anda dapat menyimpan
              anggota, transaksi, barang, dan opname.
            </p>
            <small>
              Panduan aktivasi: docs/PENCATATAN.md · Data proyek dan tugas tetap dapat digunakan.
            </small>
          </div>
        </section>
      )}
      {!book ? (
        <>
          <div className="notebook-toolbar">
            <div>
              <h2>Buku pencatatan</h2>
              <p>Anggota, kas, dan persediaan.</p>
            </div>
            <label className="notebook-search">
              <Search size={16} />
              <Input
                aria-label="Cari catatan terakhir"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari catatan terakhir…"
              />
            </label>
          </div>
          <div className="notebook-layout">
            <section className="notebook-index" aria-label="Buku pencatatan">
              {modules.map(({ path, entity, title, description, Icon }, index) => (
                <article className="notebook-row" key={path}>
                  <Link className="notebook-link" href={'/' + path} title={`Buka buku ${title}`}>
                    <div className={`notebook-spine spine-${index}`}>
                      <IkonOp Icon={Icon} size={30} />
                    </div>
                    <div className="notebook-text">
                      <div className="notebook-title-wrap">
                        <strong className="notebook-card-title">{title}</strong>
                        <span className="notebook-count">
                          {ready ? `${(data[entity] || []).length} data` : '—'}
                        </span>
                      </div>
                      <small className="notebook-desc">{description}</small>
                    </div>
                  </Link>

                  <div className="notebook-actions">
                    <Button
                      variant="secondary"
                      className="notebook-add-btn"
                      disabled={
                        !ready || (entity === 'stock-counts' && !data['inventory-items']?.length)
                      }
                      title={
                        entity === 'stock-counts' && !data['inventory-items']?.length
                          ? 'Tambahkan barang terlebih dahulu'
                          : 'Tambah catatan'
                      }
                      aria-label={'Tambah ' + title.toLowerCase()}
                      onClick={() => {
                        setCaptureEntity(entity);
                        setEdit(null);
                      }}
                    >
                      <Plus size={14} />
                      <span>Tambah</span>
                    </Button>
                    <Link
                      className="notebook-open-btn"
                      href={'/' + path}
                      title={`Buka buku ${title}`}
                    >
                      <ArrowUpRight size={16} />
                    </Link>
                  </div>
                </article>
              ))}
              <details className="notebook-help">
                <summary>Cara mencatat stok opname</summary>
                <p>
                  Tambahkan barang, pilih Hitung stok, lalu isi hasil hitung fisik. Koreksi stok
                  buku dilakukan terpisah.
                </p>
              </details>
            </section>
            <aside className="recent-notes">
              <div className="section-head">
                <h3>Terakhir diubah</h3>
                <span className="badge">{recent.length}</span>
              </div>
              {recent.length ? (
                recent.map(({ row, entry }) => (
                  <Button
                    className="recent-note"
                    key={row.id}
                    onClick={() => {
                      setCaptureEntity(entry.entity);
                      setEdit(row);
                    }}
                  >
                    <span className="recent-icon">
                      <IkonOp Icon={entry.Icon} size={22} />
                    </span>
                    <span className="recent-text">
                      <strong>{String(row.data.title)}</strong>
                      <small>
                        <span className="recent-tag">{entry.title}</span> ·{' '}
                        {formatDate(row.updated_at)}
                      </small>
                    </span>
                    <ArrowUpRight size={14} className="recent-arrow" />
                  </Button>
                ))
              ) : (
                <div className="recent-empty">
                  <FilePenLine size={22} />
                  <p>
                    {search
                      ? 'Tidak ada catatan yang cocok.'
                      : ready
                        ? 'Catatan yang Anda ubah akan muncul di sini.'
                        : 'Pencatatan belum aktif.'}
                  </p>
                </div>
              )}
            </aside>
          </div>
        </>
      ) : (
        <>
          <div className="section-head records-head">
            <div>
              <h2>
                <Ikon3D kind={IKON_HALAMAN[`/${book.path}`] ?? 'buku'} size={30} />
                {book.title}
              </h2>
              <p>{catalog[entity!].description}</p>
            </div>
            <div className="actions">
              <Button variant="secondary" disabled={!ready || !rows.length} onClick={exportCsv}>
                <Download size={15} />
                <span>CSV</span>
              </Button>
              <Button
                variant="primary"
                className="primary"
                disabled={!ready || (entity === 'stock-counts' && !data['inventory-items']?.length)}
                onClick={() => setEdit(null)}
              >
                <Plus size={15} />
                <span>
                  Tambah{' '}
                  {entity === 'cash-entries'
                    ? 'transaksi'
                    : entity === 'stock-counts'
                      ? 'opname'
                      : book.title.toLowerCase()}
                </span>
              </Button>
            </div>
          </div>
          {entity === 'stock-counts' && ready && !data['inventory-items']?.length && (
            <p className="notice">
              Daftarkan barang terlebih dahulu di <Link href="/barang">halaman Barang →</Link>
            </p>
          )}
          {ready && (
            <div className="recording-metrics">
              {(entity === 'cash-entries'
                ? [
                    {
                      label: 'Masuk',
                      value: rupiah(summary.incoming),
                      type: 'income',
                      Icon: TrendingUp,
                      subtitle: 'Total kas masuk terfilter',
                    },
                    {
                      label: 'Keluar',
                      value: rupiah(summary.outgoing),
                      type: 'expense',
                      Icon: TrendingDown,
                      subtitle: 'Total kas keluar terfilter',
                    },
                    {
                      label: 'Selisih kas tercatat',
                      value: rupiah(summary.net),
                      type: 'net',
                      Icon: Wallet,
                      subtitle: 'Selisih transaksi; bukan saldo bank',
                    },
                  ]
                : entity === 'members'
                  ? (() => {
                      const activeCount = rows.filter((r) => r.data.status === 'aktif').length;
                      const memberCash = (data['cash-entries'] || []).filter(
                        (c) => rows.some((m) => m.id === c.data.member_id) && c.data.direction === 'masuk',
                      );
                      const totalSav = memberCash.reduce((s, c) => s + Number(c.data.amount || 0), 0);
                      return [
                        {
                          label: 'Total Anggota',
                          value: rows.length,
                          type: 'total',
                          Icon: Users,
                          subtitle: `${all.length} anggota tercatat di sistem`,
                        },
                        {
                          label: 'Aktif',
                          value: activeCount,
                          type: 'active',
                          Icon: UserCheck,
                          subtitle: all.length
                            ? `${Math.round((activeCount / all.length) * 100)}% dari total anggota`
                            : 'Belum ada data',
                        },
                        {
                          label: 'Simpanan Anggota Tercatat',
                          value: rupiah(totalSav),
                          type: 'income',
                          Icon: Wallet,
                          subtitle: `${memberCash.length} transaksi kas masuk`,
                        },
                      ];
                    })()
                  : entity === 'inventory-items'
                    ? (() => {
                        const lowStock = rows.filter(
                          (r) => Number(r.data.book_quantity) <= Number(r.data.minimum_quantity),
                        );
                        const outOfStock = rows.filter((r) => Number(r.data.book_quantity) <= 0);
                        const totalVal = rows.reduce(
                          (s, r) => s + Number(r.data.book_quantity || 0) * Number(r.data.price || 0),
                          0,
                        );
                        return [
                          {
                            label: 'Jenis Barang',
                            value: rows.length,
                            type: 'total',
                            Icon: Package,
                            subtitle: `${all.length} jenis dalam katalog`,
                          },
                          {
                            label: 'Estimasi Nilai Persediaan',
                            value: rupiah(totalVal),
                            type: 'income',
                            Icon: Wallet,
                            subtitle: 'Kalkulasi stok buku × harga satuan',
                          },
                          {
                            label: 'Stok Menipis / Perlu Belanja',
                            value: lowStock.length,
                            type: 'warning',
                            Icon: AlertTriangle,
                            subtitle: outOfStock.length
                              ? `${outOfStock.length} barang habis (0 unit)`
                              : lowStock.length
                                ? `${lowStock.length} item mencapai batas min`
                                : 'Semua stok dalam batas aman',
                          },
                        ];
                      })()
                    : (() => {
                        const diffRows = rows.filter((r) => stockDifference(r) !== 0);
                        const matchRows = rows.filter((r) => stockDifference(r) === 0);
                        return [
                          {
                            label: 'Pemeriksaan',
                            value: rows.length,
                            type: 'total',
                            Icon: ClipboardCheck,
                            subtitle: 'Total sesi audit fisik dilakukan',
                          },
                          {
                            label: 'Ada selisih',
                            value: diffRows.length,
                            type: 'warning',
                            Icon: AlertTriangle,
                            subtitle: diffRows.length
                              ? 'Perlu investigasi fisik vs buku'
                              : 'Tidak ada temuan selisih',
                          },
                          {
                            label: 'Stok fisik sesuai',
                            value: matchRows.length,
                            type: 'active',
                            Icon: CheckCircle2,
                            subtitle: `${matchRows.length} pemeriksaan akurat 100%`,
                          },
                        ];
                      })()
              ).map(({ label, value, type, Icon, subtitle }) => (
                <div key={label} className={`metric-card metric-${type}`}>
                  <div className="metric-header">
                    <small className="metric-label">{label}</small>
                    <div className={`metric-icon-wrap icon-${type}`} aria-hidden>
                      <IkonOp Icon={Icon} size={24} />
                    </div>
                  </div>
                  <strong className="metric-value">{value}</strong>
                  {subtitle && <span className="metric-sub">{subtitle}</span>}
                </div>
              ))}
            </div>
          )}

          <div className="recording-filters">
            <label>
              <span className="field-caption">
                <Search size={14} />
                Cari catatan
              </span>
              <Input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nama, nomor, atau catatan…"
              />
            </label>
            {entity !== 'inventory-items' && (
              <label>
                <span className="field-caption">Bulan</span>
                <Select
                  value={month}
                  onChange={setMonth}
                  options={monthOptions}
                  ariaLabel="Pilih Bulan"
                />
              </label>
            )}
            {['members', 'cash-entries'].includes(entity!) && (
              <label>
                <span className="field-caption">
                  {entity === 'members' ? 'Status' : 'Transaksi'}
                </span>
                <Select
                  value={filter}
                  onChange={setFilter}
                  options={[
                    { value: '', label: `Semua ${entity === 'members' ? 'Status' : 'Transaksi'}` },
                    ...(entity === 'members' ? ['aktif', 'nonaktif'] : ['masuk', 'keluar']).map(
                      (value) => ({
                        value,
                        label: formatChoiceLabel(value),
                      }),
                    ),
                  ]}
                  ariaLabel={entity === 'members' ? 'Status' : 'Transaksi'}
                />
              </label>
            )}
            {entity !== 'members' && (
              <label>
                <span className="field-caption">Gerai</span>
                <Select
                  value={unit}
                  onChange={setUnit}
                  options={[
                    { value: '', label: 'Semua Gerai' },
                    ...(data.units || []).map((row) => ({
                      value: row.id,
                      label: String(row.data.title),
                    })),
                  ]}
                  ariaLabel="Gerai"
                />
              </label>
            )}
            <Button
              type="button"
              className="btn-clear-filters"
              onClick={() => {
                setSearch('');
                setMonth('');
                setFilter('');
                setUnit('');
                setInventoryFilter('');
                setOpnameFilter('');
              }}
            >
              Hapus filter
            </Button>
          </div>

          {/* Quick Filter Chips */}
          <div className="quick-chips-row" role="group" aria-label="Filter cepat">
            <span className="quick-chips-label">Filter Cepat:</span>
            {entity === 'members' && (
              <div className="quick-chips-group">
                <Button
                  type="button"
                  className={`quick-chip ${!filter ? 'is-active' : ''}`}
                  onClick={() => setFilter('')}
                >
                  Semua ({all.length})
                </Button>
                <Button
                  type="button"
                  className={`quick-chip chip-active ${filter === 'aktif' ? 'is-active' : ''}`}
                  onClick={() => setFilter('aktif')}
                >
                  ● Aktif ({all.filter((r) => r.data.status === 'aktif').length})
                </Button>
                <Button
                  type="button"
                  className={`quick-chip chip-inactive ${filter === 'nonaktif' ? 'is-active' : ''}`}
                  onClick={() => setFilter('nonaktif')}
                >
                  ○ Nonaktif ({all.filter((r) => r.data.status === 'nonaktif').length})
                </Button>
              </div>
            )}
            {entity === 'cash-entries' && (
              <div className="quick-chips-group">
                <Button
                  type="button"
                  className={`quick-chip ${!filter ? 'is-active' : ''}`}
                  onClick={() => setFilter('')}
                >
                  Semua ({all.length})
                </Button>
                <Button
                  type="button"
                  className={`quick-chip chip-income ${filter === 'masuk' ? 'is-active' : ''}`}
                  onClick={() => setFilter('masuk')}
                >
                  + Uang Masuk ({all.filter((r) => r.data.direction === 'masuk').length})
                </Button>
                <Button
                  type="button"
                  className={`quick-chip chip-expense ${filter === 'keluar' ? 'is-active' : ''}`}
                  onClick={() => setFilter('keluar')}
                >
                  - Uang Keluar ({all.filter((r) => r.data.direction === 'keluar').length})
                </Button>
              </div>
            )}
            {entity === 'inventory-items' && (
              <div className="quick-chips-group">
                <Button
                  type="button"
                  className={`quick-chip ${!inventoryFilter ? 'is-active' : ''}`}
                  onClick={() => setInventoryFilter('')}
                >
                  Semua ({all.length})
                </Button>
                <Button
                  type="button"
                  className={`quick-chip chip-active ${inventoryFilter === 'aman' ? 'is-active' : ''}`}
                  onClick={() => setInventoryFilter('aman')}
                >
                  <AppIcon name="complete" size={16} /> Stok aman ({all.filter((r) => Number(r.data.book_quantity) > Number(r.data.minimum_quantity)).length})
                </Button>
                <Button
                  type="button"
                  className={`quick-chip chip-warning ${inventoryFilter === 'menipis' ? 'is-active' : ''}`}
                  onClick={() => setInventoryFilter('menipis')}
                >
                  <AppIcon name="warning" size={16} /> Menipis ({all.filter((r) => Number(r.data.book_quantity) > 0 && Number(r.data.book_quantity) <= Number(r.data.minimum_quantity)).length})
                </Button>
                <Button
                  type="button"
                  className={`quick-chip chip-expense ${inventoryFilter === 'habis' ? 'is-active' : ''}`}
                  onClick={() => setInventoryFilter('habis')}
                >
                  <AppIcon name="unavailable" size={16} /> Habis ({all.filter((r) => Number(r.data.book_quantity) <= 0).length})
                </Button>
              </div>
            )}
            {entity === 'stock-counts' && (
              <div className="quick-chips-group">
                <Button
                  type="button"
                  className={`quick-chip ${!opnameFilter ? 'is-active' : ''}`}
                  onClick={() => setOpnameFilter('')}
                >
                  Semua ({all.length})
                </Button>
                <Button
                  type="button"
                  className={`quick-chip chip-active ${opnameFilter === 'sesuai' ? 'is-active' : ''}`}
                  onClick={() => setOpnameFilter('sesuai')}
                >
                  <AppIcon name="complete" size={16} /> Fisik sesuai ({all.filter((r) => stockDifference(r) === 0).length})
                </Button>
                <Button
                  type="button"
                  className={`quick-chip chip-warning ${opnameFilter === 'selisih' ? 'is-active' : ''}`}
                  onClick={() => setOpnameFilter('selisih')}
                >
                  <AppIcon name="warning" size={16} /> Ada selisih ({all.filter((r) => stockDifference(r) !== 0).length})
                </Button>
              </div>
            )}
          </div>

          {ready && (
            <>
              <div className="results-toolbar-bar">
                <p className="result-count">
                  {rows.length} dari {all.length} catatan
                  {entity === 'cash-entries'
                    ? ' · Ringkasan mengikuti filter; bukan saldo rekening atau laporan laba rugi.'
                    : ''}
                </p>

                <div className="op-view-switcher" role="group" aria-label="Pilihan tampilan data">
                  <Button
                    type="button"
                    className={`op-view-btn ${viewMode === 'table' ? 'is-active' : ''}`}
                    onClick={() => setViewMode('table')}
                    title="Tampilan tabel"
                  >
                    <List size={14} />
                    <span>Tabel</span>
                  </Button>
                  <Button
                    type="button"
                    className={`op-view-btn ${viewMode === 'cards' ? 'is-active' : ''}`}
                    onClick={() => setViewMode('cards')}
                    title="Tampilan kartu"
                  >
                    <LayoutGrid size={14} />
                    <span>Kartu</span>
                  </Button>
                </div>
              </div>

              {viewMode === 'table' ? (
                <div className="ledger-wrap">
                  <table className="ledger-table">
                    <thead>
                      <tr>
                        {columns.map((field) => (
                          <th key={field} className={getColumnClass(field)}>
                            {field === 'difference' ? 'Selisih' : labels[field]}
                          </th>
                        ))}
                        <th className="col-action">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.id}>
                          {columns.map((field) => (
                            <td key={field} className={getColumnClass(field)}>
                              {renderCell(row, field)}
                            </td>
                          ))}
                          <td className="col-action">
                            <div className="table-actions">
                              <Button
                                type="button"
                                className="table-btn-edit"
                                onClick={() => setEdit(row)}
                                title="Ubah data"
                              >
                                Ubah
                              </Button>
                              {entity === 'inventory-items' && (
                                <Link
                                  className="table-btn-action lihat-dunia-ikon"
                                  href={tautanDunia('inventory-items', row.id)}
                                  aria-label={`Lihat ${String(row.data.title)} di Dunia Koperasi`}
                                  title="Lihat posisi rak di Dunia Koperasi"
                                >
                                  <Ikon3D kind="pulau" size={20} rapat />
                                </Link>
                              )}
                              {entity === 'members' && (
                                <Button
                                  type="button"
                                  className="table-btn-action table-btn-cash"
                                  title="Catat kas untuk anggota ini"
                                  onClick={() => {
                                    setCaptureEntity('cash-entries');
                                    setEdit({
                                      id: '',
                                      created_at: '',
                                      updated_at: '',
                                      data: {
                                        title: `Setoran kas: ${row.data.title}`,
                                        date: today(),
                                        direction: 'masuk',
                                        account: 'Kas Utama Koperasi',
                                        amount: 0,
                                        member_id: row.id,
                                        item_id: '',
                                        unit_id: '',
                                        notes: `Transaksi untuk anggota ${row.data.title} (${row.data.member_number || ''})`,
                                      },
                                    });
                                  }}
                                >
                                  <Wallet size={12} />
                                  <span>+ Kas</span>
                                </Button>
                              )}
                              {entity === 'inventory-items' && (
                                <>
                                  <Button
                                    type="button"
                                    className="table-btn-action table-btn-buy table-btn-ikon"
                                    title="Catat pengeluaran kas pembelian barang ini"
                                    onClick={() => {
                                      setCaptureEntity('cash-entries');
                                      setEdit({
                                        id: '',
                                        created_at: '',
                                        updated_at: '',
                                        data: {
                                          title: `Beli Stok: ${row.data.title}`,
                                          date: today(),
                                          direction: 'keluar',
                                          account: 'Pengadaan Barang & Persediaan',
                                          amount: Number(row.data.price || 0) * 10,
                                          item_id: row.id,
                                          member_id: '',
                                          unit_id: row.data.unit_id || '',
                                          notes: `Pembelian stok untuk ${row.data.title} (${row.data.sku || ''})`,
                                        },
                                      });
                                    }}
                                  >
                                    <Wallet size={14} aria-hidden />
                                    <span className="sr-only">Catat pembelian</span>
                                  </Button>
                                  <Link
                                    className="table-btn-action table-btn-ikon"
                                    href={`/stok-opname?barang=${row.id}`}
                                    title="Hitung fisik opname"
                                    aria-label={`Opname ${String(row.data.title)}`}
                                  >
                                    <ClipboardCheck size={14} aria-hidden />
                                  </Link>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!rows.length && (
                    <EmptyState
                      icon={<IkonOp Icon={book.Icon} size={56} />}
                      title={all.length
                          ? 'Tidak ada data yang cocok'
                          : `Belum ada catatan ${book.title.toLowerCase()}`}
                      description={all.length
                          ? 'Coba kata pencarian atau bersihkan filter di atas.'
                          : entity === 'stock-counts' && !data['inventory-items']?.length
                            ? 'Daftarkan barang sebelum mencatat hasil hitung fisik.'
                          : `Gunakan tombol Tambah di atas untuk mengisi catatan ${book.title.toLowerCase()} pertama.`}
                      action={all.length ? {
                          label: 'Hapus filter',
                          onClick: () => {
                            setSearch('');
                            setMonth('');
                            setFilter('');
                            setUnit('');
                            setInventoryFilter('');
                            setOpnameFilter('');
                          },
                        } : entity === 'stock-counts' && !data['inventory-items']?.length
                          ? { label: 'Daftarkan barang', href: '/barang' }
                          : undefined}
                    />
                  )}
                </div>
              ) : (
                /* Card / Grid View */
                <div className="operations-cards-container">
                  <div className="operations-card-grid">
                    {rows.map((row) => {
                      if (entity === 'members') {
                        const memberEntries = (data['cash-entries'] || []).filter(
                          (c) => c.data.member_id === row.id,
                        );
                        const totalIn = memberEntries
                          .filter((c) => c.data.direction === 'masuk')
                          .reduce((sum, c) => sum + Number(c.data.amount || 0), 0);
                        const isAktif = row.data.status === 'aktif';

                        return (
                          <article className="op-card op-member-card" key={row.id}>
                            <div className="op-card-header">
                              <div className="op-member-avatar" aria-hidden>
                                {String(row.data.title || 'A').charAt(0).toUpperCase()}
                              </div>
                              <div className="op-card-info">
                                <div className="op-card-title-row">
                                  <Button variant="ghost" className="op-card-title" onClick={() => setLihat(row)}>
                                    {String(row.data.title)}
                                  </Button>
                                  <span
                                    className={`table-badge ${isAktif ? 'badge-active' : 'badge-inactive'}`}
                                  >
                                    {isAktif ? 'Aktif' : 'Nonaktif'}
                                  </span>
                                </div>
                                <div className="op-card-meta">
                                  {Boolean(row.data.member_number) && (
                                    <code className="op-code-chip">
                                      #{String(row.data.member_number)}
                                    </code>
                                  )}
                                  <span className="op-date-chip">
                                    <Calendar size={12} />{' '}
                                    {formatDate(String(row.data.date || row.data.created_at))}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="op-card-body">
                              {Boolean(row.data.contact) && (
                                <div className="op-card-row">
                                  <span className="op-row-label">
                                    <Phone size={12} /> Kontak
                                  </span>
                                  <span className="op-row-val">{String(row.data.contact)}</span>
                                </div>
                              )}
                              <div className="op-card-row op-highlight-row">
                                <span className="op-row-label">
                                  <Wallet size={12} /> Kas Tercatat
                                </span>
                                <span className="op-row-val op-cash-val">
                                  {totalIn > 0 ? rupiah(totalIn) : 'Belum ada'}
                                  <small> ({memberEntries.length} transaksi)</small>
                                </span>
                              </div>
                              {Boolean(row.data.notes) && (
                                <p className="op-card-notes">{String(row.data.notes)}</p>
                              )}
                            </div>

                            <div className="op-card-footer">
                              <Button
                                type="button"
                                className="table-btn-edit"
                                onClick={() => setEdit(row)}
                              >
                                Ubah
                              </Button>
                              <Button
                                type="button"
                                className="table-btn-action table-btn-cash"
                                onClick={() => {
                                  setCaptureEntity('cash-entries');
                                  setEdit({
                                    id: '',
                                    created_at: '',
                                    updated_at: '',
                                    data: {
                                      title: `Setoran kas: ${row.data.title}`,
                                      date: today(),
                                      direction: 'masuk',
                                      account: 'Kas Utama Koperasi',
                                      amount: 0,
                                      member_id: row.id,
                                      item_id: '',
                                      unit_id: '',
                                      notes: `Transaksi untuk anggota ${row.data.title} (${row.data.member_number || ''})`,
                                    },
                                  });
                                }}
                              >
                                <Wallet size={12} />
                                <span>+ Kas</span>
                              </Button>
                            </div>
                          </article>
                        );
                      }

                      if (entity === 'cash-entries') {
                        const isMasuk = row.data.direction === 'masuk';
                        const member = row.data.member_id
                          ? data.members?.find((m) => m.id === row.data.member_id)
                          : null;
                        const item = row.data.item_id
                          ? data['inventory-items']?.find((i) => i.id === row.data.item_id)
                          : null;

                        return (
                          <article
                            className={`op-card op-cash-card ${isMasuk ? 'card-income' : 'card-expense'}`}
                            key={row.id}
                          >
                            <div className="op-card-header">
                              <span
                                className={`table-badge ${isMasuk ? 'badge-income' : 'badge-expense'}`}
                              >
                                {isMasuk ? '+ Uang Masuk' : '- Uang Keluar'}
                              </span>
                              <span className="op-date-chip">
                                <Calendar size={12} /> {formatDate(String(row.data.date))}
                              </span>
                            </div>

                            <div className="op-cash-amount-box">
                              <strong
                                className={`op-cash-amount ${isMasuk ? 'amount-in' : 'amount-out'}`}
                              >
                                {isMasuk ? '+ ' : '- '}
                                {rupiah(Number(row.data.amount))}
                              </strong>
                              <Button variant="ghost" className="op-cash-title" onClick={() => setLihat(row)}>
                                {String(row.data.title)}
                              </Button>
                            </div>

                            <div className="op-card-body">
                              {Boolean(row.data.account) && (
                                <div className="op-card-row">
                                  <span className="op-row-label">Akun / Kas</span>
                                  <span className="table-account-tag">
                                    {String(row.data.account)}
                                  </span>
                                </div>
                              )}
                              {(member || item) && (
                                <div className="op-card-row">
                                  <span className="op-row-label">Terkait</span>
                                  <div className="table-relations-pill-group">
                                    {member && (
                                      <span
                                        className="relation-pill member-pill"
                                        title={`Anggota: ${member.data.title}`}
                                      >
                                        <Users size={11} />
                                        <span>{String(member.data.title)}</span>
                                      </span>
                                    )}
                                    {item && (
                                      <span
                                        className="relation-pill item-pill"
                                        title={`Barang: ${item.data.title}`}
                                      >
                                        <Package size={11} />
                                        <span>{String(item.data.title)}</span>
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                              {Boolean(row.data.unit_id) && (
                                <div className="op-card-row">
                                  <span className="op-row-label">Gerai</span>
                                  <span className="op-row-val">{display(row, 'unit_id')}</span>
                                </div>
                              )}
                            </div>

                            <div className="op-card-footer">
                              <Button
                                type="button"
                                className="table-btn-edit"
                                onClick={() => setEdit(row)}
                              >
                                Ubah Transaksi
                              </Button>
                            </div>
                          </article>
                        );
                      }

                      if (entity === 'inventory-items') {
                        const qty = Number(row.data.book_quantity || 0);
                        const minQty = Number(row.data.minimum_quantity || 0);
                        const price = Number(row.data.price || 0);
                        const percent =
                          minQty > 0
                            ? Math.min(100, Math.max(10, Math.round((qty / (minQty * 2)) * 100)))
                            : 100;

                        return (
                          <article className="op-card op-inventory-card" key={row.id}>
                            <div className="op-card-header">
                              <div className="op-item-icon item-thumb" aria-hidden>
                                <ThumbBarang kind={thumbBarang(String(row.data.title), String(row.data.measurement || ''))} size={40} />
                              </div>
                              <div className="op-card-info">
                                <Button variant="ghost" className="op-card-title" onClick={() => setLihat(row)}>
                                  {String(row.data.title)}
                                </Button>
                                <div className="op-card-meta">
                                  {Boolean(row.data.sku) && (
                                    <code className="op-code-chip">{String(row.data.sku)}</code>
                                  )}
                                  {Boolean(row.data.unit_id) && (
                                    <span className="op-unit-tag">{display(row, 'unit_id')}</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="op-stock-meter-box">
                              <div className="op-stock-meter-header">
                                <span className="op-stock-label">Stok Buku</span>
                                <strong className="op-stock-qty">
                                  {qty.toLocaleString('id-ID')}{' '}
                                  <small>{String(row.data.measurement || 'unit')}</small>
                                </strong>
                              </div>
                              <div className="op-stock-bar-track">
                                <div
                                  className={`op-stock-bar-fill ${qty <= 0 ? 'fill-empty' : qty <= minQty ? 'fill-warning' : 'fill-ok'}`}
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                              <div className="op-stock-meter-footer">
                                <small>Min: {minQty.toLocaleString('id-ID')}</small>
                                <span
                                  className={`table-badge ${qty <= 0 ? 'badge-diff-minus' : qty <= minQty ? 'badge-warning' : 'badge-active'}`}
                                >
                                  {qty <= 0 ? 'Habis' : qty <= minQty ? 'Menipis' : 'Aman'}
                                </span>
                              </div>
                            </div>

                            <div className="op-card-body">
                              {price > 0 && (
                                <div className="op-card-row">
                                  <span className="op-row-label">Harga Satuan</span>
                                  <strong className="op-row-val">{rupiah(price)}</strong>
                                </div>
                              )}
                            </div>

                            <div className="op-card-footer">
                              <Button
                                type="button"
                                className="table-btn-edit"
                                onClick={() => setEdit(row)}
                              >
                                Ubah
                              </Button>
                              <LihatDiDunia entity="inventory-items" id={row.id} />
                              <Button
                                type="button"
                                className="table-btn-action table-btn-buy table-btn-ikon"
                                title="Catat pengeluaran kas pembelian barang ini"
                                onClick={() => {
                                  setCaptureEntity('cash-entries');
                                  setEdit({
                                    id: '',
                                    created_at: '',
                                    updated_at: '',
                                    data: {
                                      title: `Beli Stok: ${row.data.title}`,
                                      date: today(),
                                      direction: 'keluar',
                                      account: 'Pengadaan Barang & Persediaan',
                                      amount: Number(row.data.price || 0) * 10,
                                      item_id: row.id,
                                      member_id: '',
                                      unit_id: row.data.unit_id || '',
                                      notes: `Pembelian stok untuk ${row.data.title} (${row.data.sku || ''})`,
                                    },
                                  });
                                }}
                              >
                                <Wallet size={14} aria-hidden />
                                <span className="sr-only">Catat pembelian</span>
                              </Button>
                              <Link
                                className="table-btn-action table-btn-ikon"
                                href={`/stok-opname?barang=${row.id}`}
                                title="Hitung fisik opname"
                                aria-label={`Opname ${String(row.data.title)}`}
                              >
                                <ClipboardCheck size={14} aria-hidden />
                              </Link>
                            </div>
                          </article>
                        );
                      }

                      // entity === 'stock-counts'
                      const diff = stockDifference(row);
                      const product = data['inventory-items']?.find(
                        (item) => item.id === row.data.item_id,
                      );

                      return (
                        <article className="op-card op-opname-card" key={row.id}>
                          <div className="op-card-header">
                            <span className="op-date-chip">
                              <Calendar size={12} /> {formatDate(String(row.data.date))}
                            </span>
                            {diff === 0 ? (
                              <span className="table-badge badge-diff-zero"><AppIcon name="complete" size={16} /> Sesuai (0)</span>
                            ) : diff < 0 ? (
                              <span className="table-badge badge-diff-minus">
                                Kurang ({diff.toLocaleString('id-ID')})
                              </span>
                            ) : (
                              <span className="table-badge badge-diff-plus">
                                Lebih (+{diff.toLocaleString('id-ID')})
                              </span>
                            )}
                          </div>

                          <div className="op-opname-item-title">
                            <Button variant="ghost" className="op-card-title" onClick={() => setLihat(row)}>
                              {product ? String(product.data.title) : 'Barang tidak ditemukan'}
                            </Button>
                            {product && (
                              <small className="op-card-sub">
                                {String(product.data.sku || '—')} · Satuan:{' '}
                                {String(product.data.measurement || 'unit')}
                              </small>
                            )}
                          </div>

                          <div className="op-opname-compare-grid">
                            <div className="op-compare-cell">
                              <span className="op-compare-lbl">Stok Buku</span>
                              <strong className="op-compare-val">
                                {Number(row.data.book_quantity || 0).toLocaleString('id-ID')}
                              </strong>
                            </div>
                            <div className="op-compare-arrow">→</div>
                            <div className="op-compare-cell">
                              <span className="op-compare-lbl">Hitung Fisik</span>
                              <strong className="op-compare-val">
                                {Number(row.data.counted_quantity || 0).toLocaleString('id-ID')}
                              </strong>
                            </div>
                          </div>

                          {Boolean(row.data.assignee) && (
                            <div className="op-card-row">
                              <span className="op-row-label">Petugas</span>
                              <span className="op-row-val">{String(row.data.assignee)}</span>
                            </div>
                          )}

                          <div className="op-card-footer">
                            <Button
                              type="button"
                              className="table-btn-edit"
                              onClick={() => setEdit(row)}
                            >
                              Ubah Hasil Opname
                            </Button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                  {!rows.length && (
                    <EmptyState
                      icon={<IkonOp Icon={book.Icon} size={56} />}
                      title={
                        all.length
                          ? 'Tidak ada data yang cocok'
                          : `Belum ada catatan ${book.title.toLowerCase()}`
                      }
                      description={
                        all.length
                          ? 'Coba kata pencarian atau bersihkan filter di atas.'
                          : entity === 'stock-counts' && !data['inventory-items']?.length
                            ? 'Daftarkan barang sebelum mencatat hasil hitung fisik.'
                            : `Gunakan tombol Tambah di atas untuk mengisi catatan ${book.title.toLowerCase()} pertama.`
                      }
                      action={
                        all.length
                          ? {
                              label: 'Hapus filter',
                              onClick: () => {
                                setSearch('');
                                setMonth('');
                                setFilter('');
                                setUnit('');
                                setInventoryFilter('');
                                setOpnameFilter('');
                              },
                            }
                          : entity === 'stock-counts' && !data['inventory-items']?.length
                            ? { label: 'Daftarkan barang', href: '/barang' }
                            : undefined
                      }
                    />
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
      {lihat && book && (
        <RecordDrawer
          key={lihat.id}
          entity={book.entity}
          row={data[book.entity]?.find((r) => r.id === lihat.id) || lihat}
          workspace={data}
          onClose={() => {
            setLihat(null);
            if (query.get('record')) {
              const next = new URLSearchParams(query.toString());
              next.delete('record');
              next.delete('bagian');
              router.replace('/' + slug + (next.size ? '?' + next : ''), { scroll: false });
            }
          }}
          onEdit={() => {
            setEdit(lihat);
            setLihat(null);
          }}
        />
      )}
      {edit !== undefined && entity && (
        <OperationEditor
          draftScope={draftScope}
          entity={captureEntity || entity}
          item={edit || undefined}
          data={data}
          refresh={refresh}
          close={() => {
            setEdit(undefined);
            setCaptureEntity(undefined);
            const next = new URLSearchParams(query.toString());
            ['baru', 'record', 'barang', 'arah', 'ubah'].forEach((key) => next.delete(key));
            [...next.keys()].filter((key) => key.startsWith('isi.')).forEach((key) => next.delete(key));
            router.replace('/' + slug + (next.size ? '?' + next : ''));
          }}
        />
      )}
    </>
  );
}
function OperationEditor({
  entity,
  item,
  data,
  refresh,
  close,
  draftScope,
}: {
  entity: Entity;
  item?: Item;
  data: Workspace;
  refresh: () => Promise<void>;
  close: () => void;
  draftScope?: string;
}) {
  return <Editor draftScope={draftScope} entity={entity} item={item} workspace={data} onSaved={refresh} onClose={close} />;
}
