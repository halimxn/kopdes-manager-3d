'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  ClipboardCheck,
  Globe2,
  Plus,
  ShoppingCart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Check } from '@/components/ui/check';
import { PageIcon } from '@/components/ui/icon';
import { LogoMark } from '@/components/ui/logo';
import { buyStockHref, stockCountHref } from '@/features/records/quick-links';
import type { Entity, Item } from '@/features/records/schemas';
import { postponeTask, toggleTaskDone } from '@/features/tasks/task-actions';
import type { Workspace } from '@/features/workspace/use-workspace';
import { cn } from '@/lib/utils';
import {
  buildCoopMap,
  type CoopDomain,
  type MapCapabilities,
  type MapRecord,
} from './coop-map-data';

type Filter = 'all' | 'urgent' | 'today';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Semua' },
  { id: 'urgent', label: 'Mendesak' },
  { id: 'today', label: 'Hari ini' },
];
const CAMERA = 3.4;
// Dilihat dari atas seperti meja: yang lebih dekat berada di bawah dan lebih besar.
const PITCH = 0.95;
// Sangat pelan: peta terasa hidup, tetapi tombol bidang tidak lari dari jari.
const AUTO_SPIN = 0.00004;
const INTRO_MS = 1200;

const matchesFilter = (record: MapRecord, filter: Filter) =>
  filter === 'all' ||
  (filter === 'urgent' ? record.level === 'urgent' : record.today && record.level !== 'calm');

/**
 * Peta koperasi di Beranda: koperasi di pusat, bidang kerjanya mengelilingi, dan titik-titik di
 * sekitar tiap bidang adalah catatan aslinya. Menjawab "bagian mana yang perlu saya urus sekarang?"
 * dan langsung bisa ditindak dari daftar di sampingnya. Bidang berupa tombol sungguhan agar bisa
 * dipakai dengan papan ketik dan jari; hanya garis dan titik yang digambar di kanvas.
 */
