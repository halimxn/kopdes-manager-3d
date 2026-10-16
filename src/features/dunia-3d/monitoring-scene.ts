import {
  ACESFilmicToneMapping,
  Box3,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  type Object3D,
  OrthographicCamera,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  VSMShadowMap,
  WebGLRenderer,
} from 'three';
import { gerakOrang, langkahOrang, type Orang } from './orang';
import { buangKarakter, buatKarakter } from './karakter';
import {
  PINTU_GUDANG,
  LORONG_Z,
  SLOT,
  dalamRuang,
  jangkarRuang,
  pintuRuang,
  ruangMonitoring,
  slotLebih,
  type Slot,
} from './monitoring-room';
import { ruangLogistik, type LogistikInput } from './warehouse-room';
import { ruangGerai } from './gerai-room';
import { GERAI, infoGerai, type GeraiId, type GeraiInfo } from './gerai';
import { BIDANG, type Bidang, type LokasiMonitoring } from './bidang';
import { MAX_FIGURES, isOffice, type CharacterPlan } from './character-plan';
import { ruangPulau } from './pulau';
import { panorama } from './suasana';
import type { Suasana } from './monitor-data';

/** Batas zoom kamera: cukup jauh untuk melihat seluruh lokasi, cukup dekat untuk membaca meja dan rak di ponsel. */
const ZOOM_MIN = 0.6;
const ZOOM_MAX = 5;

/** Kamera iso: jarak datar R dan tinggi tetap; sudut azimut bisa diputar dalam batas aman. */
const JARAK = Math.hypot(25, 25);
const TINGGI = 29;
/** Putaran dibatasi 15°–75° agar dinding belakang diorama tetap di belakang. */
const SUDUT_AWAL = Math.PI / 4,
  SUDUT_MIN = Math.PI / 12,
  SUDUT_MAX = (5 * Math.PI) / 12,
  LANGKAH_PUTAR = Math.PI / 12;
/** Pin biru (SVG statis) untuk hal yang perlu perhatian di peta. */
const PIN_SVG =
  '<svg viewBox="0 0 32 40" width="30" height="38" aria-hidden="true"><ellipse cx="16" cy="37" rx="7" ry="2.4" fill="#2f48d6" opacity=".22"/><path d="M16 2a12 12 0 0 1 12 12c0 8.6-9.6 18.4-11.2 21a1 1 0 0 1-1.6 0C13.6 32.4 4 22.6 4 14A12 12 0 0 1 16 2Z" fill="#546fff"/><path d="M16 2a12 12 0 0 1 12 12c0 2-.5 4-1.4 6A12 12 0 0 0 6 11.5 12 12 0 0 1 16 2Z" fill="#fff" opacity=".22"/><circle cx="16" cy="14" r="5" fill="#fff"/></svg>';
export type PinPeta = { key: string; label: string };
const LANTAI = 0.06;
/** Langkah santai (satuan/detik) dan kecepatan belok; figur berangkat bergiliran. */
const KECEPATAN = 2.6;
const BELOK = 9;
const GILIRAN = 0.35;
/** Luas pandang minimum (setengah lebar/tinggi dunia) per lokasi agar seluruh ruang terlihat. */
const BINGKAI: Record<LokasiMonitoring, { w: number; h: number }> = {
  pulau: { w: 24, h: 17 },
  gerai: { w: 20.5, h: 11.6 },
  kantor: { w: 27.5, h: 16.5 },
  gudang: { w: 24, h: 15.4 },
  pendingin: { w: 14.5, h: 9.4 },
};

type Figur = {
  plan: CharacterPlan;
  o: Orang;
  area: Bidang;
  slot: Slot;
  path: Vector3[];
  fase: number;
  /** Detik menunggu sebelum berangkat agar figur tidak berjalan serempak. */
  tunda: number;
};
type Lokasi = ReturnType<typeof ruangMonitoring>;
/** Titik tengah pandang awal per lokasi (kantor melebar ke kanan karena ruang istirahat). */
const PUSAT: Record<LokasiMonitoring, Vector3> = {
  pulau: new Vector3(0, 0, 0),
  gerai: new Vector3(0, 0, 0),
  kantor: new Vector3(0, 0, 0),
  gudang: new Vector3(0, 0, 0),
  pendingin: new Vector3(0, 0, 0),
};
const NAMA_OBJEK: Record<string, string> = {
  'pintu-pulau': 'Keluar ke pulau koperasi',
  'pintu-gudang': 'Pintu ke gudang',
  'pintu-kantor': 'Pintu ke kantor',
  'pintu-pendingin': 'Pintu ke cold storage',
  'pintu-gerai': 'Pintu ke kawasan gerai',
};

