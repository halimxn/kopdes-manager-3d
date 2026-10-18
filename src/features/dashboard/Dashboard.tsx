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
  Bell,
  CalendarDays,
  Check,
  Clock,
  ListChecks,
  Video,
  SlidersHorizontal,
  Plus,
  Trash2,
  RotateCcw,
  X,
} from 'lucide-react';
import { getFollowUps, recordHref } from '../workspace/workspace-navigation';
import type { Workspace } from '../workspace/useWorkspace';
import { schemas } from '../records/schemas';
import { isOverdue, scopeProgress } from '@/lib/progress';
import { today, formatDate, daysBetween } from '@/lib/date';
import { meetingJoinUrl } from '../meetings/meeting';
import { Donat } from '@/components/charts/GrafikLembut';
import { ModulUsahaHarian } from './ModulUsahaHarian';
import { KasBanding, useKasDuaBulan } from './KasBanding';
import { Select } from '@/components/ui/Select';
import { KartuPekerjaan } from './KartuPekerjaan';
import { KalenderMini } from './KalenderMini';

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
  const namaManajer = String(data.organization?.[0]?.data.manager || '').split(' ')[0];
  const jam = Number(jamSekarang.slice(0, 2));
  const sapaan = !jamSekarang ? 'Halo' : jam < 11 ? 'Selamat pagi' : jam < 15 ? 'Selamat siang' : jam < 18 ? 'Selamat sore' : 'Selamat malam';

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

  const warnaProyek = (i: number) => WARNA_AVATAR[(i + 1) % WARNA_AVATAR.length];
  const indeksProyek = (id: string) => Math.max(0, projects.findIndex((p) => p.id === id));
  const persenSelesai = tasks.length ? Math.round((jumlahStatus('selesai') / tasks.length) * 100) : 0;
  const fokus = [
    ...fokusTerlambat.map((t) => ({ t, jenis: 'telat' as const })),
    ...fokusHariIni.map((t) => ({ t, jenis: 'hari-ini' as const })),
    ...fokusBerikut.map((t) => ({ t, jenis: 'nanti' as const })),
  ].slice(0, 6);

  // Kalender mini menandai tanggal tenggat tugas aktif dan rapat yang belum dibatalkan.
  const tanggalBerkegiatan = [
    ...open.map((t) => t.due_date).filter(Boolean),
    ...(data.meetings || []).filter((m) => m.data.status !== 'dibatalkan').map((m) => String(m.data.date || '')),
  ];

  return (
    <div className="manager-home beranda">
      <div className="beranda-utama">
      <header className="modul beranda-kepala">
        <div>
          <p className="beranda-sapaan">
            {sapaan}
            {namaManajer ? `, ${namaManajer}` : ''}
          </p>
          <h2>{tanggalPanjang}</h2>
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

      {/* Baris kartu proyek bersampul warna hub, bergulir mendatar (pola Taskflow) */}
      <section className="beranda-berjalan" aria-label="Pekerjaan berjalan">
        <div className="modul-kepala">
          <h2>Pekerjaan berjalan</h2>
          <Link href="/proyek" className="modul-tautan">
            Semua proyek
          </Link>
        </div>
        {visibleProjects.length ? (
          <div className="beranda-berjalan-baris">
            {visibleProjects.slice(0, 6).map((p) => {
              const tugasProyek = tasks.filter((t) => t.workstream_id === p.id);
              const ms = milestoneBerikut(p.id);
              const sisa = ms ? daysBetween(now, String(ms.data.due_date)) : null;
              const orang = new Set(tugasProyek.map((t) => t.assignee).filter(Boolean)).size;
              return (
                <KartuPekerjaan
                  key={p.id}
                  hub="pekerjaan"
                  href={`/proyek?id=${encodeURIComponent(p.id)}`}
                  judul={String(p.data.title)}
                  keterangan={[
                    String(p.data.status) === 'aktif' ? 'Aktif' : 'Rencana',
                    `${tugasProyek.length} tugas`,
                    orang ? `${orang} penanggung jawab` : '',
                  ].filter(Boolean).join(' · ')}
                  progres={scopeProgress(tugasProyek)}
                  tenggat={sisa === null ? 'Belum ada milestone' : sisa < 0 ? `Milestone lewat ${-sisa} hari` : sisa === 0 ? 'Milestone hari ini' : `Milestone ${sisa} hari lagi`}
                  terlambat={sisa !== null && sisa < 0}
                />
              );
            })}
          </div>
        ) : (
          <div className="modul kartu-proyek-kosong">
            <EmptyState
              compact
              ikon="folder"
              title="Belum ada proyek"
              description={projectId ? 'Tidak ada proyek aktif pada pilihan ini.' : 'Buat proyek atau periksa proyek yang diarsipkan.'}
              action={{ label: 'Kelola proyek', href: '/proyek' }}
            />
          </div>
        )}
      </section>

      <div className="beranda-modul">
        <section className="modul beranda-status" aria-label="Progres keseluruhan">
          <div className="modul-kepala">
            <h2>Progres keseluruhan</h2>
            <Link href="/tugas" className="modul-tautan">
              Semua
            </Link>
          </div>
          <div className="beranda-status-isi">
            <ul className="beranda-legenda-daftar">
              {statusTugas.map((b) => (
                <li key={b.label}>
                  <i style={{ background: b.warna }} aria-hidden="true" />
                  <b>{b.nilai}</b>
                  {b.label.toLowerCase()}
                </li>
              ))}
              <li>
                <i className="is-proyek" aria-hidden="true" />
                <b>{visibleProjects.length}</b>proyek berjalan
              </li>
            </ul>
            <Donat bagian={statusTugas} tengah={`${persenSelesai}%`} keterangan="selesai" />
          </div>
        </section>

        <KasBanding keadaan={kas} />

        <section id="perhatian" className="modul beranda-perhatian" aria-label="Perlu perhatian">
          <div className="modul-kepala">
            <span className="ubin ubin-kecil ubin-oranye" aria-hidden="true">
              <Bell size={17} />
            </span>
            <h2>Perlu perhatian</h2>
            <span className="beranda-jumlah">{perhatian.length}</span>
          </div>
          {perhatian.length ? (
            <ul className="beranda-baris">
              {perhatian.slice(0, 5).map((item) => (
                <li key={item.id}>
                  <Link href={item.href}>
                    <span className={`avatar-warna is-${item.urgent ? 'pink' : 'oranye'}`} aria-hidden="true">
                      {item.kind.slice(0, 1)}
                    </span>
                    <span className="beranda-baris-teks">
                      <strong>{item.title}</strong>
                      <small>
                        {item.kind} · {item.reason}
                      </small>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="beranda-kosong">Tidak ada pengingat pada catatan yang dimuat.</p>
          )}
        </section>
        <ModulUsahaHarian />

        <section className="modul beranda-fokus" aria-label="Fokus hari ini">
          <div className="modul-kepala">
            <span className="ubin ubin-kecil ubin-biru" aria-hidden="true">
              <ListChecks size={17} />
            </span>
            <h2>Fokus hari ini</h2>
            <span className="beranda-jumlah">{open.length} aktif</span>
            <Link href="/tugas" className="modul-tautan">
              Semua tugas
            </Link>
          </div>
          {fokus.length ? (
            <ul className="fokus-daftar">
              {fokus.map(({ t, jenis }) => (
                <li key={t.id}>
                  <Link href={`/tugas?task=${encodeURIComponent(t.id)}`}>
                    <span className={`ubin ubin-kecil ubin-${t.workstream_id ? warnaProyek(indeksProyek(t.workstream_id)) : 'biru'}`} aria-hidden="true">
                      <ListChecks size={16} />
                    </span>
                    <span className="beranda-baris-teks">
                      <strong>{t.title}</strong>
                      <small>
                        {[namaProyek(t.workstream_id), t.subtasks.length ? `${t.subtasks.filter((st) => st.done).length}/${t.subtasks.length} subtugas` : '']
                          .filter(Boolean)
                          .join(' · ') || 'Tanpa proyek'}
                      </small>
                    </span>
                    <span className={`beranda-tanggal is-${jenis}`}>{jenis === 'hari-ini' ? 'Hari ini' : formatDate(t.due_date)}</span>
                    <span className={`avatar-warna is-${warnaAvatar(t.assignee || '?')}`} title={t.assignee || 'Belum ditugaskan'}>
                      {inisial(t.assignee || '?')}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              compact
              ikon="kalender"
              title="Tidak ada tugas aktif"
              description="Tambahkan tugas dan pilih tanggal pengerjaannya."
              action={{ label: 'Tambah tugas', href: '/tugas?baru=1' }}
            />
          )}
        </section>
      </div>
      </div>

      {/* Panel kanan (pola Taskflow): kalender bulan ini dan agenda hari ini */}
      <aside className="panel-kanan" aria-label="Kalender dan agenda">
        <section className="modul beranda-kalender" aria-label="Kalender">
          <KalenderMini tanggal={now} tandai={tanggalBerkegiatan} />
        </section>
        <section className="modul beranda-agenda dashboard-routines" aria-label="Agenda hari ini">
          <div className="modul-kepala">
            <span className="ubin ubin-kecil ubin-pink" aria-hidden="true">
              <CalendarDays size={17} />
            </span>
            <h2>Agenda</h2>
            <span className={`beranda-jumlah${semuaRutinSelesai ? ' is-selesai' : ''}`}>
              {routineCompletedCount}/{routines.length}
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

      </aside>

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
