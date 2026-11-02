'use client';
import Link from 'next/link';
import * as motion from 'motion/react-m';
import {
  ChevronRight,
  Download,
  ExternalLink,
  Globe2,
  ListPlus,
  MessageCircle,
  NotebookPen,
  Pencil,
  Phone,
  Trash2,
  Video,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Entity, Item } from './schemas';
import type { Workspace } from '@/features/workspace/use-workspace';
import { cardTone, riskLevel, riskScore, stockState } from './card-tone';
import {
  detailRows,
  displayValue,
  entityTitle,
  relatedGroups,
  suggestions,
  summaryChips,
} from './related';
import { formatChoiceLabel } from './catalog';
import { MEETING_KINDS, meetingKindOf, recordOutcomeHref } from '@/features/agenda/meeting-kinds';
import { downloadMeeting, meetingJoinUrl } from '@/features/agenda/meeting';
import { hasWorldPlace, worldHref } from '@/features/world/world-link';
import { recordLink } from '@/components/layout/nav';
import { Pill, statusTone } from '@/components/ui/pill';
import { Avatar, AvatarStack } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { useConfirm } from '@/components/ui/confirm';
import { api } from '@/lib/client';
import { addDays, daysBetween, formatDate, today } from '@/lib/date';

const LONG_FIELDS = [
  'description',
  'notes',
  'agenda',
  'minutes',
  'mitigation',
  'items',
  'reason',
  'evidence',
  'follow_up',
  'goal',
];
const UNDELETABLE: Entity[] = ['organization', 'workstreams', 'stock-movements'];

const people = (entity: Entity, row: Item): string[] => {
  const d = row.data;
  if (entity === 'meetings')
    return String(d.participants || '')
      .split(/[,;\n]/)
      .map((n) => n.trim())
      .filter(Boolean);
  return [String(d.assignee || '')].filter(Boolean);
};

/** Nomor HP menjadi tautan WhatsApp (0 → 62) dan telepon bila panjangnya masuk akal. */
function phoneLinks(contact: string) {
  const digits = contact.replace(/\D/g, '');
  if (digits.length < 8) return null;
  return { wa: `https://wa.me/${digits.replace(/^0/, '62')}`, tel: `tel:${digits}` };
}

/** Baris penting per jenis catatan, ditampilkan di kartu dan laci. */
function keyFacts(entity: Entity, row: Item, ws: Workspace): string[] {
  const d = row.data;
  const date = today();
  switch (entity) {
    case 'meetings': {
      const place = d.mode === 'online' ? 'Rapat online' : String(d.location || 'Tatap muka');
      return [`${formatDate(String(d.date))} · ${String(d.time || '')} WIB`, place];
    }
    case 'documents': {
      const expiry = String(d.expires_date || '');
      if (!expiry) return ['Masa berlaku tetap'];
      if (expiry < date) return [`Kedaluwarsa ${formatDate(expiry)}`];
      if (expiry <= addDays(date, 30)) return [`Berakhir ${formatDate(expiry)} (≤30 hari)`];
      return [`Berlaku s.d. ${formatDate(expiry)}`];
    }
    case 'risks': {
      const score = riskScore(row);
      return [`Skor ${score} · ${riskLevel(score)}`];
    }
    case 'stakeholders': {
      const last = String(d.last_contact || '');
      const facts = [String(d.contact || '')].filter(Boolean);
      if (last && daysBetween(last, date) > 14) facts.push('Perlu dihubungi (>14 hari)');
      const count = (ws.interactions || []).filter((i) => i.data.stakeholder_id === row.id).length;
      if (count) facts.push(`${count} interaksi`);
      return facts;
    }
    case 'inventory-items': {
      const state = stockState(row);
      return [
        `Stok ${Number(d.book_quantity || 0)} ${String(d.measurement || '')} · ${state === 'aman' ? 'Aman' : state === 'menipis' ? 'Menipis' : 'Habis'}`,
      ];
    }
    case 'cash-entries':
      return [
        `${d.direction === 'masuk' ? '+' : '−'} ${displayValue(entity, 'amount', d.amount, ws)}`,
        formatDate(String(d.date)),
      ];
    case 'stock-counts': {
      const diff = Number(d.counted_quantity) - Number(d.book_quantity);
      return [
        diff === 0 ? 'Fisik sesuai' : diff < 0 ? `Kurang ${-diff}` : `Lebih ${diff}`,
        `Buku ${Number(d.book_quantity)} · Fisik ${Number(d.counted_quantity)}`,
      ];
    }
    default:
      return [];
  }
}

