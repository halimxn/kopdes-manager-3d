import { catalog, formatChoiceLabel, labels, options, references } from './catalog';
import type { Entity, Item } from './schemas';
import type { Workspace } from '../workspace/useWorkspace';
import { listedIn, sameName } from '../dunia-3d/model/schedule';
import { formatDate } from '@/lib/date';
import { rupiah } from '../operations/ledger';

/** Satu baris "Label: nilai" di tab Detail. */
export type BarisDetail = { field: string; label: string; nilai: string };
/** Kelompok catatan terkait per jenis, mis. "Pengiriman (2)". */
export type Kelompok = { entity: Entity; judul: string; arah: 'merujuk' | 'dirujuk' | 'nama'; rows: Item[] };
/** Saran aksi lanjutan; tidak menulis data, hanya membuka form terisi atau halaman. */
export type Saran = { id: string; label: string; alasan: string; href: string };

const TANGGAL = /^\d{4}-\d{2}-\d{2}$/;
const KOSONG = new Set(['', 'belum ditentukan', 'belum diisi', 'otomatis']);

export const judulEntitas = (entity: Entity) => catalog[entity]?.title ?? entity;
const judul = (row?: Item) => String(row?.data.title ?? '—');
const cari = (ws: Workspace, entity: Entity, id: unknown) =>
  id ? (ws[entity] || []).find((r) => r.id === id) : undefined;

/** Nilai siap baca: rujukan → judul catatan, tanggal, rupiah, pilihan berlabel. */
export function nilaiTampil(entity: Entity, field: string, value: unknown, ws: Workspace): string {
  if (value === undefined || value === null || value === '') return '';
  const target = references[field];
  if (target) return judul(cari(ws, target, value)) || 'Catatan tidak dimuat';
  if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak';
  if (Array.isArray(value)) {
    if (field === 'subtasks')
      return `${value.filter((s) => (s as { done?: boolean }).done).length}/${value.length} selesai`;
    if (field === 'dependencies') return value.map((id) => judul(cari(ws, 'work-items', id))).join(', ');
    return value.length ? String(value.length) : '';
  }
  if (typeof value === 'object') return '';
  if (['amount', 'price', 'budget', 'value', 'total'].includes(field)) return rupiah(Number(value));
  const teks = String(value);
  if (TANGGAL.test(teks)) return formatDate(teks);
  if (KOSONG.has(teks)) return '';
  // Hanya kolom pilihan yang diberi label; kode, nomor, satuan, dan teks bebas tampil apa adanya.
  const pilihan = options[`${entity}.${field}`] ?? options[field];
  return pilihan ? formatChoiceLabel(teks, `${entity}.${field}`) || teks : teks;
}

/** Baris tab Detail mengikuti urutan kolom katalog; kolom kosong dilewati. */
export function detailBaris(entity: Entity, row: Item, ws: Workspace): BarisDetail[] {
  const fields = catalog[entity]?.fields ?? Object.keys(row.data);
  return fields
    .filter((f) => f !== 'title' && f !== 'activities')
    .map((field) => ({
      field,
      label: labels[`${entity}.${field}`] || labels[field] || field.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()),
      nilai: nilaiTampil(entity, field, row.data[field], ws),
    }))
    .filter((b) => b.nilai);
}

/**
 * Catatan terkait dua arah:
 * - merujuk: kolom `*_id` catatan ini menunjuk catatan lain;
 * - dirujuk: catatan lain yang kolom `*_id`-nya (atau prasyarat tugas) menunjuk catatan ini;
 * - nama: hubungan lewat nama orang (penanggung jawab, peserta rapat) dengan data Tim.
 */
