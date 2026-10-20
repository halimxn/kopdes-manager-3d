import { AlarmClock, CircleCheck, CircleDashed, LoaderCircle } from 'lucide-react';
import type { Item } from '../records/schemas';
import { today } from '@/lib/date';

const UBIN = [
  { nilai: 'rencana', label: 'Rencana', Ikon: CircleDashed },
  { nilai: 'proses', label: 'Dikerjakan', Ikon: LoaderCircle },
  { nilai: 'terlambat', label: 'Terlambat', Ikon: AlarmClock },
  { nilai: 'selesai', label: 'Selesai', Ikon: CircleCheck },
] as const;

/** Jumlah tugas per keadaan; "terlambat" = belum selesai/batal dan tenggatnya sudah lewat. */
export function hitungStatusTugas(rows: Item[], hariIni = today()): Record<(typeof UBIN)[number]['nilai'], number> {
  const terbuka = (s: unknown) => s !== 'selesai' && s !== 'dibatalkan';
  return {
    rencana: rows.filter((r) => r.data.status === 'rencana').length,
    proses: rows.filter((r) => r.data.status === 'proses').length,
    terlambat: rows.filter((r) => terbuka(r.data.status) && Boolean(r.data.due_date) && String(r.data.due_date) < hariIni).length,
    selesai: rows.filter((r) => r.data.status === 'selesai').length,
  };
}

/** Ubin ringkasan status di kepala halaman Tugas; menekan ubin menyaring daftar, menekan lagi melepasnya. */
export function UbinStatusTugas({ rows, aktif, onPilih }: { rows: Item[]; aktif: string; onPilih: (nilai: string) => void }) {
  const jumlah = hitungStatusTugas(rows);
  return (
    <div className="ubin-status-tugas" role="group" aria-label="Saring menurut status">
      {UBIN.map(({ nilai, label, Ikon }) => (
        <button
          key={nilai}
          type="button"
          className={`ubin-status is-${nilai}`}
          aria-pressed={aktif === nilai}
          onClick={() => onPilih(aktif === nilai ? '' : nilai)}
        >
          <span className="ubin-status-ikon" aria-hidden="true">
            <Ikon size={18} />
          </span>
          <span className="ubin-status-label">{label}</span>
          <strong>{jumlah[nilai]}</strong>
          <small>tugas</small>
        </button>
      ))}
    </div>
  );
}
