'use client';
// Grafik ringkas di panel Ringkasan dunia. Batang CSS murni (tanpa pustaka grafik) agar halaman
// dunia tidak bertambah berat. Hanya data tercatat; modul belum aktif ditulis, bukan nol.
import { addDays } from '@/lib/date';
import type { Item } from '../records/schemas';
import type { Workspace } from '../workspace/useWorkspace';
import { coldRackIds, isBelowMinimum, rackIds, type WorldModel } from './model/world-model';
import type { Nada } from './monitor-data';
import type { LokasiMonitoring } from './bidang';

type Bagian = { label: string; nilai: number; nada: Nada | 'pink' };
export type Grafik =
  | { jenis: 'harian'; judul: string; meta: string; hari: { label: string; nilai: number; sorot?: boolean }[]; format?: (n: number) => string }
  | { jenis: 'tumpuk'; judul: string; meta: string; bagian: Bagian[] }
  | { jenis: 'daftar'; judul: string; meta: string; baris: { label: string; nilai: number; catatan?: string; nada?: Nada }[] }
  | { jenis: 'catatan'; judul: string; teks: string };

const rupiahSingkat = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt` : n.toLocaleString('id-ID');
const namaHari = (tanggal: string) =>
  new Intl.DateTimeFormat('id-ID', { weekday: 'short', timeZone: 'UTC' }).format(new Date(tanggal + 'T12:00:00Z'));
const tujuhHari = (hari: string) => Array.from({ length: 7 }, (_, i) => addDays(hari, i - 6));
const perHari = (rows: Item[], hari: string, tanggalOf: (row: Item) => string, nilaiOf: (row: Item) => number = () => 1) =>
  tujuhHari(hari).map((tanggal) => ({
    label: namaHari(tanggal),
    nilai: rows.filter((row) => tanggalOf(row) === tanggal).reduce((total, row) => total + nilaiOf(row), 0),
    sorot: tanggal === hari,
  }));

type Konteks = {
  lokasi: LokasiMonitoring;
  data: Workspace;
  model: WorldModel;
  hari: string;
  stock: boolean;
  shipping: boolean;
  unavailable: boolean;
};

/** Susun grafik untuk lokasi aktif; fungsi murni agar mudah diuji. */
export function grafikLokasi({ lokasi, data, model, hari, stock, shipping, unavailable }: Konteks): Grafik[] {
  if (unavailable) return [{ jenis: 'catatan', judul: 'Grafik', teks: 'Data belum tersedia.' }];
  const tugas = data['work-items'] || [];
  const terbuka = tugas.filter((row) => ['rencana', 'proses'].includes(String(row.data.status)));
  const telat = (row: Item) => String(row.data.due_date || '9999') < hari;
  const grafikTugas: Grafik[] = [
    {
      jenis: 'tumpuk',
      judul: 'Tugas terbuka',
      meta: `${terbuka.length} tugas`,
      bagian: [
        { label: 'Lewat tenggat', nilai: terbuka.filter(telat).length, nada: 'merah' },
        { label: 'Dikerjakan', nilai: terbuka.filter((row) => !telat(row) && row.data.status === 'proses').length, nada: 'biru' },
        { label: 'Rencana', nilai: terbuka.filter((row) => !telat(row) && row.data.status === 'rencana').length, nada: 'abu' },
      ],
    },
    {
      jenis: 'harian',
      judul: 'Tugas selesai 7 hari',
      meta: 'per hari',
      hari: perHari(tugas.filter((row) => row.data.status === 'selesai'), hari, (row) => String(row.data.completed_at || '')),
    },
  ];
  const kehadiran = data.attendance;
  const grafikHadir: Grafik[] = kehadiran
    ? (() => {
        const hariIni = kehadiran.filter((row) => row.data.date === hari);
        return hariIni.length
          ? [
              {
                jenis: 'tumpuk' as const,
                judul: 'Kehadiran hari ini',
                meta: `${hariIni.length} petugas terjadwal`,
                bagian: [
                  { label: 'Hadir', nilai: hariIni.filter((row) => ['hadir', 'terlambat'].includes(String(row.data.status))).length, nada: 'hijau' as const },
                  { label: 'Izin/sakit/cuti/alpa', nilai: hariIni.filter((row) => ['izin', 'sakit', 'cuti', 'alpa'].includes(String(row.data.status))).length, nada: 'kuning' as const },
                  { label: 'Belum absen', nilai: hariIni.filter((row) => row.data.status === 'terjadwal').length, nada: 'abu' as const },
                ],
              },
            ]
          : [{ jenis: 'catatan' as const, judul: 'Kehadiran hari ini', teks: 'Belum ada jadwal atau absensi untuk hari ini.' }];
      })()
    : [];
  const kas = data['cash-entries'];
  const grafikKas: Grafik[] = !stock
    ? [{ jenis: 'catatan', judul: 'Kas 7 hari', teks: 'Buku kas belum aktif.' }]
    : [
        {
          jenis: 'harian',
          judul: 'Uang keluar 7 hari',
          meta: 'Rp tercatat',
          hari: perHari((kas || []).filter((row) => row.data.direction === 'keluar'), hari, (row) => String(row.data.date), (row) => Number(row.data.amount || 0)),
          format: rupiahSingkat,
        },
      ];

  if (lokasi === 'kantor') return [...grafikTugas, ...grafikHadir];
  if (lokasi === 'pulau') return [...grafikTugas, ...grafikKas, ...grafikHadir];
  if (lokasi === 'gerai') {
    const sales = data.sales;
    if (!sales) return [{ jenis: 'catatan', judul: 'Penjualan gerai', teks: 'Penjualan harian belum aktif (migrasi 10).' }];
    const unitNama = (id: unknown) => String((data.units || []).find((row) => row.id === id)?.data.title || 'Gerai');
    const pekan = sales.filter((row) => String(row.data.date) >= addDays(hari, -6) && String(row.data.date) <= hari);
    const perGerai = Object.entries(
      pekan.reduce<Record<string, number>>((total, row) => {
        total[String(row.data.unit_id)] = (total[String(row.data.unit_id)] || 0) + Number(row.data.amount || 0);
        return total;
      }, {}),
    ).sort((a, b) => b[1] - a[1]);
    return [
      { jenis: 'harian', judul: 'Omzet 7 hari', meta: 'Rp per hari', hari: perHari(pekan, hari, (row) => String(row.data.date), (row) => Number(row.data.amount || 0)), format: rupiahSingkat },
      { jenis: 'daftar', judul: 'Omzet per gerai', meta: '7 hari', baris: perGerai.map(([id, nilai]) => ({ label: unitNama(id), nilai, catatan: `Rp ${rupiahSingkat(nilai)}` })) },
    ];
  }
  if (lokasi === 'gudang') {
    const hasil: Grafik[] = stock
      ? [
          {
            jenis: 'daftar',
            judul: 'Barang per rak',
            meta: 'jenis barang',
            baris: rackIds.map((id) => {
              const isi = model.inventory.racks[id];
              const minimum = isi.filter(isBelowMinimum).length;
              return { label: `Rak ${id}`, nilai: isi.length, catatan: minimum ? `${isi.length} · ${minimum} minimum` : String(isi.length), nada: minimum ? ('kuning' as const) : undefined };
            }),
          },
        ]
      : [{ jenis: 'catatan', judul: 'Barang per rak', teks: 'Pencatatan barang belum aktif.' }];
    if (!shipping) return [...hasil, { jenis: 'catatan', judul: 'Pengiriman', teks: 'Pengiriman belum aktif.' }];
    const kirim = (data.deliveries || []).filter((row) => !['selesai', 'dibatalkan'].includes(String(row.data.status)));
    const status = (s: string) => kirim.filter((row) => row.data.status === s).length;
    return [
      ...hasil,
      {
        jenis: 'tumpuk',
        judul: 'Pengiriman aktif',
        meta: `${kirim.length} pengiriman`,
        bagian: [
          { label: 'Dipesan', nilai: status('dipesan'), nada: 'abu' },
          { label: 'Dikirim', nilai: status('dikirim'), nada: 'biru' },
          { label: 'Tiba', nilai: status('tiba'), nada: 'kuning' },
          { label: 'Diperiksa', nilai: status('diperiksa'), nada: 'hijau' },
        ],
      },
    ];
  }
  if (!stock) return [{ jenis: 'catatan', judul: 'Rak pendingin', teks: 'Pencatatan barang belum aktif.' }];
  return [
    {
      jenis: 'daftar',
      judul: 'Isi rak pendingin',
      meta: 'jenis barang',
      baris: coldRackIds.map((id) => {
        const isi = model.inventory.coldRacks[id];
        const minimum = isi.filter(isBelowMinimum).length;
        return { label: `Rak ${id}`, nilai: isi.length, catatan: minimum ? `${isi.length} · ${minimum} minimum` : String(isi.length), nada: minimum ? ('kuning' as const) : undefined };
      }),
    },
  ];
}

export function GrafikRingkasan({ grafik }: { grafik: Grafik[] }) {
  return (
    <div className="mt-grafik-daftar">
      {grafik.map((g) => (
        <section key={g.judul} className="mt-grafik" aria-label={g.judul}>
          <h3 className="mt-sub">
            {g.judul}
            {'meta' in g && <small>{g.meta}</small>}
          </h3>
          {g.jenis === 'catatan' && <p className="mt-empty">{g.teks}</p>}
          {g.jenis === 'harian' && <Harian {...g} />}
          {g.jenis === 'tumpuk' && <Tumpuk bagian={g.bagian} />}
          {g.jenis === 'daftar' &&
            (g.baris.length ? <DaftarBatang baris={g.baris} /> : <p className="mt-empty">Belum ada catatan.</p>)}
        </section>
      ))}
    </div>
  );
}

function Harian({ hari, format = String, judul }: Extract<Grafik, { jenis: 'harian' }>) {
  const puncak = Math.max(1, ...hari.map((h) => h.nilai));
  return (
    <div className="mt-harian" role="img" aria-label={`${judul}: ${hari.map((h) => `${h.label} ${format(h.nilai)}`).join(', ')}`}>
      {hari.map((h, i) => (
        <div key={i} className={h.sorot ? 'is-sorot' : undefined}>
          <em>{h.nilai ? format(h.nilai) : ''}</em>
          <span>
            <i style={{ height: h.nilai ? `${Math.max(6, (h.nilai / puncak) * 100)}%` : 0 }} />
          </span>
          <small>{h.label}</small>
        </div>
      ))}
    </div>
  );
}

function Tumpuk({ bagian }: { bagian: Bagian[] }) {
  const total = bagian.reduce((n, b) => n + b.nilai, 0);
  return (
    <>
      <div className="mt-tumpuk" aria-hidden="true">
        {total ? bagian.filter((b) => b.nilai).map((b) => <i key={b.label} className={`is-${b.nada}`} style={{ flexGrow: b.nilai }} />) : <i className="is-kosong" />}
      </div>
      <ul className="mt-legenda">
        {bagian.map((b) => (
          <li key={b.label}>
            <i className={`is-${b.nada}`} aria-hidden="true" />
            {b.label} <b>{b.nilai}</b>
          </li>
        ))}
      </ul>
    </>
  );
}

function DaftarBatang({ baris }: { baris: Extract<Grafik, { jenis: 'daftar' }>['baris'] }) {
  const puncak = Math.max(1, ...baris.map((b) => b.nilai));
  return (
    <ul className="mt-batang-daftar">
      {baris.map((b) => (
        <li key={b.label}>
          <span>{b.label}</span>
          <span className={`mt-bar is-${b.nada || 'biru'}`} aria-hidden="true">
            <i style={{ width: `${(b.nilai / puncak) * 100}%` }} />
          </span>
          <b>{b.catatan ?? b.nilai}</b>
        </li>
      ))}
    </ul>
  );
}
