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

/** Satu petak bidang: angka yang perlu ditangani paling besar, lalu nama dan satu fakta nyata. */
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
  const muted = pressed ? 'text-on-action/75' : 'text-on-deep-2';
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
        'enter flex min-w-0 flex-col rounded-[1.25rem] p-3 text-left ring-1 transition-[background-color,opacity,box-shadow] duration-200',
        pressed
          ? 'bg-action text-on-action ring-transparent'
          : 'bg-deep-2 text-on-deep hover:bg-surface-3',
        !pressed && (urgent ? 'ring-late-bar/70' : lit ? 'ring-on-deep-2' : 'ring-line'),
        dimmed && 'opacity-55',
        filter !== 'all' && !scoped.length && !pressed && 'opacity-40',
      )}
    >
      <span className="flex items-start justify-between gap-1">
        <span className={cn('grid size-8 place-items-center [&_svg]:size-5', pressed || muted)}>
          <PageIcon name={domain.icon} />
        </span>
        {!domain.active ? null : scoped.length ? (
          <span
            className={cn(
              'tabular text-[24px] leading-8 font-medium tracking-tight',
              !pressed && urgent > 0 && 'text-late-bar',
            )}
          >
            {scoped.length}
          </span>
        ) : (
          filter === 'all' && (
            <span className={cn('grid size-8 place-items-center [&_svg]:size-4', muted)}>
              <CheckIcon aria-hidden="true" />
            </span>
          )
        )}
      </span>
      <span className="mt-auto line-clamp-2 pt-1 text-[13.5px] leading-tight font-medium">
        {domain.label}
      </span>
      {!domain.active ? (
        <span className={cn('truncate text-xs', muted)}>Belum aktif</span>
      ) : (
        stat && (
          <span className={cn('hidden truncate pt-0.5 text-xs @md/map:block', muted)}>
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
    // Dasar panel mengikuti tema; isinya bertoken gelap seperti kartu ringkasan lain.
    <section
      aria-labelledby="coop-map-title"
      className="@container isolate h-full overflow-hidden rounded-[var(--radius-card)] bg-deep shadow-card ring-1 ring-line"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && selected) setSelected(null);
      }}
    >
      <div data-theme="dark" className="flex h-full flex-col text-on-deep">
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
          <div className="@container/map flex min-w-0 flex-1 flex-col p-4 @xl:p-5">
            <div className="grid min-h-[22rem] flex-1 grid-cols-3 grid-rows-3 gap-2.5 @md/map:gap-3.5">
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
                    className="enter flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-[1.25rem] p-2 text-center"
                  >
                    <LogoMark className="size-11 rounded-[14px]" />
                    <span className="line-clamp-2 text-xs leading-tight text-on-deep-2">
                      {coop || 'Koperasi'}
                    </span>
                  </button>
                );
              })}
            </div>
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
                  <span className="tabular text-xs text-on-deep-2">{list.length}</span>
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
      onPointerEnter={onHover}
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
