import { schemas, type Entity, type Item } from '@/features/records/schemas';
import { addDays } from '@/lib/date';

/**
 * Data contoh koperasi fiktif untuk mode demo dan berkas SEED_DATA_CONTOH.sql.
 * Semua nama, nomor, dan angka dibuat acak dengan bibit tetap sehingga hasilnya selalu sama.
 * Penanda contoh: setiap id diawali `c0de0000`, dipakai berkas HAPUS_DATA_CONTOH.sql.
 */
export const AWALAN_ID_CONTOH = 'c0de0000';

/** PRNG mulberry32: deterministik, cukup untuk memilih nama dan angka. */
function acak(bibit: number) {
  let a = bibit >>> 0;
  const r = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    r,
    int: (min: number, max: number) => min + Math.floor(r() * (max - min + 1)),
    pilih: <T>(daftar: readonly T[]) => daftar[Math.floor(r() * daftar.length)],
  };
}

const ENTITAS: Entity[] = Object.keys(schemas) as Entity[];
/** UUID v4 valid: c0de0000-EEEE-4000-8000-NNNNNNNNNNNN (E = nomor entitas, N = urutan). */
const idContoh = (entity: Entity, n: number) =>
  `${AWALAN_ID_CONTOH}-${String(ENTITAS.indexOf(entity) + 1).padStart(4, '0')}-4000-8000-${String(n).padStart(12, '0')}`;

const DEPAN = [
  'Sari', 'Budi', 'Rina', 'Agus', 'Dewi', 'Joko', 'Siti', 'Wahyu', 'Lestari', 'Eko', 'Ratna', 'Hendra',
  'Yuni', 'Bambang', 'Ika', 'Teguh', 'Fitri', 'Dimas', 'Wulan', 'Arif', 'Nur', 'Slamet', 'Endah', 'Rudi',
  'Tri', 'Ayu', 'Gilang', 'Puji', 'Danang', 'Indah', 'Yoga', 'Murni', 'Heru', 'Novi', 'Bayu', 'Sri',
] as const;
const BELAKANG = [
  'Santoso', 'Wijaya', 'Lestari', 'Pratama', 'Kusuma', 'Hartono', 'Rahayu', 'Saputra', 'Wibowo',
  'Utami', 'Setiawan', 'Purnomo', 'Handayani', 'Nugroho', 'Susanti', 'Prasetyo', 'Maharani', 'Firmansyah',
] as const;
const DUSUN = ['Krajan', 'Sumberejo', 'Ngasem', 'Tegalsari', 'Kedungrejo', 'Margomulyo'] as const;

type Baris = { entity: Entity; data: Record<string, unknown> };
export type ItemContoh = Item & { entity: Entity };

/**
 * Membuat seluruh catatan contoh. `hariIni` = tanggal acuan (YYYY-MM-DD, Asia/Jakarta);
 * semua tanggal relatif terhadapnya agar rapat "hari ini" dan tugas terlambat selalu tampak.
 */