function statusOf(entity: Entity, row: Item): string {
  if (entity === 'meetings') return MEETING_KINDS[meetingKindOf(row)].label;
  if (entity === 'cash-entries')
    return row.data.direction === 'masuk' ? 'Uang masuk' : 'Uang keluar';
  const status = row.data.status ?? row.data.condition;
  return status ? formatChoiceLabel(String(status), `${entity}.status`) : '';
}

/** Jenis catatan tentang orang: kartunya kartu orang, bukan kartu berwarna. */
export const PEOPLE_ENTITIES: Entity[] = ['members', 'stakeholders', 'staff'];

function personFacts(entity: Entity, row: Item, ws: Workspace): [string, string][] {
  const d = row.data;
  const show = (field: string, empty = '—') =>
    d[field] ? displayValue(entity, field, d[field], ws) : empty;
  if (entity === 'members')
    return [
      ['Nomor anggota', show('member_number')],
      ['Bergabung', show('date')],
    ];
  if (entity === 'stakeholders')
    return [
      ['Kontak', show('contact')],
      ['Terakhir dihubungi', show('last_contact', 'Belum')],
    ];
  return [
    ['Peran', show('role')],
    ['Tempat kerja', show('workplace')],
  ];
}

/** Tombol bulat WhatsApp dan telepon; tidak membuka laci detail. */
function ContactLinks({ contact, name }: { contact: unknown; name: string }) {
  const links = phoneLinks(String(contact || ''));
  if (!links) return null;
  const className =
    'grid size-11 place-items-center rounded-full text-ink-2 ring-1 ring-line-strong transition hover:bg-surface-3 hover:text-ink [&_svg]:size-4';
  return (
    <span className="flex shrink-0 gap-1.5">
      <a
        href={links.wa}
        target="_blank"
        rel="noreferrer"
        aria-label={`WhatsApp ${name}`}
        onClick={(event) => event.stopPropagation()}
        className={className}
      >
        <MessageCircle />
      </a>
      <a
        href={links.tel}
        aria-label={`Telepon ${name}`}
        onClick={(event) => event.stopPropagation()}
        className={className}
      >
        <Phone />
      </a>
    </span>
  );
}

/**
 * Kartu orang (anggota, kontak, tim). Tablet dan laptop: avatar besar, nama, dua fakta. HP: satu baris
 * ringkas, karena di lapangan yang dicari satu orang untuk dihubungi.
 */
