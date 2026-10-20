import { CalendarDays, Handshake, Megaphone, Users, type LucideIcon } from 'lucide-react';
import { jenisAgenda, type Item } from '../records/schemas';

export type JenisAgenda = (typeof jenisAgenda)[number];

/** Label dan ikon tiap jenis agenda. Warna pastel diatur CSS lewat `data-jenis` dan selalu disertai label. */
export const INFO_JENIS: Record<JenisAgenda, { label: string; Ikon: LucideIcon }> = {
  rapat: { label: 'Rapat', Ikon: Users },
  kunjungan: { label: 'Kunjungan', Ikon: Handshake },
  acara: { label: 'Acara', Ikon: Megaphone },
  lainnya: { label: 'Lainnya', Ikon: CalendarDays },
};

/** Jenis agenda sebuah catatan; data lama tanpa jenis dianggap rapat. */
export function jenisDari(row: Item): JenisAgenda {
  const nilai = String(row.data.jenis || '');
  return (jenisAgenda as readonly string[]).includes(nilai) ? (nilai as JenisAgenda) : 'rapat';
}

/** Form catatan kegiatan (jurnal) yang sudah terisi hasil agenda: judul, tanggal, dan tautan ke agendanya. */
export function catatHasilHref(row: Item, tanggal: string): string {
  return `/jurnal?${new URLSearchParams({
    baru: '1',
    'isi.meeting_id': row.id,
    'isi.title': `Hasil: ${String(row.data.title)}`,
    'isi.date': tanggal,
  })}`;
}
