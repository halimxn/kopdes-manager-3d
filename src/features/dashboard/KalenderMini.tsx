const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const HARI = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

/**
 * Kalender bulan berjalan untuk panel kanan Beranda. `tanggal` berbentuk yyyy-mm-dd dari `today()`
 * (Asia/Jakarta), sehingga komponen tidak membaca jam peramban sendiri.
 * Tanggal bertanda = ada tugas/rapat; status dinyatakan lewat label, bukan warna saja.
 */
export function KalenderMini({ tanggal, tandai }: { tanggal: string; tandai: string[] }) {
  const [tahun, bulan, hari] = tanggal.split('-').map(Number);
  // Hari pertama bulan dihitung di UTC agar tidak bergeser oleh zona waktu peramban.
  const geser = (new Date(Date.UTC(tahun, bulan - 1, 1)).getUTCDay() + 6) % 7;
  const jumlah = new Date(Date.UTC(tahun, bulan, 0)).getUTCDate();
  const sel: (number | null)[] = [...Array<null>(geser).fill(null), ...Array.from({ length: jumlah }, (_, i) => i + 1)];
  while (sel.length % 7) sel.push(null);
  const awalan = tanggal.slice(0, 8);
  const ada = new Set(tandai);
  return (
    <table className="kalender-mini" aria-label={`${BULAN[bulan - 1]} ${tahun}`}>
      <caption className="kalender-mini-judul">
        {BULAN[bulan - 1]} {tahun}
      </caption>
      <thead>
        <tr>
          {HARI.map((h) => (
            <th key={h} scope="col">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: sel.length / 7 }, (_, baris) => (
          <tr key={baris}>
            {sel.slice(baris * 7, baris * 7 + 7).map((d, i) => {
              if (!d) return <td key={i} />;
              const hariIni = d === hari;
              const berkegiatan = ada.has(awalan + String(d).padStart(2, '0'));
              const label = `${d} ${BULAN[bulan - 1]}${hariIni ? ', hari ini' : berkegiatan ? ', ada kegiatan' : ''}`;
              return (
                <td key={i} aria-label={label} data-hari-ini={hariIni || undefined} data-ada={berkegiatan || undefined}>
                  {d}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
