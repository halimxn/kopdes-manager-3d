import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { ShortcutList } from '@/components/layout/shortcuts';

const STEPS = [
  {
    title: 'Lengkapi profil koperasi',
    text: 'Nama koperasi dan nama manajer dipakai di Beranda, laporan, dan pilihan penanggung jawab.',
    href: '/settings',
  },
  {
    title: 'Buat proyek',
    text: 'Kelompokkan tugas per proyek, misalnya pembukaan gerai atau rapat anggota.',
    href: '/projects',
  },
  {
    title: 'Kerjakan dari Beranda',
    text: 'Centang rutin, lihat tenggat dekat, dan tambah tugas cepat setiap pagi.',
    href: '/home',
  },
  {
    title: 'Susun laporan',
    text: 'Laporan mingguan atau bulanan dihitung dari tugas, keputusan, risiko, dan kas.',
    href: '/notes?tab=reports',
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
      <section
        aria-label="Langkah memulai"
        className="grid overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-card ring-1 ring-line sm:grid-cols-2 xl:grid-cols-4"
      >
        {STEPS.map((step, index) => (
          <Link
            key={step.title}
            href={step.href}
            className="group flex flex-col gap-1.5 border-line p-5 transition-colors not-first:border-t hover:bg-surface-2 sm:even:border-l sm:[&:nth-child(2)]:border-t-0 xl:border-t-0 xl:not-first:border-l"
          >
            <span className="tabular text-sm text-ink-3">Langkah {index + 1}</span>
            <span className="text-[17px] font-medium text-ink">{step.title}</span>
            <span className="text-[13px] leading-relaxed text-ink-2">{step.text}</span>
          </Link>
        ))}
      </section>
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-[15px] font-medium">Aturan penting</h2>
          <dl className="divide-y divide-line rounded-[var(--radius-card)] bg-surface text-sm shadow-card ring-1 ring-line">
            {RULES.map(([title, text]) => (
              <div key={title} className="flex flex-col gap-0.5 px-4 py-3">
                <dt className="text-ink">{title}</dt>
                <dd className="text-[13px] leading-relaxed text-ink-3">{text}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-[15px] font-medium">Pintasan papan ketik</h2>
          <div className="rounded-[var(--radius-card)] bg-surface p-4 shadow-card ring-1 ring-line">
            <ShortcutList />
          </div>
        </section>
      </div>
    </div>
  );
}
