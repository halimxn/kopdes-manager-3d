import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { ShortcutList } from '@/components/layout/shortcuts';

const STEPS = [
  {
    title: 'Lengkapi profil koperasi',
    text: 'Nama koperasi dan nama manajer dipakai di Beranda, laporan, dan pilihan penanggung jawab.',
    href: '/settings',
    tone: 'sky',
  },
  {
    title: 'Buat proyek',
    text: 'Kelompokkan tugas per proyek, misalnya pembukaan gerai atau rapat anggota.',
    href: '/projects',
    tone: 'lavender',
  },
  {
    title: 'Kerjakan dari Beranda',
    text: 'Centang rutin, lihat tenggat dekat, dan tambah tugas cepat setiap pagi.',
    href: '/home',
    tone: 'mint',
  },
  {
    title: 'Susun laporan',
    text: 'Laporan mingguan atau bulanan dihitung dari tugas, keputusan, risiko, dan kas.',
    href: '/notes?tab=reports',
    tone: 'peach',
  },
];

const RULES = [
  [
    'Buku kas',
    'Hanya uang masuk dan keluar yang tercatat. Selisih kas bukan saldo bank atau laba.',
  ],
  [
    'Stok opname',
    'Menyimpan opname tidak mengoreksi stok buku. Koreksi dicatat sebagai mutasi stok.',
  ],
  ['Barang', 'Mencatat barang tidak membuat transaksi kas otomatis.'],
  ['Proyek selesai', 'Menutup proyek tidak mengubah status tugasnya.'],
  ['Hapus tugas', 'Tugas yang dihapus menjadi "dibatalkan" dan tetap bisa dibuka lagi dari arsip.'],
  [
    'Data contoh',
    'Data berawalan id c0de0000 hanya contoh dan bisa dihapus dengan SQL hapus data contoh.',
  ],
];

export function HelpPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Bantuan" subtitle="Panduan singkat memakai ruang kerja." />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STEPS.map((step, index) => (
          <Link
            key={step.title}
            href={step.href}
            data-tone={step.tone}
            className="relative flex flex-col gap-2 rounded-[var(--radius-card)] bg-tone p-5 text-tone-ink ring-1 ring-tone-line ring-inset transition duration-300 hover:-translate-y-0.5 hover:shadow-card"
          >
            <span className="relative grid size-9 place-items-center rounded-full bg-surface/80 font-extrabold">
              {index + 1}
            </span>
            <span className="relative text-lg font-extrabold text-ink">{step.title}</span>
            <span className="relative text-sm">{step.text}</span>
          </Link>
        ))}
      </section>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="rounded-[var(--radius-card)] bg-surface p-5 shadow-card">
          <h2 className="mb-3 text-lg font-extrabold">Aturan penting</h2>
          <dl className="flex flex-col gap-3">
            {RULES.map(([title, text]) => (
              <div key={title}>
                <dt className="font-bold">{title}</dt>
                <dd className="text-sm text-ink-2">{text}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="rounded-[var(--radius-card)] bg-surface p-5 shadow-card">
          <h2 className="mb-1 text-lg font-extrabold">Pintasan papan ketik</h2>
          <ShortcutList />
        </section>
      </div>
    </div>
  );
}
