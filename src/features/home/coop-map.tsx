'use client';
import Link from 'next/link';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check as CheckIcon,
  ClipboardCheck,
  Globe2,
  Plus,
  ShoppingCart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Check } from '@/components/ui/check';
import { PageIcon } from '@/components/ui/icon';
import { Tabs } from '@/components/ui/tabs';
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

const matchesFilter = (record: MapRecord, filter: Filter) =>
  filter === 'all' || (filter === 'urgent' ? record.level === 'urgent' : record.today);

/** Satu bidang: batang menunjukkan banyaknya urusan, koral untuk yang mendesak. */
function DomainBar({
  domain,
  records,
  max,
  filter,
  pressed,
  lit,
  onToggle,
  onHover,
}: {
  domain: CoopDomain;
  records: MapRecord[];
  max: number;
  filter: Filter;
  pressed: boolean;
  lit: boolean;
  onToggle: () => void;
  onHover: (id: string | null) => void;
}) {
  const urgent = records.filter((record) => record.level === 'urgent').length;
  const soon = records.length - urgent;
  const stat = domain.stats[0];
  const fact = stat ? `${stat.value} ${stat.label.toLowerCase()}` : '';
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={`${domain.label}: ${
        !domain.active
          ? 'belum aktif'
          : records.length
            ? `${records.length} perlu ditangani${urgent ? `, ${urgent} mendesak` : ''}`
            : 'aman'
      }`}
      onClick={onToggle}
      onPointerEnter={() => onHover(domain.id)}
      onPointerLeave={() => onHover(null)}
      onFocus={() => onHover(domain.id)}
      onBlur={() => onHover(null)}
      className={cn(
        'grid min-h-11 w-full grid-cols-[1.25rem_minmax(0,9rem)_minmax(0,1fr)_1.75rem] items-center gap-x-2.5 rounded-xl px-2 py-1 text-left transition-colors @md/map:grid-cols-[1.25rem_minmax(0,12rem)_minmax(0,1fr)_2rem] @md/map:gap-x-3',
        pressed ? 'bg-accent text-accent-ink' : lit ? 'bg-surface-2' : 'hover:bg-surface-2',
      )}
    >
      <span className={cn('[&_svg]:size-[18px]', !pressed && 'text-ink-3')}>
        <PageIcon name={domain.icon} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm leading-tight font-medium">{domain.label}</span>
        <span className={cn('block truncate text-xs', !pressed && 'text-ink-3')}>
          {!domain.active ? 'Belum aktif' : urgent ? `${urgent} mendesak` : fact}
        </span>
      </span>
      <span className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-surface-2">
        {urgent > 0 && (
          <span
            className="rounded-full bg-late-bar transition-[width] duration-500 ease-out"
            style={{ width: `${(urgent / max) * 100}%` }}
          />
        )}
        {soon > 0 && (
          <span
            className="rounded-full bg-action transition-[width] duration-500 ease-out"
            style={{ width: `${(soon / max) * 100}%` }}
          />
        )}
      </span>
      <span
        className={cn(
          'tabular text-right text-[15px] font-medium',
          !pressed && urgent > 0 && 'text-late-ink',
        )}
      >
        {!domain.active ? null : records.length ? (
          records.length
        ) : filter === 'all' ? (
          <CheckIcon aria-label="Aman" className="ml-auto size-4 text-ink-3" />
        ) : (
          <span className="text-ink-3">0</span>
        )}
      </span>
    </button>
  );
}

/**
 * Peta koperasi, panel utama Beranda: satu angka besar, delapan bidang dengan batangnya, dan daftar
 * yang bisa langsung ditindak. Menjawab "bagian mana yang perlu saya urus sekarang?" dalam sekali lihat.
 */
