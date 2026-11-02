import type { Entity, Item } from '../records/schemas';
import type { Workspace } from '@/features/workspace/use-workspace';
import { catalog } from '../records/catalog';
import { recordLink } from '@/components/layout/nav';
import { addDays, formatDate } from '@/lib/date';
import { readiness } from '@/lib/progress';
import type { Checklist } from '../records/schemas';

export function recordHref(entity: Entity, row: Item) {
  return recordLink(entity, row.id);
}

export function searchWorkspace(data: Workspace, text: string, scope = 'all') {
  const words = text.toLocaleLowerCase('id').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return (Object.keys(data) as Entity[])
    .filter((entity) => scope === 'all' || entity === scope)
    .flatMap((entity) =>
      (data[entity] || [])
        .filter((row) => {
          // Hanya mencari catatan yang sudah dimuat; tidak ada yang dikirim ke layanan pencarian luar.
          const project = data.workstreams?.find(
            (project) => project.id === row.data.workstream_id,
          );
          const content = [...Object.values(row.data), project?.data.title]
            .filter((value) => typeof value === 'string')
            .join(' ')
            .toLocaleLowerCase('id');
          return words.every((word) => content.includes(word));
        })
        .map((row) => ({
          id: `${entity}:${row.id}`,
          title: String(row.data.title),
          kind: catalog[entity].title,
          entity,
          context: String(
            data.workstreams?.find((project) => project.id === row.data.workstream_id)?.data
              .title || '',
          ),
          href: recordHref(entity, row),
        })),
    )
    .slice(0, 30);
}

export type FollowUp = {
  id: string;
  title: string;
  reason: string;
  kind: string;
  href: string;
  urgent: boolean;
};
export function getFollowUps(data: Workspace, date: string): FollowUp[] {
  const result: FollowUp[] = [];
  const add = (entity: Entity, row: Item, reason: string, urgent = false, title?: string) =>
    result.push({
      id: `${entity}:${row.id}`,
      title: title ?? String(row.data.title),
      reason,
      kind: catalog[entity].title,
      href: recordHref(entity, row),
      urgent,
    });
  for (const row of data['work-items'] || []) {
    if (
      !['selesai', 'dibatalkan'].includes(String(row.data.status)) &&
      row.data.due_date &&
      String(row.data.due_date) <= date
    )
      add(
        'work-items',
        row,
        row.data.due_date === date ? 'Tenggat hari ini' : 'Tenggat terlewat',
        row.data.due_date !== date,
      );
  }
  for (const row of data.meetings || []) {
    const meetingDate = String(row.data.date || '');
    if (
      meetingDate >= date &&
      meetingDate <= addDays(date, 7) &&
      !['selesai', 'dibatalkan'].includes(String(row.data.status))
    )
      add(
        'meetings',
        row,
        meetingDate === date ? 'Rapat hari ini' : `Rapat pada ${formatDate(meetingDate)}`,
      );
  }
  for (const row of data.documents || []) {
    const expiry = String(row.data.expires_date || '');
    if (expiry && expiry <= addDays(date, 30))
      add(
        'documents',
        row,
        expiry < date ? 'Masa berlaku habis' : 'Berakhir dalam 30 hari',
        expiry < date,
      );
  }
  for (const row of data.issues || []) {
    if (row.data.status !== 'ditutup' && String(row.data.due_date) <= date)
      add('issues', row, 'Kendala perlu ditinjau', true);
  }
  for (const row of data.risks || []) {
    if (
      row.data.status !== 'ditutup' &&
      row.data.review_date &&
      String(row.data.review_date) <= date
    )
      add('risks', row, 'Jadwal tinjau risiko');
  }
  for (const row of data['inventory-items'] || []) {
    if (Number(row.data.book_quantity) <= Number(row.data.minimum_quantity))
      add(
        'inventory-items',
        row,
        `Stok buku ${row.data.book_quantity}; batas minimum ${row.data.minimum_quantity}`,
        Number(row.data.book_quantity) === 0,
      );
  }
  // Latest count per item avoids showing historical discrepancies as current stock.
  const latest = new Map<string, Item>();
  for (const row of data['stock-counts'] || []) {
    const key = String(row.data.item_id);
    const previous = latest.get(key);
    if (
      !previous ||
      `${row.data.date}${row.created_at}` > `${previous.data.date}${previous.created_at}`
    )
      latest.set(key, row);
  }
  for (const row of latest.values())
    if (Number(row.data.counted_quantity) !== Number(row.data.book_quantity))
      add('stock-counts', row, 'Opname terakhir memiliki selisih; periksa catatannya');
  for (const row of data.deliveries || []) {
    const planned = String(row.data.planned_date || '');
    if (planned && planned <= date && !['selesai', 'dibatalkan'].includes(String(row.data.status)))
      add(
        'deliveries',
        row,
        planned === date ? 'Pengiriman dijadwalkan hari ini' : 'Pengiriman lewat jadwal',
        planned < date,
      );
  }
  // Gerai yang belum buka: kesiapan dihitung dari butir wajibnya, sama dengan halaman Gerai.
  for (const row of data.units || []) {
    if (['aktif', 'tutup', 'ditutup'].includes(String(row.data.status))) continue;
    const score = readiness(
      (data.checklist || [])
        .filter((item) => item.data.unit_id === row.id)
        .map((item) => item.data as unknown as Checklist),
    );
    if (score !== null && score < 100) add('units', row, `Kesiapan buka ${score}%`);
  }
  const staffName = (id: unknown) =>
    String(data.staff?.find((row) => row.id === id)?.data.title || 'Petugas');
  for (const row of data.attendance || []) {
    if (row.data.date !== date) continue;
    if (row.data.status === 'alpa')
      add('attendance', row, 'Alpa hari ini', true, staffName(row.data.staff_id));
    else if (row.data.status === 'terjadwal')
      add('attendance', row, 'Belum absen hari ini', false, staffName(row.data.staff_id));
  }
  for (const row of data.trainings || []) {
    if (row.data.required && row.data.status !== 'selesai' && String(row.data.date) <= date)
      add('trainings', row, 'Pelatihan wajib lewat jadwal');
  }
  return result.sort(
    (a, b) => Number(b.urgent) - Number(a.urgent) || a.title.localeCompare(b.title, 'id'),
  );
}
