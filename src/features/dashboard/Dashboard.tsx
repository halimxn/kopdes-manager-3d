'use client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { usePreference } from '@/lib/usePreference';
import { Modal } from '@/components/ui/Modal';
import {
  AlertCircle,
  ArrowRight,
  Check,
  Clock,
  Video,
  SlidersHorizontal,
  Plus,
  Trash2,
  RotateCcw,
  X,
} from 'lucide-react';
import { FollowUps } from '../follow-ups/FollowUps';
import { getFollowUps, recordHref } from '../workspace/workspace-navigation';
import type { Workspace } from '../workspace/useWorkspace';
import { schemas } from '../records/schemas';
import { isOverdue, scopeProgress } from '@/lib/progress';
import { today, addDays, formatDate } from '@/lib/date';
import { cashSummary, rupiah } from '../operations/ledger';
import { meetingJoinUrl } from '../meetings/meeting';
import { WeekBarChart, TaskDonutChart } from '@/components/charts/DashboardCharts';
import { ModulUsahaHarian } from './ModulUsahaHarian';
import { Select } from '@/components/ui/Select';

const routineSchema = z.array(z.object({ id: z.string(), time: z.string(), title: z.string() }));
function parseRoutinePreference<T>(text: string, schema: z.ZodType<T>, fallback: T): T {
  try {
    const parsed = schema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : fallback;
  } catch {
    return fallback;
  }
}

