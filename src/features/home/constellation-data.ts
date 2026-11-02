import type { Item } from '@/features/records/schemas';
import { addDays } from '@/lib/date';
import { isOverdue } from '@/lib/task-status';
import { projectTone, type Tone } from '@/lib/tones';

export type StarStatus = 'late' | 'active' | 'done';
export type Star = {
  id: string;
  label: string;
  status: StarStatus;
  today: boolean;
  x: number;
  y: number;
  z: number;
  phase: number;
};
export type Cluster = {
  /** Kosong untuk gugus tugas tanpa proyek. */
  id: string;
  label: string;
  tone: Tone;
  x: number;
  y: number;
  z: number;
  stars: Star[];
  active: number;
  late: number;
};

const MAX_CLUSTERS = 7;
const MAX_STARS_PER_CLUSTER = 14;
const STATUS_ORDER: Record<StarStatus, number> = { late: 0, active: 1, done: 2 };

/** Tiga bilangan 0–1 yang tetap untuk satu id: tata letak tidak melompat tiap kali dibuka. */
function seeds(id: string) {
  let hash = 2166136261;
  for (const letter of id) hash = Math.imul(hash ^ letter.charCodeAt(0), 16777619) >>> 0;
  const next = () => {
    hash = Math.imul(hash ^ (hash >>> 15), 2246822507) >>> 0;
    hash = Math.imul(hash ^ (hash >>> 13), 3266489909) >>> 0;
    return ((hash ^ (hash >>> 16)) >>> 0) / 4294967296;
  };
  return [next(), next(), next()] as const;
}

/**
 * Peta kerja Beranda dari catatan asli: tiap proyek berjalan satu gugus, tugasnya titik di sekitar
 * gugus itu. Tugas selesai hanya yang 30 hari terakhir; yang dibatalkan tidak ikut.
 * Gugus dan titik yang mendesak didahulukan bila melewati batas agar peta tetap terbaca di HP.
 */
export function buildConstellation(projects: Item[], tasks: Item[], date: string): Cluster[] {
  const since = addDays(date, -30);
  const groups = new Map<string, Star[]>();
  for (const task of tasks) {
    const closed = task.data.status === 'selesai';
    if (task.data.status === 'dibatalkan') continue;
    if (closed && String(task.data.completed_at || '').slice(0, 10) < since) continue;
    const [a, b, c] = seeds(task.id);
    // Sebaran bola: arah acak dengan jarak cenderung ke tepi gugus.
    const angle = a * Math.PI * 2;
    const lift = b * 2 - 1;
    const spread = 0.13 + Math.cbrt(c) * 0.27;
    const flat = Math.sqrt(1 - lift * lift);
    const star: Star = {
      id: task.id,
      label: String(task.data.title),
      status: closed ? 'done' : isOverdue(task.data, date) ? 'late' : 'active',
      today: task.data.due_date === date,
      x: Math.cos(angle) * flat * spread,
      y: lift * spread,
      z: Math.sin(angle) * flat * spread,
      phase: a * Math.PI * 2,
    };
    const key = String(task.data.workstream_id || '');
    groups.set(key, [...(groups.get(key) || []), star]);
  }

  const known = new Map(projects.map((project) => [project.id, project]));
  return [...groups.entries()]
    .map(([id, stars]) => ({
      id: known.has(id) ? id : '',
      project: known.get(id),
      stars,
      active: stars.filter((star) => star.status !== 'done').length,
      late: stars.filter((star) => star.status === 'late').length,
    }))
    .filter((group) => group.active > 0)
    .sort((a, b) => b.late - a.late || b.active - a.active || a.id.localeCompare(b.id))
    .slice(0, MAX_CLUSTERS)
    .map((group, index, all) => {
      // Gugus disebar merata di permukaan bola (spiral Fibonacci) supaya tidak saling menimpa.
      const lift = all.length === 1 ? 0 : 0.72 - (index / (all.length - 1)) * 1.44;
      const angle = index * 2.39996;
      const flat = Math.sqrt(1 - lift * lift);
      return {
        id: group.id,
        label: group.project ? String(group.project.data.title) : 'Tanpa proyek',
        tone: projectTone(group.project),
        x: Math.cos(angle) * flat,
        y: lift,
        z: Math.sin(angle) * flat,
        stars: [...group.stars]
          .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])
          .slice(0, MAX_STARS_PER_CLUSTER),
        active: group.active,
        late: group.late,
      };
    });
}
