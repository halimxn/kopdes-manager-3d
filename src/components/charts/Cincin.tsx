// Cincin progres SVG kecil untuk kartu ringkasan. Nilai selalu ditulis sebagai teks di tengah,
// jadi informasi tidak hanya lewat warna.
export function Cincin({
  persen,
  ukuran = 72,
  tebal = 8,
  label,
  warna = 'var(--brand)',
  jalur = 'var(--grafik-redup)',
  teks,
}: {
  persen: number;
  ukuran?: number;
  tebal?: number;
  label: string;
  warna?: string;
  jalur?: string;
  teks?: string;
}) {
  const r = (ukuran - tebal) / 2;
  const keliling = 2 * Math.PI * r;
  const nilai = Math.max(0, Math.min(100, Number.isFinite(persen) ? persen : 0));
  return (
    <svg
      className="cincin"
      width={ukuran}
      height={ukuran}
      viewBox={`0 0 ${ukuran} ${ukuran}`}
      role="img"
      aria-label={label}
    >
      <circle
        cx={ukuran / 2}
        cy={ukuran / 2}
        r={r}
        fill="none"
        stroke={jalur}
        strokeWidth={tebal}
      />
      {nilai > 0 && (
        <circle
          cx={ukuran / 2}
          cy={ukuran / 2}
          r={r}
          fill="none"
          stroke={warna}
          strokeWidth={tebal}
          strokeLinecap="round"
          strokeDasharray={`${(nilai / 100) * keliling} ${keliling}`}
          transform={`rotate(-90 ${ukuran / 2} ${ukuran / 2})`}
        />
      )}
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="cincin-teks">
        {teks ?? `${Math.round(nilai)}%`}
      </text>
    </svg>
  );
}
