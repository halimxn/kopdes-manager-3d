'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Item } from '@/features/records/schemas';
import { TONES } from '@/lib/tones';
import { cn } from '@/lib/utils';
import { buildConstellation, type Cluster, type Star } from './constellation-data';

type Filter = 'all' | 'late' | 'today';
type Target =
  { kind: 'star'; star: Star; cluster: Cluster } | { kind: 'cluster'; cluster: Cluster };

const CAMERA = 3.2;
const AUTO_SPIN = 0.00012;
const INTRO_MS = 1300;
// Atap gerai dan centang: tanda Kopdes yang sama dengan logo, sebagai pusat peta.
const HUB_MARK =
  'M3.5 10.2 12 3.8l8.5 6.4M6 8.6V18a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8.6m-9 5 2.2 2.2 4-4.3';

const shorten = (text: string, length: number) =>
  text.length > length ? `${text.slice(0, length - 1).trimEnd()}…` : text;
const initials = (text: string) =>
  text
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0] || '')
    .join('')
    .toUpperCase();

/**
 * Konstelasi kerja (acuan animasi Crew, pemilik 2 Nov 2026): proyek sebagai gugus dan tugas sebagai
 * titik, digambar di kanvas dengan proyeksi perspektif. Berputar pelan, bisa diputar dengan menggeser,
 * dan titik membuka tugasnya. Berhenti menggambar saat tidak terlihat agar tidak menguras baterai HP.
 */