export type MonitoringScene = ReturnType<typeof buatMonitoring>;

/**
 * Persegi layar (px) dari kotak batas dunia: delapan sudut diproyeksikan, diambil batas luarnya.
 * Dipakai bingkai siku pilihan agar ukurannya mengikuti objek yang diklik.
 */
export function persegiLayar(kotak: Box3, camera: OrthographicCamera, lebar: number, tinggi: number) {
  const v = new Vector3();
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  for (let i = 0; i < 8; i++) {
    v.set(i & 1 ? kotak.max.x : kotak.min.x, i & 2 ? kotak.max.y : kotak.min.y, i & 4 ? kotak.max.z : kotak.min.z).project(camera);
    const x = ((v.x + 1) / 2) * lebar,
      y = ((1 - v.y) / 2) * tinggi;
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }
  return { x0, y0, x1, y1 };
}

/** Delta waktu menjaga kamera halus pada berbagai kecepatan layar, berhenti saat tiba. */
export function ikutiKarakter(target: Vector3, posisi: Vector3, dt: number, reduce = false) {
  const tujuan = new Vector3(posisi.x, 0.8, posisi.z);
  if (reduce || target.distanceTo(tujuan) < 0.015) { target.copy(tujuan); return false; }
  target.lerp(tujuan, 1 - Math.exp(-dt * 7));
  return true;
}

/**
 * Jalur figur: keluar lewat titik `via` tempat lama (dibalik) → dalam pintu → lorong → pintu
 * ruang tujuan → `via` tempat baru → tempat. Semua titik dipilih di area bebas perabot.
 */
export function jalur(dari: Vector3, lama: { area: Bidang; slot: Slot } | null, ke: Bidang, slot: Slot) {
  const t: { x: number; z: number }[] = [];
  if (lama) t.push(...[...lama.slot.via].reverse(), dalamRuang(lama.area));
  if (lama?.area !== ke) {
    if (lama) {
      const keluar = pintuRuang(lama.area);
      t.push(keluar, { x: keluar.x, z: LORONG_Z });
    }
    const masuk = pintuRuang(ke);
    t.push({ x: masuk.x, z: LORONG_Z }, masuk);
  }
  t.push(dalamRuang(ke), ...slot.via, slot);
  const hasil: Vector3[] = [];
  let akhir = dari;
  for (const p of t) {
    const v = new Vector3(p.x, LANTAI, p.z);
    if (v.distanceTo(akhir) > 0.05) hasil.push(v);
    akhir = v;
  }
  return hasil;
}

/**
 * Majukan `pos` sejauh `jarak` menyusuri `path` (titik yang dicapai dibuang dari path).
 * Mengembalikan arah hadap (radian) selama masih berjalan, null bila sudah tiba.
 */
export function maju(pos: Vector3, path: Vector3[], jarak: number): number | null {
  let sisa = jarak;
  while (sisa > 0 && path.length) {
    const tuju = path[0];
    const d = Math.hypot(tuju.x - pos.x, tuju.z - pos.z);
    if (d <= sisa) {
      pos.set(tuju.x, LANTAI, tuju.z);
      path.shift();
      sisa -= d;
    } else {
      pos.x += ((tuju.x - pos.x) / d) * sisa;
      pos.z += ((tuju.z - pos.z) / d) * sisa;
      return Math.atan2(tuju.x - pos.x, tuju.z - pos.z);
    }
  }
  return null;
}

/** Sudut a menuju b lewat jalur terpendek. */
function belok(a: number, b: number, t: number) {
  const d = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + d * Math.min(1, t);
}

function pasangPose(f: Figur) {
  const { o, slot } = f;
  o.akar.position.set(slot.x, slot.y ?? LANTAI, slot.z);
  o.akar.rotation.y = slot.rot;
  for (const k of o.kaki) k.rotation.x = slot.pose === 'berdiri' ? 0 : -Math.PI / 2;
  gerakOrang(o, 0, f.fase, slot.pose === 'ketik');
}