export function dataContoh(hariIni: string): ItemContoh[] {
  const g = acak(20261010);
  const tgl = (n: number) => addDays(hariIni, n);
  const nama = new Set<string>();
  const orang = () => {
    for (;;) {
      const n = `${g.pilih(DEPAN)} ${g.pilih(BELAKANG)}`;
      if (!nama.has(n)) return nama.add(n), n;
    }
  };
  const baris: Baris[] = [];
  const urut = new Map<Entity, number>();
  const tambah = (entity: Entity, data: Record<string, unknown>) => {
    const n = (urut.get(entity) ?? 0) + 1;
    urut.set(entity, n);
    baris.push({ entity, data: { ...data, __id: idContoh(entity, n) } });
    return idContoh(entity, n);
  };

  // ---- Staf (manajer pertama) dan organisasi
  const STAF: [string, string, string, string, string, string][] = [
    // [peran, seksi, tempat, posisi, kepala, rambut]
    ['Manajer koperasi', 'umum', 'kantor', 'pengurus', 'peci', 'pendek'],
    ['Kasir & layanan anggota', 'layanan anggota', 'kantor', 'karyawan', 'hijab', 'belum diisi'],
    ['Admin keuangan', 'administrasi & keuangan', 'kantor', 'karyawan', 'tidak ada', 'panjang'],
    ['Bendahara', 'administrasi & keuangan', 'kantor', 'pengurus', 'hijab', 'belum diisi'],
    ['Kepala gudang', 'gudang & logistik', 'gudang', 'karyawan', 'topi KDMP', 'pendek'],
    ['Staf bongkar muat', 'gudang & logistik', 'gudang', 'karyawan', 'tidak ada', 'ikal'],
    ['Penjaga gerai sembako', 'usaha & gerai', 'gerai', 'karyawan', 'hijab', 'belum diisi'],
    ['Asisten apoteker', 'usaha & gerai', 'gerai', 'karyawan', 'tidak ada', 'panjang'],
    ['Koordinator usaha', 'usaha & gerai', 'kantor', 'karyawan', 'tidak ada', 'pendek'],
    ['Pengawas', 'umum', 'kantor', 'pengawas', 'peci', 'pendek'],
  ];
  const BAJU = ['biru', 'hijau', 'oranye', 'lavender', 'abu'] as const;
  const staf = STAF.map(([role, section, workplace, position, head, hair]) => ({
    nama: orang(),
    role,
    section,
    workplace,
    position,
    head,
    hair,
  }));
  const manajer = staf[0].nama;
  tambah('organization', {
    title: 'KDMP Sukamaju (contoh)',
    village: 'Sukamaju',
    district: 'Ngadirejo',
    regency: 'Temanggung',
    province: 'Jawa Tengah',
    manager: manajer,
    start_date: tgl(-120),
    target_date: tgl(240),
  });

  // ---- Unit gerai: status bercampur agar gembok terlihat
  const UNIT: [string, string, string, string?][] = [
    ['Gerai Sembako Sukamaju', 'sembako', 'aktif'],
    ['Apotek Desa', 'apotek', 'aktif'],
    ['Klinik Desa', 'klinik', 'siap buka'],
    ['Simpan Pinjam', 'simpan pinjam', 'aktif'],
    ['Cold Storage Hasil Tani', 'cold storage', 'aktif'],
    ['Gudang Logistik', 'logistik', 'aktif'],
    ['Gerai Kopi Lereng', 'kuliner', 'persiapan', '1'],
    ['Pengolahan Tembakau', 'olahan', 'rencana', '2'],
    ['Wisata Embung', 'wisata', 'rencana', '3'],
  ];
  const unit = UNIT.map(([title, kind, status, slot]) =>
    tambah('units', {
      title,
      kind,
      status,
      slot: slot ?? 'otomatis',
      location: `Dusun ${g.pilih(DUSUN)}`,
      assignee: '',
      physical: status === 'rencana' ? 'Lahan belum disiapkan' : 'Bangunan tersedia',
      equipment: status === 'aktif' ? 'Lengkap' : 'Sebagian',
    }),
  );
  const unitAktif = (i: number) => unit[i];

  const stafId = staf.map((s, i) =>
    tambah('staff', {
      title: s.nama,
      role: s.role,
      unit_id: i === 6 ? unitAktif(0) : i === 7 ? unitAktif(1) : i === 4 || i === 5 ? unitAktif(5) : '',
      status: 'aktif',
      section: s.section,
      workplace: s.workplace,
      work_hours: i < 4 ? '07:30-15:30' : '07:00-16:00',
      outfit: BAJU[i % BAJU.length],
      position: s.position,
      look_head: s.head,
      look_hair: s.hair,
      look_skin: g.pilih(['terang', 'sawo matang', 'sawo matang', 'gelap'] as const),
      look_glasses: i === 2 || i === 9 ? 'ya' : 'tidak',
    }),
  );
  // Penanggung jawab unit diisi setelah staf ada.
  for (const b of baris) if (b.entity === 'units') b.data.assignee = staf[g.int(6, 8)].nama;

  // ---- Proyek, milestone, sprint
  const PROYEK: [string, string, string, string][] = [
    ['Pembukaan gerai baru', 'GRI', 'aktif', '#2F5BEA'],
    ['Penataan gudang & logistik', 'GDG', 'aktif', '#F59E0B'],
    ['Layanan anggota digital', 'AGT', 'aktif', '#10B981'],
    ['Legalitas & perizinan', 'LGL', 'rencana', '#8B5CF6'],
  ];
  const proyek = PROYEK.map(([title, code, status, color], i) =>
    tambah('workstreams', {
      title,
      code,
      status,
      color,
      priority: i === 0 ? 'tinggi' : 'normal',
      assignee: staf[[8, 4, 1, 3][i]].nama,
      start_date: tgl(-60 + i * 7),
      target_date: tgl(30 + i * 20),
      budget: [15_000_000, 6_000_000, 0, 0][i],
      description: `Proyek contoh: ${title.toLowerCase()}.`,
    }),
  );
  const milestone = proyek.map((p, i) =>
    tambah('milestones', {
      title: ['Gerai kopi siap uji', 'Rak A–F berlabel', '100 anggota terdaftar', 'Izin usaha terbit'][i],
      workstream_id: p,
      due_date: tgl(10 + i * 9),
      actual_date: '',
    }),
  );
  const sprint = tambah('sprints', {
    title: 'Sprint Oktober',
    goal: 'Gerai kopi siap uji dan stok minimum aman',
    duration: '2 minggu',
    start_date: tgl(-5),
    end_date: tgl(9),
    status: 'aktif',
  });

  // ---- Mitra dan interaksi
  const mitra = [
    ['CV Tani Makmur', 'Pemasok pupuk'],
    ['PT Sumber Pangan', 'Pemasok sembako'],
    ['Puskesmas Ngadirejo', 'Mitra kesehatan'],
    ['Bank Desa', 'Mitra keuangan'],
    ['Pemerintah Desa Sukamaju', 'Pemerintah'],
  ].map(([title, category], i) =>
    tambah('stakeholders', {
      title,
      category,
      contact: `08${g.int(11, 59)}-${g.int(1000, 9999)}-${g.int(1000, 9999)}`,
      influence: g.int(2, 5),
      interest: g.int(2, 5),
      last_contact: tgl(-g.int(1, 20)),
      follow_up: i < 2 ? 'Konfirmasi jadwal kirim berikutnya' : '',
    }),
  );
  for (let i = 0; i < 4; i++)
    tambah('interactions', {
      title: ['Negosiasi harga pupuk', 'Kunjungan gudang pemasok', 'Koordinasi layanan klinik', 'Diskusi pembiayaan'][i],
      stakeholder_id: mitra[i],
      date: tgl(-g.int(2, 25)),
      notes: 'Catatan contoh hasil pertemuan.',
    });

  // ---- Rapat (dua hari ini) dan keputusan
  const rapat = [
    tambah('meetings', {
      title: 'Briefing pagi tim',
      date: tgl(0),
      time: '08:00',
      duration: 30,
      participants: staf.slice(0, 6).map((s) => s.nama).join(', '),
      agenda: 'Pembagian tugas harian dan kiriman masuk',
      mode: 'tatap muka',
      location: 'Ruang rapat kantor',
    }),
    tambah('meetings', {
      title: 'Rapat pengurus bulanan',
      date: tgl(0),
      time: '14:00',
      duration: 90,
      participants: [staf[0], staf[3], staf[9]].map((s) => s.nama).join(', '),
      agenda: 'Evaluasi kas bulan lalu dan rencana gerai kopi',
      mode: 'hybrid',
      location: 'Ruang rapat kantor',
    }),
    tambah('meetings', {
      title: 'Koordinasi pemasok sembako',
      date: tgl(2),
      time: '10:00',
      duration: 60,
      participants: `${staf[4].nama}, ${staf[8].nama}`,
      agenda: 'Jadwal kirim dan harga minyak goreng',
      mode: 'online',
      meeting_url: 'https://meet.example.com/kdmp-sukamaju',
    }),
  ];
  for (const [i, title] of [
    'Jam buka gerai sembako 07.00–20.00',
    'Minimum stok minyak goreng 24 botol',
    'Gerai kopi uji coba dua minggu',
    'Simpanan wajib dicatat setiap tanggal 5',
  ].entries())
    tambah('decisions', {
      title,
      meeting_id: i < 2 ? rapat[0] : '',
      date: tgl(-i * 6),
      reason: 'Keputusan contoh hasil rapat.',
    });

  // ---- Dokumen, risiko, isu
  const dokumen = [
    ['Akta pendirian koperasi', 'Akta', 'tersedia', -300, 0],
    ['NIB koperasi', 'Perizinan', 'tersedia', -200, 0],
    ['Izin apotek desa', 'Perizinan', 'tersedia', -150, 20],
    ['Izin klinik desa', 'Perizinan', 'diproses', 0, 0],
    ['SOP gudang', 'SOP', 'belum ada', 0, 0],
  ].map(([title, kind, status, terbit, habis]) =>
    tambah('documents', {
      title,
      kind,
      status,
      number: status === 'tersedia' ? `${g.int(100, 999)}/KDMP/${g.int(1, 12)}/2026` : '',
      issued_date: terbit ? tgl(Number(terbit)) : '',
      expires_date: habis ? tgl(Number(habis)) : '',
    }),
  );
  for (const [title, p, d, status] of [
    ['Stok minyak goreng di bawah minimum', 4, 3, 'terbuka'],
    ['Listrik cold storage padam saat hujan', 2, 5, 'ditangani'],
    ['Piutang anggota simpan pinjam menumpuk', 3, 4, 'terbuka'],
  ] as const)
    tambah('risks', {
      title,
      probability: p,
      impact: d,
      status,
      assignee: staf[g.int(1, 5)].nama,
      mitigation: 'Langkah contoh untuk mengurangi risiko.',
      review_date: tgl(g.int(1, 14)),
    });
  const isu = [
    tambah('issues', {
      title: 'Timbangan gerai sembako tidak akurat',
      assignee: staf[6].nama,
      due_date: tgl(2),
      status: 'terbuka',
      description: 'Selisih 50 gram tiap penimbangan.',
    }),
    tambah('issues', {
      title: 'Freezer C2 berbunyi keras',
      assignee: staf[4].nama,
      due_date: tgl(-1),
      status: 'ditangani',
    }),
  ];

  // ---- Barang (sebagian di bawah minimum) — [judul, rak, stok, minimum, satuan, harga, gerai?]
  const BARANG: [string, string, number, number, string, number, number?][] = [
    ['Beras medium 5 kg', 'A', 64, 30, 'karung', 68000],
    ['Beras premium 5 kg', 'A', 22, 20, 'karung', 78000],
    ['Minyak goreng 1 L', 'A', 9, 24, 'botol', 17500],
    ['Gula pasir 1 kg', 'A', 41, 20, 'pak', 17000],
    ['Tepung terigu 1 kg', 'B', 18, 12, 'pak', 12500],
    ['Telur ayam', 'B', 4, 10, 'tray', 52000],
    ['Mi instan', 'B', 36, 40, 'dus', 115000],
    ['Pupuk NPK 50 kg', 'C', 26, 10, 'sak', 380000],
    ['Pupuk urea 50 kg', 'C', 7, 10, 'sak', 290000],
    ['Bibit jagung hibrida', 'C', 30, 15, 'pak', 95000],
    ['Air mineral 600 ml', 'D', 58, 24, 'dus', 42000],
    ['Galon isi ulang', 'D', 15, 20, 'galon', 6000],
    ['Sabun cuci', 'D', 3, 12, 'pak', 21000],
    ['Kardus kemasan', 'E', 120, 50, 'lembar', 3500],
    ['Karung plastik', 'E', 80, 40, 'lembar', 2500],
    ['Terpal 4×6', 'F', 6, 4, 'lembar', 160000],
    ['Ikan nila beku', 'C1', 34, 20, 'kg', 32000],
    ['Sayur segar', 'C1', 5, 12, 'ikat', 6000],
    ['Daging ayam', 'C2', 21, 15, 'kg', 38000],
    ['Susu segar', 'C3', 8, 10, 'liter', 15000],
    ['Paracetamol 500 mg', 'belum ditentukan', 60, 30, 'strip', 4500, 1],
    ['Vitamin C 50 mg', 'belum ditentukan', 6, 15, 'botol', 18000, 1],
    ['Minyak kayu putih', 'belum ditentukan', 14, 10, 'botol', 23000, 1],
    ['Kopi bubuk robusta', 'belum ditentukan', 12, 8, 'pak', 35000, 0],
    ['Teh celup', 'belum ditentukan', 25, 12, 'kotak', 9000, 0],
  ];
  const barang = BARANG.map(([title, rack, stok, minimum, measurement, price, gerai], i) =>
    tambah('inventory-items', {
      title,
      sku: `BRG-${String(i + 1).padStart(3, '0')}`,
      rack,
      book_quantity: stok,
      minimum_quantity: minimum,
      measurement,
      price,
      unit_id: gerai === undefined ? '' : unitAktif(gerai),
    }),
  );

  // ---- Pengiriman di berbagai tahap
  const kirim = [
    ['Kiriman beras dari PT Sumber Pangan', 'masuk', 'tiba', 'D1', 'Truk boks', '08:30', 1],
    ['Kiriman minyak goreng', 'masuk', 'diperiksa', 'D2', 'Pickup L300', '09:15', 1],
    ['Kiriman pupuk NPK', 'masuk', 'dikirim', 'belum ditentukan', 'Truk engkel', '13:00', 0],
    ['Antar sembako ke gerai', 'keluar', 'dipesan', 'D3', 'Mobil boks koperasi', '15:00', -1],
  ].map(([title, direction, status, dock, vehicle, jam, m]) =>
    tambah('deliveries', {
      title,
      direction,
      status,
      dock,
      vehicle,
      driver_name: orang(),
      license_plate: `AA ${g.int(1000, 9999)} ${g.pilih(['KP', 'TM', 'BN', 'SD'])}`,
      arrival_time: jam,
      planned_date: tgl(0),
      arrived_date: status === 'tiba' || status === 'diperiksa' ? tgl(0) : '',
      stakeholder_id: Number(m) >= 0 ? mitra[Number(m)] : '',
      unit_id: direction === 'keluar' ? unitAktif(0) : '',
      items: g.pilih(['50 karung', '20 dus', '40 sak', '12 koli']),
    }),
  );

  // ---- Mutasi stok (riwayat; stok buku akhir = book_quantity barang)
  for (const [i, b, kind, qty, d] of [
    [0, 0, 'masuk', 30, -6],
    [1, 2, 'keluar', 15, -3],
    [2, 7, 'masuk', 20, -2],
    [3, 5, 'keluar', 6, -1],
  ] as const) {
    const akhir = BARANG[b][2];
    tambah('stock-movements', {
      title: `${kind === 'masuk' ? 'Terima' : 'Keluarkan'} ${BARANG[b][0].toLowerCase()}`,
      item_id: barang[b],
      kind,
      quantity: qty,
      date: tgl(d),
      delivery_id: i === 0 ? kirim[0] : '',
      reference_number: `MTS-${String(i + 1).padStart(4, '0')}`,
      book_before: kind === 'masuk' ? akhir - qty : akhir + qty,
      book_after: akhir,
    });
  }
  for (const b of [2, 5, 12])
    tambah('stock-counts', {
      title: `Opname ${BARANG[b][0].toLowerCase()}`,
      item_id: barang[b],
      date: tgl(-g.int(3, 10)),
      book_quantity: BARANG[b][2],
      counted_quantity: Math.max(0, BARANG[b][2] - g.int(0, 2)),
      assignee: staf[4].nama,
    });

  // ---- Anggota
  const anggota: string[] = [];
  for (let i = 0; i < 40; i++)
    anggota.push(
      tambah('members', {
        title: orang(),
        member_number: `AGT-${String(i + 1).padStart(4, '0')}`,
        date: tgl(-g.int(5, 110)),
        contact: `08${g.int(11, 59)}-${g.int(1000, 9999)}-${g.int(1000, 9999)}`,
        address: `Dusun ${g.pilih(DUSUN)} RT ${g.int(1, 6)}/RW ${g.int(1, 3)}`,
        status: i % 13 === 12 ? 'nonaktif' : 'aktif',
      }),
    );

  // ---- Buku kas satu bulan (hanya uang masuk/keluar tercatat)
  for (let d = -29; d <= 0; d++) {
    if (g.r() < 0.35) continue;
    const masuk = g.r() < 0.6;
    const [title, category, amount] = masuk
      ? g.pilih([
          ['Simpanan wajib anggota', 'Simpanan', 50000],
          ['Simpanan pokok anggota baru', 'Simpanan', 100000],
          ['Penjualan gerai sembako', 'Penjualan', g.int(8, 30) * 50000],
          ['Penjualan apotek desa', 'Penjualan', g.int(4, 16) * 25000],
          ['Sewa cold storage', 'Jasa', 150000],
        ] as const)
      : g.pilih([
          ['Bayar listrik kantor', 'Operasional', 420000],
          ['Beli alat tulis', 'Operasional', 65000],
          ['Belanja stok sembako', 'Pembelian', g.int(10, 40) * 100000],
          ['Upah bongkar muat', 'Upah', 250000],
          ['Perawatan freezer', 'Perawatan', 300000],
        ] as const);
    tambah('cash-entries', {
      title,
      date: tgl(d),
      direction: masuk ? 'masuk' : 'keluar',
      amount,
      category,
      account: g.r() < 0.7 ? 'Kas tunai' : 'Rekening koperasi',
      member_id: category === 'Simpanan' ? g.pilih(anggota) : '',
      // Upah bongkar muat dan perawatan freezer dibebankan ke proyek gudang (contoh realisasi anggaran).
      workstream_id: category === 'Upah' || category === 'Perawatan' ? proyek[1] : '',
      unit_id: category === 'Penjualan' ? unitAktif(title.includes('apotek') ? 1 : 0) : '',
      reference_number: `KAS-${String(30 + d).padStart(3, '0')}`,
    });
  }

  // ---- Tugas (±30): proses, rencana, terlambat, selesai
  const TUGAS: [string, number, string, number, number][] = [
    // [judul, staf, status, tenggat (hari), proyek]
    ['Cek stok minyak goreng di rak A', 4, 'proses', 0, 1],
    ['Susun ulang rak B untuk mi instan', 5, 'proses', 1, 1],
    ['Rekap simpanan wajib bulan ini', 1, 'proses', 2, 2],
    ['Input kas penjualan gerai kemarin', 2, 'proses', 0, 2],
    ['Siapkan etalase gerai kopi', 8, 'proses', 3, 0],
    ['Hitung ulang obat di apotek', 7, 'proses', 1, 0],
    ['Layani pendaftaran anggota baru', 1, 'proses', 0, 2],
    ['Laporan bulanan ke pengawas', 0, 'proses', 4, 3],
    ['Perbarui label rak C1–C3', 4, 'rencana', 5, 1],
    ['Survei harga kopi petani', 8, 'rencana', 6, 0],
    ['Jadwalkan servis freezer C2', 5, 'rencana', 3, 1],
    ['Lengkapi berkas izin klinik', 9, 'rencana', 8, 3],
    ['Pelatihan kasir gerai kopi', 6, 'rencana', 7, 0],
    ['Buat SOP bongkar muat', 4, 'rencana', 10, 3],
    ['Kirim undangan RAT', 3, 'rencana', 12, 2],
    ['Cetak kartu anggota', 1, 'rencana', 4, 2],
    ['Tagih piutang simpan pinjam', 3, 'rencana', -2, 2],
    ['Perbaiki timbangan gerai', 6, 'rencana', -1, 0],
    ['Opname pupuk urea', 5, 'rencana', -3, 1],
    ['Unggah foto bukti kas', 2, 'rencana', -4, 2],
    ['Pasang papan nama gerai kopi', 8, 'selesai', -2, 0],
    ['Terima kiriman beras', 4, 'selesai', -1, 1],
    ['Rapikan arsip dokumen', 3, 'selesai', -5, 3],
    ['Rekap penjualan minggu lalu', 2, 'selesai', -3, 2],
    ['Bersihkan cold storage', 5, 'selesai', -6, 1],
    ['Daftarkan NIB', 0, 'selesai', -20, 3],
    ['Sosialisasi simpan pinjam', 1, 'selesai', -9, 2],
    ['Uji coba mesin kopi', 8, 'dibatalkan', -4, 0],
  ];
  for (const [i, [title, s, status, due, p]] of TUGAS.entries())
    tambah('work-items', {
      title,
      code: `TGS-${String(i + 1).padStart(3, '0')}`,
      status,
      due_date: tgl(due),
      start_date: tgl(Math.min(due, 0) - g.int(1, 4)),
      completed_at: status === 'selesai' ? tgl(due) : '',
      assignee: staf[s].nama,
      workstream_id: proyek[p],
      milestone_id: i % 4 === 0 ? milestone[p] : '',
      sprint_id: status === 'proses' ? sprint : '',
      unit_id: p === 0 && s >= 6 ? unitAktif(s === 7 ? 1 : 0) : '',
      issue_id: i === 17 ? isu[0] : '',
      document_id: i === 13 ? dokumen[4] : '',
      priority: due < 0 && status === 'rencana' ? 'tinggi' : g.pilih(['normal', 'normal', 'rendah', 'tinggi'] as const),
      poac: g.pilih(['planning', 'organizing', 'actuating', 'controlling'] as const),
      subtasks:
        i % 3 === 0
          ? [
              { title: 'Siapkan bahan', done: true },
              { title: 'Kerjakan', done: status === 'selesai' },
              { title: 'Laporkan', done: false },
            ]
          : [],
    });

  // ---- Checklist kesiapan unit
  for (const [i, dim] of (['legalitas', 'fisik', 'sdm', 'sop', 'sistem'] as const).entries())
    for (const u of [2, 6])
      tambah('checklist', {
        title: `${dim[0].toUpperCase()}${dim.slice(1)} ${UNIT[u][0].toLowerCase()}`,
        unit_id: unit[u],
        workstream_id: proyek[0],
        dimension: dim,
        status: u === 2 ? (i < 4 ? 'selesai' : 'proses') : i < 2 ? 'proses' : 'rencana',
      });

  // ---- Pelatihan dan jurnal kegiatan (satu jurnal hari ini terkait tugas → gym)
  for (const [i, s] of [6, 7, 1].entries())
    tambah('trainings', {
      title: ['Pelatihan kasir', 'Penyimpanan obat', 'Layanan anggota'][i],
      staff_id: stafId[s],
      date: tgl(i === 0 ? 0 : i === 2 ? -10 : 5 + i),
      status: i === 2 ? 'selesai' : 'rencana',
    });
  const tugasId = (n: number) => idContoh('work-items', n);
  for (const [title, d, t] of [
    ['Senam pagi bersama tim', 0, 2],
    ['Kerja bakti gudang', -2, 0],
    ['Kunjungan petani kopi', -4, 10],
    ['Penyuluhan simpan pinjam', -9, 27],
    ['Cek suhu cold storage', -1, 0],
  ] as const)
    tambah('journal', {
      title,
      code: `KGT-${String(-d + 1).padStart(3, '0')}`,
      date: tgl(d),
      notes: 'Catatan kegiatan contoh.',
      work_item_id: t ? tugasId(t) : '',
      meeting_id: '',
    });

  // ---- Administrasi usaha (migrasi 10). Ditaruh paling akhir agar urutan acak data lama tetap.
  for (const [n, [title, category, gerai, value, condition, s]] of ([
    ['Freezer sembako 2 pintu', 'elektronik', 0, 6_500_000, 'baik', 6],
    ['Timbangan digital 150 kg', 'peralatan', 5, 1_800_000, 'perlu perbaikan', 4],
    ['Rak besi gudang (set 6)', 'furnitur', 5, 4_200_000, 'baik', 4],
    ['Laptop administrasi', 'elektronik', -1, 7_000_000, 'baik', 2],
    ['Motor roda tiga', 'kendaraan', 5, 28_000_000, 'baik', 5],
    ['Lemari pendingin obat', 'elektronik', 1, 5_400_000, 'rusak', 7],
  ] as const).entries())
    tambah('assets', {
      title,
      code: `AST-${String(n + 1).padStart(3, '0')}`,
      category,
      unit_id: gerai < 0 ? '' : unitAktif(gerai),
      acquired_date: tgl(-g.int(60, 400)),
      value,
      condition,
      assignee: staf[s].nama,
    });
  for (let d = -6; d <= 1; d++)
    for (const [i, id] of stafId.entries()) {
      const status = d > 0 ? 'terjadwal' : g.r() < 0.08 ? g.pilih(['izin', 'sakit'] as const) : g.r() < 0.1 ? 'terlambat' : 'hadir';
      const [masuk, pulang] = i < 4 ? ['07:30', '15:30'] : ['07:00', '16:00'];
      const hadir = status === 'hadir' || status === 'terlambat';
      tambah('attendance', {
        title: staf[i].nama,
        staff_id: id,
        date: tgl(d),
        status,
        shift: `${masuk}-${pulang}`,
        check_in_time: hadir ? (status === 'terlambat' ? masuk.replace(/:\d\d$/, ':45') : masuk) : '',
        // Hari ini belum ada jam pulang.
        check_out_time: hadir && d < 0 ? pulang : '',
      });
    }
  const pembelian = [
    ['Beras dan minyak goreng', 1, -6, 'diterima', 'Beras 20 karung, minyak 10 dus', 9_800_000],
    ['Pupuk NPK musim tanam', 0, -1, 'dipesan', 'NPK 40 karung', 6_400_000],
    ['Gula dan tepung', 1, 0, 'draf', 'Gula 10 karung, tepung 8 karung', 0],
  ] as const;
  const pembelianId = pembelian.map(([title, m, d, status, items, total]) =>
    tambah('purchase-orders', {
      title,
      stakeholder_id: mitra[m],
      date: tgl(d),
      expected_date: status === 'dipesan' ? tgl(2) : '',
      status,
      items,
      total,
      unit_id: unitAktif(0),
      reference_number: `PO-${String(30 + d).padStart(3, '0')}`,
    }),
  );
  // Kiriman masuk pertama berasal dari pembelian yang sudah diterima.
  const kirimanMasuk = baris.find((b) => b.entity === 'deliveries' && b.data.direction === 'masuk');
  if (kirimanMasuk) kirimanMasuk.data.purchase_id = pembelianId[0];
  for (let d = -13; d <= -1; d++)
    for (const gerai of [0, 1])
      tambah('sales', {
        title: `Penjualan ${UNIT[gerai][0]}`,
        unit_id: unitAktif(gerai),
        date: tgl(d),
        amount: (gerai === 0 ? g.int(18, 40) : g.int(6, 18)) * 50_000,
        transactions: gerai === 0 ? g.int(35, 90) : g.int(10, 35),
      });
  for (const [i, id] of anggota.slice(0, 12).entries()) {
    const catatanAnggota = baris.find((b) => b.data.__id === id)?.data;
    const namaAnggota = String(catatanAnggota?.title);
    // Simpanan tidak boleh tercatat sebelum tanggal bergabung.
    const gabung = String(catatanAnggota?.date);
    const hariGabung = Math.round((Date.parse(gabung) - Date.parse(tgl(0))) / 86_400_000);
    const simpan = (kind: string, direction: string, amount: number, d: number) =>
      tambah('savings', {
        title: `Simpanan ${kind} · ${namaAnggota}`,
        member_id: id,
        date: tgl(d),
        kind,
        direction,
        amount,
        reference_number: `SMP-${String((urut.get('savings') ?? 0) + 1).padStart(4, '0')}`,
      });
    simpan('pokok', 'setor', 100_000, hariGabung);
    for (const d of [-60, -30, 0]) if (d >= hariGabung) simpan('wajib', 'setor', 50_000, d);
    if (i % 3 === 0) simpan('sukarela', 'setor', g.int(2, 10) * 50_000, Math.max(hariGabung, -g.int(5, 40)));
    if (i === 3) simpan('sukarela', 'tarik', 50_000, 0);
  }

  // Agenda berjenis selain rapat (ditambah paling akhir agar nomor contoh lain tidak bergeser).
  tambah('meetings', {
    title: 'Kunjungan gudang pemasok beras',
    jenis: 'kunjungan',
    date: tgl(0),
    time: '10:30',
    duration: 60,
    participants: `${staf[0].nama}, ${staf[8].nama}`,
    agenda: 'Cek mutu beras dan jadwal kirim bulan depan',
    mode: 'tatap muka',
    location: 'Gudang pemasok',
  });
  tambah('meetings', {
    title: 'Sosialisasi simpanan anggota',
    jenis: 'acara',
    date: tgl(1),
    time: '16:00',
    duration: 90,
    participants: `${staf[0].nama}, ${staf[1].nama}`,
    agenda: 'Penjelasan simpanan pokok, wajib, dan sukarela',
    mode: 'tatap muka',
    location: 'Balai desa',
  });

  // Validasi dengan skema yang sama dengan server: data contoh tidak boleh lolos tanpa aturan.
  return baris.map(({ entity, data }, i) => {
    const { __id, ...isi } = data;
    const parsed = schemas[entity].parse(isi) as Record<string, unknown>;
    const waktu = new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString();
    return { id: String(__id), entity, created_at: waktu, updated_at: waktu, data: parsed };
  });
}
