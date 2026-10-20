'use client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import Link from 'next/link';
import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import { z } from 'zod';
import { usePreference } from '@/lib/usePreference';
import { Modal } from '@/components/ui/Modal';
import { Toast } from '@/components/ui/Toast';
import {
  ArrowUpRight,
  CalendarDays,
  CalendarRange,
  CircleAlert,
  Check,
  ClipboardCopy,
  Clock,
  ListChecks,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Trash2,
  Video,
  X,
} from 'lucide-react';
import { getFollowUps, recordHref } from '../workspace/workspace-navigation';
import type { Workspace } from '../workspace/useWorkspace';
import { schemas } from '../records/schemas';
import { isOverdue, scopeProgress } from '@/lib/progress';
import { today, formatDate, daysBetween, hariSeminggu } from '@/lib/date';
import { meetingJoinUrl } from '../meetings/meeting';
import { INFO_JENIS, catatHasilHref, jenisDari } from '../meetings/jenis';
import { ModulUsahaHarian } from './ModulUsahaHarian';
import { KasBanding, useKasDuaBulan } from './KasBanding';
import { Select } from '@/components/ui/Select';
import { KartuPekerjaan } from './KartuPekerjaan';
import { inisialOrang, warnaOrang } from '@/lib/orang';
import { bacaTambahCepat, selisihMenit, susunLaporanHarian, tambahMenit, teksSisaWaktu } from './beranda-bantu';

const jamTitik = (jam: string) => jam.replace(':', '.');
const hariPendek = new Intl.DateTimeFormat('id-ID', { weekday: 'short', timeZone: 'UTC' });
const hariPanjang = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const tanggalUtc = (iso: string) => new Date(iso + 'T12:00:00Z');