export function Constellation({
  projects,
  tasks,
  date,
  onOpenTask,
  onOpenProject,
}: {
  projects: Item[];
  tasks: Item[];
  date: string;
  onOpenTask: (id: string) => void;
  onOpenProject: (id: string) => void;
}) {
  const clusters = useMemo(
    () => buildConstellation(projects, tasks, date),
    [projects, tasks, date],
  );
  const [filter, setFilter] = useState<Filter>('all');
  const panel = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const tooltip = useRef<HTMLDivElement>(null);
  const filterRef = useRef(filter);
  const handlers = useRef({ onOpenTask, onOpenProject });
  useEffect(() => {
    filterRef.current = filter;
    handlers.current = { onOpenTask, onOpenProject };
  });

  const stars = clusters.flatMap((cluster) => cluster.stars);
  const lateCount = clusters.reduce((total, cluster) => total + cluster.late, 0);
  const activeCount = clusters.reduce((total, cluster) => total + cluster.active, 0);
  const todayCount = stars.filter((star) => star.today && star.status !== 'done').length;

  useEffect(() => {
    const element = canvas.current;
    const root = panel.current;
    const context = element?.getContext('2d');
    if (!element || !root || !context) return;
    const style = getComputedStyle(root);
    const read = (name: string) => style.getPropertyValue(name).trim();
    const colors = {
      ink: read('--on-deep'),
      muted: read('--on-deep-2'),
      late: read('--late-bar'),
      brand: read('--brand'),
      onBar: read('--on-bar'),
      deep: read('--deep'),
    };
    // Warna nada dibaca dari token agar kanvas ikut bila palet diganti.
    const toneColor: Record<string, string> = {};
    for (const tone of [...TONES, 'slate']) {
      const probe = document.createElement('span');
      probe.dataset.tone = tone;
      root.append(probe);
      toneColor[tone] = getComputedStyle(probe).getPropertyValue('--tone-bar').trim();
      probe.remove();
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Jari butuh area 44 px walau titiknya kecil.
    const touch = window.matchMedia('(pointer: coarse)').matches;
    const mark = new Path2D(HUB_MARK);
    let width = 0;
    let height = 0;
    let scale = 1;
    let yaw = 0.5;
    let pitch = -0.28;
    let spin = 0;
    let frame = 0;
    let began = 0;
    let last = 0;
    let visible = true;
    let hovered: Target | null = null;
    let drawn: { target: Target; x: number; y: number; r: number }[] = [];
    let drag: { x: number; y: number; moved: boolean } | null = null;

    const resize = () => {
      const box = element.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = box.width;
      height = box.height;
      scale = Math.min(width, height) * 0.43;
      element.width = Math.round(width * ratio);
      element.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const project = (x: number, y: number, z: number) => {
      const cosYaw = Math.cos(yaw);
      const sinYaw = Math.sin(yaw);
      const cosPitch = Math.cos(pitch);
      const sinPitch = Math.sin(pitch);
      const x1 = x * cosYaw + z * sinYaw;
      const z1 = -x * sinYaw + z * cosYaw;
      const y2 = y * cosPitch - z1 * sinPitch;
      const z2 = y * sinPitch + z1 * cosPitch;
      const k = CAMERA / (z2 + CAMERA);
      return { x: width / 2 + x1 * k * scale, y: height / 2 + y2 * k * scale, k, z: z2 };
    };

    const matches = (star: Star) => {
      const current = filterRef.current;
      if (current === 'late') return star.status === 'late';
      if (current === 'today') return star.today && star.status !== 'done';
      return true;
    };

    const dot = (x: number, y: number, r: number, color: string, alpha = 1) => {
      context.globalAlpha = alpha;
      context.fillStyle = color;
      context.beginPath();
      context.arc(x, y, r, 0, Math.PI * 2);
      context.fill();
    };

    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      if (!visible) return;
      if (!began) began = now;
      const delta = Math.min(now - last || 16, 48);
      last = now;
      if (!drag) {
        if (!reduced && !hovered) yaw += AUTO_SPIN * delta;
        yaw += spin;
        spin *= 0.94;
      }
      const elapsed = reduced ? INTRO_MS * 2 : now - began;
      // Semua muncul dari pusat lalu menyebar; titik yang lebih belakang menyusul.
      const intro = (offset: number) => {
        const t = Math.min(1, Math.max(0, (elapsed - offset * 420) / INTRO_MS));
        return 1 - (1 - t) ** 4;
      };
      context.clearRect(0, 0, width, height);
      const center = project(0, 0, 0);
      const nodes: { z: number; paint: () => void }[] = [];
      const hits: typeof drawn = [];
      const labels: { cluster: Cluster; x: number; y: number; alpha: number }[] = [];

      clusters.forEach((cluster, clusterIndex) => {
        const grow = intro(clusterIndex / Math.max(1, clusters.length));
        const cx = cluster.x * grow;
        const cy = cluster.y * grow;
        const cz = cluster.z * grow;
        const point = project(cx, cy, cz);
        const tone = toneColor[cluster.tone];
        const clusterOn = filterRef.current === 'all' || cluster.stars.some(matches);
        const depth = 0.55 + 0.45 * Math.min(1, Math.max(0, (point.k - 0.72) / 0.58));

        // Garis pusat ke gugus: garis dulu, lalu titiknya, seperti konstelasi yang tersusun.
        context.globalAlpha = (clusterOn ? 0.42 : 0.1) * grow * depth;
        context.strokeStyle = colors.muted;
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(center.x, center.y);
        context.lineTo(point.x, point.y);
        context.stroke();

        cluster.stars.forEach((star, starIndex) => {
          const spread = intro(0.35 + (starIndex / cluster.stars.length) * 0.7);
          const at = project(cx + star.x * spread, cy + star.y * spread, cz + star.z * spread);
          const on = matches(star);
          nodes.push({
            z: at.z,
            paint: () => {
              const fade = (on ? 1 : 0.14) * spread * depth;
              context.globalAlpha = (on ? 0.16 : 0.04) * spread;
              context.strokeStyle = tone;
              context.beginPath();
              context.moveTo(point.x, point.y);
              context.lineTo(at.x, at.y);
              context.stroke();
              const twinkle = reduced ? 1 : 0.82 + 0.18 * Math.sin(now / 900 + star.phase);
              const size = (star.status === 'done' ? 2.3 : 3.7) * at.k;
              const color = star.status === 'late' ? colors.late : tone;
              if (star.status === 'done') {
                context.globalAlpha = fade * 0.75;
                context.strokeStyle = colors.muted;
                context.beginPath();
                context.arc(at.x, at.y, size, 0, Math.PI * 2);
                context.stroke();
              } else {
                // Lingkar tembus datar, bukan gradasi: titik tampak menyala tanpa melanggar aturan warna.
                dot(at.x, at.y, size * 3, color, 0.14 * fade * twinkle);
                dot(at.x, at.y, size * 1.8, color, 0.24 * fade * twinkle);
                dot(at.x, at.y, size, color, fade);
              }
              if (star.status === 'late' && on && !reduced) {
                const pulse = (now / 1500 + star.phase) % 1;
                context.globalAlpha = (1 - pulse) * 0.6 * fade;
                context.strokeStyle = colors.late;
                context.beginPath();
                context.arc(at.x, at.y, size + pulse * 9, 0, Math.PI * 2);
                context.stroke();
              }
              if (hovered?.kind === 'star' && hovered.star.id === star.id) {
                context.globalAlpha = 1;
                context.strokeStyle = colors.ink;
                context.lineWidth = 1.5;
                context.beginPath();
                context.arc(at.x, at.y, size + 4, 0, Math.PI * 2);
                context.stroke();
                context.lineWidth = 1;
              }
            },
          });
          if (on && spread > 0.9)
            hits.push({
              target: { kind: 'star', star, cluster },
              x: at.x,
              y: at.y,
              r: touch ? 22 : 12,
            });
        });

        nodes.push({
          z: point.z - 0.01,
          paint: () => {
            const radius = 15 * point.k;
            const alpha = (clusterOn ? 1 : 0.25) * grow;
            dot(point.x, point.y, radius * 1.55, tone, 0.2 * alpha);
            dot(point.x, point.y, radius, tone, alpha * depth);
            context.globalAlpha = alpha;
            context.fillStyle = colors.onBar;
            context.font = `600 ${Math.round(10.5 * point.k)}px 'Urbanist Variable', sans-serif`;
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(initials(cluster.label), point.x, point.y + 0.5);
            labels.push({ cluster, x: point.x, y: point.y - radius - 28, alpha: alpha * depth });
          },
        });
        if (cluster.id)
          hits.push({
            target: { kind: 'cluster', cluster },
            x: point.x,
            y: point.y,
            r: touch ? 22 : 18,
          });
      });

      nodes.sort((a, b) => b.z - a.z);
      const front = nodes.filter((node) => node.z < 0);
      nodes.filter((node) => node.z >= 0).forEach((node) => node.paint());

      // Pusat: tanda Kopdes, di depan titik yang berada di belakangnya.
      const hubGrow = intro(0);
      dot(center.x, center.y, 25, colors.brand, 0.12 * hubGrow);
      dot(center.x, center.y, 18, colors.brand, hubGrow);
      context.save();
      context.globalAlpha = hubGrow;
      context.translate(center.x - 10.8, center.y - 10.8);
      context.scale(0.9, 0.9);
      context.strokeStyle = colors.onBar;
      context.lineWidth = 2.4;
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.stroke(mark);
      context.restore();
      front.forEach((node) => node.paint());

      // Pil nama proyek paling atas: dicek satu per satu agar tidak saling menimpa atau menutupi pusat.
      context.font = "500 11.5px 'Urbanist Variable', sans-serif";
      context.textAlign = 'left';
      context.textBaseline = 'middle';
      const taken = [
        { left: center.x - 22, right: center.x + 22, top: center.y - 22, bottom: center.y + 22 },
      ];
      for (const label of [...labels].sort((a, b) => a.y - b.y)) {
        const text = `${shorten(label.cluster.label, width < 420 ? 18 : 34)}  ${label.cluster.active}`;
        const pillWidth = context.measureText(text).width + 18;
        const left = Math.min(width - pillWidth - 6, Math.max(6, label.x - pillWidth / 2));
        let top = Math.max(6, label.y);
        const hits = (y: number) =>
          taken.some(
            (box) =>
              left < box.right && left + pillWidth > box.left && y < box.bottom && y + 21 > box.top,
          );
        for (let step = 0; step < 8 && hits(top); step++) top = Math.min(height - 27, top + 24);
        taken.push({ left, right: left + pillWidth, top, bottom: top + 21 });
        context.globalAlpha = label.alpha * 0.94;
        context.fillStyle = colors.deep;
        context.beginPath();
        context.roundRect(left, top, pillWidth, 21, 11);
        context.fill();
        context.globalAlpha = label.alpha;
        context.strokeStyle = colors.muted;
        context.lineWidth = 0.5;
        context.stroke();
        context.lineWidth = 1;
        context.fillStyle = colors.ink;
        context.fillText(text, left + 9, top + 11);
      }
      context.globalAlpha = 1;
      drawn = hits;
    };

    const pick = (x: number, y: number) => {
      let best: Target | null = null;
      let distance = Infinity;
      for (const hit of drawn) {
        const gap = Math.hypot(hit.x - x, hit.y - y);
        if (gap <= hit.r && gap < distance) {
          best = hit.target;
          distance = gap;
        }
      }
      return best;
    };
    const showTip = (target: Target | null, x: number, y: number) => {
      const tip = tooltip.current;
      if (!tip) return;
      if (!target) {
        tip.hidden = true;
        return;
      }
      const [title, note] = tip.children as unknown as [HTMLElement, HTMLElement];
      if (target.kind === 'star') {
        title.textContent = target.star.label;
        const state =
          target.star.status === 'late'
            ? 'Terlambat'
            : target.star.status === 'done'
              ? 'Selesai'
              : target.star.today
                ? 'Tenggat hari ini'
                : 'Aktif';
        note.textContent = `${state} · ${target.cluster.label}`;
      } else {
        title.textContent = target.cluster.label;
        note.textContent = `${target.cluster.active} tugas aktif${target.cluster.late ? `, ${target.cluster.late} terlambat` : ''}`;
      }
      tip.hidden = false;
      const left = Math.min(width - tip.offsetWidth - 8, Math.max(8, x + 14));
      tip.style.transform = `translate(${left}px, ${Math.max(8, y - tip.offsetHeight - 10)}px)`;
    };
    const position = (event: PointerEvent) => {
      const box = element.getBoundingClientRect();
      return { x: event.clientX - box.left, y: event.clientY - box.top };
    };
    const onDown = (event: PointerEvent) => {
      drag = { x: event.clientX, y: event.clientY, moved: false };
      element.setPointerCapture(event.pointerId);
    };
    const onMove = (event: PointerEvent) => {
      if (drag) {
        const dx = event.clientX - drag.x;
        const dy = event.clientY - drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
        yaw += dx * 0.006;
        spin = dx * 0.0012;
        pitch = Math.max(-1.1, Math.min(1.1, pitch + dy * 0.004));
        drag.x = event.clientX;
        drag.y = event.clientY;
        element.style.cursor = 'grabbing';
        showTip(null, 0, 0);
        return;
      }
      const { x, y } = position(event);
      hovered = pick(x, y);
      element.style.cursor = hovered ? 'pointer' : 'grab';
      showTip(hovered, x, y);
    };
    const onUp = (event: PointerEvent) => {
      const moved = drag?.moved;
      drag = null;
      element.style.cursor = 'grab';
      if (moved) return;
      const { x, y } = position(event);
      const target = pick(x, y);
      if (target?.kind === 'star') handlers.current.onOpenTask(target.star.id);
      else if (target?.kind === 'cluster') handlers.current.onOpenProject(target.cluster.id);
    };
    const onLeave = () => {
      hovered = null;
      showTip(null, 0, 0);
    };
    const onCancel = () => {
      drag = null;
    };

    resize();
    const sizes = new ResizeObserver(resize);
    sizes.observe(element);
    const seen = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    seen.observe(element);
    element.addEventListener('pointerdown', onDown);
    element.addEventListener('pointermove', onMove);
    element.addEventListener('pointerup', onUp);
    element.addEventListener('pointerleave', onLeave);
    element.addEventListener('pointercancel', onCancel);
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      sizes.disconnect();
      seen.disconnect();
      element.removeEventListener('pointerdown', onDown);
      element.removeEventListener('pointermove', onMove);
      element.removeEventListener('pointerup', onUp);
      element.removeEventListener('pointerleave', onLeave);
      element.removeEventListener('pointercancel', onCancel);
    };
  }, [clusters]);

  const filters: { id: Filter; label: string; count: number }[] = [
    { id: 'all', label: 'Semua', count: activeCount },
    { id: 'late', label: 'Terlambat', count: lateCount },
    { id: 'today', label: 'Hari ini', count: todayCount },
  ];

  return (
    // Panel selalu bertoken gelap: titik bercahaya butuh latar malam di kedua tema.
    <section
      ref={panel}
      data-theme="dark"
      aria-labelledby="constellation-title"
      className="flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] bg-deep text-on-deep ring-1 ring-line shadow-card"
    >
      <header className="flex flex-wrap items-start gap-x-4 gap-y-2 px-5 pt-5">
        <div className="min-w-0 flex-1 basis-48">
          <h2 id="constellation-title" className="text-lg font-medium">
            Konstelasi kerja
          </h2>
          <p className="text-[13px] text-on-deep-2">
            {clusters.length} proyek · {activeCount} tugas aktif · {lateCount} terlambat
          </p>
        </div>
        <div role="group" aria-label="Saring peta" className="flex flex-wrap gap-1.5">
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
              className={cn(
                'flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium ring-1 ring-line-strong transition-colors',
                filter === item.id ? 'bg-on-deep text-deep' : 'text-on-deep hover:bg-deep-2',
              )}
            >
              {item.label}
              <span className="tabular opacity-70">{item.count}</span>
            </button>
          ))}
        </div>
      </header>
      {clusters.length ? (
        <div className="relative min-h-[21rem] flex-1">
          <canvas
            ref={canvas}
            role="img"
            aria-label={`Peta ${clusters.length} proyek dengan ${activeCount} tugas aktif, ${lateCount} di antaranya terlambat. Daftar lengkapnya ada di halaman Tugas.`}
            className="absolute inset-0 size-full cursor-grab touch-pan-y"
          />
          <div
            ref={tooltip}
            hidden
            className="pointer-events-none absolute top-0 left-0 z-10 max-w-64 rounded-2xl bg-surface-solid px-3 py-2 text-ink shadow-float ring-1 ring-line-strong"
          >
            <p className="line-clamp-2 text-[13px] leading-snug font-medium" />
            <p className="truncate text-xs text-ink-2" />
          </div>
        </div>
      ) : (
        <p className="m-auto max-w-xs px-5 py-8 text-center text-sm text-on-deep-2">
          Belum ada tugas aktif untuk digambar. Tugas baru akan muncul di sini sebagai titik di
          sekitar proyeknya.
        </p>
      )}
      <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 pt-1 pb-4 text-xs text-on-deep-2">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-tone-bar" data-tone="sky" aria-hidden="true" />
          Aktif, warna proyek
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-late-bar" aria-hidden="true" />
          Terlambat
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full ring-1 ring-on-deep-2" aria-hidden="true" />
          Selesai 30 hari
        </span>
        <span className="w-full xl:ml-auto xl:w-auto">
          Geser untuk memutar, pilih titik untuk membuka
        </span>
      </footer>
    </section>
  );
}
