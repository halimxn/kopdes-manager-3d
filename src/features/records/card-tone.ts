import type { Entity, Item } from './schemas';
import type { Workspace } from '@/features/workspace/use-workspace';
import { projectTone, type Tone } from '@/lib/tones';
import { personTone } from '@/lib/people';
import { meetingKindOf } from '@/features/agenda/meeting-kinds';

/** Status stok barang: habis (≤0), menipis (≤ batas), aman. */
export function stockState(row: Item): 'habis' | 'menipis' | 'aman' {
  const quantity = Number(row.data.book_quantity || 0);
  if (quantity <= 0) return 'habis';
  if (quantity <= Number(row.data.minimum_quantity || 0)) return 'menipis';
  return 'aman';
}

export const riskScore = (row: Item) =>
  Number(row.data.probability || 3) * Number(row.data.impact || 3);
export const riskLevel = (score: number) =>
  score >= 15 ? 'Kritis' : score >= 8 ? 'Waspada' : 'Terkendali';

/**
 * Warna pastel kartu menurut arti datanya (proyek, arah kas, kondisi stok, jenis agenda),
 * sehingga warna membantu membaca, bukan hiasan acak.
 */
export function cardTone(entity: Entity, row: Item, ws: Workspace): Tone {
  const d = row.data;
  const project = (id: unknown) => ws.workstreams?.find((p) => p.id === id);
  switch (entity) {
    case 'work-items':
    case 'milestones':
      return d.workstream_id ? projectTone(project(d.workstream_id)) : 'slate';
    case 'checklist':
      return d.status === 'selesai' ? 'mint' : d.status === 'proses' ? 'sky' : 'slate';
    case 'workstreams':
      return projectTone(row);
    case 'cash-entries':
      return d.direction === 'masuk' ? 'mint' : 'rose';
    case 'savings':
      return d.direction === 'tarik' ? 'peach' : 'mint';
    case 'inventory-items':
      return { habis: 'rose', menipis: 'peach', aman: 'mint' }[stockState(row)] as Tone;
    case 'stock-counts':
      return Number(d.counted_quantity) === Number(d.book_quantity) ? 'mint' : 'peach';
    case 'meetings':
      return ({ rapat: 'lavender', kunjungan: 'sky', acara: 'peach', lainnya: 'mint' } as const)[
        meetingKindOf(row)
      ];
    case 'risks': {
      const score = riskScore(row);
      return d.status === 'ditutup'
        ? 'slate'
        : score >= 15
          ? 'rose'
          : score >= 8
            ? 'peach'
            : 'mint';
    }
    case 'issues':
      return d.status === 'ditutup' ? 'slate' : d.status === 'ditangani' ? 'sky' : 'rose';
    case 'documents':
      return d.status === 'tersedia' ? 'mint' : d.status === 'diproses' ? 'sky' : 'rose';
    case 'units':
      return d.status === 'aktif'
        ? 'mint'
        : d.status === 'siap buka'
          ? 'sky'
          : d.status === 'rencana'
            ? 'slate'
            : 'peach';
    case 'members':
      return d.status === 'nonaktif' ? 'slate' : 'sky';
    case 'staff':
    case 'attendance':
    case 'trainings':
      return personTone(
        String(
          entity === 'staff'
            ? d.title
            : ws.staff?.find((s) => s.id === d.staff_id)?.data.title || d.title,
        ),
      );
    case 'deliveries':
      return d.status === 'selesai'
        ? 'mint'
        : d.status === 'dibatalkan'
          ? 'slate'
          : d.direction === 'keluar'
            ? 'peach'
            : 'sky';
    case 'stock-movements':
      return String(d.kind).includes('kurang') || d.kind === 'keluar' ? 'peach' : 'mint';
    case 'purchase-orders':
      return d.status === 'diterima' ? 'mint' : d.status === 'dibatalkan' ? 'slate' : 'lavender';
    case 'assets':
      return d.condition === 'baik' ? 'sky' : d.condition === 'dihapuskan' ? 'slate' : 'peach';
    case 'sales':
      return 'lavender';
    case 'stakeholders':
    case 'interactions':
      return personTone(String(d.category || d.title));
    case 'decisions':
      return 'lemon';
    case 'journal':
      return 'lavender';
    default:
      return 'slate';
  }
}
