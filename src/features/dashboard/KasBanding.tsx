'use client';
// Uang masuk/keluar kumulatif bulan ini dibanding bulan lalu pada tanggal yang sama.
// Memuat kas dua bulan sendiri (berhalaman) agar angka tidak bergantung pada 50 catatan terbaru.
// Hanya uang tercatat, bukan saldo.
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { api } from '@/lib/client';
import { monthRange, today } from '@/lib/date';
import type { Item } from '../records/schemas';
import { loadCapabilities } from '../workspace/useWorkspace';
import { rupiah } from '../operations/ledger';
import { GrafikBanding } from '@/components/charts/GrafikLembut';

type Arah = 'masuk' | 'keluar';
type Keadaan = { status: 'memuat' } | { status: 'nonaktif' } | { status: 'galat'; pesan: string } | { status: 'siap'; rows: Item[] };

/** Jumlah kumulatif per tanggal 1..jumlahHari untuk satu arah kas. */
export function kumulatifHarian(rows: Item[], awal: string, jumlahHari: number, arah: Arah): number[] {
  const bulan = awal.slice(0, 7);
  const perHari = Array<number>(jumlahHari).fill(0);
  for (const row of rows) {
    const tanggal = String(row.data.date);
    if (!tanggal.startsWith(bulan) || row.data.direction !== arah) continue;
    const hari = Number(tanggal.slice(8, 10));
    if (hari >= 1 && hari <= jumlahHari) perHari[hari - 1] += Number(row.data.amount || 0);
  }
  let total = 0;
  return perHari.map((n) => (total += n));
}

async function muatKasDuaBulan(hari: string): Promise<Item[] | null> {
  if (!(await loadCapabilities()).operations) return null;
  const rows: Item[] = [];
  for (let offset = 0; offset <= 5000; ) {
    const page = await api<{ items: Item[]; hasMore: boolean; nextOffset: number }>(
      `cash-entries?from=${monthRange(hari, -1).start}&to=${hari}&limit=100&offset=${offset}`,
    );
    rows.push(...page.items);
    if (!page.hasMore) return rows;
    offset = page.nextOffset;
  }
  throw new Error('Catatan kas dua bulan terlalu banyak untuk grafik.');
}

const namaBulan = (tanggal: string) =>
  new Intl.DateTimeFormat('id-ID', { month: 'long', timeZone: 'UTC' }).format(new Date(tanggal + 'T12:00:00Z'));

export function KasBanding() {
  const hari = today();
  const [keadaan, setKeadaan] = useState<Keadaan>({ status: 'memuat' });
  const [arah, setArah] = useState<Arah>('masuk');
  useEffect(() => {
    let aktif = true;
    muatKasDuaBulan(hari)
      .then((rows) => aktif && setKeadaan(rows ? { status: 'siap', rows } : { status: 'nonaktif' }))
      .catch((galat: Error) => aktif && setKeadaan({ status: 'galat', pesan: galat.message }));
    return () => {
      aktif = false;
    };
  }, [hari]);

  const kini = monthRange(hari);
  const lalu = monthRange(hari, -1);
  const hariKe = Number(hari.slice(8, 10));
  const panjangLalu = Number(lalu.end.slice(8, 10));
  const panjangKini = Number(monthRange(hari, 0, '9999-12-31').end.slice(8, 10));
  const judul = arah === 'masuk' ? 'Uang masuk' : 'Uang keluar';

  return (
    <section className="modul beranda-kas" aria-label="Kas bulan ini dibanding bulan lalu">
      <div className="modul-kepala">
        <h2>{judul}</h2>
        <span className="beranda-legenda">
          <i className="is-kini" aria-hidden="true" />
          {namaBulan(kini.start)}
          <i className="is-lalu" aria-hidden="true" />
          {namaBulan(lalu.start)}
        </span>
        <div className="beranda-pilih" role="group" aria-label="Jenis kas">
          {(['masuk', 'keluar'] as const).map((nilai) => (
            <button key={nilai} type="button" aria-pressed={arah === nilai} onClick={() => setArah(nilai)}>
              {nilai === 'masuk' ? 'Masuk' : 'Keluar'}
            </button>
          ))}
        </div>
      </div>
      {keadaan.status === 'memuat' && <p className="beranda-kosong">Memuat buku kas…</p>}
      {keadaan.status === 'nonaktif' && <p className="beranda-kosong">Buku kas belum aktif di server ini.</p>}
      {keadaan.status === 'galat' && (
        <p className="notice error" role="alert">
          Buku kas belum dapat dimuat: {keadaan.pesan}
        </p>
      )}
      {keadaan.status === 'siap' &&
        (() => {
          const seriKini = kumulatifHarian(keadaan.rows, kini.start, hariKe, arah);
          const seriLalu = kumulatifHarian(keadaan.rows, lalu.start, panjangLalu, arah);
          const totalKini = seriKini.at(-1) || 0;
          const pembanding = seriLalu[Math.min(hariKe, panjangLalu) - 1] || 0;
          const selisih = totalKini - pembanding;
          const naik = selisih >= 0;
          return (
            <>
              <div className="kas-angka">
                <strong>{rupiah(totalKini)}</strong>
                {selisih !== 0 && (
                  <span className={`kas-selisih ${naik === (arah === 'masuk') ? 'is-baik' : 'is-buruk'}`}>
                    {naik ? <ArrowUpRight size={14} aria-hidden="true" /> : <ArrowDownRight size={14} aria-hidden="true" />}
                    {pembanding > 0
                      ? `${Math.abs(Math.round((selisih / pembanding) * 100))}%`
                      : rupiah(Math.abs(selisih))}
                  </span>
                )}
                <small>
                  dibanding 1–{Math.min(hariKe, panjangLalu)} {namaBulan(lalu.start)} ({rupiah(pembanding)}) · uang tercatat, bukan saldo
                </small>
              </div>
              <GrafikBanding
                kini={seriKini}
                lalu={seriLalu}
                jumlahHari={Math.max(panjangKini, panjangLalu)}
                labelKini={namaBulan(kini.start).slice(0, 3)}
                labelLalu={namaBulan(lalu.start).slice(0, 3)}
                tanggalKini={`${hariKe} ${namaBulan(kini.start)}`}
                ariaLabel={`${judul} kumulatif ${namaBulan(kini.start)} sampai tanggal ${hariKe}: ${rupiah(totalKini)}. ${namaBulan(lalu.start)} pada tanggal yang sama: ${rupiah(pembanding)}, sebulan penuh ${rupiah(seriLalu.at(-1) || 0)}.`}
              />
            </>
          );
        })()}
      <div className="modul-kaki">
        <Link className="home-text-link" href="/keuangan">
          Buku kas
        </Link>
      </div>
    </section>
  );
}
