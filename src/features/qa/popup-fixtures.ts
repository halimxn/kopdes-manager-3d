import { catalog } from '../records/catalog';
import { schemas, type Entity, type Item } from '../records/schemas';
import type { Workspace } from '../workspace/useWorkspace';

export const popupEntities = Object.keys(schemas) as Entity[];
const seed: Record<string, unknown> = {
  title: 'Contoh pemeriksaan tampilan dengan judul panjang dan relasi terisi',
  code: 'QA', member_number: 'QA-001', sku: 'QA-001', measurement: 'pcs',
  date: '2026-10-04', due_date: '2026-10-05', start_date: '2026-10-04',
  direction: 'masuk', amount: 10000, category: 'Contoh', account: 'Contoh',
  book_quantity: 12, minimum_quantity: 2, counted_quantity: 10, quantity: 3, assignee: 'Contoh QA',
  description: 'Data contoh khusus pemeriksaan. Bukan catatan operasional.',
  notes: 'Catatan contoh khusus pemeriksaan tombol, input, dan tata letak.',
  item_id: '00000000-0000-4000-8000-000000000001',
};
const fixtureId = (entity: Entity) => `00000000-0000-4000-8000-${String(popupEntities.indexOf(entity) + 1).padStart(12, '0')}`;
// Isian umum tidak cocok untuk enum dan relasi wajib pada catatan administrasi (migrasi 10).
const seedPerEntity: Partial<Record<Entity, Record<string, unknown>>> = {
  assets: { category: 'peralatan' },
  attendance: { staff_id: fixtureId('staff'), status: 'hadir' },
  sales: { unit_id: fixtureId('units') },
  savings: { member_id: fixtureId('members'), direction: 'setor' },
};
export const popupWorkspace: Workspace = Object.fromEntries(popupEntities.map((entity) => {
  const input = {
    ...Object.fromEntries(Object.keys(schemas[entity].shape).filter(key => key in seed).map(key => [key, seed[key]])),
    ...seedPerEntity[entity],
  };
  const item: Item = {
    id: fixtureId(entity),
    created_at: '2026-10-04T02:00:00Z', updated_at: '2026-10-04T02:00:00Z',
    data: schemas[entity].parse(input),
  };
  return [entity, [item]];
}));
export const popupLabels = Object.fromEntries(popupEntities.map(entity => [entity, catalog[entity].title]));
const task = popupWorkspace['work-items']![0];
task.data = schemas['work-items'].parse({ ...task.data,
  workstream_id: popupWorkspace.workstreams![0].id,
  milestone_id: popupWorkspace.milestones![0].id,
  unit_id: popupWorkspace.units![0].id,
  meeting_id: popupWorkspace.meetings![0].id,
  stakeholder_id: popupWorkspace.stakeholders![0].id,
  document_id: popupWorkspace.documents![0].id,
  subtasks: [{ title: 'Contoh subtugas belum selesai dengan judul panjang', done: false }, {title: 'Contoh subtugas selesai', done: true}],
  activities: [{ id: 'qa-comment', user: 'Contoh QA', role: '', text: 'Komentar contoh untuk pemeriksaan tata letak.', created_at: task.created_at, type: 'comment' }],
});
popupWorkspace['stock-counts']![0].data.item_id = popupWorkspace['inventory-items']![0].id;
popupWorkspace['stock-movements']![0].data.item_id = popupWorkspace['inventory-items']![0].id;

const readyUnit = { ...popupWorkspace.units![0], id: '00000000-0000-4000-8000-000000009001', data: schemas.units.parse({ title: 'Contoh gerai dengan penilaian sebagian', status: 'persiapan', assignee: 'Contoh QA' }) };
const completeUnit = { ...readyUnit, id: '00000000-0000-4000-8000-000000009002', data: schemas.units.parse({ title: 'Contoh gerai dengan seluruh syarat selesai', status: 'siap uji' }) };
export const cardWorkspace: Workspace = { ...popupWorkspace,
  meetings: [{ ...popupWorkspace.meetings![0], data: schemas.meetings.parse({ ...popupWorkspace.meetings![0].data, title: 'Contoh rapat koordinasi pengadaan', mode: 'online', meeting_url: 'https://example.com/rapat', participants: 'Contoh pengurus', agenda: 'Tinjau kebutuhan gerai dan pembagian tindak lanjut.', minutes: 'Catatan contoh untuk memeriksa tata letak notulen.' }) }],
  units: [...popupWorkspace.units!, readyUnit, completeUnit], checklist: [
  ...popupWorkspace.checklist!,
  ...(['legalitas', 'fisik', 'sdm', 'sop', 'sistem'] as const).flatMap((dimension, index) => [readyUnit, completeUnit].map((unit, unitIndex) => ({
    ...popupWorkspace.checklist![0], id: `00000000-0000-4000-8000-${String(9100 + index * 2 + unitIndex).padStart(12, '0')}`,
    data: schemas.checklist.parse({ title: `Contoh syarat ${dimension}`, unit_id: unit.id, dimension, required: true, status: unitIndex === 1 || index < 2 ? 'selesai' : 'rencana' }),
  }))),
] };
export const bookWorkspace: Workspace = { ...cardWorkspace,
  'cash-entries': [
    { ...popupWorkspace['cash-entries']![0], data: schemas['cash-entries'].parse({ ...popupWorkspace['cash-entries']![0].data, amount: 1234567890, member_id: popupWorkspace.members![0].id, item_id: popupWorkspace['inventory-items']![0].id, unit_id: popupWorkspace.units![0].id }) },
    { ...popupWorkspace['cash-entries']![0], id: '00000000-0000-4000-8000-000000009300', data: schemas['cash-entries'].parse({ ...popupWorkspace['cash-entries']![0].data, title: 'Contoh pengeluaran pemeriksaan', date: '2026-10-04', direction: 'keluar', amount: 125000 }) },
  ],
};

export const projectWorkspace: Workspace = { ...popupWorkspace, workstreams: [
  { ...popupWorkspace.workstreams![0], data: schemas.workstreams.parse({ ...popupWorkspace.workstreams![0].data, title: 'Contoh proyek berjalan untuk pemeriksaan', status: 'aktif' }) },
  { ...popupWorkspace.workstreams![0], id: '00000000-0000-4000-8000-000000000101', data: schemas.workstreams.parse({ title: 'Contoh proyek selesai dengan tugas historis', code: 'QA-H', status: 'selesai' }) },
], 'work-items': [...popupWorkspace['work-items']!, { ...popupWorkspace['work-items']![0], id: '00000000-0000-4000-8000-000000000102', data: schemas['work-items'].parse({ title: 'Contoh tugas historis tetap tersimpan', due_date: '2026-08-01', completed_at: '2026-08-01', status: 'selesai', workstream_id: '00000000-0000-4000-8000-000000000101' }) }] };
