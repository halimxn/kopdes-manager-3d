'use client';
// Modul Beranda dari administrasi usaha (migrasi 10). Memuat datanya sendiri dengan rentang
// tanggal tepat agar angka tidak bergantung pada 50 catatan terbaru; disembunyikan bila
// migrasi belum aktif supaya Beranda tidak dipenuhi modul kosong.
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/lib/client';
import { addDays, today } from '@/lib/date';
import type { Item } from '../records/schemas';
import { loadCapabilities } from '../workspace/useWorkspace';
import { BadgeCheck, Store } from 'lucide-react';
import { recordHref } from '../workspace/workspace-navigation';

type Data = { sales: Item[]; attendance: Item[]; staff: Item[] };
type Keadaan = { status: 'memuat' } | { status: 'nonaktif' } | { status: 'galat'; pesan: string } | ({ status: 'siap' } & Data);

const juta = (nilai: number) =>
  nilai >= 1_000_000
    ? `Rp ${(nilai / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`
    : `Rp ${nilai.toLocaleString('id-ID')}`;
const namaHari = (tanggal: string) =>
  new Intl.DateTimeFormat('id-ID', { weekday: 'short', timeZone: 'UTC' }).format(new Date(tanggal + 'T12:00:00Z'));

async function muatUsahaHarian(hari: string): Promise<Data | null> {
  if (!(await loadCapabilities()).administration) return null;
  const ambil = (path: string) => api<{ items: Item[] }>(path).then((page) => page.items);
  const [sales, attendance, staff] = await Promise.all([
    ambil(`sales?from=${addDays(hari, -6)}&to=${hari}&limit=100`),
    ambil(`attendance?from=${hari}&to=${hari}&limit=100`),
    ambil('staff?limit=100'),
  ]);
  return { sales, attendance, staff };
}

export function ModulUsahaHarian() {
  const [keadaan, setKeadaan] = useState<Keadaan>({ status: 'memuat' });
  const hari = today();
  useEffect(() => {
    let aktif = true;
    muatUsahaHarian(hari)
      .then((data) => aktif && setKeadaan(data ? { status: 'siap', ...data } : { status: 'nonaktif' }))
      .catch((galat: Error) => aktif && setKeadaan({ status: 'galat', pesan: galat.message }));
    return () => {
      aktif = false;
    };
  }, [hari]);

  if (keadaan.status === 'nonaktif' || keadaan.status === 'memuat') return null;
  if (keadaan.status === 'galat')
    return (
      <section className="modul beranda-jual" aria-label="Usaha harian">
        <p className="notice error" role="alert">Penjualan dan kehadiran belum dapat dimuat: {keadaan.pesan}</p>
      </section>
    );
  return (
    <>
      <PenjualanGerai sales={keadaan.sales} hari={hari} />
      <KehadiranHariIni attendance={keadaan.attendance} staff={keadaan.staff} />
    </>
  );
}

function PenjualanGerai({ sales, hari }: { sales: Item[]; hari: string }) {
  const hariHari = Array.from({ length: 7 }, (_, i) => addDays(hari, i - 6));
  const perHari = hariHari.map((tanggal) =>
    sales.filter((row) => row.data.date === tanggal).reduce((total, row) => total + Number(row.data.amount || 0), 0),
  );
  const puncak = Math.max(1, ...perHari);
  const total = perHari.reduce((n, v) => n + v, 0);
  const hariTercatat = perHari.filter(Boolean).length;
  return (
    <section className="modul beranda-jual" aria-label="Penjualan gerai 7 hari">
      <div className="modul-kepala">
        <span className="ubin ubin-kecil ubin-teal" aria-hidden="true">
          <Store size={17} />
        </span>
        <h2>Penjualan gerai</h2>
        <Link href="/penjualan" className="modul-tautan">Rincian</Link>
      </div>
      {sales.length ? (
        <>
          <div className="kas-angka">
            <strong>{juta(total)}</strong>
            <small>7 hari terakhir · {hariTercatat} hari tercatat</small>
          </div>
          <div className="jual-grafik" role="img" aria-label={`Omzet 7 hari: ${perHari.map((n, i) => `${namaHari(hariHari[i])} ${n ? juta(n) : 'belum dicatat'}`).join(', ')}`}>
            {perHari.map((nilai, i) => (
              <div key={hariHari[i]} className={`${hariHari[i] === hari ? 'is-hari-ini' : ''}${nilai === puncak ? ' is-puncak' : ''}${nilai ? '' : ' is-kosong'}`}>
                {nilai === puncak && <span className="jual-nilai">{juta(nilai)}</span>}
                <i style={{ height: nilai ? `${Math.max(6, (nilai / puncak) * 100)}%` : undefined }} />
                <small>{namaHari(hariHari[i])}</small>
              </div>
            ))}
          </div>
          {!perHari[6] && <p className="beranda-kosong">Hari ini belum ada catatan penjualan.</p>}
        </>
      ) : (
        <EmptyState
          compact
          ikon="lonceng"
          title="Belum ada penjualan 7 hari terakhir"
          description="Catat omzet dan jumlah transaksi tiap gerai per hari."
          action={{ label: 'Catat penjualan', href: '/penjualan?baru=1' }}
        />
      )}
    </section>
  );
}

