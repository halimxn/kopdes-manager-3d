import { addDays } from '@/lib/date';

export type Prioritas = 'rendah' | 'normal' | 'tinggi' | 'mendesak';
export type IsianTugas = {
  title: string;
  assignee?: string;
  workstream_id?: string;
  priority?: Prioritas;
  due_date?: string;
};

const NAMA_HARI = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
const GESER_HARI: Record<string, number> = { 'hari ini': 0, besok: 1, lusa: 2 };

/** Hari bernama berikutnya setelah hari ini: "senin" pada hari Senin berarti Senin depan. */
function hariBernamaBerikutnya(hariIni: string, indeks: number): string {
  const sekarang = new Date(hariIni + 'T12:00:00Z').getUTCDay();
  return addDays(hariIni, (indeks - sekarang + 7) % 7 || 7);
}

/** Tanggal dari "tgl/bln"; bila sudah lewat tahun ini, berarti tahun depan. */
function tanggalDariAngka(hariIni: string, tgl: number, bln: number): string | undefined {
  let tahun = Number(hariIni.slice(0, 4));
  const iso = (t: number) => `${t}-${String(bln).padStart(2, '0')}-${String(tgl).padStart(2, '0')}`;
  const sah = (nilai: string) => {
    const d = new Date(nilai + 'T12:00:00Z');
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === nilai;
  };
  if (!sah(iso(tahun))) return undefined;
  if (iso(tahun) < hariIni) tahun += 1;
  return sah(iso(tahun)) ? iso(tahun) : undefined;
}

/**
 * Membaca kalimat tambah cepat, misalnya "Cek stok gula @Budi #gerai besok !tinggi".
 * @nama menjadi penanggung jawab (dicocokkan ke nama di Tim, kalau tidak ada dipakai apa adanya),
 * #kata menjadi proyek yang judulnya memuat kata itu, !prioritas, dan kata waktu (hari ini, besok,
 * lusa, nama hari, atau tgl/bln). Bagian yang tidak dikenali tetap menjadi judul agar tidak hilang.
 */
export function bacaTambahCepat(
  teks: string,
  konteks: { hariIni: string; staf: string[]; proyek: { id: string; title: string }[] },
): IsianTugas {
  const isian: IsianTugas = { title: '' };
  let sisa = ` ${teks.trim()} `;
  const ambil = (pola: RegExp, olah: (cocok: RegExpMatchArray) => boolean) => {
    const cocok = sisa.match(pola);
    if (cocok && olah(cocok)) sisa = sisa.replace(cocok[0], ' ');
  };
  // Garis bawah menggantikan spasi: "@Pak_Joko" berarti "Pak Joko".
  ambil(/\s@([\p{L}\p{N}_.'-]+)/u, ([, kata]) => {
    const nama = kata.replace(/_/g, ' ');
    const kecil = nama.toLowerCase();
    isian.assignee =
      konteks.staf.find((orang) => orang.toLowerCase().startsWith(kecil)) ??
      nama.replace(/(^|\s)\p{L}/gu, (huruf) => huruf.toUpperCase());
    return true;
  });
  ambil(/\s#([\p{L}\p{N}-]+)/u, ([, kata]) => {
    const cocok = konteks.proyek.find((p) => p.title.toLowerCase().includes(kata.toLowerCase()));
    if (cocok) isian.workstream_id = cocok.id;
    return Boolean(cocok);
  });
  ambil(/\s!(rendah|normal|tinggi|mendesak)(?=\s)/i, ([, p]) => {
    isian.priority = p.toLowerCase() as Prioritas;
    return true;
  });
  ambil(/\s(hari ini|besok|lusa)(?=\s)/i, ([, kata]) => {
    isian.due_date = addDays(konteks.hariIni, GESER_HARI[kata.toLowerCase()]);
    return true;
  });
  if (!isian.due_date)
    ambil(new RegExp(`\\s(${NAMA_HARI.join('|')})(?=\\s)`, 'i'), ([, hari]) => {
      isian.due_date = hariBernamaBerikutnya(konteks.hariIni, NAMA_HARI.indexOf(hari.toLowerCase()));
      return true;
    });
  if (!isian.due_date)
    ambil(/\s(\d{1,2})\/(\d{1,2})(?=\s)/, ([, tgl, bln]) => {
      // Jangan menulis due_date kosong: nilai undefined akan menimpa tanggal bawaan form.
      const tanggal = tanggalDariAngka(konteks.hariIni, Number(tgl), Number(bln));
      if (tanggal) isian.due_date = tanggal;
      return Boolean(tanggal);
    });
  isian.title = sisa.replace(/\s+/g, ' ').trim() || 'Tugas baru';
  return isian;
}