export function CoopMap({
  ws,
  date,
  caps,
  more,
  quickAdd,
  refresh,
  onOpenTask,
}: {
  ws: Workspace;
  date: string;
  caps: MapCapabilities;
  more: Partial<Record<Entity, unknown>>;
  /** Kolom tugas cepat: tugas baru langsung masuk ke daftar yang sama. */
  quickAdd?: ReactNode;
  refresh: () => Promise<void> | void;
  onOpenTask: (id: string) => void;
}) {
  const domains = useMemo(() => buildCoopMap(ws, date, caps, more), [ws, date, caps, more]);
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [lit, setLit] = useState<string | null>(null);
  const details = useRef<HTMLElement>(null);

  const allActions = domains
    .flatMap((domain) => domain.actions.map((record) => ({ record, domain })))
    .sort((a, b) => Number(b.record.level === 'urgent') - Number(a.record.level === 'urgent'));
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
  const toggle = (id: string) => {
    setSelected(selected === id ? null : id);
    // HP: rincian ada di bawah denah; tanpa ini ketukan terasa tidak berbuat apa-apa.
    if (window.matchMedia('(max-width: 767px)').matches)
      details.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const scopedOf = (domain: CoopDomain) =>
    domain.actions.filter((record) => matchesFilter(record, filter));
  const max = Math.max(1, ...domains.map((domain) => scopedOf(domain).length));
  const needing = domains.filter((domain) => scopedOf(domain).length > 0).length;
  const listUrgent = list.filter(({ record }) => record.level === 'urgent').length;

  return (
    <section
      aria-labelledby="coop-map-title"
      className="@container isolate flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-card ring-1 ring-line"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && selected) setSelected(null);
      }}
    >
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 pt-5">
        <h2 id="coop-map-title" className="text-lg font-medium">
          Peta koperasi
        </h2>
        <Tabs
          label="Saring peta"
          value={filter}
          onChange={(id) => setFilter(id as Filter)}
          // HP: ketiga tab harus muat tanpa digulir. "Semua" tanpa angka: angkanya sudah angka besar.
          className="max-sm:[&_button]:px-3"
          items={FILTERS.map((item) => ({
            ...item,
            count: item.id === 'all' ? undefined : counts[item.id],
          }))}
        />
      </header>

      <div className="flex min-h-0 flex-1 flex-col @2xl:flex-row">
        <div className="@container/map flex min-w-0 flex-1 flex-col px-3 pt-3 pb-3">
          <div className="px-2 pb-3">
            <p className="flex flex-wrap items-baseline gap-x-2.5">
              <span className="tabular text-[44px] leading-none font-normal tracking-tight">
                {list.length}
              </span>
              <span className="text-[13px] text-ink-3">
                perlu ditangani{current && ` di ${current.label}`}
                {filter !== 'urgent' && listUrgent > 0 && ` · ${listUrgent} mendesak`}
                {!current && ` · ${needing} dari ${domains.length} bidang`}
              </span>
            </p>
          </div>
          <div className="flex flex-1 flex-col justify-between">
            {domains.map((domain) => (
              <DomainBar
                key={domain.id}
                domain={domain}
                records={scopedOf(domain)}
                max={max}
                filter={filter}
                pressed={selected === domain.id}
                lit={lit === domain.id}
                onToggle={() => toggle(domain.id)}
                onHover={setLit}
              />
            ))}
          </div>
        </div>

        <aside
          ref={details}
          aria-label={current ? `Rincian ${current.label}` : 'Yang perlu ditangani'}
          className="relative min-h-0 scroll-mb-24 border-t border-line @2xl:w-[21rem] @2xl:border-t-0 @2xl:border-l"
        >
          <div className="flex max-h-[28rem] flex-col @2xl:absolute @2xl:inset-0 @2xl:max-h-none">
            {current ? (
              <DomainHeader domain={current} onBack={() => setSelected(null)} />
            ) : (
              quickAdd && <div className="px-4 pt-3 pb-2">{quickAdd}</div>
            )}
            <ul
              className="scrollbar-none flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-2"
              onPointerLeave={() => setLit(null)}
            >
              {list.map(({ record, domain }) => (
                <ActionRow
                  key={record.key}
                  record={record}
                  domain={current ? undefined : domain}
                  ws={ws}
                  refresh={refresh}
                  onOpenTask={onOpenTask}
                  onHover={() => setLit(domain.id)}
                />
              ))}
              {!list.length && (
                <li className="px-2 py-3 text-[13px] text-ink-3">
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
          className="-ml-1.5 grid size-9 shrink-0 place-items-center rounded-full text-ink-3 transition hover:bg-surface-2 hover:text-ink [&_svg]:size-4 max-sm:size-11"
        >
          <ArrowLeft />
        </button>
        <h3 className="min-w-0 flex-1 truncate text-[15px] font-medium">{domain.label}</h3>
      </div>
      {domain.stats.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-2xl bg-surface-2 p-3">
          {domain.stats.map((stat) => (
            <div key={stat.label} className="min-w-0">
              <dt className="truncate text-xs text-ink-3">{stat.label}</dt>
              <dd className="tabular truncate text-sm font-medium">{stat.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {domain.note && <p className="text-xs text-ink-3">{domain.note}</p>}
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

// Perangkat berpenunjuk: ikon muncul saat baris disentuh, supaya daftar panjang tetap tenang.
const ROW_ICON =
  'grid size-9 shrink-0 place-items-center rounded-full text-ink-3 transition group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-surface-2 hover:text-ink [@media(hover:hover)]:opacity-0 [&_svg]:size-4 max-sm:size-11';

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
  onHover: () => void;
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
          record.level === 'urgent' ? 'text-late-ink' : 'text-ink-3',
        )}
      >
        {record.note}
        {domain && ` · ${domain.label}`}
      </span>
    </>
  );
  return (
    <li
      onPointerEnter={onHover}
      className="group flex items-center gap-2 rounded-2xl py-1.5 pr-1 pl-2 transition-colors hover:bg-surface-2"
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
            record.level === 'urgent' ? 'bg-late-bar' : 'bg-action',
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
