'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Wallet } from 'lucide-react';
import { api } from '@/lib/client';
import { rupiah } from '../operations/ledger';
import type { Item } from '../records/schemas';
import { loadCapabilities } from '../workspace/useWorkspace';

type Realisasi = { keluar: number; masuk: number; jumlah: number };
type Keadaan = { status: 'memuat' } | { status: 'nonaktif' } | { status: 'galat'; pesan: string } | ({ status: 'siap' } & Realisasi);

// Batas halaman agar proyek dengan ribuan transaksi tidak membekukan peramban.
const MAKS_HALAMAN = 50;

/** Menjumlahkan seluruh transaksi kas yang ditautkan ke proyek; galat tidak pernah ditampilkan sebagai nol. */
export async function muatRealisasi(projectId: string): Promise<Realisasi> {
  const total: Realisasi = { keluar: 0, masuk: 0, jumlah: 0 };
  for (let halaman = 0, offset = 0; halaman < MAKS_HALAMAN; halaman++) {
    const page = await api<{ items: Item[]; hasMore: boolean; nextOffset: number }>(
      `cash-entries?project=${projectId}&scope=all&limit=100&offset=${offset}`,
    );
    for (const row of page.items) {
      const nominal = Number(row.data.amount || 0);
      if (row.data.direction === 'keluar') total.keluar += nominal;
      else if (row.data.direction === 'masuk') total.masuk += nominal;
      total.jumlah++;
    }
    if (!page.hasMore) return total;
    offset = page.nextOffset;
  }
  throw new Error('Transaksi proyek terlalu banyak untuk dijumlahkan di sini.');
}

export function ProjectBudget({ project }: { project: Item }) {
  const anggaran = Number(project.data.budget || 0);
  const [keadaan, setKeadaan] = useState<Keadaan>({ status: 'memuat' });
  useEffect(() => {
    let aktif = true;
    void (async () => {
      try {
        if (!(await loadCapabilities()).operations) {
          if (aktif) setKeadaan({ status: 'nonaktif' });
          return;
        }
        const realisasi = await muatRealisasi(project.id);
        if (aktif) setKeadaan({ status: 'siap', ...realisasi });
      } catch (galat) {
        if (aktif) setKeadaan({ status: 'galat', pesan: (galat as Error).message });
      }
    })();
    return () => {
      aktif = false;
    };
  }, [project.id]);

  const persen = keadaan.status === 'siap' && anggaran ? Math.round((keadaan.keluar / anggaran) * 100) : 0;
  const lebih = keadaan.status === 'siap' && anggaran > 0 && keadaan.keluar > anggaran;
  return (
    <section className="project-budget" aria-labelledby="project-budget-title">
      <div className="project-budget-kepala">
        <span className="modul-ikon pastel-mint" aria-hidden="true">
          <Wallet size={16} />
        </span>
        <h2 id="project-budget-title">Anggaran</h2>
        <Link href="/keuangan" className="modul-tautan">
          Buku kas
        </Link>
      </div>
      {keadaan.status === 'memuat' ? (
        <p className="project-budget-catatan" role="status">Menjumlahkan transaksi proyek…</p>
      ) : keadaan.status === 'nonaktif' ? (
        <p className="project-budget-catatan">Buku kas belum aktif. Pasang migrasi pencatatan untuk melihat realisasi.</p>
      ) : keadaan.status === 'galat' ? (
        <p className="notice error" role="alert">Realisasi belum dapat dihitung: {keadaan.pesan}</p>
      ) : (
        <>
          <dl className="project-budget-angka">
            <div>
              <dt>Anggaran</dt>
              <dd>{anggaran ? rupiah(anggaran) : 'Belum diisi'}</dd>
            </div>
            <div>
              <dt>Uang keluar tercatat</dt>
              <dd>{rupiah(keadaan.keluar)}</dd>
            </div>
            <div>
              <dt>{lebih ? 'Melebihi anggaran' : 'Sisa anggaran'}</dt>
              <dd className={lebih ? 'is-lebih' : undefined}>{anggaran ? rupiah(Math.abs(anggaran - keadaan.keluar)) : '—'}</dd>
            </div>
          </dl>
          {anggaran > 0 && (
            <div className="project-budget-bar">
              <span
                className="ui-progress"
                role="progressbar"
                aria-label="Realisasi anggaran"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.min(persen, 100)}
              >
                <span className={lebih ? 'is-lebih' : undefined} style={{ width: `${Math.min(persen, 100)}%` }} />
              </span>
              <small>{persen}% terpakai</small>
            </div>
          )}
          <p className="project-budget-catatan">
            {keadaan.jumlah
              ? `${keadaan.jumlah} transaksi buku kas ditautkan ke proyek ini${keadaan.masuk ? `, termasuk uang masuk ${rupiah(keadaan.masuk)}` : ''}.`
              : 'Belum ada transaksi buku kas yang ditautkan. Pilih proyek ini saat mencatat uang keluar.'}
          </p>
        </>
      )}
    </section>
  );
}
