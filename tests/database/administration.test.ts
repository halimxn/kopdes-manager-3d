// @vitest-environment node
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

let database: PGlite;
const insert = (entity: string, data: Record<string, unknown>, id = randomUUID()) =>
  database
    .query('insert into public.hub_records(id,entity,data) values($1,$2,$3::jsonb)', [id, entity, JSON.stringify(data)])
    .then(() => id);

beforeAll(async () => {
  database = new PGlite();
  await database.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  for (const file of readdirSync('supabase/migrations')
    .filter((name) => name.endsWith('.sql'))
    .sort())
    await database.exec(readFileSync(`supabase/migrations/${file}`, 'utf8'));
}, 60000);
afterAll(async () => {
  await database?.close();
});

describe('Migrasi 10: administrasi usaha', () => {
  it('fungsi kesiapan hanya dapat dipanggil server', async () => {
    const { rows } = await database.query<{ ready: boolean; anon: boolean }>(
      `select public.hub_administration_ready() as ready,
        has_function_privilege('anon','public.hub_administration_ready()','EXECUTE') as anon`,
    );
    expect(rows[0]).toEqual({ ready: true, anon: false });
  });

  it('simpanan menolak penarikan melebihi setoran per jenis', async () => {
    const member = await insert('members', { title: 'Anggota uji', member_number: 'A-1', status: 'aktif' });
    const base = { title: 'Simpanan', member_id: member, date: '2026-10-15' };
    await insert('savings', { ...base, kind: 'sukarela', direction: 'setor', amount: 50000 });
    await insert('savings', { ...base, kind: 'sukarela', direction: 'tarik', amount: 20000 });
    await expect(insert('savings', { ...base, kind: 'sukarela', direction: 'tarik', amount: 40000 })).rejects.toThrow(
      'Savings balance would be negative',
    );
    // Saldo wajib terpisah dari sukarela.
    await expect(insert('savings', { ...base, kind: 'wajib', direction: 'tarik', amount: 1 })).rejects.toThrow(
      'Savings balance would be negative',
    );
    await expect(insert('savings', { ...base, kind: 'pinjaman', direction: 'setor', amount: 1 })).rejects.toThrow(
      'Invalid savings kind',
    );
    await expect(insert('savings', { ...base, member_id: randomUUID(), kind: 'pokok', direction: 'setor', amount: 1 })).rejects.toThrow(
      'Missing related record',
    );
  });

  it('absensi dan penjualan hanya satu per hari', async () => {
    const staff = await insert('staff', { title: 'Petugas uji', status: 'aktif' });
    await insert('attendance', { title: 'Petugas uji', staff_id: staff, date: '2026-10-15', status: 'hadir' });
    await expect(
      insert('attendance', { title: 'Petugas uji', staff_id: staff, date: '2026-10-15', status: 'izin' }),
    ).rejects.toThrow();
    await expect(
      insert('attendance', { title: 'Petugas uji', staff_id: staff, date: '2026-10-16', status: 'bolos' }),
    ).rejects.toThrow('Invalid attendance status');
    const unit = await insert('units', { title: 'Gerai uji', status: 'aktif' });
    await insert('sales', { title: 'Gerai uji', unit_id: unit, date: '2026-10-15', amount: 0, transactions: 0 });
    await expect(
      insert('sales', { title: 'Gerai uji', unit_id: unit, date: '2026-10-15', amount: 1000, transactions: 1 }),
    ).rejects.toThrow();
    await expect(
      insert('sales', { title: 'Gerai uji', unit_id: unit, date: '2026-10-16', amount: 1.5, transactions: 1 }),
    ).rejects.toThrow('Invalid amount or quantity');
  });

  it('pengiriman dapat menaut pembelian; pembelian bertaut tidak dapat dihapus', async () => {
    const purchase = await insert('purchase-orders', { title: 'Beli beras', status: 'dipesan', total: 2500000 });
    await insert('deliveries', { title: 'Kiriman beras', direction: 'masuk', status: 'tiba', purchase_id: purchase });
    await expect(database.query('delete from public.hub_records where id=$1', [purchase])).rejects.toThrow(
      'Record is still referenced',
    );
    await expect(insert('purchase-orders', { title: 'Salah', status: 'hilang', total: 0 })).rejects.toThrow(
      'Invalid purchase status',
    );
    await expect(insert('assets', { title: 'Freezer', condition: 'baru', value: 1 })).rejects.toThrow(
      'Invalid asset condition',
    );
  });
});