function PersonCard({
  entity,
  row,
  ws,
  onOpen,
  index,
  extra,
}: {
  entity: Entity;
  row: Item;
  ws: Workspace;
  onOpen: () => void;
  index: number;
  extra?: React.ReactNode;
}) {
  const name = String(row.data.title || entityTitle(entity));
  const status = statusOf(entity, row);
  const detail = summaryChips(entity, row, ws).slice(0, 2).join(' · ');
  const pill = status ? <Pill tone={statusTone(row.data.status)}>{status}</Pill> : null;
  const title = (
    <button
      type="button"
      className="block max-w-full truncate text-left text-[16px] font-medium text-ink outline-none"
      onClick={(event) => {
        event.stopPropagation();
        onOpen();
      }}
    >
      {name}
    </button>
  );
  return (
    <motion.article
      layout
      style={{ animationDelay: `${Math.min(index, 10) * 35}ms` }}
      className="enter flex h-full cursor-pointer flex-col gap-3 rounded-[var(--radius-card)] bg-surface p-3.5 shadow-card ring-1 ring-line transition-[background-color,translate] duration-300 hover:-translate-y-0.5 hover:bg-surface-solid sm:p-4"
      onClick={onOpen}
    >
      <div className="flex items-center gap-3 sm:hidden">
        <Avatar name={name} className="size-11 ring-0" />
        <div className="min-w-0 flex-1">
          {title}
          {pill}
        </div>
        <ContactLinks contact={row.data.contact} name={name} />
      </div>
      <div className="flex items-start justify-between gap-2 max-sm:hidden">
        <Avatar name={name} className="size-14 text-[15px] ring-0" />
        {pill}
      </div>
      <div className="min-w-0 max-sm:hidden">
        {title}
        {detail && <p className="truncate text-[13px] text-ink-3">{detail}</p>}
      </div>
      <dl className="grid grid-cols-2 gap-2 rounded-2xl bg-surface-2 p-3 text-[13px] max-sm:hidden">
        {personFacts(entity, row, ws).map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="truncate text-xs text-ink-3">{label}</dt>
            <dd className="truncate font-medium text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-auto flex items-center justify-between gap-2 empty:hidden">
        {extra && <div onClick={(event) => event.stopPropagation()}>{extra}</div>}
        <span className="ml-auto max-sm:hidden">
          <ContactLinks contact={row.data.contact} name={name} />
        </span>
      </div>
    </motion.article>
  );
}

/** Kartu catatan berwarna menurut artinya: status, judul, fakta penting, orang, dan tanggal. */
export function RecordCard({
  entity,
  row,
  ws,
  onOpen,
  index = 0,
  extra,
}: {
  entity: Entity;
  row: Item;
  ws: Workspace;
  onOpen: () => void;
  index?: number;
  /** Tautan cepat per jenis catatan; berada di dalam kartu dan tidak membuka laci detail. */
  extra?: React.ReactNode;
}) {
  if (PEOPLE_ENTITIES.includes(entity))
    return (
      <PersonCard entity={entity} row={row} ws={ws} onOpen={onOpen} index={index} extra={extra} />
    );
  const chips = summaryChips(entity, row, ws).slice(0, 2);
  const facts = keyFacts(entity, row, ws);
  const status = statusOf(entity, row);
  return (
    <motion.article
      layout
      style={{ animationDelay: `${Math.min(index, 10) * 35}ms` }}
      data-tone={cardTone(entity, row, ws)}
      className="enter group relative flex h-full min-h-36 cursor-pointer flex-col gap-2.5 rounded-[var(--radius-card)] bg-tone p-4 text-tone-ink ring-1 ring-tone-line ring-inset transition-[box-shadow,translate] duration-300 hover:-translate-y-0.5 hover:shadow-card"
      onClick={onOpen}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {status && (
          <span className="rounded-full bg-surface/50 px-2.5 py-1 text-[11px] font-medium text-ink">
            {status}
          </span>
        )}
        {chips.map((chip) => (
          <span
            key={chip}
            className="max-w-[12rem] truncate rounded-full px-1 py-0.5 text-[12px] font-medium"
          >
            {chip}
          </span>
        ))}
      </div>
      <button
        type="button"
        className="relative text-left text-[16px] leading-snug font-medium text-ink outline-none"
        onClick={(e) => {
          e.stopPropagation();
          onOpen();
        }}
      >
        {String(row.data.title || entityTitle(entity))}
      </button>
      {facts.length > 0 && (
        <ul className="flex flex-col gap-0.5 text-[13px]">
          {facts.map((fact) => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>
      )}
      {extra && <div onClick={(event) => event.stopPropagation()}>{extra}</div>}
      <div className="mt-auto flex items-center justify-between gap-2">
        <AvatarStack names={people(entity, row)} />
        <span className="ml-auto text-xs font-medium">
          {formatDate(String(row.data.date || row.data.due_date || row.updated_at || ''))}
        </span>
      </div>
    </motion.article>
  );
}

/** Aksi khusus per jenis catatan (agenda, kontak, kegiatan, kendala). */
function EntityActions({ entity, row }: { entity: Entity; row: Item }) {
  const d = row.data;
  const actions: React.ReactNode[] = [];
  if (entity === 'meetings') {
    const join = meetingJoinUrl(row);
    if (join)
      actions.push(
        <Button key="join" asChild size="sm" variant="primary">
          <a href={join} target="_blank" rel="noreferrer">
            <Video />
            Gabung rapat
          </a>
        </Button>,
      );
    actions.push(
      <Button key="ics" size="sm" onClick={() => downloadMeeting(row)}>
        <Download />
        Unduh jadwal (.ics)
      </Button>,
    );
    if (String(d.date) <= today())
      actions.push(
        <Button key="outcome" asChild size="sm">
          <Link href={recordOutcomeHref(row, today())}>
            <NotebookPen />
            Catat hasil
          </Link>
        </Button>,
      );
  }
  if (['meetings', 'journal', 'issues'].includes(entity)) {
    const params = new URLSearchParams({
      new: '1',
      'fill.title': `Tindak lanjut: ${String(d.title)}`,
      'fill.notes': `Sumber ${entityTitle(entity).toLowerCase()}: ${String(d.title)}`,
    });
    if (entity === 'meetings') params.set('fill.meeting_id', row.id);
    if (entity === 'issues') params.set('fill.issue_id', row.id);
    actions.push(
      <Button key="follow" asChild size="sm">
        <Link href={`/tasks?${params}`}>
          <ListPlus />
          Tindak lanjut
        </Link>
      </Button>,
    );
  }
  if (entity === 'stakeholders') {
    const links = phoneLinks(String(d.contact || ''));
    if (links)
      actions.push(
        <Button key="wa" asChild size="sm">
          <a href={links.wa} target="_blank" rel="noreferrer">
            <MessageCircle />
            WhatsApp
          </a>
        </Button>,
        <Button key="tel" asChild size="sm">
          <a href={links.tel}>
            <Phone />
            Telepon
          </a>
        </Button>,
      );
  }
  if (d.link && /^https?:\/\//.test(String(d.link)))
    actions.push(
      <Button key="link" asChild size="sm">
        <a href={String(d.link)} target="_blank" rel="noreferrer">
          <ExternalLink />
          Buka tautan
        </a>
      </Button>,
    );
  if (hasWorldPlace(entity))
    actions.push(
      <Button key="world" asChild size="sm">
        <Link href={worldHref(entity, row.id)}>
          <Globe2 />
          Lihat di dunia
        </Link>
      </Button>,
    );
  return actions.length ? <div className="flex flex-wrap gap-2">{actions}</div> : null;
}

/** Laci detail catatan: ringkasan, rincian, catatan terkait, saran, dan riwayat. */
export function RecordDetailSheet({
  entity,
  row,
  ws,
  open,
  onClose,
  onEdit,
  refresh,
}: {
  entity: Entity;
  row?: Item;
  ws: Workspace;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
  refresh: () => Promise<void> | void;
}) {
  const confirm = useConfirm();
  if (!row) return null;
  const details = detailRows(entity, row, ws).filter(
    (detail) => !LONG_FIELDS.includes(detail.field),
  );
  const longText = LONG_FIELDS.filter((field) => String(row.data[field] || '').trim());
  const groups = relatedGroups(entity, row, ws);
  const ideas = suggestions(entity, row, ws);
  const history = Array.isArray(row.data.activities)
    ? [
        ...(row.data.activities as {
          id: string;
          text: string;
          user: string;
          created_at: string;
        }[]),
      ].reverse()
    : [];
  const remove = async () => {
    if (
      !(await confirm({
        title: `Hapus ${entityTitle(entity).toLowerCase()} ini?`,
        description: `"${String(row.data.title)}" akan dihapus permanen.`,
        confirmLabel: 'Hapus',
        danger: true,
      }))
    )
      return;
    try {
      await api(entity, { id: row.id }, 'DELETE');
      toast.success('Catatan dihapus');
      onClose();
      await refresh();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={String(row.data.title || entityTitle(entity))}
      description={entityTitle(entity)}
      footer={
        <>
          {!UNDELETABLE.includes(entity) && (
            <Button variant="danger" onClick={() => void remove()}>
              <Trash2 />
              Hapus
            </Button>
          )}
          {entity !== 'stock-movements' && (
            <Button variant="primary" className="ml-auto" onClick={onEdit}>
              <Pencil />
              Ubah
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-6">
        {/* Label ringkas di bawah judul, seperti panel detail acuan. */}
        <div data-tone={cardTone(entity, row, ws)} className="flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            {statusOf(entity, row) && (
              <Pill tone={statusTone(row.data.status)}>{statusOf(entity, row)}</Pill>
            )}
            {summaryChips(entity, row, ws).map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-[color-mix(in_srgb,var(--tone-bar)_45%,transparent)] bg-tone px-2.5 py-1 text-tone-ink"
              >
                {chip}
              </span>
            ))}
          </div>
          {keyFacts(entity, row, ws).length > 0 && (
            <p className="text-sm font-bold text-ink">{keyFacts(entity, row, ws).join(' · ')}</p>
          )}
        </div>
        {longText.map((field) => (
          <section key={field} className="flex flex-col gap-1.5">
            <h3 className="text-[13px] font-semibold text-ink-3">
              {detailRows(entity, row, ws).find((d) => d.field === field)?.label || field}
            </h3>
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-ink">
              {String(row.data[field])}
            </p>
          </section>
        ))}
        <EntityActions entity={entity} row={row} />
        {details.length > 0 && (
          <dl className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-x-4 gap-y-3.5 text-sm sm:grid-cols-[8.5rem_minmax(0,1fr)]">
            {details.map((detail) => (
              <div key={detail.field} className="contents">
                <dt className="font-semibold text-ink-3">{detail.label}</dt>
                <dd className="min-w-0 font-semibold break-words text-ink">{detail.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {ideas.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="text-[13px] font-semibold text-ink-3">Saran</h3>
            {ideas.map((idea) => (
              <Link
                key={idea.id}
                href={idea.href}
                className="rounded-2xl bg-accent px-4 py-3 text-accent-ink transition hover:brightness-[0.98]"
              >
                <span className="block text-sm font-bold">{idea.label}</span>
                <span className="block text-xs opacity-80">{idea.reason}</span>
              </Link>
            ))}
          </section>
        )}
        {groups.length > 0 && (
          <section className="flex flex-col gap-3">
            <h3 className="text-[13px] font-semibold text-ink-3">Terkait</h3>
            {groups.map((group) => (
              <div key={group.entity + group.direction + group.title}>
                <p className="mb-1.5 text-[13px] font-semibold text-ink-2">
                  {group.title} <span className="text-ink-3">({group.rows.length})</span>
                </p>
                {/* Catatan terkait berupa kapsul bergaris, seperti daftar subtugas pada acuan. */}
                <ul className="flex flex-col gap-2">
                  {group.rows.slice(0, 8).map((related) => (
                    <li key={related.id}>
                      <Link
                        href={recordLink(group.entity, related.id)}
                        onClick={onClose}
                        className="flex min-h-11 items-center gap-2 rounded-full border border-line py-1 pr-2 pl-4 text-sm font-semibold text-ink transition hover:bg-surface-2"
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {String(related.data.title || entityTitle(group.entity))}
                        </span>
                        <ChevronRight className="size-4 shrink-0 text-ink-3" />
                      </Link>
                    </li>
                  ))}
                  {group.rows.length > 8 && (
                    <li className="px-4 text-xs text-ink-3">
                      +{group.rows.length - 8} catatan lain
                    </li>
                  )}
                </ul>
              </div>
            ))}
          </section>
        )}
        <section className="flex flex-col gap-2">
          <h3 className="text-[13px] font-semibold text-ink-3">Riwayat</h3>
          <ol className="flex flex-col gap-2 border-l-2 border-line pl-4 text-sm">
            {history.slice(0, 20).map((entry) => (
              <li key={entry.id}>
                <span className="font-semibold text-ink">{entry.text}</span>
                <span className="block text-xs text-ink-3">
                  {entry.user} · {formatDate(entry.created_at)}
                </span>
              </li>
            ))}
            {row.updated_at !== row.created_at && (
              <li className="text-ink-2">Diubah {formatDate(row.updated_at)}</li>
            )}
            <li className="text-ink-2">Dibuat {formatDate(row.created_at)}</li>
          </ol>
        </section>
      </div>
    </Sheet>
  );
}