function buang(root: Object3D) {
  root.traverse((obj) => {
    // Figur dan pin memakai geometri/material bersama dari cache bentuk; jangan dibuang.
    if (!(obj instanceof Mesh) || obj.userData.bersama) return;
    obj.geometry.dispose();
    for (const m of Array.isArray(obj.material) ? obj.material : [obj.material]) {
      (m as { map?: { dispose(): void } | null }).map?.dispose();
      m.dispose();
    }
  });
}

export function buatMonitoring(
  host: HTMLElement,
  opsi: {
    onPick: (key: string) => void;
    tag?: HTMLElement | null;
    hover?: HTMLElement | null;
    pins?: HTMLElement | null;
    /** Bingkai siku HTML yang mengapit objek terpilih. */
    mark?: HTMLElement | null;
    /** Garis tepi lantai (SVG) untuk ruang/unit yang dipilih, mengikuti bentuk isometriknya. */
    markRuang?: SVGSVGElement | null;
  },
) {
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = VSMShadowMap;
  renderer.shadowMap.autoUpdate = false;
  host.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  const scene = new Scene();
  scene.add(new HemisphereLight(0xfff7ee, 0xcbb8a4, 1.85));
  const light = new DirectionalLight(0xffeed6, 2.5);
  light.position.set(-12, 22, 16);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  light.shadow.radius = 4;
  light.shadow.blurSamples = 4;
  Object.assign(light.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 80 });
  light.shadow.normalBias = 0.04;
  scene.add(light);
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 160);
  const target = new Vector3();

  const kantor: Lokasi = ruangMonitoring();
  const pulau: Lokasi = ruangPulau();
  const figurGroup = new Group();
  kantor.root.add(figurGroup);
  const figur = new Map<string, Figur>();
  let gudang: (Lokasi & { key: string }) | null = null;
  let gerai: (Lokasi & { key: string; slots: Record<GeraiId, Slot[]>; info: GeraiInfo[] }) | null = null;
  const figurGerai = new Map<string, { plan: CharacterPlan; o: Orang }>();
  let rencana: CharacterPlan[] = [];
  let lokasi: LokasiMonitoring = 'kantor';
  let aktif: Lokasi = kantor;
  scene.add(kantor.root);
  let selected = '';
  let follow = false;
  let suasanaKey = '';
  let suasana: Suasana = { cuaca: 'cerah', fase: 'siang' };
  let sudut = SUDUT_AWAL;
  let pins: { key: string; el: HTMLButtonElement }[] = [];
  let zoom = 1,
    frame = 0,
    last = 0,
    disposed = false,
    count = 0;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  function langkah(dt: number, t: number) {
    let bergerak = false;
    for (const f of figur.values()) {
      if (!f.path.length) continue;
      bergerak = true;
      if (f.tunda > 0) {
        f.tunda -= dt;
        continue;
      }
      const arah = maju(f.o.akar.position, f.path, KECEPATAN * dt);
      if (arah !== null) f.o.akar.rotation.y = belok(f.o.akar.rotation.y, arah, dt * BELOK);
      if (f.path.length) langkahOrang(f.o, t, f.fase);
      else pasangPose(f);
    }
    return bergerak;
  }

  function anchor(key: string) {
    if (key.startsWith('orang:')) {
      const id = key.slice(6);
      const o = lokasi === 'kantor' ? figur.get(id)?.o : lokasi === 'gerai' ? figurGerai.get(id)?.o : undefined;
      return o ? o.akar.position.clone().setY(1.4) : null;
    }
    if (lokasi === 'kantor' && key in BIDANG) {
      const a = jangkarRuang(key as Bidang);
      return new Vector3(a.x, a.y, a.z);
    }
    const mesh = aktif.areas.get(key);
    if (!mesh) return null;
    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox as Box3;
    const c = box.getCenter(new Vector3());
    return c.setY(box.max.y + 0.2);
  }

  let masukan: LogistikInput | null = null;
  /** Nama singkat objek di bawah kursor; nama hanya muncul saat diarahkan, bukan papan tetap. */
  function nama(key: string) {
    if (key.startsWith('orang:')) return (figur.get(key.slice(6)) ?? figurGerai.get(key.slice(6)))?.plan.name ?? '';
    if (key.startsWith('g:')) {
      const g = gerai?.info.find((i) => i.id === key.slice(2));
      return g ? `${g.nama}${g.buka ? '' : ' · belum dibuka'}` : '';
    }
    if (lokasi === 'kantor' && key in BIDANG) return BIDANG[key as Bidang].nama;
    if (NAMA_OBJEK[key]) return NAMA_OBJEK[key];
    if (key.startsWith('rak-')) return `Rak ${key.slice(4)}`;
    if (key.startsWith('dok-')) return `Dok ${key.slice(4)}`;
    if (key.startsWith('kirim-')) {
      const d = masukan?.model.deliveries.find((row) => row.id === key.slice(6));
      return d ? String(d.data.license_plate || d.data.title) : 'Truk';
    }
    return '';
  }
  /** Staf unit gerai yang buka berdiri di belakang meja layanan unitnya (tanpa berjalan). */
  function pasangFigurGerai() {
    for (const f of figurGerai.values()) {
      f.o.akar.removeFromParent();
      buangKarakter(f.o);
    }
    figurGerai.clear();
    if (!gerai) return;
    const isi = new Map<string, number>();
    for (const plan of rencana.slice(0, MAX_FIGURES)) {
      if (isOffice(plan.area)) continue;
      const id = plan.area.slice(6) as GeraiId;
      const n = isi.get(id) || 0;
      isi.set(id, n + 1);
      const slot = gerai.slots[id]?.[n % 3];
      if (!slot || !GERAI[id]) continue;
      const o = buatKarakter(plan.rupa);
      o.akar.userData.orang = plan.id;
      o.akar.traverse((c) => (c.userData.bersama = true));
      o.akar.position.set(slot.x + Math.floor(n / 3) * 0.5, slot.y ?? LANTAI, slot.z);
      o.akar.rotation.y = slot.rot;
      gerakOrang(o, 0, n, false);
      gerai.root.add(o.akar);
      figurGerai.set(plan.id, { plan, o });
    }
    invalidate();
  }
  const proyeksi = new Vector3();
  const kotakPilih = new Box3();
  /** Kotak batas dunia objek terpilih: figur, ruang, rak, dok, truk, atau unit gerai. */
  function kotakPilihan(key: string): Box3 | null {
    if (key.startsWith('orang:')) {
      const id = key.slice(6);
      const o = lokasi === 'kantor' ? figur.get(id)?.o : lokasi === 'gerai' ? figurGerai.get(id)?.o : undefined;
      return o ? kotakPilih.setFromObject(o.akar) : null;
    }
    const mesh = aktif.areas.get(key);
    if (!mesh) return null;
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    mesh.updateWorldMatrix(true, false);
    return kotakPilih.copy(mesh.geometry.boundingBox as Box3).applyMatrix4(mesh.matrixWorld);
  }
  function render() {
    const a = selected ? anchor(selected) : null;
    renderer.render(scene, camera);
    host.dataset.frames = String(++count);
    host.dataset.drawCalls = String(renderer.info.render.calls);
    host.dataset.lokasi = lokasi;
    host.dataset.walking = String([...figur.values()].filter((f) => f.path.length).length);
    host.dataset.following = follow ? selected : '';
    host.dataset.cameraTarget = `${target.x.toFixed(2)},${target.z.toFixed(2)}`;
    for (const p of pins) {
      const at = p.key === selected ? null : anchor(p.key);
      if (!at) {
        p.el.hidden = true;
        continue;
      }
      proyeksi.copy(at).project(camera);
      const px = ((proyeksi.x + 1) / 2) * host.clientWidth,
        py = ((1 - proyeksi.y) / 2) * host.clientHeight;
      p.el.hidden = px < 0 || py < 0 || px > host.clientWidth || py > host.clientHeight;
      p.el.style.transform = `translate(${Math.round(px)}px, ${Math.round(py)}px) translate(-50%, -100%)`;
    }
    // Bingkai siku mengikuti ukuran objek di layar; label pil duduk di atas tengah bingkai.
    const w = host.clientWidth,
      h = host.clientHeight;
    const kotak = selected ? kotakPilihan(selected) : null;
    const r = kotak ? persegiLayar(kotak, camera, w, h) : null;
    const orang = selected.startsWith('orang:');
    const pad = orang ? 6 : 8;
    const tampak = !!r && r.x1 > 0 && r.y1 > 0 && r.x0 < w && r.y0 < h;
    // Ruang kantor dan unit gerai: tepi lantai miring; objek lain: bingkai persegi.
    const ruang = (lokasi === 'kantor' && selected in BIDANG) || selected.startsWith('g:');
    const svg = opsi.markRuang;
    if (svg) {
      svg.toggleAttribute('data-on', !!(ruang && kotak && tampak));
      if (ruang && kotak && tampak) {
        const y = kotak.min.y + 0.06;
        const p = [
          [kotak.min.x, kotak.min.z],
          [kotak.max.x, kotak.min.z],
          [kotak.max.x, kotak.max.z],
          [kotak.min.x, kotak.max.z],
        ].map(([x, z]) => {
          proyeksi.set(x, y, z).project(camera);
          return [((proyeksi.x + 1) / 2) * w, ((1 - proyeksi.y) / 2) * h];
        });
        const t = (a: number[], b: number[], k: number) => `${(a[0] + (b[0] - a[0]) * k).toFixed(1)},${(a[1] + (b[1] - a[1]) * k).toFixed(1)}`;
        svg.querySelector('polygon')?.setAttribute('points', p.map((q) => q.map((v) => v.toFixed(1)).join(',')).join(' '));
        svg.querySelector('path')?.setAttribute(
          'd',
          p.map((q, i) => `M${t(q, p[(i + 3) % 4], 0.16)}L${q[0].toFixed(1)},${q[1].toFixed(1)}L${t(q, p[(i + 1) % 4], 0.16)}`).join(''),
        );
      }
    }
    const mark = opsi.mark;
    if (mark) {
      mark.hidden = !tampak || ruang;
      if (r && tampak) {
        const bw = Math.max(24, r.x1 - r.x0 + pad * 2),
          bh = Math.max(24, r.y1 - r.y0 + pad * 2);
        mark.style.width = `${Math.round(bw)}px`;
        mark.style.height = `${Math.round(bh)}px`;
        mark.style.transform = `translate(${Math.round((r.x0 + r.x1) / 2 - bw / 2)}px, ${Math.round((r.y0 + r.y1) / 2 - bh / 2)}px)`;
        mark.style.setProperty('--siku', `${Math.round(Math.max(10, Math.min(24, Math.min(bw, bh) * 0.24)))}px`);
        mark.dataset.jenis = orang ? 'orang' : 'objek';
      }
    }
    const tag = opsi.tag;
    if (!tag) return;
    if (!a || !r || !tampak) {
      tag.hidden = true;
      return;
    }
    const x = (r.x0 + r.x1) / 2,
      y = r.y0 - pad - 6;
    tag.hidden = x < 0 || y < 0 || x > w || y > h;
    tag.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, -100%)`;
  }

  function invalidate() {
    if (frame || disposed || document.hidden) return;
    frame = requestAnimationFrame((now) => {
      frame = 0;
      if (disposed) return;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
      const jalan = lokasi === 'kantor' && langkah(dt, now / 1000);
      const a = follow ? anchor(selected) : null;
      const mengejar = a ? ikutiKarakter(target, a, dt, reduce) : false;
      if (a) arahkan();
      render();
      // Render berhenti setelah figur dan kamera tiba; suasana tidak punya loop idle.
      if (jalan || mengejar) {
        last = now;
        invalidate();
      } else last = 0;
    });
  }

  function arahkan() {
    camera.position.set(target.x + JARAK * Math.cos(sudut), target.y + TINGGI, target.z + JARAK * Math.sin(sudut));
    camera.lookAt(target);
    camera.updateMatrixWorld();
  }
  function resize() {
    const w = host.clientWidth || 1,
      h = host.clientHeight || 1;
    renderer.setSize(w, h, false);
    const css = getComputedStyle(host);
    const inset = (n: string) => parseFloat(css.getPropertyValue(`--inset-${n}`)) || 0;
    let [t, r, b, l] = ['top', 'right', 'bottom', 'left'].map(inset);
    // Kartu melayang menutupi tepi; bingkai kamera digeser ke area kosong bila masih cukup luas.
    if (w - l - r < w * 0.45) l = r = 0;
    if (h - t - b < 160) t = b = 0;
    const vw = w - l - r,
      vh = h - t - b;
    const fit = BINGKAI[lokasi];
    // Layar potret: denah memanjang tampak kecil bila dipaskan selebar layar, jadi tampilan awal diperbesar
    // (ponsel ±1,5×, tablet ±1,2×).
    const potret = vh > vw * 1.2 ? Math.min(1.5, 0.6 + 0.45 * (vh / vw)) : 1;
    const half = Math.max(fit.h, fit.w / (vw / vh)) / (zoom * potret);
    const ppu = vh / (2 * half);
    camera.left = -(vw / 2 + l) / ppu;
    camera.right = (vw / 2 + r) / ppu;
    camera.top = (vh / 2 + t) / ppu;
    camera.bottom = -(vh / 2 + b) / ppu;
    camera.updateProjectionMatrix();
    invalidate();
  }

  // Interaksi: klik memilih, seret (mouse/pena) menggeser, roda menzoom.
  const ray = new Raycaster(),
    point = new Vector2();
  let tekan: { x: number; y: number; geser: boolean } | null = null;
  // Sentuh: satu jari menggeser, dua jari mencubit untuk zoom; tombol zoom tetap tersedia.
  const jari = new Map<number, { x: number; y: number }>();
  let cubit = 0;
  const jarak2 = () => {
    const [a, b] = [...jari.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  function pick(e: PointerEvent) {
    const r = renderer.domElement.getBoundingClientRect();
    point.set(((e.clientX - r.left) / r.width) * 2 - 1, 1 - ((e.clientY - r.top) / r.height) * 2);
    ray.setFromCamera(point, camera);
    // Kaca sekat tidak menghalangi klik ke ruang di belakangnya.
    const sasaran = aktif.root.children.filter((c) => !c.userData.kaca);
    let o: Object3D | null = ray.intersectObjects(sasaran, true)[0]?.object ?? null;
    while (o && !o.userData.bidang && !o.userData.orang) o = o.parent;
    if (!o) return '';
    return o.userData.orang ? `orang:${o.userData.orang}` : String(o.userData.bidang);
  }
  const down = (e: PointerEvent) => {
    if (e.pointerType === 'touch') {
      jari.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (jari.size === 2) {
        cubit = jarak2();
        if (tekan) tekan.geser = true;
        return;
      }
    }
    tekan = { x: e.clientX, y: e.clientY, geser: false };
  };
  const move = (e: PointerEvent) => {
    if (e.pointerType === 'touch' && jari.has(e.pointerId)) {
      jari.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (jari.size === 2 && cubit) {
        const d = jarak2();
        zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom * (d / cubit)));
        cubit = d;
        follow = false;
        resize();
        return;
      }
    }
    if (tekan && (e.buttons || e.pointerType === 'touch') && jari.size < 2) {
      const dx = e.clientX - tekan.x,
        dy = e.clientY - tekan.y;
      if (!tekan.geser && Math.hypot(dx, dy) < 5) return;
      tekan.geser = true;
      follow = false;
      renderer.domElement.style.cursor = 'grabbing';
      const wpp = (camera.top - camera.bottom) / (host.clientHeight || 1);
      const kanan = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
      const atas = new Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
      target.addScaledVector(kanan, -dx * wpp).addScaledVector(atas, dy * wpp);
      target.x = Math.max(-24, Math.min(24, target.x));
      target.z = Math.max(-13, Math.min(13, target.z));
      tekan.x = e.clientX;
      tekan.y = e.clientY;
      arahkan();
      invalidate();
      return;
    }
    const key = pick(e);
    renderer.domElement.style.cursor = key ? 'pointer' : '';
    const chip = opsi.hover;
    if (!chip) return;
    const teks = key ? nama(key) : '';
    chip.hidden = !teks;
    if (!teks) return;
    if (chip.textContent !== teks) chip.textContent = teks;
    const r = renderer.domElement.getBoundingClientRect();
    chip.style.transform = `translate(${Math.round(e.clientX - r.left + 14)}px, ${Math.round(e.clientY - r.top + 14)}px)`;
  };
  const leave = () => {
    if (opsi.hover) opsi.hover.hidden = true;
  };
  const up = (e: PointerEvent) => {
    if (e.pointerType === 'touch') {
      jari.delete(e.pointerId);
      if (jari.size < 2) cubit = 0;
      if (jari.size) return;
    }
    const geser = tekan?.geser;
    tekan = null;
    renderer.domElement.style.cursor = '';
    if (geser) return;
    const key = pick(e);
    if (key) opsi.onPick(key);
  };
  const wheel = (e: WheelEvent) => {
    e.preventDefault();
    api.zoom(e.deltaY < 0 ? 0.1 : -0.1);
  };
  const visibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
    } else invalidate();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  const el = renderer.domElement;
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointerleave', leave);
  el.addEventListener('pointercancel', up);
  el.addEventListener('wheel', wheel, { passive: false });
  document.addEventListener('visibilitychange', visibility);
  target.copy(PUSAT.kantor);
  arahkan();
  renderer.shadowMap.needsUpdate = true;
  resize();

  const api = {
    /** Pindah lokasi; gudang/cold storage dibangun ulang hanya bila datanya berubah. */
    show(next: LokasiMonitoring, input: LogistikInput) {
      masukan = input;
      if (next === 'gerai') {
        const info = infoGerai(input.model);
        const key = JSON.stringify(info.map((g) => [g.id, g.nama, g.buka]));
        if (gerai?.key !== key) {
          if (gerai) {
            gerai.root.removeFromParent();
            buang(gerai.root);
          }
          gerai = { ...ruangGerai(info), key, info };
          pasangFigurGerai();
        }
      } else if (next !== 'kantor' && next !== 'pulau') {
        const m = input.model;
        const key = JSON.stringify([
          next,
          input.stock,
          input.deliveries,
          m.inventory.items.map((i) => [i.id, i.updated_at]),
          m.trucks.map((t) => [t.delivery.id, t.place, t.index]),
        ]);
        if (gudang?.key !== key) {
          if (gudang) {
            gudang.root.removeFromParent();
            buang(gudang.root);
          }
          gudang = { ...ruangLogistik(input, next === 'pendingin'), key };
        }
      }
      const baru = next === 'pulau' ? pulau : next === 'kantor' ? kantor : next === 'gerai' ? gerai! : gudang!;
      if (baru !== aktif || next !== lokasi) {
        // Figur yang sedang berjalan langsung tiba bila kantor ditinggalkan.
        for (const f of figur.values()) {
          f.path = [];
          pasangPose(f);
        }
        aktif.root.removeFromParent();
        scene.add(baru.root);
        aktif = baru;
        suasanaKey = '';
        lokasi = next;
        follow = false;
        target.copy(PUSAT[next]);
        zoom = 1;
        arahkan();
        renderer.shadowMap.needsUpdate = true;
        resize();
      }
      api.setSuasana(suasana);
      invalidate();
    },
    /** Figur mengikuti rencana aktivitas; perpindahan ruang dianimasikan lewat lorong. */
    setPlans(plans: CharacterPlan[]) {
      rencana = plans;
      pasangFigurGerai();
      const tampil = plans.slice(0, MAX_FIGURES).filter((p) => isOffice(p.area));
      const isi = new Map<Bidang, number>();
      const ada = new Set(tampil.map((p) => p.id));
      for (const [id, f] of figur) {
        if (ada.has(id)) continue;
        f.o.akar.removeFromParent();
        buangKarakter(f.o);
        figur.delete(id);
      }
      let urut = 0;
      tampil.forEach((plan, i) => {
        if (!isOffice(plan.area)) return;
        const n = isi.get(plan.area) || 0;
        if (plan.action !== 'manage') isi.set(plan.area, n + 1);
        // Meja manajer hanya untuk figur manajer; figur lain memakai tempat sisanya.
        const khusus = SLOT[plan.area].find((s) => s.manajer);
        const daftar = SLOT[plan.area].filter((s) => !s.manajer);
        const slot =
          plan.action === 'manage' && khusus
            ? khusus
            : n < daftar.length
              ? daftar[n]
              : slotLebih(plan.area, n - daftar.length);
        let f = figur.get(plan.id);
        if (!f) {
          const o = buatKarakter(plan.rupa);
          o.akar.userData.orang = plan.id;
          o.akar.traverse((c) => (c.userData.bersama = true));
          o.akar.position.set(PINTU_GUDANG.x, LANTAI, PINTU_GUDANG.z);
          figurGroup.add(o.akar);
          f = { plan, o, area: plan.area, slot, path: [], fase: i * 1.7, tunda: urut++ * GILIRAN };
          figur.set(plan.id, f);
          f.path = reduce ? [] : jalur(o.akar.position, null, plan.area, slot);
        } else if (f.area !== plan.area || f.slot.x !== slot.x || f.slot.z !== slot.z) {
          // Figur yang masih berjalan menyelesaikan rute lamanya dulu, lalu berangkat lagi.
          const ujung = f.path.at(-1) ?? f.o.akar.position;
          if (!f.path.length) f.tunda = urut++ * GILIRAN;
          f.path = reduce ? [] : [...f.path, ...jalur(ujung, { area: f.area, slot: f.slot }, plan.area, slot)];
        }
        f.plan = plan;
        f.area = plan.area;
        f.slot = slot;
        if (!f.path.length) pasangPose(f);
      });
      invalidate();
    },
    select(key: string) {
      if (key !== selected && key.startsWith('orang:')) { zoom = 1.9; resize(); }
      selected = key;
      follow = key.startsWith('orang:');
      for (const [id, mesh] of aktif.areas) {
        const pilihan = key.startsWith('orang:') ? (figur.get(key.slice(6))?.area ?? figurGerai.get(key.slice(6))?.plan.area.replace('gerai:', 'g:')) : '';
        const on = id === key || pilihan === id;
        mesh.material.emissive.set(on ? 0x2f4d8a : 0);
        mesh.material.emissiveIntensity = on ? 0.14 : 0;
      }
      invalidate();
    },
    setSuasana(next: Suasana) {
      suasana = next;
      const key = `${next.cuaca}:${next.fase}`;
      if (key === suasanaKey) return;
      suasanaKey = key;
      aktif.root.traverse((obj) => {
        if (!(obj instanceof Mesh) || !obj.userData.panorama) return;
        obj.material.map?.dispose();
        obj.material.map = panorama(next);
        obj.material.needsUpdate = true;
      });
      const malam = next.fase === 'malam';
      light.color.set(next.fase === 'senja' ? 0xffc7a0 : malam ? 0xc6d5ff : 0xffeed6);
      light.intensity = malam ? 1.2 : next.cuaca === 'hujan' ? 1.8 : 2.5;
      renderer.shadowMap.needsUpdate = true;
      invalidate();
    },
    zoom(delta: number) {
      // Langkah berlipat agar rentang 0,6–5× terasa rata: tiap klik ±20 %, roda ±10 %.
      const faktor = delta > 0 ? 1 + delta : 1 / (1 - delta);
      zoom = delta ? Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom * faktor)) : 1;
      resize();
    },
    /** Putar kamera satu langkah (−1 kiri, 1 kanan) dalam batas aman; mengembalikan sudut. */
    putar(arah: number) {
      sudut = Math.max(SUDUT_MIN, Math.min(SUDUT_MAX, sudut + Math.sign(arah) * LANGKAH_PUTAR));
      arahkan();
      resize();
      return sudut;
    },
    /** Pin biru di atas objek yang perlu perhatian; klik memilih objeknya. */
    setPins(list: PinPeta[]) {
      const wadah = opsi.pins;
      if (!wadah) return;
      for (const p of pins) p.el.remove();
      pins = list.map(({ key, label }) => {
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'mt-pin';
        el.hidden = true;
        el.setAttribute('aria-label', label);
        el.title = label;
        el.innerHTML = PIN_SVG;
        el.addEventListener('click', () => opsi.onPick(key));
        wadah.appendChild(el);
        return { key, el };
      });
      invalidate();
    },
    home() {
      follow = false;
      target.copy(PUSAT[lokasi]);
      sudut = SUDUT_AWAL;
      zoom = 1;
      arahkan();
      resize();
    },
    destroy() {
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointerleave', leave);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('wheel', wheel);
      if (opsi.hover) opsi.hover.hidden = true;
      for (const p of pins) p.el.remove();
      for (const f of figur.values()) buangKarakter(f.o);
      for (const f of figurGerai.values()) buangKarakter(f.o);
      buang(kantor.root);
      buang(pulau.root);
      if (gudang) buang(gudang.root);
      if (gerai) buang(gerai.root);
      if (opsi.mark) opsi.mark.hidden = true;
      opsi.markRuang?.removeAttribute('data-on');
      light.shadow.dispose();
      renderer.dispose();
      el.remove();
    },
  };
  return api;
}