// Konfeti perayaan rutin beres: posisi tetap (bukan acak) agar render tetap murni.
const KONFETI = Array.from({ length: 18 }, (_, i) => ({
  x: Math.round(Math.cos((i / 18) * Math.PI * 2) * (70 + (i % 3) * 34)),
  y: -36 - ((i * 23) % 80),
  r: (i * 47) % 360,
  warna: ['var(--brand-isi)', 'var(--grafik-oranye)', 'var(--grafik-teal)', 'var(--grafik-pink)'][i % 4],
}));

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

  // Rutinitas harian manajer gerai; daftar bawaan (standar KDMP) bisa diubah lewat Atur
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
  const [pesan, setPesan] = useState('');
  const [rayakan, setRayakan] = useState(0);
  const [laporanManual, setLaporanManual] = useState('');
  const [tambahTeks, setTambahTeks] = useState('');
  const [hariPilih, setHariPilih] = useState(now);

  useEffect(() => {
    if (!pesan) return;
    const timer = window.setTimeout(() => setPesan(''), 4000);
    return () => window.clearTimeout(timer);
  }, [pesan]);
  useEffect(() => {
    if (!rayakan) return;
    const timer = window.setTimeout(() => setRayakan(0), 1400);
    return () => window.clearTimeout(timer);
  }, [rayakan]);

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
    // Perayaan hanya saat centang terakhir membuat semua rutin beres, bukan saat membuka ulang.
    if (!semuaRutinSelesai && routines.length > 0 && routines.every((r) => next.includes(r.id))) {
      setRayakan((kali) => kali + 1);
      setPesan('Rutin hari ini beres semua.');
    }
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
  // Tugas dan rapat sudah tampil di Perlu tindakan dan Agenda; pengingat lain (dokumen, stok, risiko) menyusul.
  const perhatianLain = getFollowUps(data, now).filter(
    (item) => !item.id.startsWith('work-items:') && !item.id.startsWith('meetings:'),
  );
  const kas = useKasDuaBulan(now);
  const namaManajer = String(data.organization?.[0]?.data.manager || '').split(' ')[0];
  const namaKoperasi = String(data.organization?.[0]?.data.title || '');
  const jam = Number(jamSekarang.slice(0, 2));
  const sapaan = !jamSekarang ? 'Halo' : jam < 11 ? 'Selamat pagi' : jam < 15 ? 'Selamat siang' : jam < 18 ? 'Selamat sore' : 'Selamat malam';

  const tanggalPanjang = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(now + 'T12:00:00Z'));

  // Agenda hari ini memakai jam mulai + durasi untuk menandai lewat/berlangsung/nanti.
  const urutJam = (a: { data: Record<string, unknown> }, b: { data: Record<string, unknown> }) =>
    String(a.data.time || '99').localeCompare(String(b.data.time || '99'));
  // Skema rapat kini tanpa status, tetapi data lama bisa membawanya; rapat yang dibatalkan tidak ditampilkan.
  const rapatAktif = (data.meetings || []).filter((m) => m.data.status !== 'dibatalkan');
  const rapatHariIni = rapatAktif.filter((m) => String(m.data.date) === now).sort(urutJam);
  const keadaanRapat = (m: (typeof rapatHariIni)[number]) => {
    const mulai = String(m.data.time || '');
    if (!mulai || !jamSekarang) return 'nanti';
    if (tambahMenit(mulai, Number(m.data.duration) || 60) <= jamSekarang) return 'lewat';
    return mulai <= jamSekarang ? 'kini' : 'nanti';
  };
  const rapatBerikutnya = rapatHariIni.find((m) => keadaanRapat(m) !== 'lewat');
  // Garis "sekarang" dipasang tepat sebelum rapat pertama yang belum mulai.
  const idRapatSetelahKini = jamSekarang ? rapatHariIni.find((m) => keadaanRapat(m) === 'nanti')?.id : undefined;
  const menitKeRapat =
    rapatBerikutnya && jamSekarang && keadaanRapat(rapatBerikutnya) === 'nanti'
      ? selisihMenit(jamSekarang, String(rapatBerikutnya.data.time))
      : null;

  // Proyek: progres dan milestone terdekat yang belum tercapai.
  const milestoneBerikut = (projectId_: string) =>
    (data.milestones || [])
      .filter((m) => m.data.workstream_id === projectId_ && !m.data.actual_date)
      .sort((a, b) => String(a.data.due_date).localeCompare(String(b.data.due_date)))[0];

  const fokus = [
    ...fokusTerlambat.map((t) => ({ t, jenis: 'telat' as const })),
    ...fokusHariIni.map((t) => ({ t, jenis: 'hari-ini' as const })),
    ...fokusBerikut.map((t) => ({ t, jenis: 'nanti' as const })),
  ].slice(0, 6);

  // Minggu ini: pita Senin–Minggu; hari yang dipilih menampilkan rapat dan tugas terbukanya.
  const minggu = hariSeminggu(now);
  const isiHari = (tanggal: string) => ({
    tugas: open.filter((t) => t.due_date === tanggal),
    rapat: rapatAktif.filter((m) => String(m.data.date) === tanggal).sort(urutJam),
  });
  const pilihan = isiHari(hariPilih);

  function kirimTambahCepat(event: FormEvent) {
    event.preventDefault();
    if (!tambahTeks.trim()) return;
    const isian = bacaTambahCepat(tambahTeks, {
      hariIni: now,
      staf: (data.staff || []).map((s) => String(s.data.title)).filter(Boolean),
      proyek: projects.map((p) => ({ id: p.id, title: String(p.data.title) })),
    });
    // Form tugas yang sama dengan tombol Tambah: manajer memeriksa isian sebelum menyimpan.
    window.dispatchEvent(new CustomEvent('hub-task', { detail: isian }));
    setTambahTeks('');
  }

  async function salinLaporan() {
    const teks = susunLaporanHarian({
      tanggal: now,
      koperasi: namaKoperasi || undefined,
      rutin: routines.map((r) => ({ judul: r.title, jam: r.time, selesai: completedRoutines.includes(r.id) })),
      tugas: allTasks.map((t) => ({
        judul: t.title,
        status: t.status,
        tenggat: t.due_date,
        selesaiPada: t.completed_at || undefined,
        pic: t.assignee || undefined,
      })),
      rapat: data.meetings
        ? rapatHariIni.map((m) => ({ judul: String(m.data.title), jam: String(m.data.time || '') || undefined, jenis: INFO_JENIS[jenisDari(m)].label }))
        : undefined,
      kegiatan: data.journal
        ? data.journal.filter((j) => String(j.data.date) === now).map((j) => ({ judul: String(j.data.title) }))
        : undefined,
    });
    try {
      await navigator.clipboard.writeText(teks);
      setPesan('Laporan hari ini disalin. Tempel di grup WhatsApp pengurus.');
    } catch {
      setLaporanManual(teks);
    }
  }

  const persenRutin = routines.length ? Math.round((routineCompletedCount / routines.length) * 100) : 0;

  return (
    <div className="manager-home beranda">
      <header className="beranda-kepala">
        <div className="beranda-sapa">
          <h2>
            {sapaan}
            {namaManajer ? `, ${namaManajer}` : ''}
          </h2>
          <p className="beranda-ringkas">
            {tanggalPanjang}
            {' · '}
            <Link href="/tugas?status=terlambat" className={overdueCount ? 'is-telat' : undefined}>
              {overdueCount} terlambat
            </Link>
            {' · '}
            <Link href="/hari-ini">{dueTodayCount} jatuh tempo hari ini</Link>
          </p>
        </div>
        <div className="beranda-kepala-aksi">
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
          <Button type="button" className="beranda-salin" onClick={() => void salinLaporan()}>
            <ClipboardCopy size={16} aria-hidden="true" />
            <span>
              Salin laporan<span className="beranda-salin-ekor"> hari ini</span>
            </span>
          </Button>
        </div>
      </header>

      <form className="beranda-tambah" onSubmit={kirimTambahCepat}>
        <label htmlFor="beranda-tambah-isi">Tambah tugas</label>
        <Input
          id="beranda-tambah-isi"
          value={tambahTeks}
          onChange={(e) => setTambahTeks(e.target.value)}
          placeholder="Cek stok gula @Budi #gerai besok !tinggi"
          autoComplete="off"
          aria-describedby="beranda-tambah-petunjuk"
        />
        <Button type="submit" primary>
          <Plus size={16} aria-hidden="true" />
          <span>Buat</span>
        </Button>
        <p id="beranda-tambah-petunjuk">
          <b>@nama</b> penanggung jawab · <b>#proyek</b> · <b>!tinggi</b> atau <b>!mendesak</b> · <b>besok</b>, <b>lusa</b>, nama hari, atau tgl/bln
        </p>
      </form>

      <div className="beranda-grid">
        <section className="modul bertakik beranda-rutin" aria-labelledby="judul-rutin">
          <div className="modul-kepala">
            <span className="ubin ubin-kecil ubin-aksen" aria-hidden="true">
              <ListChecks size={17} />
            </span>
            <h2 id="judul-rutin">Rutin harian</h2>
            <span className={`beranda-jumlah${semuaRutinSelesai ? ' is-selesai' : ''}`}>
              {routineCompletedCount}/{routines.length}
            </span>
          </div>
          <button
            type="button"
            className="takik-aksi"
            onClick={() => setShowRoutineModal(true)}
            aria-label="Atur rutinitas"
            title="Atur rutinitas"
          >
            <SlidersHorizontal size={18} aria-hidden="true" />
          </button>
          <div
            className="rutin-progres"
            role="progressbar"
            aria-label="Rutin selesai"
            aria-valuemin={0}
            aria-valuemax={routines.length}
            aria-valuenow={routineCompletedCount}
          >
            <i style={{ '--isi': `${persenRutin}%` } as CSSProperties} />
          </div>
          {routines.length ? (
            <ol className="rutin-daftar">
              {routines.map((item) => {
                const isChecked = completedRoutines.includes(item.id);
                const berikutnya = item.id === routineBerikutnya;
                const terlewat = !isChecked && Boolean(jamSekarang) && item.time < jamSekarang;
                const keadaan = isChecked ? 'is-selesai' : berikutnya ? 'is-berikutnya' : terlewat ? 'is-terlewat' : '';
                return (
                  <li key={item.id} className={`rutin-butir ${keadaan}`}>
                    <label>
                      <input
                        type="checkbox"
                        className="rutin-centang"
                        checked={isChecked}
                        onChange={() => toggleRoutine(item.id)}
                      />
                      <span className="rutin-simpul" aria-hidden="true">
                        <Check size={14} strokeWidth={3} />
                      </span>
                      <span className="rutin-jam">{jamTitik(item.time)}</span>
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
          ) : (
            <div className="rutin-kosong">
              <p>Belum ada rutinitas. Mulai dari daftar standar KDMP, lalu ubah sesuai kebutuhan.</p>
              <Button type="button" onClick={handleResetRoutines}>
                Pakai rutinitas standar
              </Button>
            </div>
          )}
          {rayakan > 0 && (
            <div key={rayakan} className="konfeti" aria-hidden="true">
              {KONFETI.map((k, i) => (
                <i
                  key={i}
                  style={{ '--x': `${k.x}px`, '--y': `${k.y}px`, '--r': `${k.r}deg`, background: k.warna } as CSSProperties}
                />
              ))}
            </div>
          )}
        </section>

        <section className="modul bertakik beranda-agenda" aria-labelledby="judul-agenda">
          <div className="modul-kepala">
            <span className="ubin ubin-kecil ubin-pink" aria-hidden="true">
              <Clock size={17} />
            </span>
            <h2 id="judul-agenda">Agenda hari ini</h2>
            <span className="beranda-jumlah">{rapatHariIni.length} agenda</span>
          </div>
          <Link
            href={`/rapat?${new URLSearchParams({ baru: '1', 'isi.date': now })}`}
            className="takik-aksi"
            aria-label="Jadwalkan agenda"
            title="Jadwalkan agenda"
          >
            <Plus size={18} aria-hidden="true" />
          </Link>
          {rapatBerikutnya && menitKeRapat !== null && (
            <p className="agenda-hitung">
              <span className="agenda-denyut" aria-hidden="true" />
              <span className="agenda-hitung-judul">
                Berikutnya <strong>{String(rapatBerikutnya.data.title)}</strong>
              </span>
              <span className="agenda-sisa">{teksSisaWaktu(menitKeRapat)}</span>
            </p>
          )}
          {rapatHariIni.length ? (
            <ol className="agenda-linimasa">
              {rapatHariIni.map((m) => {
                const keadaan = keadaanRapat(m);
                const mulai = String(m.data.time || '');
                const selesai = mulai ? tambahMenit(mulai, Number(m.data.duration) || 60) : '';
                const url = meetingJoinUrl(m);
                const tandaiKini = m.id === idRapatSetelahKini;
                const jenis = jenisDari(m);
                const { label: labelJenis, Ikon: IkonJenis } = INFO_JENIS[jenis];
                return (
                  <li
                    key={m.id}
                    className={`agenda-butir is-${keadaan}`}
                    data-jenis={jenis}
                    data-kini={tandaiKini ? `${jamTitik(jamSekarang)} sekarang` : undefined}
                  >
                    <span className="agenda-jam">
                      <b>{mulai ? jamTitik(mulai) : '—'}</b>
                      {selesai && <small>{jamTitik(selesai)}</small>}
                    </span>
                    <div className="agenda-isi">
                      <span className="cip-jenis">
                        <IkonJenis size={12} aria-hidden="true" /> {labelJenis}
                      </span>
                      <Link href={recordHref('meetings', m)} className="agenda-judul">
                        {String(m.data.title)}
                      </Link>
                      <small className="agenda-tempat">
                        {String(m.data.mode || 'tatap muka') === 'online'
                          ? 'Rapat online'
                          : String(m.data.location || 'Tatap muka')}
                        {keadaan === 'kini' ? ' · sedang berlangsung' : keadaan === 'lewat' ? ' · selesai' : ''}
                      </small>
                      {((url && keadaan !== 'lewat') || keadaan === 'lewat') && (
                        <span className="agenda-aksi">
                          {url && keadaan !== 'lewat' && (
                            <a href={url} target="_blank" rel="noreferrer" className="agenda-tombol is-utama">
                              <Video size={14} aria-hidden="true" /> Gabung
                            </a>
                          )}
                          {keadaan === 'lewat' && (
                            <Link href={catatHasilHref(m, now)} className="agenda-tombol">
                              Catat hasil
                            </Link>
                          )}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <EmptyState
              compact
              ikon="kalender"
              title="Tidak ada agenda hari ini"
              description="Rapat, kunjungan, acara, atau rapat online yang dijadwalkan untuk hari ini akan tampil di sini."
            />
          )}
        </section>

        <section id="perhatian" className="modul bertakik beranda-tindakan" aria-labelledby="judul-tindakan">
          <div className="modul-kepala">
            <span className="ubin ubin-kecil ubin-oranye" aria-hidden="true">
              <CircleAlert size={17} />
            </span>
            <h2 id="judul-tindakan">Perlu tindakan</h2>
            <span className="beranda-jumlah">{fokusTerlambat.length + fokusHariIni.length + perhatianLain.length}</span>
          </div>
          <Link href="/tugas" className="takik-aksi" aria-label="Buka semua tugas" title="Buka semua tugas">
            <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
          {fokus.length || perhatianLain.length ? (
            <ul className="beranda-baris">
              {fokus.map(({ t, jenis }) => (
                <li key={t.id}>
                  <Link href={`/tugas?task=${encodeURIComponent(t.id)}`}>
                    <span className={`beranda-tanggal is-${jenis}`}>
                      {jenis === 'hari-ini' ? 'Hari ini' : jenis === 'telat' ? `Lewat ${daysBetween(t.due_date, now)} hari` : formatDate(t.due_date)}
                    </span>
                    <span className="beranda-baris-teks">
                      <strong>{t.title}</strong>
                      <small>
                        {[namaProyek(t.workstream_id), t.subtasks.length ? `${t.subtasks.filter((st) => st.done).length}/${t.subtasks.length} subtugas` : '']
                          .filter(Boolean)
                          .join(' · ') || 'Tanpa proyek'}
                      </small>
                    </span>
                    <span className={`avatar-warna is-${warnaOrang(t.assignee || '?')}`} title={t.assignee || 'Belum ditugaskan'}>
                      {inisialOrang(t.assignee || '?')}
                    </span>
                  </Link>
                </li>
              ))}
              {perhatianLain.slice(0, 4).map((item) => (
                <li key={item.id}>
                  <Link href={item.href}>
                    {/* Kata pertama jenis catatan ("Dokumen", "Barang") agar lebar cip seragam dan judul sejajar */}
                    <span className={`beranda-tanggal is-${item.urgent ? 'telat' : 'nanti'}`} title={item.kind}>
                      {item.kind.split(' ')[0]}
                    </span>
                    <span className="beranda-baris-teks">
                      <strong>{item.title}</strong>
                      <small>{item.reason}</small>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              compact
              ikon="kalender"
              title="Tidak ada yang mendesak"
              description="Tugas terlambat, tenggat hari ini, dan pengingat dokumen atau stok akan tampil di sini."
            />
          )}
        </section>

        <section className="modul bertakik beranda-minggu" aria-labelledby="judul-minggu">
          <div className="modul-kepala">
            <span className="ubin ubin-kecil ubin-teal" aria-hidden="true">
              <CalendarRange size={17} />
            </span>
            <h2 id="judul-minggu">Minggu ini</h2>
          </div>
          <Link href="/tugas?view=kalender" className="takik-aksi" aria-label="Buka kalender tugas" title="Buka kalender tugas">
            <CalendarDays size={18} aria-hidden="true" />
          </Link>
          <p className="pita-ringkas">
            {hariPilih === now ? 'Hari ini' : hariPanjang.format(tanggalUtc(hariPilih))}: {pilihan.tugas.length} tugas · {pilihan.rapat.length} agenda
          </p>
          <div className="pita-minggu" role="group" aria-label="Pilih hari">
            {minggu.map((tanggal) => {
              const isi = isiHari(tanggal);
              return (
                <button
                  key={tanggal}
                  type="button"
                  className="pita-hari"
                  aria-pressed={tanggal === hariPilih}
                  data-hari-ini={tanggal === now ? 'true' : undefined}
                  aria-label={`${hariPanjang.format(tanggalUtc(tanggal))}: ${isi.tugas.length} tugas, ${isi.rapat.length} agenda`}
                  onClick={() => setHariPilih(tanggal)}
                >
                  <small>{hariPendek.format(tanggalUtc(tanggal))}</small>
                  <b>{Number(tanggal.slice(8))}</b>
                  <span className="pita-titik" aria-hidden="true">
                    {isi.rapat.length > 0 && <i className="is-rapat" />}
                    {isi.tugas.length > 0 && <i className="is-tugas" />}
                  </span>
                </button>
              );
            })}
          </div>
          {pilihan.tugas.length || pilihan.rapat.length ? (
            <ul className="beranda-baris">
              {pilihan.rapat.slice(0, 3).map((m) => (
                <li key={m.id}>
                  <Link href={recordHref('meetings', m)}>
                    <span className="beranda-tanggal is-rapat" data-jenis={jenisDari(m)}>
                      <Clock size={13} aria-hidden="true" /> {m.data.time ? jamTitik(String(m.data.time)) : 'Agenda'}
                    </span>
                    <span className="beranda-baris-teks">
                      <strong>{String(m.data.title)}</strong>
                      <small>{INFO_JENIS[jenisDari(m)].label}</small>
                    </span>
                  </Link>
                </li>
              ))}
              {pilihan.tugas.slice(0, 4).map((t) => (
                <li key={t.id}>
                  <Link href={`/tugas?task=${encodeURIComponent(t.id)}`}>
                    <span className={`beranda-tanggal is-${isOverdue(t, now) ? 'telat' : 'nanti'}`}>Tugas</span>
                    <span className="beranda-baris-teks">
                      <strong>{t.title}</strong>
                      <small>{namaProyek(t.workstream_id) || 'Tanpa proyek'}</small>
                    </span>
                    <span className={`avatar-warna is-${warnaOrang(t.assignee || '?')}`} title={t.assignee || 'Belum ditugaskan'}>
                      {inisialOrang(t.assignee || '?')}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="beranda-kosong">Tidak ada tugas terbuka atau agenda pada hari ini.</p>
          )}
        </section>
      </div>

      {/* Baris kartu proyek bersampul pastel, bergulir mendatar */}
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

      <div className="beranda-usaha">
        <KasBanding keadaan={kas} />
        <ModulUsahaHarian />
      </div>

      {pesan && <Toast message={pesan} />}

      {laporanManual && (
        <Modal className="laporan-salin-dialog" aria-labelledby="laporan-salin-judul" onDismiss={() => setLaporanManual('')}>
          <h2 id="laporan-salin-judul">Salin laporan hari ini</h2>
          <p className="laporan-salin-ket">Peramban menolak menyalin otomatis. Pilih semua teks di bawah lalu salin.</p>
          <label className="sr-only" htmlFor="laporan-salin-isi">
            Isi laporan
          </label>
          <textarea id="laporan-salin-isi" readOnly rows={14} value={laporanManual} onFocus={(e) => e.currentTarget.select()} />
          <div className="form-actions">
            <Button type="button" onClick={() => setLaporanManual('')}>
              Tutup
            </Button>
          </div>
        </Modal>
      )}

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
                  <h2 id="routine-config-title">Atur rutinitas harian</h2>
                  <p className="routine-config-ket">Checklist operasional harian gerai</p>
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
                    placeholder="Cek suhu showcase"
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
                    <span className="routine-time-badge">{jamTitik(item.time)}</span>
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
                <span>Kembalikan bawaan</span>
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
