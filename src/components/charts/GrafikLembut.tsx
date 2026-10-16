// Grafik ringan berbasis SVG (tanpa pustaka, menjaga JS awal ≤ 300 KB). Garis tipis melengkung,
// isi gradien memudar ke bawah; setiap grafik punya aria-label berisi angkanya.
import { useId } from 'react';

type Titik = [number, number];

/** Kurva Catmull-Rom → Bézier kubik; tegangan rendah agar lengkung tidak melampaui data. */
export function kurvaHalus(titik: Titik[]): string {
  if (!titik.length) return '';
  let d = `M${titik[0][0]} ${titik[0][1]}`;
  for (let i = 0; i < titik.length - 1; i++) {
    const [p0, p1, p2, p3] = [titik[i - 1] || titik[i], titik[i], titik[i + 1], titik[i + 2] || titik[i + 1]];
    const k = 0.18;
    const c1: Titik = [p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k];
    const c2: Titik = [p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k];
    // Jaga titik kendali di antara kedua ujung agar kurva kumulatif tidak turun.
    c1[1] = Math.min(Math.max(c1[1], Math.min(p1[1], p2[1])), Math.max(p1[1], p2[1]));
    c2[1] = Math.min(Math.max(c2[1], Math.min(p1[1], p2[1])), Math.max(p1[1], p2[1]));
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0]} ${p2[1]}`;
  }
  return d;
}

/** Batas atas sumbu yang bulat (langkah 1–8 × 10ⁿ) untuk empat garis bantu, tanpa ruang kosong berlebih. */
export function batasAtas(maks: number): number {
  if (maks <= 0) return 4;
  const kasar = maks / 4;
  const pangkat = 10 ** Math.floor(Math.log10(kasar));
  const langkah = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map((n) => n * pangkat).find((n) => n >= kasar) || 10 * pangkat;
  return langkah * 4;
}

export function singkat(nilai: number): string {
  if (nilai >= 1_000_000) return `${(nilai / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`;
  if (nilai >= 1_000) return `${Math.round(nilai / 1_000).toLocaleString('id-ID')} rb`;
  return nilai.toLocaleString('id-ID');
}

const L = 640, T = 230, KIRI = 52, KANAN = 628, ATAS = 18, BAWAH = 190;

/** Garis kumulatif periode ini (tegas + isi memudar) dibanding periode lalu (putus-putus). */
export function GrafikBanding({
  kini,
  lalu,
  jumlahHari,
  labelKini,
  labelLalu,
  tanggalKini,
  ariaLabel,
}: {
  kini: number[];
  lalu: number[];
  jumlahHari: number;
  labelKini: string;
  labelLalu: string;
  tanggalKini: string;
  ariaLabel: string;
}) {
  const id = useId().replace(/:/g, '');
  const atas = batasAtas(Math.max(...kini, ...lalu, 0));
  const x = (hari: number) => KIRI + ((hari - 1) / Math.max(1, jumlahHari - 1)) * (KANAN - KIRI);
  const y = (nilai: number) => BAWAH - (nilai / atas) * (BAWAH - ATAS);
  const titikKini = kini.map((v, i): Titik => [x(i + 1), y(v)]);
  const titikLalu = lalu.map((v, i): Titik => [x(i + 1), y(v)]);
  const ujung = titikKini.at(-1);
  const nilaiLaluSama = lalu[Math.min(kini.length, lalu.length) - 1] || 0;
  const tipKiri = ujung ? ujung[0] > L - 200 : false;
  return (
    <svg className="grafik-banding" viewBox={`0 0 ${L} ${T}`} role="img" aria-label={ariaLabel}>
      <defs>
        <linearGradient id={`isi-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--grafik-oranye)" stopOpacity="0.42" />
          <stop offset="1" stopColor="var(--grafik-oranye)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3, 4].map((i) => {
        const v = (atas / 4) * i;
        return (
          <g key={i}>
            <path d={`M${KIRI} ${y(v)}H${KANAN}`} className="grafik-bantu" />
            <text x={KIRI - 10} y={y(v) + 4} textAnchor="end" className="grafik-sumbu">
              {singkat(v)}
            </text>
          </g>
        );
      })}
      {[1, 5, 10, 15, 20, 25, 30].filter((h) => h <= jumlahHari).map((h) => (
        <text key={h} x={x(h)} y={T - 12} textAnchor="middle" className="grafik-sumbu">
          {h}
        </text>
      ))}
      <path d={kurvaHalus(titikLalu)} className="grafik-garis-lalu" />
      {ujung && (
        <>
          <path d={`${kurvaHalus(titikKini)} L${ujung[0]} ${BAWAH} L${KIRI} ${BAWAH} Z`} fill={`url(#isi-${id})`} className="grafik-muncul" />
          <path d={kurvaHalus(titikKini)} className="grafik-garis-kini grafik-muncul" />
          <path d={`M${ujung[0]} ${ATAS}V${BAWAH}`} className="grafik-penanda" />
          <circle cx={ujung[0]} cy={ujung[1]} r="5.5" className="grafik-titik" />
          <g transform={`translate(${tipKiri ? ujung[0] - 186 : ujung[0] + 14} ${Math.min(Math.max(ujung[1] - 70, ATAS), BAWAH - 76)})`} className="grafik-tip">
            <rect width="172" height="72" rx="12" />
            <text x="14" y="22" className="grafik-tip-judul">{tanggalKini}</text>
            <circle cx="18" cy="40" r="4" className="tip-kini" />
            <text x="30" y="44">{labelKini}</text>
            <text x="158" y="44" textAnchor="end" className="grafik-tip-nilai">Rp {singkat(kini.at(-1) || 0)}</text>
            <circle cx="18" cy="58" r="3.5" className="tip-lalu" />
            <text x="30" y="62">{labelLalu}</text>
            <text x="158" y="62" textAnchor="end" className="grafik-tip-nilai">Rp {singkat(nilaiLaluSama)}</text>
          </g>
        </>
      )}
    </svg>
  );
}

