import Link from 'next/link';
import { Progress } from '@/components/ui/Progress';
import { IkonHalaman } from '@/components/ui/IkonHalaman';

const IKON = { pekerjaan: '/proyek', catatan: '/rapat', usaha: '/gerai', koperasi: '/anggota' } as const;

/** Kartu ala Taskflow: sampul warna hub + ikon, karena tidak ada foto asli yang boleh dipakai. */
export function KartuPekerjaan({
  judul,
  hub,
  href,
  progres,
  tenggat,
  keterangan,
  terlambat = false,
}: {
  judul: string;
  hub: keyof typeof IKON;
  href: string;
  progres: number | null;
  tenggat?: string;
  keterangan?: string;
  terlambat?: boolean;
}) {
  return (
    <Link href={href} className={`kartu-pekerjaan sampul-${hub}`}>
      <span className="kartu-pekerjaan-sampul" aria-hidden="true">
        <IkonHalaman href={IKON[hub]} size={36} />
      </span>
      <span className="kartu-pekerjaan-teks">
        <strong>{judul}</strong>
        {keterangan && <small>{keterangan}</small>}
      </span>
      <Progress value={progres} label="Progres" tampilkanAngka />
      {tenggat && <small className={`kartu-pekerjaan-tenggat${terlambat ? ' is-telat' : ''}`}>{tenggat}</small>}
    </Link>
  );
}
