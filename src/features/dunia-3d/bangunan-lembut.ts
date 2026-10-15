// Bangunan bergaya mainan lembut: semua sudut membulat besar, atap "bantal" (lempeng membulat
// bertingkat) atau atap lengkung, tanpa atap runcing. Muka depan menghadap +z.
import { CylinderGeometry, Group, Mesh, type ColorRepresentation } from 'three';
import { WARNA, bahan, bola, di, kotak, silinder } from './bentuk';

export type JenisBangunan = 'kantor' | 'balai' | 'loket' | 'gudang' | 'pendingin' | 'toko' | 'kios' | 'apotek' | 'klinik' | 'musala' | 'rumah';

type Rupa = { w: number; d: number; h: number; dinding: number; atap: number; aksen: number; lantai?: 2 };
// Palet mengikuti konsep kamar isometrik pertama: dinding krem/periwinkle muda, atap periwinkle,
// lavender, kayu hangat, terakota, sage. lantai 2 = bangunan bertingkat (badan kedua ditumpuk).
export const RUPA_BANGUNAN: Record<JenisBangunan, Rupa> = {
  kantor: { w: 5.2, d: 4.2, h: 2.4, dinding: 0xf3eee6, atap: 0x8e9de6, aksen: 0xe46b62, lantai: 2 },
  balai: { w: 5.8, d: 4.4, h: 2.4, dinding: 0xf3eee6, atap: 0xc9785f, aksen: 0xe6c393 },
  loket: { w: 4.4, d: 3.8, h: 2.4, dinding: 0xdfe5fb, atap: 0x86c3ab, aksen: 0xe6c393 },
  gudang: { w: 6.2, d: 4.6, h: 2.6, dinding: 0xe9e4f8, atap: 0x9d90d8, aksen: 0xe6c393 },
  pendingin: { w: 4.2, d: 4.0, h: 2.2, dinding: 0xf3f5fd, atap: 0x8e9de6, aksen: 0xb3c4f5, lantai: 2 },
  toko: { w: 4.6, d: 3.8, h: 2.3, dinding: 0xf3eee6, atap: 0xd9a070, aksen: 0x86c3ab },
  kios: { w: 3.0, d: 2.8, h: 2.0, dinding: 0xdfe5fb, atap: 0x9d90d8, aksen: 0xe6c393 },
  apotek: { w: 4.0, d: 3.6, h: 2.3, dinding: 0xf3eee6, atap: 0x86c3ab, aksen: 0x5fae8f },
  klinik: { w: 4.8, d: 4.0, h: 2.2, dinding: 0xf3eee6, atap: 0xb3c4f5, aksen: 0xe46b62, lantai: 2 },
  musala: { w: 4.0, d: 4.0, h: 2.4, dinding: 0xf3eee6, atap: 0x86c3ab, aksen: 0x86c3ab },
  rumah: { w: 3.6, d: 3.4, h: 2.1, dinding: 0xdfe5fb, atap: 0xc9785f, aksen: 0x9d90d8 },
};

function jendela(warnaBingkai: ColorRepresentation = WARNA.putih) {
  const g = new Group();
  g.add(di(kotak(0.72, 0.72, 0.1, warnaBingkai, 0.18), 0, 0, 0), di(kotak(0.54, 0.54, 0.06, 0x8fb8f0, 0.14, 0.25), 0, 0.09, 0.05));
  return g;
}

