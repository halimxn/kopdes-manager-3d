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
import { recordHref } from '../workspace/workspace-navigation';

type Data = { sales: Item[]; attendance: Item[]; staff: Item[]; units: Item[] };
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
  const [sales, attendance, staff, units] = await Promise.all([
    ambil(`sales?from=${addDays(hari, -6)}&to=${hari}&limit=100`),
    ambil(`attendance?from=${hari}&to=${hari}&limit=100`),
    ambil('staff?limit=100'),
    ambil('units?limit=100'),
  ]);
  return { sales, attendance, staff, units };
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
      <section className="modul lebar-penuh" aria-label="Usaha harian">
        <p className="notice error" role="alert">Penjualan dan kehadiran belum dapat dimuat: {keadaan.pesan}</p>
      </section>
    );
  return (
    <>
      <PenjualanGerai sales={keadaan.sales} units={keadaan.units} hari={hari} />
      <KehadiranHariIni attendance={keadaan.attendance} staff={keadaan.staff} />
    </>
  );
}

function PenjualanGerai({ sales, units, hari }: { sales: Item[]; units: Item[]; hari: string }) {
  const hariHari = Array.from({ length: 7 }, (_, i) => addDays(hari, i - 6));
  const perHari = hariHari.map((tanggal) =>
    sales.filter((row) => row.data.date === tanggal).reduce((total, row) => total + Number(row.data.amount || 0), 0),
  );
  const puncak = Math.max(1, ...perHari);
  const perGerai = Object.entries(
    sales.reduce<Record<string, number>>((total, row) => {
      const id = String(row.data.unit_id);
      total[id] = (total[id] || 0) + Number(row.data.amount || 0);
      return total;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const namaGerai = (id: string) => String(units.find((row) => row.id === id)?.data.title || 'Gerai');
  return (
    <section className="modul lebar-separuh" aria-label="Penjualan gerai 7 hari">
      <div className="modul-kepala">
        <h2>Penjualan gerai 7 hari</h2>
        <Link href="/penjualan" className="modul-tautan">Rincian</Link>
      </div>
      {sales.length ? (
        <div className="jual">
          <div className="jual-grafik" role="img" aria-label={`Omzet 7 hari: ${perHari.map((n, i) => `${namaHari(hariHari[i])} ${juta(n)}`).join(', ')}`}>
            {perHari.map((nilai, i) => (
              <div key={hariHari[i]} className={hariHari[i] === hari ? 'is-hari-ini' : undefined}>
                <i style={{ height: nilai ? `${Math.max(4, (nilai / puncak) * 100)}%` : 0 }} />
                <small>{namaHari(hariHari[i])}</small>
              </div>
            ))}
          </div>
          <ul className="jual-daftar">
            {perGerai.map(([id, total]) => (
              <li key={id}>
                <span>{namaGerai(id)}</span>
                <b>{juta(total)}</b>
              </li>
            ))}
          </ul>
        </div>
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
  return (
    <section className="modul lebar-separuh" aria-label="Kehadiran hari ini">
      <div className="modul-kepala">
        <h2>Kehadiran hari ini</h2>
        <Link href="/absensi" className="modul-tautan">Jadwal & absensi</Link>
      </div>
      {aktif.length ? (
        <>
          <div className="beranda-pil hadir-ringkas">
            <span className="pil pil-netral"><b>{hadir}</b> hadir</span>
            <span className="pil pil-biru"><b>{absen}</b> izin/sakit/cuti/alpa</span>
            <span className={`pil ${belum ? 'pil-telat' : 'pil-netral'}`}><b>{belum}</b> belum absen</span>
          </div>
          <ul className="beranda-baris is-ringkas">
            {baris.map(({ row, catatan }) => {
              const status = String(catatan?.data.status || '');
              const belumAbsen = !status || status === 'terjadwal';
              return (
                <li key={row.id}>
                  <Link href={catatan ? recordHref('attendance', catatan) : '/absensi?baru=1'}>
                    <span className="record-avatar" aria-hidden="true">{String(row.data.title || '?').slice(0, 1).toUpperCase()}</span>
                    <span className="beranda-baris-teks">
                      <strong>{String(row.data.title)}</strong>
                      <small>{String(catatan?.data.shift || row.data.work_hours || row.data.role || '')}</small>
                    </span>
                    <span className={`beranda-tanggal${belumAbsen || status === 'alpa' ? ' is-telat' : status === 'hadir' ? ' is-hadir' : ''}`}>
                      {belumAbsen
                        ? 'Belum absen'
                        : status === 'hadir' || status === 'terlambat'
                          ? `${status === 'terlambat' ? 'Terlambat' : 'Hadir'}${catatan?.data.check_in_time ? ` ${String(catatan.data.check_in_time)}` : ''}`
                          : status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
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
