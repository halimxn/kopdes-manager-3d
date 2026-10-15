'use client';
// Angka ringkas di halaman administrasi usaha. Dihitung dari catatan yang sudah dimuat;
// bila masih ada halaman berikutnya, WorkspacePage sudah menampilkan catatan muatan sebagian.
import { addDays, today } from '@/lib/date';
import { rupiah } from '../operations/ledger';
import type { Entity, Item } from '../records/schemas';
import type { Workspace } from '../workspace/useWorkspace';

type Angka = { label: string; nilai: string; catatan?: string; nada?: 'ok' | 'warn' | 'late' };

const jumlah = (rows: Item[], field: string) => rows.reduce((total, row) => total + Number(row.data[field] || 0), 0);

export function angkaAdministrasi(entity: Entity, data: Workspace, hari = today()): Angka[] {
  const rows = data[entity] || [];
  if (entity === 'savings') {
    const saldo = (kind: string) =>
      rows
        .filter((row) => row.data.kind === kind)
        .reduce((total, row) => total + (row.data.direction === 'tarik' ? -1 : 1) * Number(row.data.amount || 0), 0);
    const penyimpan = new Set(rows.map((row) => row.data.member_id)).size;
    return [
      { label: 'Simpanan pokok', nilai: rupiah(saldo('pokok')) },
      { label: 'Simpanan wajib', nilai: rupiah(saldo('wajib')) },
      { label: 'Simpanan sukarela', nilai: rupiah(saldo('sukarela')) },
      { label: 'Anggota penyimpan', nilai: String(penyimpan) },
    ];
  }
  if (entity === 'sales') {
    const awal = addDays(hari, -6);
    const pekan = rows.filter((row) => String(row.data.date) >= awal && String(row.data.date) <= hari);
    const kemarin = rows.filter((row) => row.data.date === addDays(hari, -1));
    return [
      { label: 'Omzet 7 hari', nilai: rupiah(jumlah(pekan, 'amount')) },
      { label: 'Transaksi 7 hari', nilai: String(jumlah(pekan, 'transactions')) },
      { label: 'Omzet kemarin', nilai: rupiah(jumlah(kemarin, 'amount')), catatan: `${kemarin.length} gerai melapor` },
    ];
  }
  if (entity === 'attendance') {
    const hariIni = rows.filter((row) => row.data.date === hari);
    const hadir = hariIni.filter((row) => ['hadir', 'terlambat'].includes(String(row.data.status))).length;
    const absen = hariIni.filter((row) => ['izin', 'sakit', 'cuti', 'alpa'].includes(String(row.data.status))).length;
    const belum = hariIni.filter((row) => row.data.status === 'terjadwal').length;
    const terlambat = hariIni.filter((row) => row.data.status === 'terlambat').length;
    return [
      { label: 'Hadir hari ini', nilai: `${hadir}/${hariIni.length}`, nada: 'ok' },
      { label: 'Terlambat', nilai: String(terlambat), nada: terlambat ? 'warn' : undefined },
      { label: 'Izin, sakit, cuti, alpa', nilai: String(absen), nada: absen ? 'warn' : undefined },
      { label: 'Belum absen', nilai: String(belum) },
    ];
  }
  if (entity === 'purchase-orders') {
    const terbuka = rows.filter((row) => row.data.status === 'dipesan');
    const lewat = terbuka.filter((row) => row.data.expected_date && String(row.data.expected_date) < hari).length;
    return [
      { label: 'Menunggu barang', nilai: String(terbuka.length) },
      { label: 'Nilai pesanan terbuka', nilai: rupiah(jumlah(terbuka, 'total')) },
      { label: 'Lewat perkiraan tiba', nilai: String(lewat), nada: lewat ? 'late' : undefined },
    ];
  }
  if (entity === 'assets') {
    const aktif = rows.filter((row) => row.data.condition !== 'dihapuskan');
    const perbaikan = aktif.filter((row) => ['perlu perbaikan', 'rusak'].includes(String(row.data.condition))).length;
    return [
      { label: 'Aset tercatat', nilai: String(aktif.length) },
      { label: 'Nilai perolehan', nilai: rupiah(jumlah(aktif, 'value')) },
      { label: 'Perlu perbaikan / rusak', nilai: String(perbaikan), nada: perbaikan ? 'warn' : undefined },
    ];
  }
  return [];
}

export function RingkasanAdministrasi({ entity, data }: { entity: Entity; data: Workspace }) {
  const angka = angkaAdministrasi(entity, data);
  if (!angka.length) return null;
  return (
    <section className="ringkasan-admin" aria-label="Ringkasan">
      {angka.map((item) => (
        <div key={item.label} className={`ringkasan-admin-angka${item.nada ? ` is-${item.nada}` : ''}`}>
          <span>{item.label}</span>
          <strong>{item.nilai}</strong>
          {item.catatan && <small>{item.catatan}</small>}
        </div>
      ))}
    </section>
  );
}
