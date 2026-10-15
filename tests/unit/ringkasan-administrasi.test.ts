import { expect, it } from 'vitest';
import { angkaAdministrasi } from '@/features/administrasi/RingkasanAdministrasi';
import { judulOtomatis } from '@/features/records/judul-otomatis';
import type { Item } from '@/features/records/schemas';

const row = (id: string, data: Record<string, unknown>) => ({ id, data }) as unknown as Item;

it('saldo simpanan per jenis mengurangi penarikan', () => {
  const angka = angkaAdministrasi('savings', {
    savings: [
      row('1', { member_id: 'a', kind: 'sukarela', direction: 'setor', amount: 100_000 }),
      row('2', { member_id: 'a', kind: 'sukarela', direction: 'tarik', amount: 40_000 }),
      row('3', { member_id: 'b', kind: 'wajib', direction: 'setor', amount: 50_000 }),
    ],
  });
  expect(angka.find((a) => a.label === 'Simpanan sukarela')?.nilai).toMatch(/60\.000/);
  expect(angka.find((a) => a.label === 'Anggota penyimpan')?.nilai).toBe('2');
});

it('kehadiran hari ini menghitung hadir dan terlambat sebagai hadir', () => {
  const angka = angkaAdministrasi(
    'attendance',
    {
      attendance: [
        row('1', { date: '2026-10-15', status: 'hadir' }),
        row('2', { date: '2026-10-15', status: 'terlambat' }),
        row('3', { date: '2026-10-15', status: 'sakit' }),
        row('4', { date: '2026-10-14', status: 'hadir' }),
      ],
    },
    '2026-10-15',
  );
  expect(angka[0]).toMatchObject({ label: 'Hadir hari ini', nilai: '2/3' });
});

it('judul otomatis diambil dari petugas, gerai, atau anggota', () => {
  const ws = { staff: [row('s', { title: 'Sari' })], units: [row('u', { title: 'Gerai Sembako' })], members: [row('m', { title: 'Budi' })] };
  expect(judulOtomatis('attendance', { staff_id: 's' }, ws)).toBe('Sari');
  expect(judulOtomatis('sales', { unit_id: 'u' }, ws)).toBe('Penjualan Gerai Sembako');
  expect(judulOtomatis('savings', { member_id: 'm', kind: 'wajib' }, ws)).toBe('Simpanan wajib · Budi');
  expect(judulOtomatis('assets', {}, ws)).toBeNull();
});
