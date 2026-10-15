'use client';
// Kartu melayang: putih bersih, sudut 14–18 px, aksen
// teal, ikon teal. Komponen generik; isi datanya disusun MonitoringDashboard.
import Link from 'next/link';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ArrowUpRight, Check, ChevronDown, ChevronLeft, ChevronRight, Plus, X, type LucideIcon } from 'lucide-react';
import type { Nada } from './monitor-data';
import { Ikon3D, ThumbBarang, type Ikon3DKind, type ThumbKind } from '@/components/ui/Ikon3D';

export function Pill({ nada, children }: { nada: Nada; children: ReactNode }) {
  return <span className={`mt-pill is-${nada}`}>{children}</span>;
}

/** Ubin putih-biru muda berisi ikon biru kilap. */
export function IconTile({ icon, size = 30, nada }: { icon: Ikon3DKind; size?: number; nada?: Nada }) {
  return (
    <span className={`mt-tile${nada ? ` is-${nada}` : ''}`} aria-hidden="true">
      <Ikon3D kind={icon} size={size} />
    </span>
  );
}

/** Popover sederhana: tutup saat klik di luar atau Escape, fokus kembali ke pemicu. */
export function usePopover() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener('pointerdown', down);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', down);
      document.removeEventListener('keydown', key);
    };
  }, [open]);
  return { open, setOpen, root, trigger };
}

export type KpiChip = { text: string; nada: Nada };
export function KpiCard({
  icon,
  label,
  value,
  chip,
  foot,
  onClick,
}: {
  icon: Ikon3DKind;
  label: string;
  value: string;
  chip?: KpiChip;
  foot: string;
  onClick?: () => void;
}) {
  return (
    <button type="button" className="mt-card mt-kpi" onClick={onClick} disabled={!onClick}>
      <IconTile icon={icon} size={34} />
      <span className="mt-kpi-body">
        <small>{label}</small>
        <span className="mt-kpi-value">
          <strong>{value}</strong>
          {chip && <em className={`is-${chip.nada}`}>{chip.text}</em>}
        </span>
        <span className="mt-kpi-foot">{foot}</span>
      </span>
    </button>
  );
}