/** Donat lembut: busur berujung bulat dengan jeda kecil antarbagian. */
export function Donat({
  bagian,
  tengah,
  keterangan,
}: {
  bagian: { label: string; nilai: number; warna: string }[];
  tengah: string;
  keterangan: string;
}) {
  const r = 52, keliling = 2 * Math.PI * r;
  const total = bagian.reduce((n, b) => n + b.nilai, 0);
  const isi = bagian.filter((b) => b.nilai > 0);
  // Ujung bulat menambah setengah tebal garis di tiap sisi, jadi jeda harus > tebal (14).
  const jeda = isi.length > 1 ? 18 : 0;
  let geser = 0;
  return (
    <svg className="grafik-donat" viewBox="0 0 140 140" role="img" aria-label={`${tengah} ${keterangan}: ${bagian.map((b) => `${b.nilai} ${b.label.toLowerCase()}`).join(', ')}`}>
      <circle cx="70" cy="70" r={r} className="grafik-dasar-lingkar" />
      {total > 0 &&
        isi.map((b) => {
          const panjang = Math.max(0.1, (b.nilai / total) * keliling - jeda);
          const busur = (
            <circle
              key={b.label}
              cx="70"
              cy="70"
              r={r}
              fill="none"
              stroke={b.warna}
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={`${panjang} ${keliling}`}
              strokeDashoffset={-geser}
              transform="rotate(-90 70 70)"
              className="grafik-muncul"
            />
          );
          geser += (b.nilai / total) * keliling;
          return busur;
        })}
      <text x="70" y="70" textAnchor="middle" className="grafik-donat-angka">{tengah}</text>
      <text x="70" y="90" textAnchor="middle" className="grafik-sumbu">{keterangan}</text>
    </svg>
  );
}

/** Setengah lingkaran: nilai dari maksimum (mis. hadir dari petugas aktif). */
export function Gauge({ nilai, maks, keterangan }: { nilai: number; maks: number; keterangan: string }) {
  const id = useId().replace(/:/g, '');
  const panjang = Math.PI * 80;
  const isi = maks > 0 ? (Math.min(nilai, maks) / maks) * panjang : 0;
  return (
    <svg className="grafik-gauge" viewBox="0 0 200 118" role="img" aria-label={`${nilai} dari ${maks} ${keterangan}`}>
      <defs>
        <linearGradient id={`gauge-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="var(--grafik-teal)" />
          <stop offset="1" stopColor="var(--grafik-biru)" />
        </linearGradient>
      </defs>
      <path d="M20 100 A80 80 0 0 1 180 100" className="grafik-dasar-lingkar" strokeLinecap="round" />
      {isi > 0 && (
        <path
          d="M20 100 A80 80 0 0 1 180 100"
          fill="none"
          stroke={`url(#gauge-${id})`}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${isi} ${panjang}`}
          className="grafik-muncul"
        />
      )}
      <text x="100" y="88" textAnchor="middle" className="grafik-donat-angka">{`${nilai}/${maks}`}</text>
      <text x="100" y="108" textAnchor="middle" className="grafik-sumbu">{keterangan}</text>
    </svg>
  );
}
