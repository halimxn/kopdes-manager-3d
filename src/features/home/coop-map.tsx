'use client';
import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
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
// Letak tiap bidang tetap, supaya manajer hafal tempatnya seperti denah. Baris atas usaha, tengah
// pekerjaan harian, bawah orang dan berkas. `null` adalah koperasi di pusat.
const LAYOUT = ['gerai', 'barang', 'kas', 'agenda', null, 'kerja', 'anggota', 'tim', 'dokumen'];

const matchesFilter = (record: MapRecord, filter: Filter) =>
  filter === 'all' || (filter === 'urgent' ? record.level === 'urgent' : record.today);

type PlotState = 'urgent' | 'soon' | 'safe' | 'quiet' | 'off';
// Warna petak hanya berarti keadaan, jadi kondisi koperasi terbaca sebelum angkanya dibaca.
const PLOT_STATE: Record<PlotState, string> = {
  urgent: 'bg-late-solid text-on-late-solid',
  soon: 'bg-doing text-doing-ink',
  safe: 'bg-done text-done-ink',
  quiet: 'bg-surface-2 text-ink-3',
  off: 'border border-dashed border-line-strong text-ink-3',
};
const LEGEND = [
  { label: 'Mendesak', swatch: 'bg-late-solid' },
  { label: 'Perlu ditangani', swatch: 'bg-doing' },
  { label: 'Aman', swatch: 'bg-done' },
];

/** Satu petak bidang: warna keadaan, angka yang perlu ditangani paling besar, lalu nama bidangnya. */
function Plot({
  domain,
  filter,
  pressed,
  lit,
  dimmed,
  index,
  onToggle,
  onHover,
}: {
  domain: CoopDomain;
  filter: Filter;
  pressed: boolean;
  lit: boolean;
  dimmed: boolean;
  index: number;
  onToggle: () => void;
  onHover: (id: string | null) => void;
}) {
  const scoped = domain.actions.filter((record) => matchesFilter(record, filter));
  const urgent = scoped.filter((record) => record.level === 'urgent').length;
  const stat = domain.stats[0];
  const state: PlotState = !domain.active
    ? 'off'
    : urgent
      ? 'urgent'
      : scoped.length
        ? 'soon'
        : filter === 'all'
          ? 'safe'
          : 'quiet';
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={`${domain.label}: ${
        !domain.active
          ? 'belum aktif'
          : scoped.length
            ? `${scoped.length} perlu ditangani${urgent ? `, ${urgent} mendesak` : ''}`
            : 'aman'
      }`}
      onClick={onToggle}
      onPointerEnter={() => onHover(domain.id)}
      onPointerLeave={() => onHover(null)}
      onFocus={() => onHover(domain.id)}
      onBlur={() => onHover(null)}
      style={{ animationDelay: `${index * 40}ms` }}
      className={cn(
        'enter flex min-w-0 flex-col p-2.5 text-left ring-current transition-[background-color,color,opacity,box-shadow] duration-300 ring-inset -outline-offset-4 hover:ring-1 focus-visible:outline-current @md/map:p-3.5',
        PLOT_STATE[state],
        pressed ? 'ring-[3px] hover:ring-[3px]' : lit && 'ring-1',
        dimmed && 'opacity-55',
      )}
    >
      <span className="flex items-start gap-1">
        {state === 'urgent' || state === 'soon' ? (
          <span className="tabular text-[30px] leading-9 font-normal tracking-tight @md/map:text-[40px] @md/map:leading-[2.75rem]">
            {scoped.length}
          </span>
        ) : (
          state === 'safe' && (
            <span className="-ml-0.5 grid size-9 place-items-center [&_svg]:size-6">
              <CheckIcon aria-hidden="true" />
            </span>
          )
        )}
        <span className="ml-auto grid size-6 shrink-0 place-items-center [&_svg]:size-[18px] @md/map:[&_svg]:size-5">
          <PageIcon name={domain.icon} />
        </span>
      </span>
      <span className="mt-auto line-clamp-2 pt-1 text-[13.5px] leading-tight font-medium">
        {domain.label}
      </span>
      {state === 'off' ? (
        <span className="truncate text-xs">Belum aktif</span>
      ) : state === 'urgent' ? (
        <span className="truncate pt-0.5 text-xs">{urgent} mendesak</span>
      ) : (
        stat && (
          <span className="hidden truncate pt-0.5 text-xs @md/map:block">
            {stat.value} {stat.label.toLowerCase()}
          </span>
        )
      )}
    </button>
  );
}

