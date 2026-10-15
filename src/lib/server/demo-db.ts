import 'server-only';
import { randomUUID } from 'node:crypto';
import { dataContoh } from '@/features/demo/data-contoh';
import { references } from '@/features/records/catalog';
import { today } from '@/lib/date';

/**
 * Pengganti klien Supabase untuk mode demo. Hanya mendukung bagian PostgREST yang dipakai
 * aplikasi (filter eq/gt/gte/lte/in/ilike/or, order, range, limit, single) dan RPC aplikasi.
 * Data hidup di memori proses: bertahan selama `npm run dev` berjalan, kembali ke data contoh
 * saat server dimulai ulang.
 */
type Baris = Record<string, unknown> & { id: string };
type Galat = { code: string; message: string };
type Hasil = { data: unknown; error: Galat | null; count?: number };

type Toko = Record<string, Baris[]>;
const wadah = globalThis as typeof globalThis & { __kopdesDemo?: Toko };
function toko(): Toko {
  wadah.__kopdesDemo ??= {
    hub_records: dataContoh(today()).map((r) => ({ ...r }) as Baris),
  };
  return wadah.__kopdesDemo;
}
/** Hanya untuk tes: kembalikan data contoh awal. */
export function aturUlangDemo() {
  delete wadah.__kopdesDemo;
}

const salin = <T>(v: T): T => structuredClone(v);
const galat = (code: string, message: string): Hasil => ({ data: null, error: { code, message } });

/** Nilai kolom, termasuk `data->>field` (teks, null bila tidak ada) seperti PostgREST. */
function nilai(row: Baris, path: string): string | null {
  if (path.startsWith('data->>')) {
    const v = (row.data as Record<string, unknown> | undefined)?.[path.slice(7)];
    if (v === undefined || v === null) return null;
    return typeof v === 'object' ? JSON.stringify(v) : String(v);
  }
  const v = row[path];
  return v === undefined || v === null ? null : String(v);
}

type Saring = (row: Baris) => boolean;
function operasi(path: string, op: string, arg: unknown): Saring {
  return (row) => {
    const v = nilai(row, path);
    if (op === 'in') {
      const daftar = Array.isArray(arg)
        ? arg.map(String)
        : String(arg)
            .replace(/^\(|\)$/g, '')
            .split(',');
      return v !== null && daftar.includes(v);
    }
    if (v === null) return false;
    const a = String(arg);
    if (op === 'eq') return v === a;
    if (op === 'gt') return v > a;
    if (op === 'gte') return v >= a;
    if (op === 'lt') return v < a;
    if (op === 'lte') return v <= a;
    if (op === 'ilike') {
      // % = apa saja, _ = satu karakter, \x = karakter x apa adanya.
      const lolos = (c: string) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      let pola = '';
      for (let i = 0; i < a.length; i++) {
        const c = a[i];
        if (c === '\\' && i + 1 < a.length) pola += lolos(a[++i]);
        else pola += c === '%' ? '.*' : c === '_' ? '.' : lolos(c);
      }
      return new RegExp(`^${pola}$`, 'is').test(v);
    }
    return false;
  };
}
/** `a.in.(x,y),b.gte.2026-01-01` → gabungan OR. Koma di dalam kurung tidak memisah. */
function atau(teks: string): Saring {
  const bagian: string[] = [];
  let dalam = 0,
    awal = 0;
  for (let i = 0; i < teks.length; i++) {
    if (teks[i] === '(') dalam++;
    else if (teks[i] === ')') dalam--;
    else if (teks[i] === ',' && !dalam) {
      bagian.push(teks.slice(awal, i));
      awal = i + 1;
    }
  }
  bagian.push(teks.slice(awal));
  const saring = bagian.map((b) => {
    const m = /^(.+?)\.(eq|gt|gte|lt|lte|in|ilike)\.(.*)$/.exec(b.trim());
    if (!m) throw new Error(`Filter demo tidak dikenal: ${b}`);
    return operasi(m[1], m[2], m[3]);
  });
  return (row) => saring.some((s) => s(row));
}

