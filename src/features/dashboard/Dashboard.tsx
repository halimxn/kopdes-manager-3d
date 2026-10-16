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
  CalendarDays,
  Check,
  Clock,
  FolderOpen,
  ListChecks,
  PieChart,
  Video,
  SlidersHorizontal,
  Plus,
  Trash2,
  RotateCcw,
  Wallet,
  X,
} from 'lucide-react';
import { getFollowUps, recordHref } from '../workspace/workspace-navigation';
import type { Workspace } from '../workspace/useWorkspace';
import { schemas } from '../records/schemas';
import { isOverdue, scopeProgress } from '@/lib/progress';
import { today, formatDate } from '@/lib/date';
import { meetingJoinUrl } from '../meetings/meeting';
import { Donat } from '@/components/charts/GrafikLembut';
import { ModulUsahaHarian } from './ModulUsahaHarian';
import { KasBanding, SelisihKas, namaBulan, ringkasKas, useKasDuaBulan } from './KasBanding';
import { rupiah } from '../operations/ledger';
import { Select } from '@/components/ui/Select';

const WARNA_AVATAR = ['biru', 'ungu', 'oranye', 'teal', 'pink'] as const;
/** Warna avatar tetap per nama agar orang yang sama selalu berwarna sama. */
function warnaAvatar(nama: string) {
  let h = 0;
  for (const huruf of nama) h = (h * 31 + huruf.charCodeAt(0)) >>> 0;
  return WARNA_AVATAR[h % WARNA_AVATAR.length];
}
const inisial = (nama: string) =>
  nama
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((kata) => kata[0].toUpperCase())
    .join('') || '?';

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
  const allTasks = (data['work-items'] || []).map((row) => ({
    ...schemas['work-items'].parse(row.data),
    id: row.id,
  }));
  const tasks = allTasks.filter((task) => !projectId || task.workstream_id === projectId);
  const open = tasks.filter((t) => !['selesai', 'dibatalkan'].includes(t.status));

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

  // Fokus hari ini: tenggat terlewat dan jatuh tempo hari ini; bila kosong, tenggat terdekat.
  const urutTenggat = (a: { due_date: string }, b: { due_date: string }) => a.due_date.localeCompare(b.due_date);
  const fokusTerlambat = open.filter((t) => isOverdue(t, now)).sort(urutTenggat);
  const fokusHariIni = open.filter((t) => t.due_date === now);
  const fokusBerikut =
    fokusTerlambat.length || fokusHariIni.length
      ? []
      : open.filter((t) => t.due_date > now).sort(urutTenggat).slice(0, 5);
  const namaProyek = (id: string) => String(projects.find((p) => p.id === id)?.data.title || '');
  const overdueCount = fokusTerlambat.length;
  const dueTodayCount = fokusHariIni.length;
  const perhatian = getFollowUps(data, now);
  const kas = useKasDuaBulan(now);
  const kasMasuk = kas.status === 'siap' ? ringkasKas(kas.rows, now, 'masuk') : null;
  const namaManajer = String(data.organization?.[0]?.data.manager || '').split(' ')[0];
  const jam = Number(jamSekarang.slice(0, 2));
  const sapaan = !jamSekarang ? 'Halo' : jam < 11 ? 'Selamat pagi' : jam < 15 ? 'Selamat siang' : jam < 18 ? 'Selamat sore' : 'Selamat malam';
  const rataProgres = visibleProjects.length
    ? Math.round(
        visibleProjects.reduce((n, p) => n + scopeProgress(tasks.filter((t) => t.workstream_id === p.id)), 0) /
          visibleProjects.length,
      )
    : 0;
  const tanggalPanjang = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(now + 'T12:00:00Z'));

  // Status tugas untuk donat; Dibatalkan hanya tampil bila ada.
  const jumlahStatus = (status: string) => tasks.filter((t) => t.status === status).length;
  const statusTugas = [
    { label: 'Rencana', nilai: jumlahStatus('rencana'), warna: 'var(--grafik-biru)' },
    { label: 'Dikerjakan', nilai: jumlahStatus('proses'), warna: 'var(--grafik-oranye)' },
    { label: 'Selesai', nilai: jumlahStatus('selesai'), warna: 'var(--grafik-teal)' },
    { label: 'Dibatalkan', nilai: jumlahStatus('dibatalkan'), warna: 'var(--ink-subtle)' },
  ].filter((b) => b.label !== 'Dibatalkan' || b.nilai > 0);

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

  const barisFokus = (task: (typeof open)[number], jenis: 'telat' | 'hari-ini' | 'nanti') => (
    <li key={task.id}>
      <Link href={`/tugas?task=${encodeURIComponent(task.id)}`}>
        <span className={`avatar-warna is-${warnaAvatar(task.assignee || '?')}`} aria-hidden="true">
          {inisial(task.assignee || '?')}
        </span>
        <span className="beranda-baris-teks">
          <strong>{task.title}</strong>
          <small>
            {[task.assignee || 'Belum ditugaskan', namaProyek(task.workstream_id)].filter(Boolean).join(' · ')}
            {task.subtasks.length > 0 &&
              ` · ${task.subtasks.filter((st) => st.done).length}/${task.subtasks.length} subtugas`}
          </small>
        </span>
        <span className={`beranda-tanggal is-${jenis}`}>{jenis === 'hari-ini' ? 'Hari ini' : formatDate(task.due_date)}</span>
      </Link>
    </li>
  );

  return (
    <div className="manager-home beranda">
      <header className="beranda-kepala">
        <div>
          <p className="beranda-sapaan">
            {sapaan}
            {namaManajer ? `, ${namaManajer}` : ''}
          </p>
          <h1>{tanggalPanjang}</h1>
          <p className="beranda-ringkas">
            <Link href="/tugas?status=terlambat" className={overdueCount ? 'is-telat' : undefined}>
              {overdueCount} terlambat
            </Link>
            {' · '}
            <Link href="/hari-ini">{dueTodayCount} jatuh tempo hari ini</Link>
            {rapatBerikutnya && (
              <>
                {' · '}
                <Link href={recordHref('meetings', rapatBerikutnya)}>
                  rapat {String(rapatBerikutnya.data.time || 'hari ini')}
                </Link>
              </>
            )}
            {perhatian.length > 0 && (
              <>
                {' · '}
                <Link href="/tindak-lanjut" className="is-perhatian">
                  {perhatian.length} perlu perhatian
                </Link>
              </>
            )}
          </p>
        </div>
        <label className="beranda-proyek">
          <span className="sr-only">Proyek</span>
          <Select
            value={projectId}
            onChange={setProjectId}
            options={[
              { value: '', label: 'Semua proyek' },
              ...projects.map((project) => ({ value: project.id, label: String(project.data.title) })),
            ]}
            ariaLabel="Proyek"
          />
        </label>
      </header>

      <div className="beranda-angka" aria-label="Ringkasan angka">
        <Link href="/tugas" className="modul kartu-angka">
          <span className="ubin ubin-biru" aria-hidden="true">
            <ListChecks size={22} />
          </span>
          <span className="kartu-angka-isi">
            <small>Tugas aktif</small>
            <strong>{open.length}</strong>
            <span>
              {overdueCount > 0 && <b className="is-telat">{overdueCount} terlambat</b>}
              {overdueCount > 0 && ' · '}
              {dueTodayCount} hari ini
            </span>
          </span>
        </Link>
        <Link href="/proyek" className="modul kartu-angka">
          <span className="ubin ubin-ungu" aria-hidden="true">
            <FolderOpen size={22} />
          </span>
          <span className="kartu-angka-isi">
            <small>Proyek berjalan</small>
            <strong>{visibleProjects.length}</strong>
            <span>rata-rata progres {rataProgres}%</span>
          </span>
        </Link>
        <Link href="/keuangan" className="modul kartu-angka">
          <span className="ubin ubin-oranye" aria-hidden="true">
            <Wallet size={22} />
          </span>
          <span className="kartu-angka-isi">
            <small>Uang masuk</small>
            {kasMasuk ? (
              <>
                <strong>{rupiah(kasMasuk.total)}</strong>
                <span>
                  {namaBulan(now)}
                  <SelisihKas selisih={kasMasuk.selisih} pembanding={kasMasuk.pembanding} arah="masuk" />
                </span>
              </>
            ) : (
              <span>
                {kas.status === 'memuat'
                  ? 'Memuat buku kas…'
                  : kas.status === 'nonaktif'
                    ? 'Buku kas belum aktif'
                    : 'Buku kas belum dapat dimuat'}
              </span>
            )}
          </span>
        </Link>
        <Link href="/rapat" className="modul kartu-angka">
          <span className="ubin ubin-pink" aria-hidden="true">
            <CalendarDays size={22} />
          </span>
          <span className="kartu-angka-isi">
            <small>Agenda hari ini</small>
            <strong>
              {routineCompletedCount}/{routines.length}
            </strong>
            <span>rutinitas · {rapatHariIni.length} rapat</span>
          </span>
        </Link>
      </div>

      <div className="beranda-modul">
        <section className="modul beranda-fokus" aria-label="Fokus hari ini">
          <div className="modul-kepala">
            <span className="ubin ubin-kecil ubin-biru" aria-hidden="true">
              <ListChecks size={17} />
            </span>
            <h2>Fokus hari ini</h2>
            <span className="beranda-jumlah">{open.length} tugas aktif</span>
            <Link href="/tugas" className="modul-tautan">
              Semua tugas
            </Link>
          </div>
          {fokusTerlambat.length > 0 && (
            <>
              <h3 className="beranda-grup is-telat">Terlambat · {fokusTerlambat.length}</h3>
              <ul className="beranda-baris">{fokusTerlambat.slice(0, 5).map((t) => barisFokus(t, 'telat'))}</ul>
            </>
          )}
          {fokusHariIni.length > 0 && (
            <>
              <h3 className="beranda-grup is-hari-ini">Hari ini · {fokusHariIni.length}</h3>
              <ul className="beranda-baris">{fokusHariIni.slice(0, 5).map((t) => barisFokus(t, 'hari-ini'))}</ul>
            </>
          )}
          {fokusBerikut.length > 0 && (
            <>
              <h3 className="beranda-grup">Berikutnya</h3>
              <ul className="beranda-baris">{fokusBerikut.map((t) => barisFokus(t, 'nanti'))}</ul>
            </>
          )}
          {!open.length && (
            <EmptyState
              compact
              ikon="kalender"
              title="Tidak ada tugas aktif"
              description="Tambahkan tugas dan pilih tanggal pengerjaannya."
              action={{ label: 'Tambah tugas', href: '/tugas?baru=1' }}
            />
          )}
        </section>

        <section className="modul beranda-agenda dashboard-routines" aria-label="Agenda hari ini">
          <div className="modul-kepala">
            <span className="ubin ubin-kecil ubin-pink" aria-hidden="true">
              <CalendarDays size={17} />
            </span>
            <h2>Agenda</h2>
            <span className={`beranda-jumlah${semuaRutinSelesai ? ' is-selesai' : ''}`}>
              {routineCompletedCount}/{routines.length} rutinitas
            </span>
            <Link href="/rapat" className="modul-tautan">
              Rapat
            </Link>
          </div>
          <ol className="rutin-rel">
            {agenda.map((butir) => {
              if (butir.rapat) {
                const m = butir.rapat;
                const url = meetingJoinUrl(m);
                return (
                  <li key={'rapat-' + m.id} className={`rutin-butir is-rapat${m === rapatBerikutnya ? ' is-berikutnya' : ''}`}>
                    <Link href={recordHref('meetings', m)}>
                      <span className="rutin-jam">{butir.jam || '—'}</span>
                      <span className="rutin-simpul" aria-hidden="true"><Video size={13} /></span>
                      <span className="rutin-isi">
                        <span className="rutin-judul">{String(m.data.title)}</span>
                        <small className="rutin-ket">Rapat · {String(m.data.mode || 'tatap muka')}</small>
                      </span>
                    </Link>
                    {url && (
                      <a href={url} target="_blank" rel="noreferrer" className="rutin-gabung">
                        <Video size={14} aria-hidden="true" /> Gabung
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
                <li key={item.id} className={`rutin-butir ${keadaan}`}>
                  <label>
                    <span className="rutin-jam">{item.time}</span>
                    <span className="rutin-simpul" aria-hidden="true">
                      <Check size={13} strokeWidth={3} />
                    </span>
                    <input
                      type="checkbox"
                      className="rutin-centang"
                      checked={isChecked}
                      onChange={() => toggleRoutine(item.id)}
                    />
                    <span className="rutin-isi">
                      <span className="rutin-judul">{item.title}</span>
                      {berikutnya && <small className="rutin-label">Berikutnya</small>}
                      {terlewat && <span className="sr-only">Jam sudah lewat</span>}
                    </span>
                  </label>
                </li>
              );
            })}
          </ol>
          {agenda.length === 0 && (
            <EmptyState
              compact
              ikon="jam"
              title="Agenda hari ini kosong"
              description="Tambahkan rutinitas harian atau jadwalkan rapat."
              action={{ label: 'Atur rutinitas', onClick: () => setShowRoutineModal(true) }}
            />
          )}
          <div className="modul-kaki">
            <Button type="button" className="btn-routine-config" onClick={() => setShowRoutineModal(true)} aria-label="Atur rutinitas">
              <SlidersHorizontal size={14} />
              <span>Atur rutinitas</span>
            </Button>
          </div>
        </section>

        <KasBanding keadaan={kas} />
        <ModulUsahaHarian />

        <section className="modul beranda-status" aria-label="Status tugas">
          <div className="modul-kepala">
            <span className="ubin ubin-kecil ubin-biru" aria-hidden="true">
              <PieChart size={17} />
            </span>
            <h2>Status tugas</h2>
          </div>
          <Donat bagian={statusTugas} tengah={String(tasks.length)} keterangan="tugas" />
          <ul className="beranda-legenda-daftar">
            {statusTugas.map((b) => (
              <li key={b.label}>
                <i style={{ background: b.warna }} aria-hidden="true" />
                {b.label}
                <b>{b.nilai}</b>
              </li>
            ))}
          </ul>
        </section>

        <section className="modul beranda-proyek-modul" aria-label="Proyek berjalan">
          <div className="modul-kepala">
            <span className="ubin ubin-kecil ubin-ungu" aria-hidden="true">
              <FolderOpen size={17} />
            </span>
            <h2>Proyek berjalan</h2>
            <Link href="/proyek" className="modul-tautan">
              Semua proyek
            </Link>
          </div>
          {visibleProjects.length ? (
            <ul className="beranda-proyek-daftar">
              {visibleProjects.slice(0, 4).map((p) => {
                const persen = scopeProgress(tasks.filter((t) => t.workstream_id === p.id));
                const ms = milestoneBerikut(p.id);
                return (
                  <li key={p.id}>
                    <Link href={`/proyek?id=${encodeURIComponent(p.id)}`}>
                      <span className="beranda-baris-teks">
                        <strong>{String(p.data.title)}</strong>
                        <small>
                          {ms
                            ? `${String(ms.data.title)} · ${formatDate(String(ms.data.due_date))}`
                            : 'Belum ada milestone berikutnya'}
                        </small>
                      </span>
                      <span className="proyek-batang" role="img" aria-label={`Progres ${persen}%`}>
                        <span style={{ width: `${persen}%` }} />
                      </span>
                      <b>{persen}%</b>
                    </Link>
                  </li>
                );
              })}
            </ul>
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