export function Dashboard({ data, preferenceScope = '' }: { data: Workspace; preferenceScope?: string }) {
  const now = today();
  const [projectId, setProjectId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const allTasks = (data['work-items'] || []).map((row) => ({
    ...schemas['work-items'].parse(row.data),
    id: row.id,
  }));
  const tasks = allTasks.filter((task) => !projectId || task.workstream_id === projectId);
  const [filter, setFilter] = useState('aktif');
  const open = tasks.filter((t) => !['selesai', 'dibatalkan'].includes(t.status));
  const visible = tasks
    .filter((t) =>
      ['selesai', 'rencana', 'proses', 'dibatalkan'].includes(filter)
        ? t.status === filter
        : filter === 'terlambat'
          ? isOverdue(t, now)
          : !['selesai', 'dibatalkan'].includes(t.status),
    )
    .filter((t) => !selectedDate || (t.status === 'selesai' && t.completed_at === selectedDate))
    .sort((a, b) => a.due_date.localeCompare(b.due_date));

  const projects = data.workstreams || [];
  const visibleProjects = projects.filter(
    (project) => project.data.status !== 'diarsipkan' && (!projectId || project.id === projectId),
  );

  // Rutinitas harian manajer gerai; daftar bawaan bisa diubah lewat Atur
  const ROUTINE_CONFIG_KEY = 'kdmp_manager_routine_config';
  const ROUTINE_KEY = `kdmp_manager_routine_${now}`;
  const DEFAULT_ROUTINES = [
    { id: 'kas-awal', time: '07:30', title: 'Buka gerai & cek kas modal awal' },
    { id: 'briefing', time: '08:30', title: 'Briefing singkat petugas kasir/toko' },
    { id: 'cek-rak', time: '10:00', title: 'Cek persediaan barang rak & stok menipis' },
    { id: 'rekap-siang', time: '13:00', title: 'Rekapitulasi setoran anggota & kas tengah hari' },
    { id: 'tutup-buku', time: '16:30', title: 'Tutup buku kas harian & hitung fisik uang kasir' },
    { id: 'kunci-toko', time: '17:00', title: 'Cek keamanan, inventaris, dan kunci gerai' },
  ];

  const [routineText, setRoutineText] = usePreference(
    preferenceScope + ROUTINE_CONFIG_KEY,
    JSON.stringify(DEFAULT_ROUTINES),
  );
  const [completedText, setCompletedText] = usePreference(preferenceScope + ROUTINE_KEY, '[]');
  const routines = parseRoutinePreference(routineText, routineSchema, DEFAULT_ROUTINES);
  const completedRoutines = parseRoutinePreference(completedText, z.array(z.string()), []);
  const routineCompletedCount = routines.filter((routine) =>
    completedRoutines.includes(routine.id),
  ).length;
  const [showRoutineModal, setShowRoutineModal] = useState(false);
  const [newRoutineTime, setNewRoutineTime] = useState('08:00');
  const [newRoutineTitle, setNewRoutineTitle] = useState('');

  function saveRoutines(items: typeof DEFAULT_ROUTINES) {
    setRoutineText(JSON.stringify(items));
  }

  function handleAddRoutine(e: React.FormEvent) {
    e.preventDefault();
    if (!newRoutineTitle.trim()) return;
    const newItem = {
      id: crypto.randomUUID(),
      time: newRoutineTime.trim() || '08:00',
      title: newRoutineTitle.trim(),
    };
    const updated = [...routines, newItem].sort((a, b) => a.time.localeCompare(b.time));
    saveRoutines(updated);
    setNewRoutineTitle('');
  }

  function handleDeleteRoutine(id: string) {
    const updated = routines.filter((r) => r.id !== id);
    saveRoutines(updated);
  }

  function handleResetRoutines() {
    saveRoutines(DEFAULT_ROUTINES);
  }

  const [jamSekarang, setJamSekarang] = useState('');
  useEffect(() => {
    const format = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    const perbarui = () => setJamSekarang(format.format(new Date()));
    perbarui();
    const timer = window.setInterval(perbarui, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  // Rutinitas berikutnya = yang belum selesai dan jamnya belum lewat; yang belum selesai tapi jamnya lewat ditandai.
  const routineBerikutnya = jamSekarang
    ? routines.find((r) => !completedRoutines.includes(r.id) && r.time >= jamSekarang)?.id
    : undefined;
  const semuaRutinSelesai = routines.length > 0 && routineCompletedCount === routines.length;

  function toggleRoutine(id: string) {
    const next = completedRoutines.includes(id)
      ? completedRoutines.filter((item) => item !== id)
      : [...completedRoutines, id];
    setCompletedText(JSON.stringify(next));
  }

  // Bar chart: 7-day completion
  const week = Array.from({ length: 7 }, (_, i) => addDays(now, i - 6));
  const doneCounts = week.map(
    (date) => tasks.filter((t) => t.status === 'selesai' && t.completed_at === date).length,
  );
  const barData = week.map((date, i) => ({
    label: new Intl.DateTimeFormat('id-ID', { weekday: 'short' }).format(
      new Date(date + 'T12:00:00Z'),
    ),
    dateLabel: formatDate(date),
    date,
    value: doneCounts[i],
    isToday: date === now,
  }));

  // Donut chart: task status breakdown
  const totalTasks = tasks.length;
  const donutSlices = [
    {
      label: 'Selesai',
      value: tasks.filter((t) => t.status === 'selesai').length,
      color: 'var(--success)',
      cls: 'dot-done',
    },
    {
      label: 'Dikerjakan',
      value: tasks.filter((t) => t.status === 'proses').length,
      color: 'var(--brand)',
      cls: 'dot-active',
    },
    {
      label: 'Rencana',
      value: tasks.filter((t) => t.status === 'rencana').length,
      color: 'var(--pastel-purple-text)',
      cls: 'dot-plan',
    },
    {
      label: 'Dibatalkan',
      value: tasks.filter((t) => t.status === 'dibatalkan').length,
      color: 'var(--danger)',
      cls: 'dot-late',
    },
  ];

  const journalRecent = [...(data.journal || [])]
    .sort((a, b) => String(b.data.date || '').localeCompare(String(a.data.date || '')))
    .slice(0, 4);
  const overdueCount = tasks.filter((t) => isOverdue(t, now)).length;
  const dueTodayCount = open.filter((t) => t.due_date === now).length;
  const perhatian = getFollowUps(data, now);
  const tanggalPanjang = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(now + 'T12:00:00Z'));

  // Agenda hari ini: rapat hari ini dan rutinitas dalam satu urutan jam.
  const rapatHariIni = (data.meetings || [])
    .filter((m) => String(m.data.date) === now && m.data.status !== 'dibatalkan')
    .sort((a, b) => String(a.data.time || '99').localeCompare(String(b.data.time || '99')));
  const rapatBerikutnya = rapatHariIni.find(
    (m) => m.data.status !== 'selesai' && (!jamSekarang || String(m.data.time || '') >= jamSekarang),
  );
  const agenda = [
    ...routines.map((r) => ({ jenis: 'rutin' as const, jam: r.time, rutin: r, rapat: undefined })),
    ...rapatHariIni.map((m) => ({ jenis: 'rapat' as const, jam: String(m.data.time || ''), rutin: undefined, rapat: m })),
  ].sort((a, b) => (a.jam || '99').localeCompare(b.jam || '99'));

  // Proyek: progres dan milestone terdekat yang belum tercapai.
  const milestoneBerikut = (projectId_: string) =>
    (data.milestones || [])
      .filter((m) => m.data.workstream_id === projectId_ && !m.data.actual_date)
      .sort((a, b) => String(a.data.due_date).localeCompare(String(b.data.due_date)))[0];

  // Kas bulan berjalan: hanya uang masuk/keluar tercatat, bukan saldo.
  const bulanIni = now.slice(0, 7);
  const kasBulanIni = (data['cash-entries'] || []).filter((row) => String(row.data.date).startsWith(bulanIni));
  const kas = cashSummary(kasBulanIni);
  const pekanKas = [0, 1, 2, 3, 4].map((pekan) => {
    const baris = kasBulanIni.filter((row) => Math.min(4, Math.floor((Number(String(row.data.date).slice(8, 10)) - 1) / 7)) === pekan);
    return cashSummary(baris);
  });
  const puncakKas = Math.max(1, ...pekanKas.flatMap((p) => [p.incoming, p.outgoing]));
  const keluarPerKategori = new Map<string, number>();
  for (const row of kasBulanIni.filter((r) => r.data.direction === 'keluar')) {
    const kategori = String(row.data.category || 'Lainnya');
    keluarPerKategori.set(kategori, (keluarPerKategori.get(kategori) || 0) + Number(row.data.amount));
  }
  const kategoriTerbesar = [...keluarPerKategori.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const namaBulan = new Intl.DateTimeFormat('id-ID', { month: 'long', timeZone: 'Asia/Jakarta' }).format(
    new Date(now + 'T12:00:00Z'),
  );

  // Pita jam hari ini (07.00–18.00): rutinitas dan rapat sesuai durasinya, disusun dalam
  // baris agar tidak bertumpuk. Di layar sempit pita berubah menjadi daftar biasa (CSS).
  const JAM_AWAL = 7,
    JAM_AKHIR = 18;
  const keJam = (hhmm: string) => {
    const [h, m] = (hhmm || '').split(':').map(Number);
    return Number.isFinite(h) ? h + (Number.isFinite(m) ? m : 0) / 60 : JAM_AWAL;
  };
  const posisiPita = (mulai: number, menit: number) => {
    const awal = Math.min(Math.max(mulai, JAM_AWAL), JAM_AKHIR - 0.5);
    const akhir = Math.min(Math.max(awal + menit / 60, awal + 0.5), JAM_AKHIR);
    return { awal, akhir };
  };
  const ujungBaris: number[] = [];
  const pita = agenda.map((butir) => {
    // Rutinitas tidak punya durasi; 75 menit cukup untuk jam + judul singkat tanpa terpotong habis.
    const menit = butir.rapat ? Number(butir.rapat.data.duration || 60) : 75;
    const { awal, akhir } = posisiPita(keJam(butir.jam), menit);
    // Baris pertama yang sudah kosong; bila tiga baris penuh, pakai yang paling cepat selesai.
    let baris = ujungBaris.findIndex((ujung) => ujung <= awal);
    if (baris < 0 && ujungBaris.length < 3) baris = ujungBaris.push(akhir) - 1;
    else {
      if (baris < 0) baris = ujungBaris.indexOf(Math.min(...ujungBaris));
      ujungBaris[baris] = akhir;
    }
    const rentang = JAM_AKHIR - JAM_AWAL;
    return {
      butir,
      gaya: {
        '--mulai': ((awal - JAM_AWAL) / rentang) * 100,
        '--lebar': ((akhir - awal) / rentang) * 100,
        '--baris': baris,
      } as React.CSSProperties,
    };
  });
  const barisPita = Math.max(1, ujungBaris.length);
  const posisiSekarang =
    jamSekarang && keJam(jamSekarang) >= JAM_AWAL && keJam(jamSekarang) <= JAM_AKHIR
      ? ((keJam(jamSekarang) - JAM_AWAL) / (JAM_AKHIR - JAM_AWAL)) * 100
      : null;

  // Antrean kerja: kelompok menurut tenggat saat tidak ada saringan khusus.
  const besok = addDays(now, 1);
  const kelompokAntrean = [
    { kunci: 'telat', judul: 'Terlambat', tugas: open.filter((t) => isOverdue(t, now)) },
    { kunci: 'hari-ini', judul: 'Hari ini', tugas: open.filter((t) => !isOverdue(t, now) && t.due_date === now) },
    { kunci: 'besok', judul: 'Besok', tugas: open.filter((t) => t.due_date === besok) },
    { kunci: 'nanti', judul: 'Berikutnya', tugas: open.filter((t) => t.due_date > besok) },
  ].map((k) => ({ ...k, tugas: [...k.tugas].sort((a, b) => a.due_date.localeCompare(b.due_date)) }));
  const modeKelompok = filter === 'aktif' && !selectedDate;

  // Linimasa proyek: 2 minggu ke belakang sampai 8 minggu ke depan.
  const awalLini = addDays(now, -14),
    akhirLini = addDays(now, 56);
  const hariLini = 70;
  const persenLini = (tanggal: string) =>
    Math.min(100, Math.max(0, (Math.round((Date.parse(tanggal) - Date.parse(awalLini)) / 86_400_000) / hariLini) * 100));
  const bulanLini = Array.from({ length: 3 }, (_, i) => {
    const d = new Date(awalLini + 'T12:00:00Z');
    d.setUTCMonth(d.getUTCMonth() + i + 1, 1);
    const tanggal = d.toISOString().slice(0, 10);
    return tanggal <= akhirLini
      ? {
          tanggal,
          kiri: persenLini(tanggal),
          nama: new Intl.DateTimeFormat('id-ID', { month: 'short', timeZone: 'UTC' }).format(d),
        }
      : null;
  }).filter((b): b is { tanggal: string; kiri: number; nama: string } => Boolean(b));

  function barisTugas(task: (typeof tasks)[number]) {
    const late = isOverdue(task, now);
    const hariIni = task.due_date === now;
    return (
      <li key={task.id}>
        <Link href={`/tugas?task=${encodeURIComponent(task.id)}`}>
          <span className={`beranda-titik is-${late ? 'telat' : task.status}`} aria-hidden="true" />
          <span className="beranda-baris-teks">
            <strong>{task.title}</strong>
            <small>
              {task.assignee || 'Belum ditugaskan'}
              {task.subtasks.length > 0 &&
                ` · ${task.subtasks.filter((st) => st.done).length}/${task.subtasks.length} subtugas`}
            </small>
          </span>
          <span className={`beranda-tanggal${late ? ' is-telat' : hariIni ? ' is-hari-ini' : ''}`}>
            {hariIni ? 'Hari ini' : formatDate(task.due_date)}
          </span>
        </Link>
      </li>
    );
  }

  return (
    <div className="manager-home beranda">
      <header className="beranda-kepala">
        <div>
          <h1>{tanggalPanjang}</h1>
          <div className="beranda-pil" aria-label="Ringkasan hari ini">
            <Link href="/tugas?status=terlambat" className={`pil ${overdueCount ? 'pil-telat' : 'pil-netral'}`}>
              <AlertCircle size={15} aria-hidden="true" />
              <b>{overdueCount}</b> terlambat
            </Link>
            <Link href="/hari-ini" className="pil pil-biru">
              <b>{dueTodayCount}</b> jatuh tempo hari ini
            </Link>
            {rapatBerikutnya && (
              <Link href={recordHref('meetings', rapatBerikutnya)} className="pil pil-pink">
                <Video size={15} aria-hidden="true" />
                Rapat {String(rapatBerikutnya.data.time || 'hari ini')}
              </Link>
            )}
          </div>
        </div>
        <label className="beranda-proyek">
          <span className="sr-only">Proyek</span>
          <Select
            value={projectId}
            onChange={(value) => {
              setProjectId(value);
              setSelectedDate('');
            }}
            options={[
              { value: '', label: 'Semua proyek' },
              ...projects.map((project) => ({ value: project.id, label: String(project.data.title) })),
            ]}
            ariaLabel="Proyek"
          />
        </label>
      </header>

      {/* Pita jam: rutinitas (bisa dicentang) dan rapat hari ini dalam satu garis waktu */}
      <section className="modul beranda-pita dashboard-routines" aria-label="Agenda hari ini">
        <div className="modul-kepala">
          <h2>Hari ini</h2>
          <span className={`beranda-jumlah${semuaRutinSelesai ? ' is-selesai' : ''}`}>
            {routineCompletedCount}/{routines.length} selesai
          </span>
          <span className="beranda-pita-aksi">
            <Button type="button" className="btn-routine-config" onClick={() => setShowRoutineModal(true)} aria-label="Atur rutinitas">
              <SlidersHorizontal size={14} />
              <span>Atur rutinitas</span>
            </Button>
            <Link className="modul-tautan" href="/rapat">Semua rapat</Link>
          </span>
        </div>
        {agenda.length ? (
          <div className="pita-wadah">
            <ol className="pita-jam" style={{ '--jumlah-baris': barisPita } as React.CSSProperties}>
              {pita.map(({ butir, gaya }) => {
                if (butir.rapat) {
                  const m = butir.rapat;
                  const url = meetingJoinUrl(m);
                  return (
                    <li key={'rapat-' + m.id} style={gaya} className={`rutin-butir is-rapat${m === rapatBerikutnya ? ' is-berikutnya' : ''}`}>
                      <Link href={recordHref('meetings', m)} title={`${butir.jam} ${String(m.data.title)}`}>
                        <span className="rutin-jam">{butir.jam || '—'}</span>
                        <span className="rutin-judul">{String(m.data.title)}</span>
                        <span className="sr-only">Rapat {String(m.data.mode || 'tatap muka')}</span>
                      </Link>
                      {url && (
                        <a href={url} target="_blank" rel="noreferrer" className="rutin-gabung" aria-label={`Gabung ${String(m.data.title)}`}>
                          <Video size={14} aria-hidden="true" />
                        </a>
                      )}
                    </li>
                  );
                }
                const item = butir.rutin!;
                const isChecked = completedRoutines.includes(item.id);
                const berikutnya = item.id === routineBerikutnya;
                const terlewat = !isChecked && Boolean(jamSekarang) && item.time < jamSekarang;
                const keadaan = isChecked ? 'is-selesai' : berikutnya ? 'is-berikutnya' : terlewat ? 'is-terlewat' : '';
                return (
                  <li key={item.id} style={gaya} className={`rutin-butir ${keadaan}`}>
                    <label title={`${item.time} ${item.title}`}>
                      <input type="checkbox" className="rutin-centang" checked={isChecked} onChange={() => toggleRoutine(item.id)} />
                      <span className="rutin-simpul" aria-hidden="true">
                        <Check size={11} strokeWidth={3} />
                      </span>
                      <span className="rutin-jam">{item.time}</span>
                      <span className="rutin-judul">{item.title}</span>
                      {berikutnya && <small className="rutin-label">Berikutnya</small>}
                      {terlewat && <span className="sr-only">Jam sudah lewat</span>}
                    </label>
                  </li>
                );
              })}
            </ol>
            {posisiSekarang !== null && (
              <span className="pita-sekarang" style={{ '--mulai': posisiSekarang } as React.CSSProperties} aria-hidden="true" />
            )}
            <div className="pita-skala" aria-hidden="true">
              {Array.from({ length: JAM_AKHIR - JAM_AWAL + 1 }, (_, i) => (
                <span key={i}>{String(JAM_AWAL + i).padStart(2, '0')}</span>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState
            compact
            ikon="jam"
            title="Agenda hari ini kosong"
            description="Tambahkan rutinitas harian atau jadwalkan rapat."
            action={{ label: 'Atur rutinitas', onClick: () => setShowRoutineModal(true) }}
          />
        )}
      </section>

      <div className="beranda-utama">
        <section className="modul beranda-tugas" aria-label="Antrean kerja">
          <div className="modul-kepala">
            <h2>Antrean kerja</h2>
            <div className="beranda-seg" role="group" aria-label="Saring tugas">
              {[
                ['aktif', 'Aktif', open.length],
                ['terlambat', 'Terlambat', overdueCount],
                ['selesai', 'Selesai', tasks.filter((t) => t.status === 'selesai').length],
              ].map(([value, label, count]) => (
                <button
                  key={String(value)}
                  type="button"
                  aria-pressed={filter === value}
                  onClick={() => {
                    setFilter(String(value));
                    setSelectedDate('');
                  }}
                >
                  {label}
                  <span>{count}</span>
                </button>
              ))}
            </div>
          </div>
          {(selectedDate || ['rencana', 'proses', 'dibatalkan'].includes(filter)) && (
            <div className="dashboard-selection" role="status">
              <span>{selectedDate ? 'Selesai pada ' + formatDate(selectedDate) : 'Status: ' + filter}</span>
              <Button
                onClick={() => {
                  setSelectedDate('');
                  setFilter('aktif');
                }}
              >
                Hapus pilihan
              </Button>
            </div>
          )}
          {modeKelompok && open.length ? (
            <div className="antrean">
              {kelompokAntrean
                .filter((k) => k.tugas.length)
                .map((k) => (
                  <div key={k.kunci} className={`antrean-kelompok is-${k.kunci}`}>
                    <h3>
                      <span aria-hidden="true" />
                      {k.judul} <small>{k.tugas.length}</small>
                    </h3>
                    <ul className="beranda-baris">{k.tugas.slice(0, 5).map(barisTugas)}</ul>
                  </div>
                ))}
            </div>
          ) : !modeKelompok && visible.length ? (
            <ul className="beranda-baris">{visible.slice(0, 7).map(barisTugas)}</ul>
          ) : (
            <EmptyState
              compact
              ikon="kalender"
              title={filter === 'selesai' ? 'Belum ada tugas selesai' : 'Tidak ada tugas di sini'}
              description={filter === 'terlambat' ? 'Tidak ada tenggat yang terlewat.' : 'Tambahkan tugas dan pilih tanggal pengerjaannya.'}
              action={{ label: 'Tambah tugas', href: '/tugas?baru=1' }}
            />
          )}
          <div className="modul-kaki">
            <Link className="home-text-link" href="/tugas">
              Semua tugas <ArrowRight size={15} />
            </Link>
          </div>
        </section>

        <div className="beranda-samping">
          {/* Kas: panel gelap sebagai jangkar; hanya uang masuk/keluar tercatat, bukan saldo */}
          <section className="modul beranda-kas" aria-label="Kas bulan ini">
            <div className="modul-kepala">
              <h2>Kas {namaBulan}</h2>
              <Link href="/keuangan" className="modul-tautan">Buku kas</Link>
            </div>
            {data['cash-entries'] ? (
              <>
                <div className="kas-ringkas">
                  <div><small>Uang masuk</small><b className="is-masuk">{rupiah(kas.incoming)}</b></div>
                  <div><small>Uang keluar</small><b className="is-keluar">{rupiah(kas.outgoing)}</b></div>
                </div>
                <div className="kas-pekan" role="img" aria-label={`Uang masuk dan keluar per pekan bulan ${namaBulan}`}>
                  {pekanKas.map((p, i) => (
                    <div key={i}>
                      <span className="kas-batang">
                        <i className="is-masuk" style={{ height: `${Math.max(3, (p.incoming / puncakKas) * 100)}%` }} />
                        <i className="is-keluar" style={{ height: `${Math.max(3, (p.outgoing / puncakKas) * 100)}%` }} />
                      </span>
                      <small>P{i + 1}</small>
                    </div>
                  ))}
                </div>
                <p className="kas-catatan">
                  Tercatat, bukan saldo{kategoriTerbesar ? ` · keluar terbesar: ${kategoriTerbesar}` : ''}
                </p>
              </>
            ) : (
              <p className="beranda-kosong">Buku kas belum aktif di server ini.</p>
            )}
          </section>

          <section id="perhatian" className="modul" aria-label="Perlu perhatian">
            <div className="modul-kepala">
              <h2>Perlu perhatian</h2>
              <span className="beranda-jumlah">{perhatian.length}</span>
            </div>
            {perhatian.length ? (
              <ul className="beranda-baris is-ringkas">
                {perhatian.slice(0, 5).map((item) => (
                  <li key={item.id}>
                    <Link href={item.href}>
                      <span className={`beranda-jenis${item.urgent ? ' is-mendesak' : ''}`}>{item.kind}</span>
                      <span className="beranda-baris-teks">
                        <strong>{item.title}</strong>
                        <small>{item.reason}</small>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="beranda-kosong">Tidak ada pengingat pada catatan yang dimuat.</p>
            )}
            {perhatian.length > 5 && (
              <details className="beranda-semua">
                <summary>Lihat semua ({perhatian.length})</summary>
                <FollowUps data={data} />
              </details>
            )}
          </section>

          <section className="modul" aria-label="Kegiatan terbaru">
            <div className="modul-kepala">
              <h2>Kegiatan terbaru</h2>
              <Link href="/jurnal" className="modul-tautan">Semua</Link>
            </div>
            {journalRecent.length ? (
              <ul className="beranda-baris is-ringkas">
                {journalRecent.map((row) => (
                  <li key={row.id}>
                    <Link href={recordHref('journal', row)}>
                      <span className="beranda-titik is-proses" aria-hidden="true" />
                      <span className="beranda-baris-teks">
                        <strong>{String(row.data.title || '')}</strong>
                        <small>{formatDate(String(row.data.date || ''))}</small>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                compact
                ikon="buku"
                title="Belum ada kegiatan dicatat"
                description="Catat kunjungan, koordinasi, atau hasil lapangan."
                action={{ label: 'Catat kegiatan', href: '/jurnal?baru=1' }}
              />
            )}
          </section>
        </div>
      </div>

      {/* Linimasa proyek: bilah dari mulai sampai target, isi = progres, belah ketupat = milestone berikutnya */}
      <section className="modul beranda-lini" aria-label="Proyek saya">
        <div className="modul-kepala">
          <h2>Proyek</h2>
          <small className="beranda-lini-ket">
            {formatDate(awalLini)} – {formatDate(akhirLini)} · belah ketupat = milestone berikutnya
          </small>
          <Link href="/roadmap" className="modul-tautan">Linimasa lengkap</Link>
        </div>
        {visibleProjects.length ? (
          <div className="lini">
            <div className="lini-skala" aria-hidden="true">
              {bulanLini.map((b) => (
                <span key={b.tanggal} style={{ '--kiri': b.kiri } as React.CSSProperties}>{b.nama}</span>
              ))}
            </div>
            <ul className="lini-daftar">
              {visibleProjects.slice(0, 6).map((p) => {
                const persen = scopeProgress(tasks.filter((t) => t.workstream_id === p.id));
                const ms = milestoneBerikut(p.id);
                const mulai = persenLini(String(p.data.start_date || awalLini));
                const selesai = persenLini(String(p.data.target_date || akhirLini));
                const lebar = Math.max(2, selesai - mulai);
                return (
                  <li key={p.id}>
                    <Link href={`/proyek?id=${encodeURIComponent(p.id)}`}>
                      <span className="lini-nama">
                        <strong>{String(p.data.title)}</strong>
                        <small>
                          {persen}% · {ms ? `${String(ms.data.title)} ${formatDate(String(ms.data.due_date))}` : 'Belum ada milestone berikutnya'}
                        </small>
                      </span>
                      <span className="lini-jalur" aria-hidden="true">
                        <i className="lini-bilah" style={{ '--kiri': mulai, '--lebar': lebar } as React.CSSProperties}>
                          <i style={{ width: `${persen}%` }} />
                        </i>
                        {ms && <i className="lini-ms" style={{ '--kiri': persenLini(String(ms.data.due_date)) } as React.CSSProperties} />}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <span className="lini-hari-ini" style={{ '--kiri': persenLini(now) } as React.CSSProperties} aria-hidden="true" />
          </div>
        ) : (
          <EmptyState
            compact
            ikon="folder"
            title="Belum ada proyek"
            description={projectId ? 'Tidak ada proyek aktif pada pilihan ini.' : 'Buat proyek atau periksa proyek yang diarsipkan.'}
            action={{ label: 'Kelola proyek', href: '/proyek' }}
          />
        )}
      </section>

      <div className="beranda-bawah">
        <ModulUsahaHarian />
        <section className="modul dashboard-extra" aria-label="Grafik pekerjaan">
          <div className="modul-kepala">
            <h2>Grafik pekerjaan</h2>
          </div>
          <div className="dash-analytics-row">
            <WeekBarChart
              data={barData}
              selectedDate={selectedDate}
              onSelect={(date) => {
                setSelectedDate(selectedDate === date ? '' : date);
                setFilter('selesai');
              }}
            />
            <TaskDonutChart
              slices={donutSlices}
              total={totalTasks}
              selected={filter}
              onSelect={(status) => {
                setFilter(status);
                setSelectedDate('');
              }}
            />
          </div>
        </section>
      </div>

      {/* ── Modal Atur Rutinitas Manajer ─────────────────── */}
      {showRoutineModal && (
        <Modal className="sprint-modal-dialog" aria-labelledby="routine-config-title" onDismiss={() => setShowRoutineModal(false)}>
          <div
            className="sprint-modal-card routine-config-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sprint-modal-head">
              <div className="title-with-badge">
                <div className="sprint-icon-pill">
                  <Clock size={20} />
                </div>
                <div>
                  <h2 id="routine-config-title">Atur Rutinitas Harian</h2>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--ink-muted)' }}>
                    Checklist operasional harian gerai
                  </p>
                </div>
              </div>
              <Button
                type="button"
                className="close-btn"
                onClick={() => setShowRoutineModal(false)}
                aria-label="Tutup"
              >
                <X size={18} />
              </Button>
            </div>

            <div className="routine-config-body">
              <form onSubmit={handleAddRoutine} className="routine-add-form">
                <div className="routine-add-inputs">
                  <label>Jam
                  <Input
                    type="time"
                    value={newRoutineTime}
                    onChange={(e) => setNewRoutineTime(e.target.value)}
                    className="routine-time-input"
                    title="Waktu rutinitas"
                    aria-label="Waktu rutinitas baru"
                    required
                  />
                  </label>
                  <label>Rutinitas
                  <Input
                    type="text"
                    placeholder="Tambah rutinitas baru (misal: Cek suhu showcase)..."
                    value={newRoutineTitle}
                    onChange={(e) => setNewRoutineTitle(e.target.value)}
                    className="routine-title-input"
                    aria-label="Judul rutinitas baru"
                    maxLength={120}
                    required
                  />
                  </label>
                </div>
                <Button type="submit" className="btn-add-routine">
                  <Plus size={15} />
                  <span>Tambah</span>
                </Button>
              </form>

              <div className="routine-config-list">
                {routines.map((item) => (
                  <div key={item.id} className="routine-config-item">
                    <span className="routine-time-badge">{item.time}</span>
                    <span className="routine-config-title">{item.title}</span>
                    <Button
                      type="button"
                      className="btn-delete-routine"
                      onClick={() => handleDeleteRoutine(item.id)}
                      title="Hapus rutinitas ini"
                      aria-label={`Hapus ${item.title}`}
                    >
                      <Trash2 size={15} />
                    </Button>
                  </div>
                ))}
                {routines.length === 0 && (
                  <p className="routine-empty-hint">Belum ada rutinitas yang diatur.</p>
                )}
              </div>
            </div>

            <div className="routine-modal-footer">
              <Button
                type="button"
                className="btn-reset-routine"
                onClick={handleResetRoutines}
                title="Kembalikan ke rutinitas standar KDMP"
              >
                <RotateCcw size={13} />
                <span>Kembalikan Bawaan</span>
              </Button>
              <Button
                type="button"
                className="btn-primary-finish"
                primary
                onClick={() => setShowRoutineModal(false)}
              >
                Selesai
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