export function terkait(entity: Entity, row: Item, ws: Workspace): Kelompok[] {
  const hasil: Kelompok[] = [];
  const tambah = (k: Kelompok) => {
    const ada = hasil.find((h) => h.entity === k.entity && h.arah === k.arah);
    const rows = k.rows.filter((r) => r.id !== row.id && !(ada?.rows || []).some((x) => x.id === r.id));
    if (!rows.length) return;
    if (ada) ada.rows.push(...rows);
    else hasil.push({ ...k, rows });
  };

  for (const [field, target] of Object.entries(references)) {
    const found = cari(ws, target, row.data[field]);
    if (found) tambah({ entity: target, judul: labels[field] || judulEntitas(target), arah: 'merujuk', rows: [found] });
  }
  if (Array.isArray(row.data.dependencies))
    tambah({
      entity: 'work-items',
      judul: 'Prasyarat',
      arah: 'merujuk',
      rows: row.data.dependencies.map((id) => cari(ws, 'work-items', id)).filter(Boolean) as Item[],
    });

  const fieldKe = Object.entries(references).filter(([, t]) => t === entity).map(([f]) => f);
  for (const other of Object.keys(ws) as Entity[]) {
    const rows = (ws[other] || []).filter(
      (r) =>
        fieldKe.some((f) => r.data[f] === row.id) ||
        (entity === 'work-items' && Array.isArray(r.data.dependencies) && r.data.dependencies.includes(row.id)),
    );
    if (rows.length) tambah({ entity: other, judul: judulEntitas(other), arah: 'dirujuk', rows });
  }

  // Hubungan lewat nama: staf ↔ tugas/rapat/kegiatan; penanggung jawab ↔ staf.
  const nama = String(row.data.title || '');
  if (entity === 'staff' && nama) {
    tambah({ entity: 'work-items', judul: 'Tugas', arah: 'nama', rows: (ws['work-items'] || []).filter((t) => sameName(t.data.assignee, nama)) });
    tambah({ entity: 'meetings', judul: 'Rapat diikuti', arah: 'nama', rows: (ws.meetings || []).filter((m) => listedIn(m.data.participants, nama)) });
    tambah({ entity: 'units', judul: 'Penanggung jawab unit', arah: 'nama', rows: (ws.units || []).filter((u) => sameName(u.data.assignee, nama)) });
  }
  const pj = String(row.data.assignee || '');
  if (entity !== 'staff' && pj) {
    const staf = (ws.staff || []).filter((s) => sameName(pj, String(s.data.title)));
    tambah({ entity: 'staff', judul: 'Penanggung jawab', arah: 'nama', rows: staf });
  }
  if (entity === 'meetings')
    tambah({
      entity: 'staff',
      judul: 'Peserta',
      arah: 'nama',
      rows: (ws.staff || []).filter((s) => listedIn(row.data.participants, String(s.data.title))),
    });
  return hasil;
}

const q = (o: Record<string, string>) =>
  Object.entries(o)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');

/** Saran aksi lanjutan per catatan. Hanya membuka form terisi; penyimpanan tetap oleh pengguna. */
export function saran(entity: Entity, row: Item, ws: Workspace): Saran[] {
  const d = row.data;
  const out: Saran[] = [];
  if (entity === 'deliveries' && d.direction !== 'keluar' && ['diperiksa', 'selesai'].includes(String(d.status))) {
    const sudah = (ws['stock-movements'] || []).some((m) => m.data.delivery_id === row.id);
    if (!sudah)
      out.push({
        id: 'mutasi-masuk',
        label: 'Catat mutasi masuk',
        alasan: 'Barang sudah diperiksa tetapi belum ada mutasi stok dari pengiriman ini.',
        href: `/pengiriman?${q({ bagian: 'stock-movements', baru: '1', 'isi.delivery_id': row.id, 'isi.kind': 'masuk', 'isi.title': `Terima ${judul(row)}` })}`,
      });
  }
  if (entity === 'cash-entries' && d.direction === 'keluar' && !d.item_id && /beli|belanja|stok/i.test(`${d.category} ${d.title}`))
    out.push({
      id: 'kaitkan-barang',
      label: 'Kaitkan barang',
      alasan: 'Pengeluaran belanja ini belum terhubung ke barang.',
      href: `/keuangan?${q({ record: row.id, ubah: '1' })}`,
    });
  if (entity === 'meetings') {
    const keputusan = (ws.decisions || []).filter((k) => k.data.meeting_id === row.id);
    const sudah = new Set((ws['work-items'] || []).filter((t) => t.data.meeting_id === row.id).map((t) => String(t.data.title)));
    for (const k of keputusan.slice(0, 3)) {
      const title = `Tindak lanjut: ${judul(k)}`;
      if (!sudah.has(title))
        out.push({
          id: `tugas-${k.id}`,
          label: `Buat tugas dari “${judul(k)}”`,
          alasan: 'Keputusan rapat belum punya tugas tindak lanjut.',
          href: `/tugas?${q({ baru: '1', 'isi.meeting_id': row.id, 'isi.title': title })}`,
        });
    }
  }
  if (entity === 'units' && ['siap uji', 'siap buka', 'persiapan'].includes(String(d.status)))
    out.push({
      id: 'kesiapan',
      label: 'Cek kesiapan unit',
      alasan: 'Unit sedang menuju buka; pastikan butir wajib di halaman Kesiapan selesai.',
      href: `/kesiapan?${q({ baru: '1', 'isi.unit_id': row.id, 'isi.title': `Kesiapan ${judul(row)}` })}`,
    });
  if (entity === 'inventory-items' && Number(d.book_quantity) < Number(d.minimum_quantity)) {
    out.push({
      id: 'belanja',
      label: 'Catat belanja barang',
      alasan: `Stok ${String(d.book_quantity)} di bawah minimum ${String(d.minimum_quantity)}.`,
      href: `/keuangan?${q({ baru: '1', arah: 'keluar', 'isi.item_id': row.id, 'isi.category': 'Pembelian', 'isi.title': `Belanja ${judul(row)}` })}`,
    });
    out.push({
      id: 'pengiriman',
      label: 'Jadwalkan pengiriman',
      alasan: 'Siapkan kedatangan barang pengganti.',
      href: `/pengiriman?${q({ baru: '1', 'isi.title': `Kiriman ${judul(row)}`, 'isi.items': judul(row) })}`,
    });
  }
  if (entity === 'risks' && d.status === 'terbuka' && !(ws['work-items'] || []).some((t) => String(t.data.title).includes(judul(row))))
    out.push({
      id: 'mitigasi',
      label: 'Buat tugas mitigasi',
      alasan: 'Risiko terbuka belum punya tugas penanganan.',
      href: `/tugas?${q({ baru: '1', 'isi.title': `Tangani: ${judul(row)}`, 'isi.assignee': String(d.assignee || '') })}`,
    });
  return out;
}