const urutanPerhatian = ['terjadwal', 'alpa', 'terlambat', 'sakit', 'izin', 'cuti', 'hadir', 'libur'];
const WARNA = ['delima', 'ungu', 'oranye', 'teal', 'pink'] as const;
const warnaOrang = (nama: string) => {
  let h = 0;
  for (const huruf of nama) h = (h * 31 + huruf.charCodeAt(0)) >>> 0;
  return WARNA[h % WARNA.length];
};

/** Tim hari ini (pola Team Members M.project): bilah hadir/izin/belum, lalu petugas yang perlu dilihat dulu. */
function KehadiranHariIni({ attendance, staff }: { attendance: Item[]; staff: Item[] }) {
  const aktif = staff.filter((row) => row.data.status === 'aktif');
  const catatanOf = (id: string) => attendance.find((row) => row.data.staff_id === id);
  const hadir = attendance.filter((row) => ['hadir', 'terlambat'].includes(String(row.data.status))).length;
  const absen = attendance.filter((row) => ['izin', 'sakit', 'cuti', 'alpa'].includes(String(row.data.status))).length;
  // Belum absen: terjadwal tapi belum diperbarui, atau petugas aktif tanpa catatan hari ini.
  const belum = aktif.filter((row) => {
    const status = catatanOf(row.id)?.data.status;
    return !status || status === 'terjadwal';
  }).length;
  const baris = aktif
    .map((row) => ({ row, catatan: catatanOf(row.id) }))
    .sort(
      (a, b) =>
        urutanPerhatian.indexOf(String(a.catatan?.data.status || 'terjadwal')) -
        urutanPerhatian.indexOf(String(b.catatan?.data.status || 'terjadwal')),
    )
    .slice(0, 4);
  const total = Math.max(1, hadir + absen + belum);
  return (
    <section className="modul beranda-hadir" aria-label="Kehadiran hari ini">
      <div className="modul-kepala">
        <span className="ubin ubin-kecil ubin-teal" aria-hidden="true">
          <BadgeCheck size={17} />
        </span>
        <h2>Tim hari ini</h2>
        <Link href="/absensi" className="modul-tautan">Absensi</Link>
      </div>
      {aktif.length ? (
        <>
          <p className="hadir-ringkas">
            <b>{hadir}</b> hadir · <b>{absen}</b> izin/sakit · <b className={belum ? 'is-telat' : undefined}>{belum}</b> belum absen
          </p>
          <span className="hadir-bilah" role="img" aria-label={`${hadir} dari ${aktif.length} petugas hadir`}>
            <i className="is-hadir" style={{ flexGrow: hadir / total }} />
            <i className="is-izin" style={{ flexGrow: absen / total }} />
            <i className="is-belum" style={{ flexGrow: belum / total }} />
          </span>
          <ul className="beranda-baris">
            {baris.map(({ row, catatan }) => {
              const nama = String(row.data.title || '?');
              const status = String(catatan?.data.status || '');
              const belumAbsen = !status || status === 'terjadwal';
              const label = belumAbsen
                ? 'Belum absen'
                : status === 'hadir' || status === 'terlambat'
                  ? `${status === 'terlambat' ? 'Terlambat' : 'Hadir'}${catatan?.data.check_in_time ? ` ${String(catatan.data.check_in_time)}` : ''}`
                  : status.charAt(0).toUpperCase() + status.slice(1);
              return (
                <li key={row.id}>
                  <Link href={catatan ? recordHref('attendance', catatan) : '/absensi?baru=1'}>
                    <span className={`avatar-warna is-${warnaOrang(nama)}`} aria-hidden="true">
                      {nama.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="beranda-baris-teks">
                      <strong>{nama}</strong>
                      <small>{String(catatan?.data.shift || row.data.work_hours || row.data.role || '')}</small>
                    </span>
                    <span className={`hadir-status is-${belumAbsen || status === 'alpa' ? 'telat' : status === 'hadir' ? 'hadir' : 'izin'}`}>{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <EmptyState
          compact
          ikon="tim"
          title="Belum ada petugas aktif"
          description="Tambahkan petugas di Tim & petugas untuk mencatat kehadiran."
          action={{ label: 'Buka Tim', href: '/tim' }}
        />
      )}
    </section>
  );
}