export function CoopMap({
  ws,
  date,
  caps,
  more,
  coop,
  refresh,
  onOpenTask,
}: {
  ws: Workspace;
  date: string;
  caps: MapCapabilities;
  more: Partial<Record<Entity, unknown>>;
  coop: string;
  refresh: () => Promise<void> | void;
  onOpenTask: (id: string) => void;
}) {
  const router = useRouter();
  const domains = useMemo(() => buildCoopMap(ws, date, caps, more), [ws, date, caps, more]);
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const panel = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const tooltip = useRef<HTMLDivElement>(null);
  const hub = useRef<HTMLButtonElement>(null);
  const nodes = useRef<(HTMLButtonElement | null)[]>([]);
  // Kamera dan waktu masuk disimpan di luar efek: mencentang tugas tidak mengulang animasi masuk.
  const camera = useRef({ yaw: 0.35, spin: 0, began: 0 });
  const focus = useRef<{ domain: string | null; record: string | null; filter: Filter }>({
    domain: null,
    record: null,
    filter: 'all',
  });
  const hoveredDomain = useRef<string | null>(null);
  const openRecord = useRef<(record: MapRecord) => void>(() => undefined);

  useEffect(() => {
    focus.current.domain = selected;
    focus.current.filter = filter;
    openRecord.current = (record) => {
      if (record.entity === 'work-items') onOpenTask(record.id);
      else router.push(record.href);
    };
  });

  useEffect(() => {
    const element = canvas.current;
    const root = panel.current;
    const context = element?.getContext('2d');
    if (!element || !root || !context) return;
    const style = getComputedStyle(root);
    const read = (name: string) => style.getPropertyValue(name).trim();
    const colors = { ink: read('--on-deep'), muted: read('--on-deep-2'), late: read('--late-bar') };
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const touch = window.matchMedia('(pointer: coarse)').matches;
    const cam = camera.current;
    const count = domains.length;
    let width = 0;
    let height = 0;
    let scale = 1;
    let frame = 0;
    let last = 0;
    let visible = true;
    let inside = false;
    let hits: { record: MapRecord; domain: CoopDomain; x: number; y: number }[] = [];
    let hovered: string | null = null;
    let drag: { x: number; moved: boolean } | null = null;

    const resize = () => {
      const box = element.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = box.width;
      height = box.height;
      // Sisakan ruang untuk tombol bidang di tepi kanvas.
      scale = Math.min(width * 0.39, (height * 0.3) / Math.sin(PITCH));
      element.width = Math.round(width * ratio);
      element.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    const project = (x: number, y: number, z: number) => {
      const cosYaw = Math.cos(cam.yaw);
      const sinYaw = Math.sin(cam.yaw);
      const x1 = x * cosYaw + z * sinYaw;
      const z1 = -x * sinYaw + z * cosYaw;
      const y2 = y * Math.cos(PITCH) - z1 * Math.sin(PITCH);
      const z2 = y * Math.sin(PITCH) + z1 * Math.cos(PITCH);
      const k = CAMERA / (z2 + CAMERA);
      return {
        x: width / 2 + x1 * k * scale, // Pusat sedikit di atas tengah: label bidang terdepan butuh ruang di bawah.
        y: height * 0.44 + y2 * k * scale,
        k,
        z: z2,
      };
    };
    const dot = (x: number, y: number, r: number, color: string, alpha: number) => {
      context.globalAlpha = alpha;
      context.fillStyle = color;
      context.beginPath();
      context.arc(x, y, r, 0, Math.PI * 2);
      context.fill();
    };

    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      if (!visible || !width) return;
      if (!cam.began) cam.began = now;
      const delta = Math.min(now - last || 16, 48);
      last = now;
      const { domain: selectedId, record: focusRecord, filter: activeFilter } = focus.current;
      const selectedIndex = domains.findIndex((domain) => domain.id === selectedId);
      if (selectedIndex >= 0) {
        // Bidang terpilih diputar ke depan lewat jalan terpendek.
        const target = (selectedIndex / count) * Math.PI * 2 + Math.PI / 2;
        const gap = Math.atan2(Math.sin(target - cam.yaw), Math.cos(target - cam.yaw));
        cam.yaw += reduced ? gap : gap * 0.09;
      } else if (!drag) {
        if (!reduced && !inside) cam.yaw += AUTO_SPIN * delta;
        cam.yaw += cam.spin;
        cam.spin *= 0.94;
      }
      const elapsed = reduced ? INTRO_MS * 2 : now - cam.began;
      const intro = (offset: number) => {
        const t = Math.min(1, Math.max(0, (elapsed - offset * 380) / INTRO_MS));
        return 1 - (1 - t) ** 4;
      };
      context.clearRect(0, 0, width, height);
      const center = project(0, 0, 0);
      const nextHits: typeof hits = [];

      domains.forEach((domain, index) => {
        const angle = (index / count) * Math.PI * 2;
        const grow = intro(index / count);
        const nx = Math.cos(angle) * grow;
        const nz = Math.sin(angle) * grow;
        const point = project(nx, 0, nz);
        const isSelected = domain.id === selectedId;
        const isHovered = domain.id === hoveredDomain.current;
        const dimmed = selectedId !== null && !isSelected;
        const fits =
          activeFilter === 'all' ||
          domain.records.some((record) => matchesFilter(record, activeFilter));
        const presence = dimmed ? 0.3 : fits ? 1 : 0.32;
        const depth = 0.6 + 0.4 * Math.min(1, Math.max(0, (point.k - 0.78) / 0.44));

        // Garis pusat ke bidang; bidang yang mendesak punya denyut yang berjalan menuju pusat.
        context.globalAlpha = (isSelected || isHovered ? 0.8 : 0.28) * presence * grow;
        context.strokeStyle = domain.urgent ? colors.late : colors.muted;
        context.lineWidth = isSelected || isHovered ? 1.5 : 1;
        context.beginPath();
        context.moveTo(center.x, center.y);
        context.lineTo(point.x, point.y);
        context.stroke();
        context.lineWidth = 1;
        if (domain.urgent && !reduced && presence === 1) {
          const t = (now / 2100 + index * 0.17) % 1;
          dot(
            point.x + (center.x - point.x) * t,
            point.y + (center.y - point.y) * t,
            2.2,
            colors.late,
            0.9 * (1 - t) * grow,
          );
        }

        domain.records.forEach((record, recordIndex) => {
          const spread = intro(0.4 + (recordIndex / domain.records.length) * 0.6);
          const reach = isSelected ? 1.6 : 1;
          const at = project(
            nx + record.x * spread * reach,
            record.y * spread * reach,
            nz + record.z * spread * reach,
          );
          const on = matchesFilter(record, activeFilter);
          const fade = (on ? presence : 0.12) * spread * depth;
          const size =
            (record.level === 'urgent' ? 3.3 : record.level === 'soon' ? 2.7 : 1.7) * at.k;
          const color = record.level === 'urgent' ? colors.late : colors.ink;
          if (record.level === 'calm') dot(at.x, at.y, size, colors.muted, fade * 0.55);
          else {
            dot(at.x, at.y, size * 2.3, color, 0.16 * fade);
            dot(at.x, at.y, size, color, fade);
          }
          if (record.level === 'urgent' && on && !reduced && !dimmed) {
            const pulse = (now / 1500 + record.phase) % 1;
            context.globalAlpha = (1 - pulse) * 0.55 * fade;
            context.strokeStyle = colors.late;
            context.beginPath();
            context.arc(at.x, at.y, size + pulse * 8, 0, Math.PI * 2);
            context.stroke();
          }
          if (record.key === focusRecord || record.key === hovered) {
            context.globalAlpha = 1;
            context.strokeStyle = colors.ink;
            context.lineWidth = 1.5;
            context.beginPath();
            context.arc(at.x, at.y, size + 4.5, 0, Math.PI * 2);
            context.stroke();
            context.lineWidth = 1;
          }
          if (on && !dimmed && spread > 0.9) nextHits.push({ record, domain, x: at.x, y: at.y });
        });

        // Tombol bidang mengikuti proyeksi; yang di depan lebih besar dan menutupi yang di belakang.
        const node = nodes.current[index];
        if (node) {
          const size = 0.82 + 0.26 * Math.min(1, Math.max(0, (point.k - 0.78) / 0.44));
          node.style.transform = `translate(${point.x - node.offsetWidth / 2}px, ${point.y - 22}px) scale(${size})`;
          node.style.opacity = String(grow * (dimmed ? 0.55 : fits ? 0.72 + 0.28 * depth : 0.45));
          node.style.zIndex = String(Math.round(100 - point.z * 40));
        }
      });
      context.globalAlpha = 1;
      if (hub.current) {
        hub.current.style.transform = `translate(${center.x - hub.current.offsetWidth / 2}px, ${center.y - 22}px)`;
        hub.current.style.opacity = String(intro(0));
      }
      hits = nextHits;
    };

    const position = (event: PointerEvent) => {
      const box = element.getBoundingClientRect();
      return { x: event.clientX - box.left, y: event.clientY - box.top };
    };
    const pick = (x: number, y: number) => {
      const radius = touch ? 22 : 11;
      let best: (typeof hits)[number] | null = null;
      let distance = Infinity;
      for (const hit of hits) {
        const gap = Math.hypot(hit.x - x, hit.y - y);
        if (gap <= radius && gap < distance) {
          best = hit;
          distance = gap;
        }
      }
      return best;
    };
    const showTip = (hit: ReturnType<typeof pick>, x: number, y: number) => {
      const tip = tooltip.current;
      if (!tip) return;
      if (!hit) {
        tip.hidden = true;
        return;
      }
      const [title, note] = tip.children as unknown as [HTMLElement, HTMLElement];
      title.textContent = hit.record.title;
      note.textContent =
        hit.record.level === 'calm' ? hit.domain.label : `${hit.record.note} · ${hit.domain.label}`;
      tip.hidden = false;
      const left = Math.min(width - tip.offsetWidth - 8, Math.max(8, x + 14));
      tip.style.transform = `translate(${left}px, ${Math.max(8, y - tip.offsetHeight - 10)}px)`;
    };
    const onDown = (event: PointerEvent) => {
      drag = { x: event.clientX, moved: false };
      element.setPointerCapture(event.pointerId);
    };
    const onMove = (event: PointerEvent) => {
      if (drag) {
        const dx = event.clientX - drag.x;
        if (Math.abs(dx) > 3) drag.moved = true;
        // Saat ada bidang terpilih kamera mengunci bidang itu, jadi geseran diabaikan.
        if (!focus.current.domain) {
          cam.yaw -= dx * 0.006;
          cam.spin = -dx * 0.0012;
        }
        drag.x = event.clientX;
        element.style.cursor = 'grabbing';
        showTip(null, 0, 0);
        return;
      }
      const { x, y } = position(event);
      const hit = pick(x, y);
      hovered = hit?.record.key ?? null;
      element.style.cursor = hit ? 'pointer' : 'grab';
      showTip(hit, x, y);
    };
    const onUp = (event: PointerEvent) => {
      const moved = drag?.moved;
      drag = null;
      element.style.cursor = 'grab';
      if (moved) return;
      const { x, y } = position(event);
      const hit = pick(x, y);
      if (hit) openRecord.current(hit.record);
    };
    const onEnter = () => {
      inside = true;
    };
    const onLeave = () => {
      inside = false;
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
    const wrap = element.parentElement;
    wrap?.addEventListener('pointerenter', onEnter);
    wrap?.addEventListener('pointerleave', onLeave);
    element.addEventListener('pointerdown', onDown);
    element.addEventListener('pointermove', onMove);
    element.addEventListener('pointerup', onUp);
    element.addEventListener('pointercancel', onCancel);
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      sizes.disconnect();
      seen.disconnect();
      wrap?.removeEventListener('pointerenter', onEnter);
      wrap?.removeEventListener('pointerleave', onLeave);
      element.removeEventListener('pointerdown', onDown);
      element.removeEventListener('pointermove', onMove);
      element.removeEventListener('pointerup', onUp);
      element.removeEventListener('pointercancel', onCancel);
    };
  }, [domains]);

  const allActions = domains
    .flatMap((domain) => domain.actions.map((record) => ({ record, domain })))
    .sort((a, b) => Number(b.record.level === 'urgent') - Number(a.record.level === 'urgent'));
  const needing = domains.filter((domain) => domain.actions.length > 0).length;
  const urgentCount = allActions.filter(({ record }) => record.level === 'urgent').length;
  const current = domains.find((domain) => domain.id === selected);
  const scoped = current
    ? current.actions.map((record) => ({ record, domain: current }))
    : allActions;
  const list = scoped.filter(({ record }) => matchesFilter(record, filter));
  const counts: Record<Filter, number> = {
    all: scoped.length,
    urgent: scoped.filter(({ record }) => matchesFilter(record, 'urgent')).length,
    today: scoped.filter(({ record }) => matchesFilter(record, 'today')).length,
  };

  return (
    // Dasar panel mengikuti tema; isinya bertoken gelap karena titik bercahaya butuh latar malam.
    <section
      aria-labelledby="coop-map-title"
      className="@container h-full overflow-hidden rounded-[var(--radius-card)] bg-deep shadow-card ring-1 ring-line"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && selected) setSelected(null);
      }}
    >
      <div ref={panel} data-theme="dark" className="flex h-full flex-col text-on-deep">
        <header className="flex flex-wrap items-start gap-x-4 gap-y-2 px-5 pt-5">
          <div className="min-w-0 flex-1 basis-48">
            <h2 id="coop-map-title" className="text-lg font-medium">
              Peta koperasi
            </h2>
            <p className="text-[13px] text-on-deep-2">
              {needing
                ? `${needing} dari ${domains.length} bidang perlu ditangani`
                : 'Semua bidang aman'}
              {urgentCount > 0 && ` · ${urgentCount} mendesak`}
            </p>
          </div>
          <div role="group" aria-label="Saring peta" className="flex flex-wrap gap-1.5">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={filter === item.id}
                onClick={() => setFilter(item.id)}
                className={cn(
                  'flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium ring-1 ring-line-strong transition-colors',
                  filter === item.id ? 'bg-on-deep text-on-bar' : 'text-on-deep hover:bg-deep-2',
                )}
              >
                {item.label}
                <span className="tabular opacity-70">{counts[item.id]}</span>
              </button>
            ))}
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col @xl:flex-row">
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="relative min-h-[23rem] flex-1 overflow-hidden">
              <canvas
                ref={canvas}
                aria-hidden="true"
                className="absolute inset-0 size-full cursor-grab touch-pan-y"
              />
              <button
                ref={hub}
                type="button"
                onClick={() => setSelected(null)}
                aria-label={`${coop || 'Koperasi'}: tampilkan semua bidang`}
                className="absolute top-0 left-0 z-[100] flex w-24 flex-col items-center gap-1 opacity-0"
              >
                <LogoMark className="size-11 rounded-[14px]" />
                <span className="line-clamp-1 max-w-full rounded-full bg-surface-solid/80 px-2 text-[11px] text-on-deep-2">
                  {coop || 'Koperasi'}
                </span>
              </button>
              {domains.map((domain, index) => {
                const need = domain.urgent + domain.soon;
                const pressed = selected === domain.id;
                return (
                  <button
                    key={domain.id}
                    ref={(element) => {
                      nodes.current[index] = element;
                    }}
                    type="button"
                    aria-pressed={pressed}
                    aria-label={`${domain.label}: ${
                      !domain.active
                        ? 'belum aktif'
                        : need
                          ? `${need} perlu ditangani${domain.urgent ? `, ${domain.urgent} mendesak` : ''}`
                          : 'aman'
                    }`}
                    onClick={() => setSelected(pressed ? null : domain.id)}
                    onPointerEnter={() => {
                      hoveredDomain.current = domain.id;
                    }}
                    onPointerLeave={() => {
                      hoveredDomain.current = null;
                    }}
                    onFocus={() => {
                      hoveredDomain.current = domain.id;
                    }}
                    onBlur={() => {
                      hoveredDomain.current = null;
                    }}
                    className="group absolute top-0 left-0 flex w-[5.25rem] origin-top flex-col items-center gap-1 rounded-2xl opacity-0"
                  >
                    <span
                      className={cn(
                        'relative grid size-11 place-items-center rounded-full ring-1 transition-colors [&_svg]:size-[19px]',
                        pressed
                          ? 'bg-action text-on-action ring-transparent'
                          : 'bg-surface-solid text-on-deep ring-line-strong group-hover:bg-surface-3',
                        !pressed && domain.urgent > 0 && 'ring-2 ring-late-bar',
                        !domain.active && 'text-on-deep-2',
                      )}
                    >
                      <PageIcon name={domain.icon} />
                      {need > 0 && (
                        <span
                          className={cn(
                            'tabular absolute -top-1 -right-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10.5px] font-semibold',
                            domain.urgent ? 'bg-late-bar text-on-bar' : 'bg-on-deep text-on-bar',
                          )}
                        >
                          {need}
                        </span>
                      )}
                    </span>
                    <span className="rounded-full bg-surface-solid/80 px-2 text-center text-[11.5px] leading-[1.35] font-medium">
                      {domain.label}
                    </span>
                  </button>
                );
              })}
              <div
                ref={tooltip}
                hidden
                className="pointer-events-none absolute top-0 left-0 z-[300] max-w-64 rounded-2xl bg-surface-solid px-3 py-2 text-ink shadow-float ring-1 ring-line-strong"
              >
                <p className="line-clamp-2 text-[13px] leading-snug font-medium" />
                <p className="truncate text-xs text-ink-2" />
              </div>
            </div>
            <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 pt-1 pb-4 text-xs text-on-deep-2">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-late-bar" aria-hidden="true" />
                Mendesak
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-on-deep" aria-hidden="true" />
                Perlu ditangani
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-on-deep-2/60" aria-hidden="true" />
                Catatan lain
              </span>
            </footer>
          </div>

          <aside
            aria-label={current ? `Rincian ${current.label}` : 'Yang perlu ditangani'}
            className="relative min-h-0 border-t border-line @xl:w-[19rem] @xl:border-t-0 @xl:border-l"
          >
            <div className="flex max-h-[28rem] flex-col @xl:absolute @xl:inset-0 @xl:max-h-none">
              {current ? (
                <DomainHeader domain={current} onBack={() => setSelected(null)} />
              ) : (
                <div className="flex items-center justify-between px-4 pt-4 pb-2">
                  <h3 className="text-sm font-medium">Perlu ditangani</h3>
                  <span className="tabular text-xs text-on-deep-2">{list.length}</span>
                </div>
              )}
              <ul
                className="scrollbar-none flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-2"
                onPointerLeave={() => {
                  focus.current.record = null;
                }}
              >
                {list.map(({ record, domain }) => (
                  <ActionRow
                    key={record.key}
                    record={record}
                    domain={current ? undefined : domain}
                    ws={ws}
                    refresh={refresh}
                    onOpenTask={onOpenTask}
                    onHover={(key) => {
                      focus.current.record = key;
                    }}
                  />
                ))}
                {!list.length && (
                  <li className="px-2 py-3 text-[13px] text-on-deep-2">
                    {filter !== 'all'
                      ? 'Tidak ada yang cocok dengan saringan ini.'
                      : current && !current.active
                        ? 'Bidang ini belum aktif.'
                        : current
                          ? 'Tidak ada yang perlu ditangani di bidang ini.'
                          : 'Tidak ada yang perlu ditangani hari ini.'}
                  </li>
                )}
              </ul>
              {current && <DomainActions domain={current} />}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function DomainHeader({ domain, onBack }: { domain: CoopDomain; onBack: () => void }) {
  return (
    <div className="flex flex-col gap-3 px-4 pt-3 pb-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Kembali ke semua bidang"
          className="-ml-1.5 grid size-9 shrink-0 place-items-center rounded-full text-on-deep-2 transition hover:bg-deep-2 hover:text-on-deep [&_svg]:size-4 max-sm:size-11"
        >
          <ArrowLeft />
        </button>
        <h3 className="min-w-0 flex-1 truncate text-[15px] font-medium">{domain.label}</h3>
      </div>
      {domain.stats.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-2xl bg-deep-2 p-3">
          {domain.stats.map((stat) => (
            <div key={stat.label} className="min-w-0">
              <dt className="truncate text-xs text-on-deep-2">{stat.label}</dt>
              <dd className="tabular truncate text-sm font-medium">{stat.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {domain.note && <p className="text-xs text-on-deep-2">{domain.note}</p>}
    </div>
  );
}

function DomainActions({ domain }: { domain: CoopDomain }) {
  return (
    <div className="flex items-center gap-1.5 border-t border-line p-2.5">
      <Button asChild size="sm" variant="primary" className="flex-1">
        <Link href={`/${domain.page}?new=1`}>
          <Plus />
          Tambah
        </Link>
      </Button>
      <Button asChild size="sm" className="flex-1">
        <Link href={`/${domain.page}`}>
          Buka
          <ArrowRight />
        </Link>
      </Button>
      <Button asChild size="icon-sm" className="size-9 max-sm:size-11">
        <Link
          href={`/world?lokasi=${domain.world}`}
          aria-label={`Lihat ${domain.label} di Dunia 3D`}
        >
          <Globe2 />
        </Link>
      </Button>
    </div>
  );
}

const ROW_ICON =
  'grid size-9 shrink-0 place-items-center rounded-full text-on-deep-2 transition hover:bg-deep-2 hover:text-on-deep [&_svg]:size-4 max-sm:size-11';

/** Satu hal yang perlu ditangani: tindakan tersering langsung di barisnya, tanpa pindah halaman. */
function ActionRow({
  record,
  domain,
  ws,
  refresh,
  onOpenTask,
  onHover,
}: {
  record: MapRecord;
  domain?: CoopDomain;
  ws: Workspace;
  refresh: () => Promise<void> | void;
  onOpenTask: (id: string) => void;
  onHover: (key: string) => void;
}) {
  const task: Item | undefined =
    record.entity === 'work-items'
      ? ws['work-items']?.find((row) => row.id === record.id)
      : undefined;
  const item: Item | undefined =
    record.entity === 'inventory-items'
      ? ws['inventory-items']?.find((row) => row.id === record.id)
      : undefined;
  const body = (
    <>
      <span className="line-clamp-2 text-[13.5px] leading-snug">{record.title}</span>
      <span
        className={cn(
          'line-clamp-2 text-xs',
          record.level === 'urgent' ? 'text-late-bar' : 'text-on-deep-2',
        )}
      >
        {record.note}
        {domain && ` · ${domain.label}`}
      </span>
    </>
  );
  return (
    <li
      onPointerEnter={() => onHover(record.key)}
      className="flex items-center gap-2 rounded-2xl py-1.5 pr-1 pl-2 transition-colors hover:bg-deep-2"
    >
      {task ? (
        <Check
          checked={task.data.status === 'selesai'}
          onChange={() => void toggleTaskDone(task, refresh)}
          label={`Tandai selesai: ${record.title}`}
        />
      ) : (
        <span
          className={cn(
            'mx-1.5 size-2 shrink-0 rounded-full',
            record.level === 'urgent' ? 'bg-late-bar' : 'bg-on-deep',
          )}
          aria-hidden="true"
        />
      )}
      {task ? (
        <button
          type="button"
          onClick={() => onOpenTask(record.id)}
          className="min-w-0 flex-1 text-left"
        >
          {body}
        </button>
      ) : (
        <Link href={record.href} className="min-w-0 flex-1">
          {body}
        </Link>
      )}
      {task && (
        <button
          type="button"
          onClick={() => void postponeTask(task, 1, refresh)}
          aria-label={`Tunda 1 hari: ${record.title}`}
          title="Tunda 1 hari"
          className={ROW_ICON}
        >
          <CalendarClock />
        </button>
      )}
      {item && (
        <>
          <Link
            href={stockCountHref(item)}
            aria-label={`Opname ${record.title}`}
            title="Opname"
            className={ROW_ICON}
          >
            <ClipboardCheck />
          </Link>
          <Link
            href={buyStockHref(item)}
            aria-label={`Beli stok ${record.title}`}
            title="Beli stok"
            className={ROW_ICON}
          >
            <ShoppingCart />
          </Link>
        </>
      )}
    </li>
  );
}