/** Nilai awal form dari parameter `isi.<kolom>` (dipakai tautan saran). */
export function isiDariQuery(query: URLSearchParams): Record<string, string> {
  const isi: Record<string, string> = {};
  for (const [k, v] of query.entries()) if (k.startsWith('isi.')) isi[k.slice(4)] = v;
  return isi;
}

/** Cip ringkas di kartu daftar: kolom paling berguna per jenis catatan (maks. 4). */
export function ringkasan(entity: Entity, row: Item, ws: Workspace): string[] {
  const v = (field: string) => nilaiTampil(entity, field, row.data[field], ws);
  const pakai = (...parts: (string | false)[]) => parts.filter(Boolean).slice(0, 4) as string[];
  const d = row.data;
  switch (entity) {
    case 'staff':
      return pakai(v('role'), v('section'), d.workplace ? `Di ${v('workplace')}` : false, d.unit_id ? v('unit_id') : false);
    case 'trainings':
      return pakai(v('staff_id'), v('date'), d.required ? 'Wajib' : 'Opsional');
    case 'stakeholders':
      // Kontak, tanggal kontak terakhir, dan tindak lanjut sudah punya baris sendiri di kartu mitra.
      return [];
    case 'interactions':
      return pakai(v('stakeholder_id'), v('date'));
    case 'risks':
      return pakai(`Skor ${Number(d.probability || 0) * Number(d.impact || 0)}`, d.review_date ? `Tinjau ${v('review_date')}` : false);
    case 'issues':
      return pakai(d.due_date ? `Tenggat ${v('due_date')}` : false);
    case 'decisions':
      return pakai(v('date'), d.meeting_id ? `Rapat ${v('meeting_id')}` : false);
    case 'milestones':
      return pakai(v('workstream_id'), d.due_date ? `Tenggat ${v('due_date')}` : false, d.actual_date ? `Tercapai ${v('actual_date')}` : false);
    case 'checklist':
      return pakai(v('dimension'), v('unit_id'), d.required ? 'Wajib' : false);
    case 'documents':
      return pakai(v('kind'), v('number'), d.expires_date ? `Berlaku s.d. ${v('expires_date')}` : false);
    case 'sprints':
      return pakai(v('duration'), d.start_date ? `${v('start_date')} – ${v('end_date')}` : false);
    case 'units':
      return pakai(v('kind'), v('location'));
    case 'assets':
      return pakai(v('category'), v('condition'), v('unit_id'), Number(d.value) > 0 && v('value'));
    case 'attendance':
      return pakai(v('shift'), d.check_in_time ? `Datang ${v('check_in_time')}` : false, d.check_out_time ? `Pulang ${v('check_out_time')}` : false, v('unit_id'));
    case 'purchase-orders':
      return pakai(v('stakeholder_id'), Number(d.total) > 0 && v('total'), d.expected_date ? `Perkiraan tiba ${v('expected_date')}` : false);
    case 'sales':
      return pakai(`Omzet ${v('amount')}`, `${Number(d.transactions || 0)} transaksi`);
    case 'savings':
      return pakai(`${d.direction === 'tarik' ? 'Tarik' : 'Setor'} ${v('amount')}`, `Simpanan ${String(d.kind)}`, v('reference_number'));
    default:
      return [];
  }
}