/** Jam "HH:MM" ditambah sejumlah menit, dibatasi 23:59 (rapat tidak melewati tengah malam). */
export function tambahMenit(jam: string, menit: number): string {
  const [h, m] = jam.split(':').map(Number);
  const total = Math.min(23 * 60 + 59, h * 60 + m + Math.max(0, menit));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** Selisih menit dua jam "HH:MM" pada hari yang sama. */
export function selisihMenit(dari: string, ke: string): number {
  const menit = (jam: string) => Number(jam.slice(0, 2)) * 60 + Number(jam.slice(3, 5));
  return menit(ke) - menit(dari);
}

/** Teks hitung mundur yang ringkas: "1 menit lagi", "47 menit lagi", "2 jam 5 menit lagi". */
export function teksSisaWaktu(menit: number): string {
  if (menit <= 0) return 'Mulai sekarang';
  const jam = Math.floor(menit / 60);
  const sisa = menit % 60;
  return `${jam ? `${jam} jam ` : ''}${sisa ? `${sisa} menit ` : ''}lagi`;
}

export type BahanLaporan = {
  tanggal: string;
  koperasi?: string;
  rutin: { judul: string; jam: string; selesai: boolean }[];
  tugas: { judul: string; status: string; tenggat: string; selesaiPada?: string; pic?: string }[];
  rapat?: { judul: string; jam?: string; jenis?: string }[];
  kegiatan?: { judul: string }[];
};

const jamTitik = (jam: string) => jam.replace(':', '.');

/**
 * Menyusun laporan kerja harian berupa teks polos yang siap ditempel ke grup WhatsApp pengurus.
 * Bagian yang datanya tidak dimuat (undefined) dilewati, bukan ditulis "tidak ada".
 */
export function susunLaporanHarian(bahan: BahanLaporan): string {
  const tanggal = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(bahan.tanggal + 'T12:00:00Z'));
  const terbuka = (status: string) => !['selesai', 'dibatalkan'].includes(status);
  const selesaiHariIni = bahan.tugas.filter((t) => t.status === 'selesai' && t.selesaiPada === bahan.tanggal);
  const jatuhTempo = bahan.tugas.filter((t) => terbuka(t.status) && t.tenggat === bahan.tanggal);
  const terlambat = bahan.tugas.filter((t) => terbuka(t.status) && Boolean(t.tenggat) && t.tenggat < bahan.tanggal);
  const pic = (nama?: string) => (nama ? ` (${nama})` : '');
  const baris: string[] = ['Laporan kerja harian', [tanggal, bahan.koperasi].filter(Boolean).join(' · ')];
  const bagian = (judul: string, isi: string[]) => {
    if (isi.length) baris.push('', judul, ...isi);
  };
  if (bahan.rutin.length) {
    const beres = bahan.rutin.filter((r) => r.selesai).length;
    bagian(
      `Rutin harian: ${beres} dari ${bahan.rutin.length} selesai`,
      bahan.rutin.map((r) => `${r.selesai ? '✓' : '○'} ${jamTitik(r.jam)} ${r.judul}`),
    );
  }
  bagian(`Tugas selesai hari ini (${selesaiHariIni.length})`, selesaiHariIni.map((t) => `- ${t.judul}${pic(t.pic)}`));
  bagian(`Jatuh tempo hari ini (${jatuhTempo.length})`, jatuhTempo.map((t) => `- ${t.judul}${pic(t.pic)}`));
  bagian(`Terlambat (${terlambat.length})`, terlambat.map((t) => `- ${t.judul}${pic(t.pic)}, tenggat ${t.tenggat}`));
  if (bahan.rapat)
    bagian('Agenda hari ini', bahan.rapat.map((r) => `- ${r.jam ? jamTitik(r.jam) + ' ' : ''}${r.judul}${r.jenis && r.jenis !== 'Rapat' ? ` (${r.jenis.toLowerCase()})` : ''}`));
  if (bahan.kegiatan) bagian('Kegiatan tercatat', bahan.kegiatan.map((k) => `- ${k.judul}`));
  if (baris.length === 2) baris.push('', 'Belum ada pekerjaan tercatat hari ini.');
  return baris.join('\n');
}
