// Ikon bersama dan thumbnail barang berbasis SVG, tanpa menambah kanvas WebGL.
import { useId, type ReactNode } from 'react';
import {
  Package,
  Truck,
  Clock3,
  CalendarDays,
  ClipboardList,
  TriangleAlert,
  Dumbbell,
  FileText,
  UsersRound,
  Warehouse,
  Snowflake,
  Monitor,
  Check,
  ShelvingUnit,
  Building2,
  Coffee,
  Store,
  LockKeyhole,
  Bell,
  Wallet,
  IdCard,
  House,
  Sun,
  FolderKanban,
  Flag,
  BookOpen,
  ShieldCheck,
  ChartNoAxesCombined,
  Settings2,
  CircleHelp,
  Trees,
  Handshake,
  MapPin,
  Plus,
  type LucideIcon,
} from 'lucide-react';

export type Ikon3DKind =
  | 'kotak'
  | 'truk'
  | 'jam'
  | 'kalender'
  | 'papan'
  | 'peringatan'
  | 'dumbel'
  | 'dokumen'
  | 'tim'
  | 'gudang'
  | 'salju'
  | 'meja'
  | 'cek'
  | 'rak'
  | 'kantor'
  | 'kopi'
  | 'toko'
  | 'gembok'
  | 'lonceng'
  | 'dompet'
  | 'kartu'
  | 'rumah'
  | 'matahari'
  | 'folder'
  | 'bendera'
  | 'buku'
  | 'perisai'
  | 'grafik'
  | 'gerigi'
  | 'tanya'
  | 'pulau'
  | 'jabat'
  | 'pin'
  | 'tambah';

export type ThumbKind =
  | 'kardus'
  | 'karung'
  | 'karung-hijau'
  | 'galon'
  | 'botol'
  | 'obat'
  | 'telur'
  | 'sayur'
  | 'ikan'
  | 'daging'
  | 'susu'
  | 'kopi-pak'
  | 'lembaran';

type P = [number, number];
const C = Math.cos(Math.PI / 6);
/** Proyeksi isometrik: x ke kanan-bawah, y ke kiri-bawah, z ke atas; pusat (24, 30). */
const iso = (x: number, y: number, z: number): P => [24 + (x - y) * C, 30 + (x + y) * 0.5 - z];
const pts = (list: P[]) => list.map(([a, b]) => `${a.toFixed(2)},${b.toFixed(2)}`).join(' ');

