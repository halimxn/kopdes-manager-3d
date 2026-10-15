// Bentuk dasar gaya diorama lembut: semua sudut membulat, material doff pastel, geometri dan
// material dipakai bersama (cache) agar adegan berisi banyak benda tetap ringan.
import {
  BoxGeometry,
  CapsuleGeometry,
  ConeGeometry,
  CylinderGeometry,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  type BufferGeometry,
  type ColorRepresentation,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/** Palet pastel bersama; ubah di sini, bukan per benda. */
export const WARNA = {
  dinding: 0x8e9de6,
  dindingAtas: 0xb3c4f5,
  dindingDalam: 0x9aa8ec,
  lantai: 0xc98e5f,
  alas: 0xa8664f,
  kayu: 0xe6c393,
  kayuGelap: 0xc79a68,
  putih: 0xf3eee6,
  krem: 0xe9dcc6,
  sage: 0x86c3ab,
  lavender: 0x9d90d8,
  biruKaca: 0x4f7fd6,
  daun: 0x5fb36a,
  pot: 0xe2876f,
  abu: 0x9aa0ad,
  gelap: 0x3c3f4a,
  kulit: 0xf0c7a0,
  rambut: 0x4a3a33,
  merah: 0xe46b62,
  kuning: 0xf2c75c,
} as const;

const material = new Map<string, MeshStandardMaterial>();
/** Material doff sedikit mengilap; `pancar` > 0 untuk lampu dan layar yang berpendar. */
export function bahan(warna: ColorRepresentation, pancar = 0, kilap = 0.75) {
  const kunci = `${String(warna)}|${pancar}|${kilap}`;
  let m = material.get(kunci);
  if (!m) {
    m = new MeshStandardMaterial({ color: warna, roughness: kilap, metalness: 0 });
    if (pancar) {
      m.emissive.set(warna);
      m.emissiveIntensity = pancar;
    }
    material.set(kunci, m);
  }
  return m;
}

const geometri = new Map<string, BufferGeometry>();
function simpan(kunci: string, buat: () => BufferGeometry) {
  let g = geometri.get(kunci);
  if (!g) {
    g = buat();
    geometri.set(kunci, g);
  }
  return g;
}

function jadi(g: BufferGeometry, warna: ColorRepresentation, pancar = 0) {
  const m = new Mesh(g, bahan(warna, pancar));
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** Kotak membulat; (x, y, z) = pusat alas, bukan pusat kotak, agar penempatan mudah dibaca. */
export function kotak(w: number, h: number, d: number, warna: ColorRepresentation, r = 0.08, pancar = 0) {
  const radius = Math.min(r, w / 2, h / 2, d / 2);
  const g = simpan(`k${w}|${h}|${d}|${radius}`, () => {
    const geo = radius > 0.001 ? new RoundedBoxGeometry(w, h, d, 2, radius) : new BoxGeometry(w, h, d);
    geo.translate(0, h / 2, 0);
    return geo;
  });
  return jadi(g, warna, pancar);
}

export function silinder(rAtas: number, rBawah: number, h: number, warna: ColorRepresentation, segmen = 16) {
  const g = simpan(`s${rAtas}|${rBawah}|${h}|${segmen}`, () => {
    const geo = new CylinderGeometry(rAtas, rBawah, h, segmen);
    geo.translate(0, h / 2, 0);
    return geo;
  });
  return jadi(g, warna);
}

export function bola(r: number, warna: ColorRepresentation, pancar = 0) {
  return jadi(simpan(`b${r}`, () => new SphereGeometry(r, 16, 10)), warna, pancar);
}

/** Kapsul berdiri; alas di y = 0. */
export function kapsul(r: number, panjang: number, warna: ColorRepresentation) {
  const g = simpan(`c${r}|${panjang}`, () => {
    const geo = new CapsuleGeometry(r, panjang, 4, 12);
    geo.translate(0, panjang / 2 + r, 0);
    return geo;
  });
  return jadi(g, warna);
}

/** Pasang posisi lalu kembalikan objek yang sama (penempatan satu baris). */
export function di<T extends { position: { set: (x: number, y: number, z: number) => unknown } }>(o: T, x: number, y: number, z: number) {
  o.position.set(x, y, z);
  return o;
}

/** Atap limas (piramida empat sisi) selebar w × d, setinggi h. */
export function limas(w: number, h: number, d: number, warna: ColorRepresentation) {
  const g = simpan(`l${w}|${h}|${d}`, () => {
    const geo = new ConeGeometry(Math.SQRT1_2, 1, 4);
    geo.rotateY(Math.PI / 4);
    geo.translate(0, 0.5, 0);
    geo.scale(w, h, d);
    return geo;
  });
  return jadi(g, warna);
}