/**
 * Peta koperasi di Beranda: denah dengan koperasi di pusat dan delapan bidang kerja di sekelilingnya.
 * Menjawab "bagian mana yang perlu saya urus sekarang?" dalam sekali lihat, lalu langsung bisa ditindak
 * dari daftar di sampingnya.
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
  const domains = useMemo(() => buildCoopMap(ws, date, caps, more), [ws, date, caps, more]);
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [lit, setLit] = useState<string | null>(null);
  const details = useRef<HTMLElement>(null);

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
  const toggle = (id: string) => {
    setSelected(selected === id ? null : id);
    // HP: rincian ada di bawah denah; tanpa ini ketukan terasa tidak berbuat apa-apa.
    if (window.matchMedia('(max-width: 767px)').matches)
      details.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  return (
    <section
      aria-labelledby="coop-map-title"
      className="@container isolate h-full overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-card ring-1 ring-line"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && selected) setSelected(null);
      }}
    >
      <div className="flex h-full flex-col">
        <header className="flex flex-wrap items-start gap-x-4 gap-y-2 px-5 pt-5">
          <div className="min-w-0 flex-1 basis-48">
            <h2 id="coop-map-title" className="text-lg font-medium">
              Peta koperasi
            </h2>
            <p className="text-[13px] text-ink-3">
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
                  'flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition-colors',
                  filter === item.id
                    ? 'bg-accent text-accent-ink'
                    : 'text-ink-2 ring-1 ring-line-strong hover:bg-surface-2',
                )}
              >
                {item.label}
                <span className="tabular opacity-70">{counts[item.id]}</span>
              </button>
            ))}
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col @xl:flex-row">
          <div className="@container/map flex min-w-0 flex-1 flex-col p-4 @xl:p-5">
            <div className="grid min-h-[22rem] flex-1 grid-cols-3 grid-rows-3 gap-[3px] overflow-hidden rounded-[1.25rem]">
              {LAYOUT.map((id, index) => {
                const domain = domains.find((item) => item.id === id);
                if (domain)
                  return (
                    <Plot
                      key={domain.id}
                      domain={domain}
                      filter={filter}
                      pressed={selected === domain.id}
                      lit={lit === domain.id}
                      dimmed={selected !== null && selected !== domain.id}
                      index={index}
                      onToggle={() => toggle(domain.id)}
                      onHover={setLit}
                    />
                  );
                return (
                  <button
                    key="hub"
                    type="button"
                    onClick={() => setSelected(null)}
                    aria-label={`${coop || 'Koperasi'}: tampilkan semua bidang`}
                    style={{ animationDelay: `${index * 40}ms` }}
                    className="enter flex min-w-0 flex-col items-center justify-center gap-1.5 bg-surface-2 p-2 text-center -outline-offset-4"
                  >
                    <LogoMark className="size-11 rounded-[14px]" />
                    <span className="line-clamp-2 text-xs leading-tight text-ink-2">
                      {coop || 'Koperasi'}
                    </span>
                  </button>
                );
              })}
            </div>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 pt-3 text-xs text-ink-2">
              {LEGEND.map((item) => (
                <li key={item.label} className="flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className={cn('size-2.5 rounded-[3px] ring-1 ring-line', item.swatch)}
                  />
                  {item.label}
                </li>
              ))}
            </ul>
          </div>

          <aside
            ref={details}
            aria-label={current ? `Rincian ${current.label}` : 'Yang perlu ditangani'}
            className="relative min-h-0 scroll-mb-24 border-t border-line @xl:w-[19rem] @xl:border-t-0 @xl:border-l"
          >
            <div className="flex max-h-[28rem] flex-col @xl:absolute @xl:inset-0 @xl:max-h-none">
              {current ? (
                <DomainHeader domain={current} onBack={() => setSelected(null)} />
              ) : (
                <div className="flex items-center justify-between px-4 pt-4 pb-2">
                  <h3 className="text-sm font-medium">Perlu ditangani</h3>
                  <span className="tabular text-xs text-ink-3">{list.length}</span>
                </div>
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
            record.level === 'urgent' ? 'bg-late-bar' : 'bg-doing-bar',
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
