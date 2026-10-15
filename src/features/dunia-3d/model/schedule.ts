import type { Item } from '../../records/schemas';
import type { WorldLocation } from './world-model';

export type NpcActivity =
  'rapat' | 'briefing' | 'bongkar' | 'kerja' | 'istirahat' | 'keliling' | 'pulang';
export type NpcPlan = {
  staff: Item;
  activity: NpcActivity;
  /** Lokasi dunia tempat karakter digambar; pulang berarti tidak digambar. */
  location: WorldLocation | null;
  /** Alasan dari catatan asli, ditampilkan di kartu karakter. */
  reason: string;
};

const minutesOf = (time: string) => {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
};
function jakartaMinutes(now: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(now);
  return minutesOf(parts);
}
const normal = (text: unknown) =>
  String(text || '')
    .trim()
    .toLocaleLowerCase('id');
/** Penanggung jawab tugas cocok bila namanya persis sama (huruf besar/kecil dan spasi tepi diabaikan). */
export const sameName = (text: unknown, name: string) =>
  normal(text) !== '' && normal(text) === normal(name);
/** Nama tercantum di daftar peserta (dipisah koma, titik koma, baris baru atau "dan"). */
export const listedIn = (text: unknown, name: string) =>
  String(text || '')
    .split(/[,;\n]|\s+dan\s+/i)
    .some((part) => sameName(part, name));
const hashOf = (id: string) => [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0);

/**
 * Kegiatan karakter Tim menurut prioritas: rapat → bongkar muat → tugas proses → istirahat
 * 12:00–13:00 → kerja/keliling bergiliran di jam kerja → pulang. Ini visualisasi jadwal dan
 * tugas tercatat, bukan bukti kehadiran. Hanya Tim yang namanya tertulis di Peserta ikut rapat;
 * Peserta kosong = hanya manajer (kehadiran tidak dikarang).
 */
export function planStaff(
  staff: Item[],
  context: { currentMeeting?: Item; tasks: Item[]; deliveries: Item[] },
  now: Date,
): NpcPlan[] {
  const minutes = jakartaMinutes(now);
  const atDock = context.deliveries.some(
    (row) =>
      row.data.direction !== 'keluar' && ['tiba', 'diperiksa'].includes(String(row.data.status)),
  );
  return staff
    .filter((row) => ['aktif', 'ditunjuk'].includes(String(row.data.status)))
    .map((row): NpcPlan => {
      const name = String(row.data.title);
      const workplace = String(row.data.workplace || 'kantor');
      const home: WorldLocation =
        workplace === 'gudang' ? 'gudang' : workplace === 'gerai' ? 'luar' : 'dalam';
      const [start, end] = String(row.data.work_hours || '08:00-16:00').split('-');
      const working = minutes >= minutesOf(start) && minutes < minutesOf(end);
      const meeting = context.currentMeeting;
      const participants = String(meeting?.data.participants || '').trim();
      if (meeting && participants && listedIn(participants, name))
        return {
          staff: row,
          activity: 'rapat',
          location: 'dalam',
          reason: `Rapat: ${meeting.data.title}`,
        };
      if (!working)
        return {
          staff: row,
          activity: 'pulang',
          location: null,
          reason: `Jam kerja ${start}–${end}`,
        };
      // 15 menit pertama jam kerja: staf kantor berkumpul untuk briefing singkat dengan manajer.
      if (workplace === 'kantor' && minutes < minutesOf(start) + 15)
        return {
          staff: row,
          activity: 'briefing',
          location: 'dalam',
          reason: `Briefing awal jam kerja ${start}`,
        };
      if (atDock && row.data.section === 'gudang & logistik')
        return {
          staff: row,
          activity: 'bongkar',
          location: 'gudang',
          reason: 'Truk pengiriman di dok',
        };
      const task = context.tasks.find(
        (item) => item.data.status === 'proses' && sameName(item.data.assignee, name),
      );
      if (task)
        return {
          staff: row,
          activity: 'kerja',
          location: home,
          reason: `Tugas: ${task.data.title}`,
        };
      if (minutes >= 12 * 60 && minutes < 13 * 60)
        return {
          staff: row,
          activity: 'istirahat',
          location: 'dalam',
          reason: 'Jam istirahat 12:00–13:00',
        };
      // Giliran 15 menit: sebagian karakter keliling agar kantor tidak diam, tanpa acak tiap muat.
      const roaming = (hashOf(row.id) + Math.floor(minutes / 15)) % 4 === 0;
      return roaming
        ? { staff: row, activity: 'keliling', location: home, reason: 'Keliling di jam kerja' }
        : { staff: row, activity: 'kerja', location: home, reason: 'Jam kerja' };
    });
}

/** Tugas terbuka yang penanggung jawabnya sama persis dengan nama staf. */
export const staffTasks = (tasks: Item[], name: string) =>
  tasks.filter(
    (task) =>
      !['selesai', 'dibatalkan'].includes(String(task.data.status)) &&
      sameName(task.data.assignee, name),
  );
export type TaskReply = 'terlambat' | 'proses' | 'beres';
/** Balasan staf saat disapa manajer: ada tugas lewat tenggat, ada tugas berjalan, atau beres. */
export function taskReply(tasks: Item[], name: string, today: string): TaskReply {
  const own = staffTasks(tasks, name);
  if (own.some((task) => task.data.due_date && String(task.data.due_date) < today))
    return 'terlambat';
  return own.length ? 'proses' : 'beres';
}

export type ManagerPlan =
  | { kind: 'briefing'; reason: string }
  | { kind: 'meja-staf'; staffId: string; reason: string }
  | { kind: 'dok'; reason: string }
  | { kind: 'ruang'; reason: string };

/**
 * Manajer: memimpin briefing; bila ada tugas lewat tenggat milik staf yang sedang di meja,
 * mendatangi meja itu bergiliran tiap 10 menit; bila truk di dok, menuju dok; selain itu di ruangannya.
 */
export function planManager(
  plans: NpcPlan[],
  context: { tasks: Item[]; deliveries: Item[] },
  now: Date,
  today: string,
): ManagerPlan {
  if (plans.some((plan) => plan.activity === 'briefing'))
    return { kind: 'briefing', reason: 'Memimpin briefing pagi' };
  const late = plans
    .filter((plan) => plan.activity === 'kerja' && plan.location === 'dalam')
    .map((plan) => ({
      plan,
      task: context.tasks.find(
        (task) =>
          task.data.due_date &&
          String(task.data.due_date) < today &&
          sameName(task.data.assignee, String(plan.staff.data.title)),
      ),
    }))
    .filter((entry) => entry.task);
  if (late.length) {
    const pick = late[Math.floor(jakartaMinutes(now) / 10) % late.length];
    return {
      kind: 'meja-staf',
      staffId: pick.plan.staff.id,
      reason: `Cek tugas lewat tenggat: ${pick.task?.data.title}`,
    };
  }
  if (
    context.deliveries.some(
      (row) =>
        row.data.direction !== 'keluar' && ['tiba', 'diperiksa'].includes(String(row.data.status)),
    )
  )
    return { kind: 'dok', reason: 'Memeriksa truk di dok' };
  return { kind: 'ruang', reason: 'Di ruang manajer' };
}