/** Atap lengkung (setengah tabung) memanjang sumbu x, untuk gudang. */
function atapLengkung(w: number, d: number, warna: number) {
  const geo = new CylinderGeometry(d / 2, d / 2, w, 24, 1, false, 0, Math.PI);
  // sumbu tabung ke x; setengah lingkaran sisi +x berputar menjadi sisi atas
  geo.rotateZ(Math.PI / 2);
  const m = new Mesh(geo, bahan(warna));
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** Tanda plus membulat (klinik/apotek) dari dua kotak. */
function tandaPlus(warna: number) {
  const g = new Group();
  g.add(di(kotak(0.6, 0.18, 0.08, warna, 0.08), 0, 0.21, 0), di(kotak(0.18, 0.6, 0.08, warna, 0.08), 0, 0, 0));
  return g;
}

export function bangunanLembut(jenis: JenisBangunan) {
  const r = RUPA_BANGUNAN[jenis];
  const g = new Group();
  const muka = r.d / 2 + 0.04;
  g.add(di(kotak(r.w + 0.3, 0.22, r.d + 0.3, 0xefe4d2, 0.11), 0, 0, 0));
  g.add(di(kotak(r.w, r.h, r.d, r.dinding, 0.42), 0, 0.2, 0));
  let atas = 0.2 + r.h;
  if (r.lantai === 2) {
    // lantai dua sedikit lebih kecil dan bergeser ke belakang: siluet bertumpuk seperti balok
    g.add(di(kotak(r.w + 0.2, 0.22, r.d + 0.2, r.atap, 0.11), 0, atas - 0.05, 0));
    g.add(di(kotak(r.w - 0.9, r.h * 0.85, r.d - 0.9, r.dinding, 0.38), -0.2, atas + 0.15, -0.3));
    for (const s of [-1, 1]) g.add(di(jendela(), -0.2 + s * (r.w / 2 - 1.2), atas + 0.15 + r.h * 0.4, -0.3 + (r.d - 0.9) / 2 + 0.04));
    atas += 0.15 + r.h * 0.85;
  }
  if (jenis === 'gudang') {
    g.add(di(atapLengkung(r.w + 0.3, r.d + 0.3, r.atap), 0, atas - 0.15, 0));
  } else if (jenis === 'musala') {
    g.add(di(kotak(r.w + 0.4, 0.4, r.d + 0.4, r.atap, 0.2), 0, atas - 0.1, 0));
    const kubah = bola(1.3, r.aksen);
    kubah.scale.set(1, 0.9, 1);
    g.add(di(kubah, 0, atas + 0.35, 0), di(bola(0.16, WARNA.kuning), 0, atas + 1.6, 0));
  } else {
    // atap bantal: lempeng membulat bertingkat dua
    g.add(di(kotak(r.w + 0.5, 0.5, r.d + 0.5, r.atap, 0.25), 0, atas - 0.12, 0));
    g.add(di(kotak(r.w - 0.6, 0.4, r.d - 0.6, r.atap, 0.2), 0, atas + 0.32, 0));
  }
  // pintu membulat
  const lebarPintu = jenis === 'gudang' ? 2.0 : 0.95;
  g.add(di(kotak(lebarPintu, jenis === 'gudang' ? 1.9 : 1.55, 0.12, jenis === 'gudang' ? r.aksen : 0xc99a68, 0.2), 0, 0.2, muka));
  // jendela depan dan sisi kanan (terlihat kamera)
  if (r.w > 3.2 && jenis !== 'gudang') for (const s of [-1, 1]) g.add(di(jendela(), s * (r.w / 2 - 0.85), 0.2 + r.h * 0.48, muka));
  if (jenis === 'kantor') for (const s of [-1, 0, 1]) g.add(di(jendela(), s * 1.5, 0.2 + r.h * 0.8, muka));
  for (let z = -r.d / 2 + 1; z < r.d / 2 - 0.6; z += 1.5) {
    const j = jendela();
    j.rotation.y = Math.PI / 2;
    j.position.set(r.w / 2 + 0.04, 0.2 + r.h * 0.48, z);
    g.add(j);
  }
  // aksesori pembeda
  if (jenis === 'toko' || jenis === 'kios' || jenis === 'loket' || jenis === 'apotek') {
    const tenda = kotak(r.w * 0.82, 0.16, 0.9, r.aksen, 0.08);
    tenda.position.set(0, 0.2 + r.h * 0.74, muka + 0.36);
    tenda.rotation.x = 0.28;
    g.add(tenda);
  }
  if (jenis === 'klinik' || jenis === 'apotek') g.add(di(tandaPlus(jenis === 'klinik' ? r.aksen : 0xffffff), r.w / 2 - 0.8, 0.2 + r.h * 0.78, muka + 0.02));
  if (jenis === 'kantor') {
    g.add(di(silinder(0.06, 0.06, 3.2, WARNA.abu), -r.w / 2 - 0.6, 0, muka + 0.4));
    g.add(di(kotak(0.9, 0.3, 0.04, r.aksen, 0.04), -r.w / 2 - 0.15, 2.8, muka + 0.4), di(kotak(0.9, 0.3, 0.04, WARNA.putih, 0.04), -r.w / 2 - 0.15, 2.5, muka + 0.4));
  }
  if (jenis === 'pendingin') for (const x of [-0.8, 0.8]) g.add(di(kotak(0.9, 0.5, 0.7, 0xdfe7f3, 0.2), x, atas + 0.3, 0.6));
  if (jenis === 'balai') for (const x of [-1.8, 1.8]) g.add(di(silinder(0.18, 0.18, 1.6, WARNA.krem), x, 0.2, muka + 0.5));
  return g;
}

