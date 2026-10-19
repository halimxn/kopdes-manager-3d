import { describe, expect, it } from 'vitest';
import { bacaTambahCepat, selisihMenit, susunLaporanHarian, tambahMenit, teksSisaWaktu } from '@/features/dashboard/beranda-bantu';
import { hariSeminggu } from '@/lib/date';

// 19 Oktober 2026 jatuh pada hari Senin.
const konteks = {
  hariIni: '2026-10-19',
  staf: ['Budi Darma', 'Ayu Rahma'],
  proyek: [
    { id: 'p-gerai', title: 'Gerai sembako' },
    { id: 'p-rat', title: 'Rapat anggota tahunan' },
  ],
};

describe('bacaTambahCepat', () => {
  it('mengenali PIC dari Tim, proyek, prioritas, dan kata waktu; sisanya judul', () => {
    expect(bacaTambahCepat('Cek stok gula @budi #gerai besok !tinggi', konteks)).toEqual({
      title: 'Cek stok gula',
      assignee: 'Budi Darma',
      workstream_id: 'p-gerai',
      priority: 'tinggi',
      due_date: '2026-10-20',
    });
  });

  it('nama di luar Tim tetap dipakai apa adanya, dan #kata yang tidak cocok tidak dibuang', () => {
    const isian = bacaTambahCepat('Telepon pemasok #beras @Pak_Joko', konteks);
    expect(isian.assignee).toBe('Pak Joko');
    expect(isian.workstream_id).toBeUndefined();
    expect(isian.title).toBe('Telepon pemasok #beras');
    expect(bacaTambahCepat('Antar faktur @budi', { ...konteks, staf: [] }).assignee).toBe('Budi');
  });

  it('nama hari berarti hari itu berikutnya; senin pada hari Senin berarti pekan depan', () => {
    expect(bacaTambahCepat('Setor laporan jumat', konteks).due_date).toBe('2026-10-23');
    expect(bacaTambahCepat('Rapat staf senin', konteks).due_date).toBe('2026-10-26');
  });

  it('tgl/bln yang sudah lewat berarti tahun depan; tanggal mustahil diabaikan', () => {
    expect(bacaTambahCepat('Bayar sewa 1/11', konteks).due_date).toBe('2026-11-01');
    expect(bacaTambahCepat('Tutup buku 5/1', konteks).due_date).toBe('2027-01-05');
    const mustahil = bacaTambahCepat('Cek 31/2', konteks);
    expect('due_date' in mustahil).toBe(false);
    expect(mustahil.title).toBe('Cek 31/2');
  });

  it('kalimat kosong tetap menghasilkan judul bawaan', () => {
    expect(bacaTambahCepat('  ', konteks).title).toBe('Tugas baru');
  });
});

describe('waktu agenda', () => {
  it('menambah durasi rapat tanpa melewati tengah malam', () => {
    expect(tambahMenit('09:30', 90)).toBe('11:00');
    expect(tambahMenit('23:30', 120)).toBe('23:59');
  });

  it('menghitung sisa waktu ke rapat berikutnya dalam kalimat ringkas', () => {
    expect(selisihMenit('09:12', '10:00')).toBe(48);
    expect(teksSisaWaktu(48)).toBe('48 menit lagi');
    expect(teksSisaWaktu(125)).toBe('2 jam 5 menit lagi');
    expect(teksSisaWaktu(60)).toBe('1 jam lagi');
    expect(teksSisaWaktu(0)).toBe('Mulai sekarang');
  });
});

describe('susunLaporanHarian', () => {
  it('memuat rutin, tugas selesai, jatuh tempo, terlambat, rapat, dan kegiatan', () => {
    const teks = susunLaporanHarian({
      tanggal: '2026-10-19',
      koperasi: 'KDMP Contoh',
      rutin: [
        { judul: 'Buka gerai', jam: '07:30', selesai: true },
        { judul: 'Setor kas', jam: '15:00', selesai: false },
      ],
      tugas: [
        { judul: 'Pasang rak', status: 'selesai', tenggat: '2026-10-18', selesaiPada: '2026-10-19', pic: 'Ayu' },
        { judul: 'Selesai kemarin', status: 'selesai', tenggat: '2026-10-17', selesaiPada: '2026-10-18' },
        { judul: 'Cek timbangan', status: 'proses', tenggat: '2026-10-19' },
        { judul: 'Kirim undangan', status: 'rencana', tenggat: '2026-10-14', pic: 'Sinta' },
        { judul: 'Dibatalkan', status: 'dibatalkan', tenggat: '2026-10-10' },
      ],
      rapat: [{ judul: 'Rapat pengurus', jam: '10:00' }],
      kegiatan: [{ judul: 'Survei lokasi' }],
    });
    expect(teks).toContain('Senin, 19 Oktober 2026 · KDMP Contoh');
    expect(teks).toContain('Rutin harian: 1 dari 2 selesai');
    expect(teks).toContain('✓ 07.30 Buka gerai');
    expect(teks).toContain('○ 15.00 Setor kas');
    expect(teks).toContain('Tugas selesai hari ini (1)\n- Pasang rak (Ayu)');
    expect(teks).toContain('Jatuh tempo hari ini (1)\n- Cek timbangan');
    expect(teks).toContain('Terlambat (1)\n- Kirim undangan (Sinta), tenggat 2026-10-14');
    expect(teks).toContain('- 10.00 Rapat pengurus');
    expect(teks).toContain('- Survei lokasi');
    expect(teks).not.toContain('Selesai kemarin');
    expect(teks).not.toContain('Dibatalkan');
  });

  it('data yang tidak dimuat dilewati, dan hari kosong ditulis jujur', () => {
    const teks = susunLaporanHarian({ tanggal: '2026-10-19', rutin: [], tugas: [] });
    expect(teks).not.toContain('Rapat hari ini');
    expect(teks).toContain('Belum ada pekerjaan tercatat hari ini.');
  });
});

it('hariSeminggu memberi Senin sampai Minggu pekan yang sama', () => {
  expect(hariSeminggu('2026-10-21')).toEqual([
    '2026-10-19',
    '2026-10-20',
    '2026-10-21',
    '2026-10-22',
    '2026-10-23',
    '2026-10-24',
    '2026-10-25',
  ]);
  expect(hariSeminggu('2026-10-25')[0]).toBe('2026-10-19');
});