export type Stat = { label: string; value: string; total?: string; bar?: number; nada?: Nada };
/** Kotak statistik 2 × 2: label kecil, angka tebal "x / y", bilah progres berwarna. */
export function Stats({ items }: { items: Stat[] }) {
  return (
    <div className="mt-stats">
      {items.map((s) => (
        <div key={s.label}>
          <small>{s.label}</small>
          <strong>
            {s.value}
            {s.total && <span> / {s.total}</span>}
          </strong>
          {s.bar !== undefined && (
            <span className={`mt-bar is-${s.nada || 'biru'}`} aria-hidden="true">
              <i style={{ width: `${Math.round(Math.max(0, Math.min(1, s.bar)) * 100)}%` }} />
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export function PanelHead({
  icon,
  eyebrow,
  title,
  sub,
  href,
  onClose,
}: {
  icon: Ikon3DKind;
  eyebrow: string;
  title: string;
  sub?: string;
  href?: string;
  onClose?: () => void;
}) {
  return (
    <header className="mt-panel-head">
      <IconTile icon={icon} size={36} />
      <span>
        <small>{eyebrow}</small>
        <h2>{title}</h2>
        {sub && <em>{sub}</em>}
      </span>
      <span className="mt-head-actions">
        {href && (
          <Link className="mt-icon-btn" href={href} aria-label={`Buka halaman ${title}`}>
            <ArrowUpRight size={16} />
          </Link>
        )}
        {onClose && (
          <button type="button" className="mt-icon-btn" onClick={onClose} aria-label="Tutup pilihan">
            <X size={16} />
          </button>
        )}
      </span>
    </header>
  );
}

/** Judul bagian dalam panel dengan keterangan kecil di kanan (mis. "satuan"). */
export function Section({ title, meta }: { title: string; meta?: string }) {
  return (
    <h3 className="mt-sub">
      {title}
      {meta && <small>{meta}</small>}
    </h3>
  );
}

/** Tautan ke halaman operasional terkait, berupa pil kecil di bawah panel. */
export function Links({ items }: { items: { href: string; label: string; baru?: boolean }[] }) {
  if (!items.length) return null;
  return (
    <nav className="mt-links" aria-label="Halaman terkait">
      {items.map((l) => (
        <Link key={l.href} href={l.href} className={l.baru ? 'is-baru' : undefined}>
          {l.baru && <Plus size={13} aria-hidden="true" />}
          {l.label}
          {!l.baru && <ArrowUpRight size={13} aria-hidden="true" />}
        </Link>
      ))}
    </nav>
  );
}

export type RowView = {
  key: string;
  title: string;
  sub: string;
  pill?: string;
  nada?: Nada;
  href?: string;
  onClick?: () => void;
  active?: boolean;
  bar?: number;
  /** Teks kecil di samping bilah, mis. "2/6". */
  barText?: string;
  ikon?: Ikon3DKind;
  thumb?: ThumbKind;
  /** Inisial nama sebagai avatar bila baris mewakili orang. */
  avatar?: string;
  value?: string;
  unit?: string;
};
export function Rows({ rows, empty }: { rows: RowView[]; empty: string }) {
  if (!rows.length) return <p className="mt-empty">{empty}</p>;
  return (
    <ul className="mt-rows">
      {rows.map((r) => {
        const body = (
          <>
            {r.thumb ? (
              <span className="mt-row-ikon" aria-hidden="true">
                <ThumbBarang kind={r.thumb} size={30} />
              </span>
            ) : r.ikon ? (
              <span className="mt-row-ikon" aria-hidden="true">
                <Ikon3D kind={r.ikon} size={26} />
              </span>
            ) : null}
            {r.avatar && (
              <span className="mt-row-avatar" aria-hidden="true">
                {r.avatar}
              </span>
            )}
            <span className="mt-row-text">
              <strong>{r.title}</strong>
              <small>{r.sub}</small>
            </span>
            {r.value !== undefined && (
              <span className="mt-row-value">
                {r.value}
                {r.unit && <small>{r.unit}</small>}
              </span>
            )}
            {r.pill && <Pill nada={r.nada || 'abu'}>{r.pill}</Pill>}
            {r.bar !== undefined && (
              <span className="mt-row-bar">
                <span className={`mt-bar is-${r.nada === 'kuning' || r.nada === 'merah' ? r.nada : 'hijau'}`} aria-hidden="true">
                  <i style={{ width: `${Math.round(r.bar * 100)}%` }} />
                </span>
                {r.barText && <small>{r.barText}</small>}
              </span>
            )}
            <ChevronRight size={15} className="mt-row-arrow" aria-hidden="true" />
          </>
        );
        return (
          <li key={r.key}>
            {r.href ? (
              <Link className="mt-row" href={r.href}>
                {body}
              </Link>
            ) : (
              <button type="button" className="mt-row" aria-pressed={r.active} onClick={r.onClick}>
                {body}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export type Step = {
  key: string;
  label: string;
  sub: string;
  state: 'done' | 'now' | 'next';
  icon: LucideIcon;
};
/** Pelacak bertahap: bulatan berikon terhubung garis, tahap aktif berlingkar biru. */
export function Stepper({ steps, label }: { steps: Step[]; label: string }) {
  return (
    <ol className="mt-steps" aria-label={label}>
      {steps.map((s) => {
        const Icon = s.state === 'done' ? Check : s.icon;
        return (
          <li key={s.key} className={`is-${s.state}`} aria-current={s.state === 'now' ? 'step' : undefined}>
            <span className="mt-step-dot" aria-hidden="true">
              <Icon size={s.state === 'now' ? 16 : 14} strokeWidth={2.4} />
            </span>
            <strong>{s.label}</strong>
            <small>{s.sub}</small>
          </li>
        );
      })}
    </ol>
  );
}

export function Pager({ index, total, onMove, label }: { index: number; total: number; onMove: (d: number) => void; label: string }) {
  if (total < 2) return null;
  return (
    <span className="mt-pager">
      <button type="button" className="mt-icon-btn is-small" aria-label={`${label} sebelumnya`} onClick={() => onMove(-1)}>
        <ChevronLeft size={15} />
      </button>
      <small aria-live="polite">
        {index + 1}/{total}
      </small>
      <button type="button" className="mt-icon-btn is-small" aria-label={`${label} berikutnya`} onClick={() => onMove(1)}>
        <ChevronRight size={15} />
      </button>
    </span>
  );
}

export type Tab = { id: string; label: string; count: string; rows: RowView[]; empty: string };
export function TabsCard({ icon, title, tabs, label }: { icon: Ikon3DKind; title: string; tabs: Tab[]; label: string }) {
  const [current, setCurrent] = useState(tabs[0]?.id);
  const tab = tabs.find((t) => t.id === current) || tabs[0];
  const id = useId();
  return (
    <section className="mt-card mt-tabs" aria-label={label}>
      <header>
        <IconTile icon={icon} size={24} />
        <div role="tablist" aria-label={label}>
          {tabs.map((t) => (
            <button
              key={t.id}
              id={`${id}-${t.id}`}
              type="button"
              role="tab"
              aria-selected={t.id === tab?.id}
              onClick={() => setCurrent(t.id)}
            >
              {t.label} <span>{t.count}</span>
            </button>
          ))}
        </div>
        <small>{title}</small>
      </header>
      {tab && (
        <div role="tabpanel" aria-labelledby={`${id}-${tab.id}`}>
          <Rows rows={tab.rows} empty={tab.empty} />
        </div>
      )}
    </section>
  );
}

export type LokasiOpsi = { id: string; kode: string; label: string; sub: string };
/** Pemilih lokasi ala "WH-01 Riverside Hub": lencana kode, nama, ringkasan, daftar pilihan. */
export function LokasiPicker({ value, options, onChange }: { value: string; options: LokasiOpsi[]; onChange: (id: string) => void }) {
  const { open, setOpen, root, trigger } = usePopover();
  const now = options.find((o) => o.id === value) || options[0];
  const list = useId();
  return (
    <div className="mt-lokasi" ref={root}>
      <button
        ref={trigger}
        type="button"
        className="mt-lokasi-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={list}
        aria-label={`Lokasi: ${now.label}. Ganti lokasi`}
        onClick={() => setOpen(!open)}
      >
        <b className="mt-badge">{now.kode}</b>
        <span>
          <strong>{now.label}</strong>
          <small>{now.sub}</small>
        </span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open && (
        <ul id={list} role="listbox" aria-label="Pilih lokasi" className="mt-card mt-pop mt-lokasi-list">
          {options.map((o) => (
            <li key={o.id} role="option" aria-selected={o.id === value}>
              <button
                type="button"
                onClick={() => {
                  onChange(o.id);
                  setOpen(false);
                  trigger.current?.focus();
                }}
              >
                <b className="mt-badge">{o.kode}</b>
                <span>
                  <strong>{o.label}</strong>
                  <small>{o.sub}</small>
                </span>
                {o.id === value && <Check size={16} aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export type SheetState = 'intip' | 'setengah' | 'penuh';
const URUT: SheetState[] = ['intip', 'setengah', 'penuh'];
/**
 * Lembar bawah untuk ponsel: pegangan diketuk berganti intip → setengah → penuh, atau diseret
 * naik/turun. Di layar lebar komponen ini hanya pembungkus tanpa gaya (lihat monitoring.css).
 */
export function Sheet({ state, onState, label, children }: { state: SheetState; onState: (s: SheetState) => void; label: string; children: ReactNode }) {
  const awal = useRef<number | null>(null);
  const geser = (dy: number) => {
    const i = URUT.indexOf(state);
    if (Math.abs(dy) < 24) return onState(URUT[(i + 1) % URUT.length]);
    onState(URUT[Math.max(0, Math.min(URUT.length - 1, i + (dy < 0 ? 1 : -1)))]);
  };
  return (
    <section className="mt-sheet" data-state={state} aria-label={label}>
      <button
        type="button"
        className="mt-sheet-handle"
        aria-label={state === 'penuh' ? 'Kecilkan panel' : 'Besarkan panel'}
        aria-expanded={state !== 'intip'}
        onPointerDown={(e) => {
          awal.current = e.clientY;
          e.currentTarget.setPointerCapture?.(e.pointerId);
        }}
        onPointerUp={(e) => {
          const dy = awal.current === null ? 0 : e.clientY - awal.current;
          awal.current = null;
          geser(dy);
        }}
        onClick={(e) => {
          // Enter/Spasi (detail 0) berganti tahap; ketukan/seretan ditangani pointer di atas.
          if (e.detail === 0) geser(0);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp') onState(URUT[Math.min(2, URUT.indexOf(state) + 1)]);
          if (e.key === 'ArrowDown') onState(URUT[Math.max(0, URUT.indexOf(state) - 1)]);
        }}
      >
        <i aria-hidden="true" />
      </button>
      <div className="mt-sheet-body">{children}</div>
    </section>
  );
}
