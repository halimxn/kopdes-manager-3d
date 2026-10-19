import Link from 'next/link';
import { notFound } from 'next/navigation';

/** Daftar halaman pratinjau development; tidak tersedia di build produksi. */
const HALAMAN = [
  { href: '/dev/ruang-kerja', judul: 'Ruang kerja senada dunia 3D', isi: 'Menu web, kartu, tulisan, form, dan mode gelap dengan contoh lokal.' },
  { href: '/dev/dunia-3d', judul: 'Dunia 3D kosong', isi: 'Tanpa data: memeriksa keadaan kosong dan galat.' },
  { href: '/dev/dunia-3d?contoh=1', judul: 'Monitoring kantor 3D', isi: 'Kantor bersekat, ringkasan tugas, tim, rapat, dokumen, dan operasional dengan data contoh.' },
  { href: '/dev/ikon', judul: 'Ikon dua nada', isi: 'Semua ikon 3D dan thumbnail barang.' },
  { href: '/dev/komponen', judul: 'Komponen UI', isi: 'Tombol, form, kartu, dan kontrol halaman operasional.' },
  { href: '/dev/popup', judul: 'Popup dan modal', isi: 'Semua dialog dengan data contoh.' },
];

export default function Page() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return (
    <main className="mx-auto max-w-2xl p-4">
      <h1 className="mb-1 text-xl font-semibold">Halaman development</h1>
      <p className="mb-4 text-sm opacity-70">Data di sini contoh lokal, tidak tersambung database.</p>
      <ul className="grid gap-2">
        {HALAMAN.map((h) => (
          <li key={h.href}>
            <Link href={h.href} className="block min-h-11 rounded-xl border p-3 hover:bg-black/5 focus-visible:outline">
              <strong className="block">{h.judul}</strong>
              <span className="text-sm opacity-70">{h.isi}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
