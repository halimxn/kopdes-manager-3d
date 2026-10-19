'use client';
import { DialogSurface } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Ikon3D, type Ikon3DKind } from '@/components/ui/Ikon3D';
import {
  Users,
  Package,
  ClipboardCheck,
  CheckSquare,
  Calendar,
  BarChart3,
  ShieldAlert,
  X,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

/** Ikon dua nada tiap aksi, senada dengan ikon halaman tujuannya. */
const IKON_AKSI: Record<string, Ikon3DKind> = {
  'cash-in': 'dompet',
  'cash-out': 'dompet',
  'add-member': 'kartu',
  'add-item': 'kotak',
  'stock-count': 'rak',
  'add-task': 'papan',
  'schedule-meeting': 'kalender',
  'generate-report': 'grafik',
  'record-risk': 'perisai',
  'record-sales': 'lonceng',
  'record-savings': 'gembok',
  'record-attendance': 'jam',
};

export type ActionItem = {
  id: string;
  title: string;
  desc: string;
  href: string;
  badge: string;
  badgeCls: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  keyShortcut: string;
};

const actions: ActionItem[] = [
  {
    id: 'cash-in',
    title: 'Catat kas masuk',
    desc: 'Simpanan anggota, penjualan tunai gerai, atau penerimaan dana.',
    href: '/keuangan?baru=1&arah=masuk',
    badge: 'Kas masuk',
    badgeCls: 'badge-in',
    Icon: TrendingUp,
    keyShortcut: '1',
  },
  {
    id: 'cash-out',
    title: 'Catat kas keluar',
    desc: 'Belanja stok barang, biaya operasional toko, atau beban usaha.',
    href: '/keuangan?baru=1&arah=keluar',
    badge: 'Kas keluar',
    badgeCls: 'badge-out',
    Icon: TrendingDown,
    keyShortcut: '2',
  },
  {
    id: 'add-member',
    title: 'Tambah anggota',
    desc: 'Catat nama, nomor anggota, dan status keanggotaan.',
    href: '/anggota?baru=1',
    badge: 'Keanggotaan',
    badgeCls: 'badge-member',
    Icon: Users,
    keyShortcut: '3',
  },
  {
    id: 'add-item',
    title: 'Tambah barang',
    desc: 'Catat barang, harga, dan batas stok minimum.',
    href: '/barang?baru=1',
    badge: 'Persediaan',
    badgeCls: 'badge-item',
    Icon: Package,
    keyShortcut: '4',
  },
  {
    id: 'stock-count',
    title: 'Catat stok opname',
    desc: 'Catat hasil hitung fisik barang di gerai.',
    href: '/stok-opname?baru=1',
    badge: 'Opname',
    badgeCls: 'badge-count',
    Icon: ClipboardCheck,
    keyShortcut: '5',
  },
  {
    id: 'add-task',
    title: 'Buat tugas',
    desc: 'Tugaskan pekerjaan penting dengan tenggat dan prioritas.',
    href: '/tugas?baru=1',
    badge: 'Pekerjaan',
    badgeCls: 'badge-task',
    Icon: CheckSquare,
    keyShortcut: '6',
  },
  {
    id: 'schedule-meeting',
    title: 'Jadwalkan rapat',
    desc: 'Agenda koordinasi pengurus, pengawas, atau musyawarah warga.',
    href: '/rapat?baru=1',
    badge: 'Koordinasi',
    badgeCls: 'badge-meeting',
    Icon: Calendar,
    keyShortcut: '7',
  },
  {
    id: 'generate-report',
    title: 'Buat laporan',
    desc: 'Simpan ringkasan pekerjaan untuk periode pilihan.',
    href: '/laporan',
    badge: 'Laporan',
    badgeCls: 'badge-report',
    Icon: BarChart3,
    keyShortcut: '8',
  },
  {
    id: 'record-risk',
    title: 'Catat risiko atau kendala',
    desc: 'Catat masalah dan rencana penanganannya.',
    href: '/risiko?baru=1',
    badge: 'Mitigasi',
    badgeCls: 'badge-risk',
    Icon: ShieldAlert,
    keyShortcut: '9',
  },
];
// Butuh migrasi 10; halaman tujuan menjelaskan bila belum aktif. Tanpa pintasan angka.
const usahaHarian: ActionItem[] = [
  {
    id: 'record-sales',
    title: 'Catat penjualan harian',
    desc: 'Omzet dan jumlah transaksi gerai hari ini.',
    href: '/penjualan?baru=1',
    badge: 'Penjualan',
    badgeCls: 'badge-in',
    Icon: TrendingUp,
    keyShortcut: '',
  },
  {
    id: 'record-savings',
    title: 'Catat simpanan anggota',
    desc: 'Setoran atau penarikan simpanan pokok, wajib, sukarela.',
    href: '/simpanan?baru=1',
    badge: 'Simpanan',
    badgeCls: 'badge-member',
    Icon: Users,
    keyShortcut: '',
  },
  {
    id: 'record-attendance',
    title: 'Catat absensi petugas',
    desc: 'Kehadiran, izin, atau jadwal kerja petugas.',
    href: '/absensi?baru=1',
    badge: 'Absensi',
    badgeCls: 'badge-task',
    Icon: Calendar,
    keyShortcut: '',
  },
];

function KelompokAksi({ judul, daftar, onSelect }: { judul: string; daftar: ActionItem[]; onSelect: (href: string) => void }) {
  return (
    <div className="action-group-box">
      <span className="action-group-title">{judul}</span>
      <div className="action-modal-grid">
        {daftar.map(({ id, title, desc, href, keyShortcut }) => (
          <Button key={id} type="button" className="action-card-btn" onClick={() => onSelect(href)}>
            <div className="action-icon-squircle">
              <Ikon3D kind={IKON_AKSI[id] ?? 'tambah'} size={32} />
            </div>
            <div className="action-text">
              <strong>{title}</strong>
              <small>{desc}</small>
            </div>
            {keyShortcut && <kbd className="action-key">{keyShortcut}</kbd>}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function ManagerActionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      const match = actions.find((a) => a.keyShortcut === e.key);
      if (match && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        onClose();
        router.push(match.href);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, router]);

  const handleSelect = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <DialogSurface
      ref={dialogRef}
      className="manager-action-dialog"
      aria-labelledby="action-modal-title"
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      onClose={onClose}
    >
      <div className="action-modal-container">
        <header className="action-modal-header">
          <div>
            <h2 id="action-modal-title">Tambah catatan & kegiatan</h2>
            <p>
              Pilih tindakan cepat. Tekan angka <kbd>1</kbd> s.d. <kbd>9</kbd> untuk membuka formulir langsung.
            </p>
          </div>
          <Button
            type="button"
            className="action-modal-close"
            onClick={onClose}
            aria-label="Tutup menu aksi"
            title="Tutup (Esc)"
          >
            <X size={20} strokeWidth={2.25} />
          </Button>
        </header>

        <div className="action-modal-sections">
          <KelompokAksi judul="Buku koperasi" daftar={actions.slice(0, 5)} onSelect={handleSelect} />
          <KelompokAksi judul="Pekerjaan & evaluasi" daftar={actions.slice(5)} onSelect={handleSelect} />
          <KelompokAksi judul="Usaha harian" daftar={usahaHarian} onSelect={handleSelect} />
        </div>
      </div>
    </DialogSurface>
  );
}