/** Pemeriksaan unik pada hub_records, setara indeks unik di migrasi. */
function bentrok(rows: Baris[], baru: Baris): boolean {
  const d = baru.data as Record<string, unknown>;
  return rows.some((r) => {
    if (r.id === baru.id) return false;
    const rd = r.data as Record<string, unknown>;
    if (baru.entity === 'organization' && r.entity === 'organization') return true;
    if (baru.entity === 'workstreams' && r.entity === 'workstreams' && rd.code === d.code)
      return true;
    return false;
  });
}
/** Pemicu hapus: catatan yang masih dirujuk tidak boleh dihapus. */
function masihDirujuk(rows: Baris[], id: string): boolean {
  return rows.some((r) => {
    const d = r.data as Record<string, unknown>;
    if (Object.keys(references).some((f) => d[f] === id)) return true;
    return Array.isArray(d.dependencies) && d.dependencies.includes(id);
  });
}

class Kueri implements PromiseLike<Hasil> {
  private saring: Saring[] = [];
  private urutan: [string, boolean][] = [];
  private batas?: [number, number];
  private aksi: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private muatan?: Record<string, unknown>;
  private satu?: 'single' | 'maybe';
  private hitung = false;
  constructor(private tabel: string) {}
  select(_columns?: string, options?: { count?: 'exact' }) {
    this.hitung = options?.count === 'exact';
    return this;
  }
  insert(v: Record<string, unknown>) {
    this.aksi = 'insert';
    this.muatan = v;
    return this;
  }
  update(v: Record<string, unknown>) {
    this.aksi = 'update';
    this.muatan = v;
    return this;
  }
  delete() {
    this.aksi = 'delete';
    return this;
  }
  eq(p: string, v: unknown) {
    return this.tambah(operasi(p, 'eq', v));
  }
  gt(p: string, v: unknown) {
    return this.tambah(operasi(p, 'gt', v));
  }
  gte(p: string, v: unknown) {
    return this.tambah(operasi(p, 'gte', v));
  }
  lte(p: string, v: unknown) {
    return this.tambah(operasi(p, 'lte', v));
  }
  in(p: string, v: unknown[]) {
    return this.tambah(operasi(p, 'in', v));
  }
  ilike(p: string, v: string) {
    return this.tambah(operasi(p, 'ilike', v));
  }
  or(teks: string) {
    return this.tambah(atau(teks));
  }
  order(p: string, opsi?: { ascending?: boolean }) {
    this.urutan.push([p, opsi?.ascending !== false]);
    return this;
  }
  range(a: number, b: number) {
    this.batas = [a, b];
    return this;
  }
  limit(n: number) {
    this.batas = [0, n - 1];
    return this;
  }
  single() {
    this.satu = 'single';
    return this;
  }
  maybeSingle() {
    this.satu = 'maybe';
    return this;
  }
  private tambah(s: Saring) {
    this.saring.push(s);
    return this;
  }
  then<A = Hasil, B = never>(
    ok?: ((v: Hasil) => A | PromiseLike<A>) | null,
    gagal?: ((e: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    return Promise.resolve()
      .then(() => this.jalankan())
      .then(ok, gagal);
  }
  private jalankan(): Hasil {
    const rows = (toko()[this.tabel] ??= []);
    const cocok = () => rows.filter((r) => this.saring.every((s) => s(r)));
    let hasil: Baris[];
    let count = 0;
    if (this.aksi === 'insert') {
      const waktu = new Date().toISOString();
      const baru = {
        id: randomUUID(),
        created_at: waktu,
        updated_at: waktu,
        ...this.muatan,
      } as Baris;
      if (this.tabel === 'hub_records' && bentrok(rows, baru))
        return galat('23505', 'duplicate key value');
      rows.push(baru);
      hasil = [baru];
    } else if (this.aksi === 'update') {
      hasil = cocok();
      for (const r of hasil) {
        if (this.tabel === 'hub_records' && bentrok(rows, { ...r, ...this.muatan } as Baris))
          return galat('23505', 'duplicate key value');
        Object.assign(r, salin(this.muatan), { updated_at: new Date().toISOString() });
      }
    } else if (this.aksi === 'delete') {
      hasil = cocok();
      for (const r of hasil) {
        if (this.tabel === 'hub_records' && masihDirujuk(rows, r.id))
          return galat('P0001', 'Record is still referenced');
      }
      toko()[this.tabel] = rows.filter((r) => !hasil.includes(r));
    } else {
      hasil = cocok();
      count = hasil.length;
      for (const [p, naik] of [...this.urutan].reverse())
        hasil.sort((a, b) => {
          const x = nilai(a, p) ?? '',
            y = nilai(b, p) ?? '';
          return x === y ? 0 : (x < y ? -1 : 1) * (naik ? 1 : -1);
        });
      if (this.batas) hasil = hasil.slice(this.batas[0], this.batas[1] + 1);
    }
    if (this.satu) {
      if (hasil.length > 1 || (this.satu === 'single' && !hasil.length))
        return galat('PGRST116', 'JSON object requested, multiple (or no) rows returned');
      return { data: hasil[0] ? salin(hasil[0]) : null, error: null };
    }
    return { data: salin(hasil), error: null, ...(this.hitung ? { count } : {}) };
  }
}

function simpanTugas(args: Record<string, unknown>): Hasil {
  const rows = toko().hub_records;
  const waktu = new Date().toISOString();
  let rekam: Baris;
  let previousStatus: unknown;
  if (args.record_id) {
    const ada = rows.find((r) => r.id === args.record_id && r.entity === 'work-items');
    if (!ada) return galat('P0001', 'Missing record');
    previousStatus = (ada.data as Record<string, unknown>).status;
    Object.assign(ada, { data: salin(args.payload), updated_at: waktu });
    rekam = ada;
  } else {
    rekam = {
      id: randomUUID(),
      entity: 'work-items',
      data: salin(args.payload),
      created_at: waktu,
      updated_at: waktu,
    };
    rows.push(rekam);
  }
  const payload = args.payload as Record<string, unknown>;
  const recurrenceKey = `${rekam.id}:${payload.due_date}`;
  if (
    payload.status === 'selesai' &&
    previousStatus !== 'selesai' &&
    args.next_payload &&
    !rows.some((row) => row.recurrence_key === recurrenceKey)
  )
    rows.push({
      id: randomUUID(),
      entity: 'work-items',
      data: salin(args.next_payload),
      recurrence_key: recurrenceKey,
      created_at: waktu,
      updated_at: waktu,
    });
  return { data: salin(rekam), error: null };
}

function mutasiStok(p: Record<string, unknown>): Hasil {
  const rows = toko().hub_records;
  const jumlah = Number(p.quantity);
  const arah = { masuk: 1, 'koreksi tambah': 1, keluar: -1, 'koreksi kurang': -1 }[String(p.kind)];
  if (!arah || !Number.isInteger(jumlah) || jumlah <= 0)
    return galat('P0001', 'Invalid amount or quantity');
  const barang = rows.find((r) => r.entity === 'inventory-items' && r.id === p.item_id);
  if (!barang) return galat('P0001', 'Missing related record');
  const d = barang.data as Record<string, unknown>;
  const sebelum = Number(d.book_quantity),
    sesudah = sebelum + arah * jumlah;
  if (sesudah < 0) return galat('P0001', 'Stock would be negative');
  d.book_quantity = sesudah;
  const waktu = new Date().toISOString();
  const id = randomUUID();
  rows.push({
    id,
    entity: 'stock-movements',
    data: { ...salin(p), book_before: sebelum, book_after: sesudah },
    created_at: waktu,
    updated_at: waktu,
  });
  return { data: id, error: null };
}

const klien = {
  from: (tabel: string) => new Kueri(tabel),
  rpc: async (nama: string, args: Record<string, unknown> = {}): Promise<Hasil> => {
    if (['hub_operations_ready', 'hub_logistics_ready', 'hub_administration_ready'].includes(nama))
      return { data: true, error: null };
    if (nama === 'save_work_item') return simpanTugas(args);
    if (nama === 'hub_post_stock_movement')
      return mutasiStok(args.p_data as Record<string, unknown>);
    // PIN, sesi, dan pemulihan cadangan tidak berlaku di mode demo.
    return galat('P0001', `Fungsi ${nama} tidak tersedia di mode demo.`);
  },
};

/** Klien demo berbentuk sama dengan klien Supabase untuk bagian yang dipakai aplikasi. */
export function demoDb() {
  return klien;
}
