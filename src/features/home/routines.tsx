'use client';
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import * as motion from 'motion/react-m';
import { CalendarDays, PartyPopper, Plus, Settings2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Item } from '@/features/records/schemas';
import { Check } from '@/components/ui/check';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Input } from '@/components/ui/field';
import { TimeField } from '@/components/ui/date-time-field';
import { Notice } from '@/components/ui/states';
import { SegmentBar } from '@/components/ui/progress';
import { api } from '@/lib/client';
import { today } from '@/lib/date';
import { useJakartaClock } from '@/lib/clock';
import { cn } from '@/lib/utils';

/** Rutinitas standar manajer gerai KDMP; dipakai saat daftar rutin masih kosong. */
export const DEFAULT_ROUTINES = [
  { time: '07:30', title: 'Buka gerai & cek kas modal awal' },
  { time: '08:30', title: 'Briefing singkat petugas kasir/toko' },
  { time: '10:00', title: 'Cek persediaan barang rak & stok menipis' },
  { time: '13:00', title: 'Rekapitulasi setoran anggota & kas tengah hari' },
  { time: '16:30', title: 'Tutup buku kas harian & hitung fisik uang kasir' },
  { time: '17:00', title: 'Cek keamanan, inventaris, dan kunci gerai' },
];
const DAY_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const EVERY_DAY = [1, 2, 3, 4, 5, 6, 7];

/** Ringkasan hari aktif: "Setiap hari", "Sen–Jum", atau daftar hari. */
function daysLabel(days: number[]) {
  const key = [...days].sort().join('');
  if (key === '1234567') return 'Setiap hari';
  if (key === '123456') return 'Sen–Sab';
  if (key === '12345') return 'Sen–Jum';
  return (
    [...days]
      .sort()
      .map((day) => DAY_LABELS[day - 1])
      .join(', ') || 'Tidak ada hari'
  );
}