function campur(hex: string, ke: string, t: number) {
  const a = parseInt(hex.slice(1), 16),
    b = parseInt(ke.slice(1), 16);
  const ch = (s: number) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t);
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`;
}

/** Id gradasi unik per ikon; disaring agar aman dipakai dalam url(#…). */
type Ctx = { id: string };
const u = (c: Ctx, nama: string) => `url(#${c.id}-${nama})`;

function Defs({ c }: { c: Ctx }) {
  const g = (nama: string, a: string, b: string, x2 = 0, y2 = 1) => (
    <linearGradient id={`${c.id}-${nama}`} x1="0" y1="0" x2={x2} y2={y2}>
      <stop offset="0" stopColor={a} />
      <stop offset="1" stopColor={b} />
    </linearGradient>
  );
  return (
    <defs>
      {g('muka', '#a9c4ff', '#3b68f0')}
      {g('tebal', '#2c51d6', '#1b3aa6')}
      {g('atas', '#d4e2ff', '#97b6ff', 1, 1)}
      {g('kiri', '#6f97ff', '#3d69ee')}
      {g('kanan', '#3a63e6', '#2445bd')}
      {g('pucat', '#ffffff', '#dbe6ff')}
      <radialGradient id={`${c.id}-kilap`} cx="0.32" cy="0.18" r="0.62">
        <stop offset="0" stopColor="#fff" stopOpacity="0.75" />
        <stop offset="0.55" stopColor="#fff" stopOpacity="0.12" />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </radialGradient>
      <radialGradient id={`${c.id}-bayang`} cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#1d3a9e" stopOpacity="0.28" />
        <stop offset="1" stopColor="#1d3a9e" stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

/** Balok isometrik: tiga sisi bergradasi dan tepi depan berkilau. `warna` = balok berwarna. */
function Balok({
  c,
  x,
  y,
  z,
  w,
  d,
  h,
  warna,
  kilau = true,
}: {
  c: Ctx;
  x: number;
  y: number;
  z: number;
  w: number;
  d: number;
  h: number;
  warna?: string;
  kilau?: boolean;
}) {
  const kiri = warna ?? u(c, 'kiri'),
    kanan = warna ? campur(warna, '#1e2a4a', 0.22) : u(c, 'kanan'),
    atas = warna ? campur(warna, '#ffffff', 0.35) : u(c, 'atas');
  const f = (p: P[], fill: string) => (
    <polygon points={pts(p)} fill={fill} stroke={fill} strokeWidth={0.9} strokeLinejoin="round" />
  );
  return (
    <g>
      {f(
        [iso(x, y + d, z), iso(x + w, y + d, z), iso(x + w, y + d, z + h), iso(x, y + d, z + h)],
        kiri,
      )}
      {f(
        [iso(x + w, y, z), iso(x + w, y + d, z), iso(x + w, y + d, z + h), iso(x + w, y, z + h)],
        kanan,
      )}
      {f(
        [iso(x, y, z + h), iso(x + w, y, z + h), iso(x + w, y + d, z + h), iso(x, y + d, z + h)],
        atas,
      )}
      {kilau && (
        <polyline
          points={pts([iso(x, y + d, z + h), iso(x + w, y + d, z + h), iso(x + w, y, z + h)])}
          fill="none"
          stroke="#fff"
          strokeOpacity={0.75}
          strokeWidth={0.9}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
    </g>
  );
}

/** Garis/sisipan pada permukaan isometrik. */
function Garis({
  a,
  b,
  warna = '#fff',
  w = 1.4,
  o = 1,
}: {
  a: [number, number, number];
  b: [number, number, number];
  warna?: string;
  w?: number;
  o?: number;
}) {
  const [x1, y1] = iso(...a),
    [x2, y2] = iso(...b);
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={warna}
      strokeOpacity={o}
      strokeWidth={w}
      strokeLinecap="round"
    />
  );
}
function Bidang({ p, fill, o = 1 }: { p: P[]; fill: string; o?: number }) {
  return (
    <polygon
      points={pts(p)}
      fill={fill}
      fillOpacity={o}
      stroke={fill}
      strokeOpacity={o}
      strokeWidth={0.6}
      strokeLinejoin="round"
    />
  );
}

const SIMBOL: Record<Ikon3DKind, LucideIcon> = {
  kotak: Package,
  truk: Truck,
  jam: Clock3,
  kalender: CalendarDays,
  papan: ClipboardList,
  peringatan: TriangleAlert,
  dumbel: Dumbbell,
  dokumen: FileText,
  tim: UsersRound,
  gudang: Warehouse,
  salju: Snowflake,
  meja: Monitor,
  cek: Check,
  rak: ShelvingUnit,
  kantor: Building2,
  kopi: Coffee,
  toko: Store,
  gembok: LockKeyhole,
  lonceng: Bell,
  dompet: Wallet,
  kartu: IdCard,
  rumah: House,
  matahari: Sun,
  folder: FolderKanban,
  bendera: Flag,
  buku: BookOpen,
  perisai: ShieldCheck,
  grafik: ChartNoAxesCombined,
  gerigi: Settings2,
  tanya: CircleHelp,
  pulau: Trees,
  jabat: Handshake,
  pin: MapPin,
  tambah: Plus,
};

/** Simbol dua warna pada ubin timbul; satu bentuk dan pencahayaan untuk seluruh aplikasi. */
export function Ikon3D({
  kind,
  size = 32,
  className,
  rapat = false,
}: {
  kind: Ikon3DKind;
  size?: number;
  className?: string;
  rapat?: boolean;
}) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const Icon = SIMBOL[kind];
  // Tanpa ubin latar: simbol dua nada (garis gradasi token --ikon-garis-*, isian --ikon-isi) berbayang halus.
  return (
    <svg
      viewBox={rapat ? '5 5 38 38' : '2 2 44 44'}
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={className ?? 'ikon3d'}
    >
      <defs>
        {/* Koordinat simbol lucide (0–24): garis lurus tetap terwarnai, tidak hilang. */}
        <linearGradient id={`${id}-g`} gradientUnits="userSpaceOnUse" x1="2" y1="2" x2="22" y2="22">
          <stop style={{ stopColor: 'var(--ikon-garis-a)' }} />
          <stop offset="1" style={{ stopColor: 'var(--ikon-garis-b)' }} />
        </linearGradient>
      </defs>
      <Icon
        x="6"
        y="6"
        width="36"
        height="36"
        strokeWidth="2.1"
        className="ikon3d-simbol"
        // Gaya inline: aturan lama `svg { stroke/fill }` di CSS tidak boleh menimpa warna ikon.
        style={{ stroke: `url(#${id}-g)`, fill: 'var(--ikon-isi)', color: 'var(--brand)' }}
      />
    </svg>
  );
}

// ---------- Thumbnail barang berwarna ----------
function Karung({ c, warna, label }: { c: Ctx; warna: string; label: string }) {
  const d = 'M13 12q11-4 22 0l2 22q-1 6-13 6t-13-6Z';
  return (
    <>
      <path d={d} transform="translate(0 2.4)" fill={campur(warna, '#3a2a1a', 0.35)} />
      <path d={d} fill={warna} />
      <path d="M13 12q11-4 22 0l-1 3q-10-3-20 0Z" fill={campur(warna, '#3a2a1a', 0.18)} />
      <rect x={17} y={21} width={14} height={9} rx={2} fill={label} />
      <path d={d} fill={u(c, 'kilap')} />
    </>
  );
}
function Botol({ c, isi, tutup }: { c: Ctx; isi: string; tutup: string }) {
  const d = 'M20 12h8v4q5 3 5 9v12a4 4 0 0 1-4 4H19a4 4 0 0 1-4-4V25q0-6 5-9Z';
  return (
    <>
      <path d={d} transform="translate(0 2)" fill={campur(isi, '#2a2a3a', 0.35)} />
      <path d={d} fill={isi} />
      <rect x={19} y={6} width={10} height={6.5} rx={2} fill={tutup} />
      <rect x={17.5} y={26} width={13} height={8} rx={2} fill="#fff" fillOpacity={0.85} />
      <path d={d} fill={u(c, 'kilap')} />
    </>
  );
}

const THUMB: Record<ThumbKind, (c: Ctx) => ReactNode> = {
  kardus: (c) => (
    <>
      <Balok c={c} x={-9} y={-9} z={0} w={18} d={18} h={14} warna="#d9a066" />
      <Garis a={[-9, -1.5, 14]} b={[9, -1.5, 14]} warna="#f3d7ae" w={3} />
      <Garis a={[9, -1.5, 14]} b={[9, -1.5, 7]} warna="#f3d7ae" w={3} o={0.8} />
    </>
  ),
  karung: (c) => <Karung c={c} warna="#efe6d2" label="#3b68f0" />,
  'karung-hijau': (c) => <Karung c={c} warna="#7cc59a" label="#f6f1e3" />,
  galon: (c) => (
    <>
      <path
        d="M14 18q0-5 5-6h10q5 1 5 6v18a5 5 0 0 1-5 5H19a5 5 0 0 1-5-5Z"
        fill="#8cc4f2"
        fillOpacity={0.95}
      />
      <rect x={20} y={6} width={8} height={7} rx={2} fill="#3b68f0" />
      {[22, 30].map((y) => (
        <rect key={y} x={14} y={y} width={20} height={2} fill="#5ea6e6" />
      ))}
      <path d="M14 18q0-5 5-6h10q5 1 5 6v18a5 5 0 0 1-5 5H19a5 5 0 0 1-5-5Z" fill={u(c, 'kilap')} />
    </>
  ),
  botol: (c) => <Botol c={c} isi="#f2c64f" tutup="#e0742f" />,
  obat: (c) => (
    <>
      <rect
        x={9}
        y={14}
        width={30}
        height={20}
        rx={4}
        fill="#d7dde8"
        transform="translate(0 2.4)"
      />
      <rect x={9} y={14} width={30} height={20} rx={4} fill="#f4f6fa" />
      {[16, 24, 32].map((x) =>
        [20, 28].map((y) => (
          <g key={`${x}${y}`}>
            <ellipse cx={x} cy={y} rx={3.2} ry={2.6} fill="#e8eef9" />
            <path d={`M${x - 3} ${y}a3 2.6 0 0 1 3-2.6v5.2a3 2.6 0 0 1-3-2.6Z`} fill="#e45d5d" />
            <path d={`M${x} ${y - 2.6}a3 2.6 0 0 1 0 5.2Z`} fill="#fff" />
          </g>
        )),
      )}
      <rect x={9} y={14} width={30} height={20} rx={4} fill={u(c, 'kilap')} />
    </>
  ),
  telur: (c) => (
    <>
      <Balok c={c} x={-11} y={-8} z={0} w={22} d={16} h={3} warna="#c9b08f" />
      {[-6, 0, 6].map((x) =>
        [-3, 3].map((y) => {
          const [cx, cy] = iso(x, y, 5);
          return (
            <ellipse
              key={`${x}${y}`}
              cx={cx}
              cy={cy - 1}
              rx={3.2}
              ry={3.8}
              fill="#f6e7cf"
              stroke="#e2c9a4"
              strokeWidth={0.5}
            />
          );
        }),
      )}
    </>
  ),
  sayur: (c) => (
    <>
      <path
        d="M24 40c-6 0-11-6-11-13 0-8 6-14 11-18 5 4 11 10 11 18 0 7-5 13-11 13Z"
        fill="#3f9a5f"
        transform="translate(0 2)"
      />
      <path
        d="M24 40c-6 0-11-6-11-13 0-8 6-14 11-18 5 4 11 10 11 18 0 7-5 13-11 13Z"
        fill="#6cc488"
      />
      <path
        d="M24 12v27M24 22l-6-4M24 28l6-4M24 33l-5-3"
        stroke="#d8f2df"
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      <path
        d="M24 40c-6 0-11-6-11-13 0-8 6-14 11-18 5 4 11 10 11 18 0 7-5 13-11 13Z"
        fill={u(c, 'kilap')}
      />
    </>
  ),
  ikan: (c) => (
    <>
      <path
        d="M6 24q10-11 24-6l9-6-3 12 3 12-9-6q-14 5-24-6Z"
        fill="#5b7fa6"
        transform="translate(0 2)"
      />
      <path d="M6 24q10-11 24-6l9-6-3 12 3 12-9-6q-14 5-24-6Z" fill="#9cc0e6" />
      <circle cx={13} cy={22.5} r={1.8} fill="#1f2c44" />
      <path d="M6 24q10-11 24-6l9-6-3 12 3 12-9-6q-14 5-24-6Z" fill={u(c, 'kilap')} />
    </>
  ),
  daging: (c) => (
    <>
      <path
        d="M10 26c0-8 8-14 17-14s13 6 11 13-8 14-17 14S10 33 10 26Z"
        fill="#b8505a"
        transform="translate(0 2.4)"
      />
      <path d="M10 26c0-8 8-14 17-14s13 6 11 13-8 14-17 14S10 33 10 26Z" fill="#ef8f93" />
      <path
        d="M16 27c2-5 7-8 13-8"
        fill="none"
        stroke="#fde3e3"
        strokeWidth={2.2}
        strokeLinecap="round"
      />
      <path d="M10 26c0-8 8-14 17-14s13 6 11 13-8 14-17 14S10 33 10 26Z" fill={u(c, 'kilap')} />
    </>
  ),
  susu: (c) => (
    <>
      <Balok c={c} x={-6} y={-6} z={0} w={12} d={12} h={18} warna="#f4f6fb" />
      <Bidang p={[iso(-6, 6, 18), iso(6, 6, 18), iso(6, 0, 23), iso(-6, 0, 23)]} fill="#ffffff" />
      <Bidang p={[iso(-5, 6, 4), iso(5, 6, 4), iso(5, 6, 11), iso(-5, 6, 11)]} fill="#6aa8ef" />
    </>
  ),
  'kopi-pak': (c) => (
    <>
      <path
        d="M14 10h20l2 28a3 3 0 0 1-3 3H15a3 3 0 0 1-3-3Z"
        fill="#6b4632"
        transform="translate(0 2)"
      />
      <path d="M14 10h20l2 28a3 3 0 0 1-3 3H15a3 3 0 0 1-3-3Z" fill="#a5714f" />
      <rect x={14} y={8} width={20} height={4} rx={1} fill="#e7c9a6" />
      <ellipse cx={24} cy={26} rx={5} ry={6.5} fill="#5b3a2a" />
      <path d="M24 20q-2 6 0 13" stroke="#a5714f" strokeWidth={1.4} fill="none" />
      <path d="M14 10h20l2 28a3 3 0 0 1-3 3H15a3 3 0 0 1-3-3Z" fill={u(c, 'kilap')} />
    </>
  ),
  lembaran: (c) => (
    <>
      {[0, 1, 2].map((i) => (
        <Balok
          key={i}
          c={c}
          x={-11}
          y={-8}
          z={i * 3}
          w={22}
          d={16}
          h={2.6}
          warna={i === 2 ? '#7aa7d9' : '#5d8cc4'}
        />
      ))}
    </>
  ),
};

/** Thumbnail barang berwarna menurut nama/satuan; jatuh ke kardus bila tidak dikenali. */
export function thumbBarang(title: string, satuan = ''): ThumbKind {
  const t = `${title} ${satuan}`.toLowerCase();
  const ada = (...k: string[]) => k.some((s) => t.includes(s));
  if (ada('pupuk', 'bibit', 'benih')) return 'karung-hijau';
  if (ada('karung', 'sak', 'beras', 'gula', 'tepung')) return 'karung';
  if (ada('galon', 'air mineral')) return 'galon';
  if (ada('obat', 'paracetamol', 'strip', 'tablet', 'kapsul')) return 'obat';
  if (ada('minyak', 'botol', 'vitamin', 'sabun cair')) return 'botol';
  if (ada('telur', 'tray')) return 'telur';
  if (ada('sayur', 'ikat', 'bayam', 'kangkung')) return 'sayur';
  if (ada('ikan', 'nila', 'lele')) return 'ikan';
  if (ada('daging', 'ayam', 'sapi')) return 'daging';
  if (ada('susu', 'liter')) return 'susu';
  if (ada('kopi', 'teh')) return 'kopi-pak';
  if (ada('terpal', 'lembar', 'plastik')) return 'lembaran';
  return 'kardus';
}

export function ThumbBarang({ kind, size = 32 }: { kind: ThumbKind; size?: number }) {
  const c = { id: `t${useId().replace(/[^a-zA-Z0-9_-]/g, '')}` };
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className="ikon3d"
    >
      <Defs c={c} />
      <ellipse cx={24} cy={42.5} rx={12} ry={2.4} fill="#1e2a4a" fillOpacity={0.12} />
      {THUMB[kind](c)}
    </svg>
  );
}

export const IKON3D_KINDS = Object.keys(SIMBOL) as Ikon3DKind[];
export const THUMB_KINDS = Object.keys(THUMB) as ThumbKind[];