/** Hari aktif rutin: "Setiap hari" atau "Hari tertentu" (baru tampil pilihan harinya). */
function RoutineDays({ days, onChange }: { days: number[]; onChange: (days: number[]) => void }) {
  const [custom, setCustom] = useState(days.length < 7);
  const option = (on: boolean) =>
    cn(
      'h-8 flex-1 rounded-lg px-3 text-[13px] font-semibold text-ink-3 transition hover:text-ink',
      on && 'bg-surface text-ink shadow-card',
    );
  return (
    <div className="flex flex-col gap-2">
      <div
        className="flex gap-1 rounded-xl bg-surface-3 p-1"
        role="radiogroup"
        aria-label="Hari aktif"
      >
        <button
          type="button"
          role="radio"
          aria-checked={!custom}
          className={option(!custom)}
          onClick={() => {
            setCustom(false);
            if (days.length < 7) onChange(EVERY_DAY);
          }}
        >
          Setiap hari
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={custom}
          className={option(custom)}
          onClick={() => setCustom(true)}
        >
          Hari tertentu
        </button>
      </div>
      {custom && (
        <div
          className="flex animate-[item-in_0.25s_var(--ease-out)] gap-1"
          role="group"
          aria-label="Pilih hari"
        >
          {DAY_LABELS.map((label, index) => {
            const day = index + 1;
            const on = days.includes(day);
            return (
              <button
                key={label}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  const next = on ? days.filter((d) => d !== day) : [...days, day].sort();
                  if (next.length) onChange(next);
                  else toast('Pilih minimal satu hari.');
                }}
                className="h-9 flex-1 rounded-full bg-surface text-xs font-bold text-ink-3 ring-1 ring-line transition hover:text-ink aria-pressed:bg-action aria-pressed:text-on-action aria-pressed:ring-transparent"
              >
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
const LEGACY_KEY = 'kdmp_manager_routine_config';

/** Hari ISO 1 (Senin) … 7 (Minggu) untuk tanggal YYYY-MM-DD. */
export const isoWeekday = (date: string) =>
  ((new Date(date + 'T12:00:00Z').getUTCDay() + 6) % 7) + 1;

export type RoutineState = {
  routine: Item;
  done: boolean;
  state: 'done' | 'next' | 'missed' | 'later';
};

/** Rutin yang berlaku pada tanggal itu, diurutkan jam, dengan keadaan selesai/berikutnya/terlewat. */
export function routineStates(
  routines: Item[],
  checks: Item[],
  date: string,
  now: string,
): RoutineState[] {
  const weekday = isoWeekday(date);
  const doneIds = new Set(
    checks
      .filter((check) => check.data.date === date)
      .map((check) => String(check.data.routine_id)),
  );
  const list = routines
    .filter(
      (routine) =>
        routine.data.active !== false && ((routine.data.days as number[]) || []).includes(weekday),
    )
    .sort((a, b) => String(a.data.time).localeCompare(String(b.data.time)));
  const isToday = date === today();
  let nextFound = false;
  return list.map((routine) => {
    const done = doneIds.has(routine.id);
    if (done) return { routine, done, state: 'done' };
    if (isToday && String(routine.data.time) < now) return { routine, done, state: 'missed' };
    if (isToday && !nextFound) {
      nextFound = true;
      return { routine, done, state: 'next' };
    }
    return { routine, done, state: 'later' };
  });
}

/** Centang rutin hari ini; diambil langsung dari database agar HP dan laptop selalu sama. */
export function useRoutineChecks(ready: boolean) {
  const [checks, setChecks] = useState<Item[]>([]);
  const date = today();
  const fetchChecks = () =>
    api<{ items: Item[] }>(`routine-checks?from=${date}&to=${date}&limit=100`, undefined, 'GET', {
      bypassCache: true,
    }).then((page) => page.items);
  useEffect(() => {
    if (!ready) return;
    let live = true;
    fetchChecks()
      .then((items) => live && setChecks(items))
      .catch((error: Error) => toast.error(error.message));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, date]);
  const reload = async () => {
    try {
      setChecks(await fetchChecks());
    } catch (error) {
      toast.error((error as Error).message);
    }
  };
  return { checks, setChecks, reload };
}

function Confetti() {
  const pieces = Array.from({ length: 22 }, (_, i) => i);
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((i) => (
        <motion.span
          key={i}
          className="absolute top-1/3 left-1/2 size-2 rounded-[3px]"
          style={{
            background: [
              'var(--accent-strong)',
              'var(--late-bar)',
              'var(--done-bar)',
              'var(--warn-bar)',
              'var(--doing-bar)',
            ][i % 5],
          }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{
            x: Math.cos(i * 1.7) * (80 + (i % 5) * 28),
            y: Math.sin(i * 1.7) * 70 + 90,
            opacity: 0,
            rotate: 260 + i * 25,
          }}
          transition={{ duration: 1.3, ease: [0.2, 0.7, 0.3, 1] }}
        />
      ))}
    </span>
  );
}

export function RoutinesCard({
  routines,
  checks,
  setChecks,
  reload,
  refresh,
  ready,
}: {
  routines: Item[];
  checks: Item[];
  setChecks: (next: Item[] | ((current: Item[]) => Item[])) => void;
  reload: () => Promise<void>;
  refresh: () => Promise<void> | void;
  ready: boolean;
}) {
  const now = useJakartaClock();
  const date = today();
  const [managing, setManaging] = useState(false);
  const [party, setParty] = useState(0);
  const states = useMemo(
    () => routineStates(routines, checks, date, now),
    [routines, checks, date, now],
  );
  const done = states.filter((item) => item.done).length;

  const toggle = async (item: RoutineState) => {
    const existing = checks.find(
      (check) => check.data.routine_id === item.routine.id && check.data.date === date,
    );
    // Perayaan hanya saat centang terakhir membuat semua rutin beres.
    if (!existing && done + 1 === states.length) setParty((n) => n + 1);
    if (existing) {
      setChecks((current) => current.filter((check) => check.id !== existing.id));
      try {
        await api('routine-checks', { id: existing.id }, 'DELETE');
      } catch (error) {
        toast.error((error as Error).message);
        await reload();
      }
      return;
    }
    const optimistic: Item = {
      id: `tmp-${item.routine.id}`,
      created_at: '',
      updated_at: '',
      data: { routine_id: item.routine.id, date },
    };
    setChecks((current) => [...current, optimistic]);
    try {
      const saved = await api<Item>('routine-checks', {
        data: { routine_id: item.routine.id, date },
      });
      setChecks((current) => current.map((check) => (check.id === optimistic.id ? saved : check)));
      if (done + 1 === states.length) toast.success('Rutin hari ini beres semua.');
    } catch {
      // Perangkat lain mungkin sudah mencentang lebih dulu; muat ulang keadaan sebenarnya.
      await reload();
    }
  };

  return (
    <section
      aria-labelledby="routines-title"
      className="panel-deep relative flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] shadow-card ring-1 ring-line"
    >
      <header className="flex flex-col gap-3 px-5 pt-5 pb-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="routines-title" className="text-lg font-medium text-ink">
            Rutin hari ini
          </h2>
          {ready && (
            <Button size="sm" onClick={() => setManaging(true)}>
              <Settings2 />
              Atur
            </Button>
          )}
        </div>
        {states.length > 0 ? (
          <p className="flex items-baseline gap-2.5">
            <span className="tabular text-[44px] leading-none font-normal tracking-tight">
              {done}
              <span className="text-ink-3">/{states.length}</span>
            </span>
            <span className="text-[13px] text-ink-3">selesai</span>
          </p>
        ) : (
          <p className="text-[13px] text-ink-3">Belum ada rutin untuk hari ini</p>
        )}
        {states.length > 0 && (
          <SegmentBar
            value={(done / states.length) * 100}
            segments={states.length}
            label="Progres rutin"
          />
        )}
      </header>
      <div className="scrollbar-none relative min-h-0 flex-1 overflow-y-auto p-3">
        {party > 0 && <Confetti key={party} />}
        {!ready ? (
          <div className="p-2">
            <Notice>
              Rutin harian kini tersimpan di database agar sama di HP dan laptop. Jalankan migrasi
              11 (20261023000011_rutin_harian.sql) untuk mengaktifkannya.
            </Notice>
          </div>
        ) : !routines.length ? (
          <EmptyRoutines refresh={refresh} />
        ) : (
          <ol className="flex flex-col md:grid md:grid-cols-2 md:gap-x-2 xl:flex">
            <AnimatePresence initial={false}>
              {states.map((item) => (
                <motion.li
                  key={item.routine.id}
                  layout
                  className={cn(
                    'flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors',
                    item.state === 'next' && 'bg-surface-2 ring-1 ring-line',
                  )}
                >
                  <span
                    className={cn(
                      'tabular w-11 shrink-0 text-sm font-normal',
                      item.done ? 'text-ink-3' : 'text-ink-2',
                    )}
                  >
                    {String(item.routine.data.time).replace(':', '.')}
                  </span>
                  <Check
                    checked={item.done}
                    onChange={() => void toggle(item)}
                    label={String(item.routine.data.title)}
                  />
                  <span
                    className={cn(
                      'min-w-0 flex-1 text-[14.5px] font-normal',
                      item.done ? 'text-ink-3 line-through' : 'text-ink',
                    )}
                  >
                    {String(item.routine.data.title)}
                  </span>
                  {item.state === 'next' && (
                    <span className="shrink-0 text-xs font-medium text-accent-ink">Berikutnya</span>
                  )}
                  {item.state === 'missed' && (
                    <span className="shrink-0 text-xs text-ink-3">Terlewat</span>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
            {states.length > 0 && done === states.length && (
              <li className="mt-2 flex items-center gap-2 rounded-2xl bg-done md:col-span-2 px-4 py-3 text-sm font-bold text-done-ink">
                <PartyPopper className="size-4" />
                Semua rutin hari ini selesai.
              </li>
            )}
          </ol>
        )}
      </div>
      <RoutineManager
        open={managing}
        onClose={() => setManaging(false)}
        routines={routines}
        refresh={refresh}
      />
    </section>
  );
}

function legacyRoutines(): { time: string; title: string }[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(LEGACY_KEY) || '[]') as {
      time?: string;
      title?: string;
    }[];
    return parsed
      .filter((r) => r.title && /^\d{2}:\d{2}$/.test(String(r.time)))
      .map((r) => ({ time: String(r.time), title: String(r.title) }));
  } catch {
    return [];
  }
}

async function createRoutines(list: { time: string; title: string }[]) {
  for (const routine of list)
    await api('routines', { data: { ...routine, days: [1, 2, 3, 4, 5, 6, 7], active: true } });
}

function EmptyRoutines({ refresh }: { refresh: () => Promise<void> | void }) {
  const [busy, setBusy] = useState(false);
  // Dirender setelah data dimuat di peramban, jadi localStorage aman dibaca saat inisialisasi.
  const [legacy] = useState(() => (typeof window === 'undefined' ? [] : legacyRoutines()));
  const run = async (list: { time: string; title: string }[]) => {
    setBusy(true);
    try {
      await createRoutines(list);
      await refresh();
      toast.success('Rutin tersimpan');
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-col items-start gap-3 p-3">
      <p className="text-sm text-ink-2">
        Belum ada rutinitas. Mulai dari rutinitas standar manajer gerai, lalu sesuaikan.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" busy={busy} onClick={() => void run(DEFAULT_ROUTINES)}>
          Pakai rutinitas standar
        </Button>
        {legacy.length > 0 && (
          <Button busy={busy} onClick={() => void run(legacy)}>
            Pindahkan {legacy.length} rutin dari perangkat ini
          </Button>
        )}
      </div>
    </div>
  );
}

/** Jam rutin: kapsul ringkas di kiri baris, sama di form tambah dan daftar. */
const TIME =
  'h-10 w-[5.75rem] shrink-0 gap-2 border-transparent bg-accent px-3 font-bold text-accent-ink hover:border-transparent [&>svg]:text-accent-ink [&>svg:last-child]:hidden';

/** Atur rutin: jam, judul, hari aktif. Menghapus = menonaktifkan agar riwayat centang tetap utuh. */
function RoutineManager({
  open,
  onClose,
  routines,
  refresh,
}: {
  open: boolean;
  onClose: () => void;
  routines: Item[];
  refresh: () => Promise<void> | void;
}) {
  const [time, setTime] = useState('08:00');
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const active = routines
    .filter((routine) => routine.data.active !== false)
    .sort((a, b) => String(a.data.time).localeCompare(String(b.data.time)));
  const update = async (routine: Item, changes: Record<string, unknown>) => {
    try {
      await api('routines', { id: routine.id, data: { ...routine.data, ...changes } });
      await refresh();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="Atur rutin harian"
      description="Rutin muncul di Beranda pada hari yang dipilih."
    >
      <div className="flex flex-col gap-4">
        <form
          className="flex items-center gap-2 rounded-2xl bg-surface-2 p-2"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!title.trim()) return;
            setBusy(true);
            try {
              await createRoutines([{ time, title: title.trim().slice(0, 120) }]);
              await refresh();
              setTitle('');
            } catch (error) {
              toast.error((error as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <TimeField value={time} onChange={setTime} aria-label="Jam" className={TIME} />
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Nama rutin baru"
            maxLength={120}
            className="h-10 min-w-0 border-transparent bg-surface"
            wrapperClassName="flex-1"
            aria-label="Nama rutin"
          />
          <Button
            type="submit"
            variant="primary"
            busy={busy}
            disabled={!title.trim()}
            aria-label="Tambah rutin"
            className="h-10 rounded-xl max-sm:w-10 max-sm:px-0"
          >
            <Plus />
            <span className="max-sm:sr-only">Tambah</span>
          </Button>
        </form>
        <ul className="flex flex-col divide-y divide-line rounded-2xl ring-1 ring-line">
          {active.map((routine) => {
            const days = (routine.data.days as number[]) || [];
            const open = editing === routine.id;
            return (
              <li key={routine.id} className="group flex flex-col gap-2 p-2">
                <div className="flex items-center gap-2">
                  <TimeField
                    value={String(routine.data.time)}
                    aria-label="Jam"
                    className={TIME}
                    onChange={(next) =>
                      next !== routine.data.time && void update(routine, { time: next })
                    }
                  />
                  <Input
                    defaultValue={String(routine.data.title)}
                    maxLength={120}
                    aria-label="Nama rutin"
                    className="h-10 min-w-0 border-transparent bg-transparent px-2.5 font-semibold hover:border-transparent hover:bg-surface-2"
                    wrapperClassName="flex-1"
                    onBlur={(event) =>
                      event.target.value.trim() &&
                      event.target.value !== routine.data.title &&
                      void update(routine, { title: event.target.value.trim() })
                    }
                  />
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-label={`Hari aktif: ${daysLabel(days)}`}
                    onClick={() => setEditing(open ? null : routine.id)}
                    className="flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-surface-2 px-3 text-xs font-bold text-ink-2 transition hover:bg-surface-3 aria-expanded:bg-accent aria-expanded:text-accent-ink"
                  >
                    <CalendarDays className="size-3.5" />
                    <span className="max-sm:hidden">{daysLabel(days)}</span>
                  </button>
                  <Button
                    size="icon-sm"
                    variant="danger"
                    aria-label={`Hapus ${String(routine.data.title)}`}
                    onClick={() => void update(routine, { active: false })}
                    className="opacity-60 group-hover:opacity-100 focus-visible:opacity-100 max-md:opacity-100"
                  >
                    <Trash2 />
                  </Button>
                </div>
                {open && (
                  <div className="animate-[item-in_0.25s_var(--ease-out)] rounded-xl bg-surface-2 p-2">
                    <RoutineDays
                      days={days}
                      onChange={(next) => void update(routine, { days: next })}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <Button
          variant="ghost"
          onClick={async () => {
            const missing = DEFAULT_ROUTINES.filter(
              (d) => !active.some((r) => r.data.title === d.title),
            );
            if (!missing.length) return toast('Semua rutin standar sudah ada.');
            await createRoutines(missing);
            await refresh();
          }}
        >
          Tambahkan rutin standar yang belum ada
        </Button>
      </div>
    </Sheet>
  );
}
