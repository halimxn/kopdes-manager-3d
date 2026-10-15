// Perabot diorama dari bentuk dasar. Satuan: 1 ≈ 50 cm; setiap fungsi mengembalikan Group yang
// alasnya di y = 0 dan menghadap +z (ke kamera), lalu diputar/ditempatkan oleh pemanggil.
import { Group, type ColorRepresentation } from 'three';
import { WARNA, bola, di, kapsul, kotak, silinder } from './bentuk';

function grup(...anak: Parameters<Group['add']>) {
  const g = new Group();
  g.add(...anak);
  return g;
}

export function meja(w = 1.8, d = 0.9, warna: ColorRepresentation = WARNA.kayu) {
  const kaki = (x: number, z: number) => di(kotak(0.18, 0.74, 0.18, WARNA.kayuGelap, 0.08), x, 0, z);
  const lx = w / 2 - 0.12, lz = d / 2 - 0.12;
  return grup(
    di(kotak(w, 0.18, d, warna, 0.09), 0, 0.68, 0),
    kaki(-lx, -lz), kaki(lx, -lz), kaki(-lx, lz), kaki(lx, lz),
    di(kotak(0.5, 0.36, d - 0.2, WARNA.krem, 0.05), lx - 0.3, 0.38, 0),
  );
}

export function kursi(warna: ColorRepresentation = WARNA.lavender) {
  return grup(
    di(kotak(0.62, 0.14, 0.6, warna, 0.07), 0, 0.42, 0),
    di(kotak(0.62, 0.7, 0.14, warna, 0.07), 0, 0.5, -0.26),
    di(silinder(0.09, 0.09, 0.42, WARNA.abu), 0, 0, 0),
    di(kotak(0.5, 0.1, 0.5, WARNA.abu, 0.05), 0, 0, 0),
  );
}

export function monitor() {
  return grup(
    di(kotak(0.3, 0.04, 0.2, WARNA.gelap, 0.02), 0, 0, 0),
    di(kotak(0.12, 0.28, 0.12, WARNA.gelap, 0.05), 0, 0.03, -0.04),
    di(kotak(0.8, 0.5, 0.14, WARNA.gelap, 0.07), 0, 0.28, -0.04),
    di(kotak(0.7, 0.4, 0.02, 0x9fd3ff, 0.02, 0.55), 0, 0.33, 0.01),
  );
}

export function lemari(w = 1.3, h = 2.4, warna: ColorRepresentation = WARNA.kayu) {
  return grup(
    di(kotak(w, h, 0.62, warna, 0.1), 0, 0, 0),
    di(kotak(w / 2 - 0.06, h - 0.2, 0.04, WARNA.krem, 0.06), -w / 4, 0.1, 0.31),
    di(kotak(w / 2 - 0.06, h - 0.2, 0.04, WARNA.krem, 0.06), w / 4, 0.1, 0.31),
    di(bola(0.05, WARNA.lavender), -0.08, h * 0.52, 0.35),
    di(bola(0.05, WARNA.lavender), 0.08, h * 0.52, 0.35),
  );
}

/** Rak terbuka berisi map/kardus warna-warni; `isi` 0–1 = seberapa penuh (dipakai rak data). */
export function rakTerbuka(w = 1.4, h = 2, isi = 1, warnaRangka: ColorRepresentation = WARNA.kayu) {
  const g = grup(
    di(kotak(0.22, h, 0.52, warnaRangka, 0.1), -w / 2, 0, 0),
    di(kotak(0.22, h, 0.52, warnaRangka, 0.1), w / 2, 0, 0),
  );
  const tingkat = 4;
  const palet = [WARNA.merah, WARNA.sage, WARNA.lavender, WARNA.kuning, WARNA.biruKaca, WARNA.pot];
  for (let i = 0; i < tingkat; i++) {
    const y = 0.08 + (i * (h - 0.16)) / (tingkat - 1);
    g.add(di(kotak(w + 0.12, 0.18, 0.54, warnaRangka, 0.08), 0, y, 0));
    if (i === tingkat - 1) continue;
    const jumlah = Math.round(5 * isi);
    for (let j = 0; j < jumlah; j++)
      g.add(di(kotak(0.16, 0.4, 0.38, palet[(i * 2 + j) % palet.length], 0.03), -w / 2 + 0.22 + j * 0.22, y + 0.07, 0));
  }
  return g;
}

export function tanaman(skala = 1) {
  const g = grup(di(silinder(0.24, 0.18, 0.4, WARNA.pot), 0, 0, 0), di(silinder(0.22, 0.22, 0.04, 0x6b4a3a), 0, 0.38, 0));
  for (let i = 0; i < 6; i++) {
    const daun = kapsul(0.07, 0.42 + (i % 3) * 0.12, WARNA.daun);
    daun.position.set(0, 0.4, 0);
    daun.rotation.set(Math.cos(i) * 0.45, (i / 6) * Math.PI * 2, Math.sin(i * 2) * 0.45);
    g.add(daun);
  }
  g.scale.setScalar(skala);
  return g;
}

/** Jendela untuk dinding; tebal kecil, ditempel di permukaan dinding. */
export function jendela(w = 1.5, h = 1.2) {
  return grup(
    di(kotak(w, h, 0.12, WARNA.kayu, 0.04), 0, 0, 0),
    di(kotak(w / 2 - 0.12, h - 0.2, 0.04, WARNA.biruKaca, 0.02, 0.35), -w / 4 + 0.02, 0.1, 0.05),
    di(kotak(w / 2 - 0.12, h - 0.2, 0.04, WARNA.biruKaca, 0.02, 0.35), w / 4 - 0.02, 0.1, 0.05),
  );
}

export function pintu() {
  return grup(
    di(kotak(1.1, 2.3, 0.12, WARNA.kayuGelap, 0.05), 0, 0, 0),
    di(kotak(0.95, 2.15, 0.06, WARNA.kayu, 0.05), 0, 0.05, 0.05),
    di(bola(0.06, WARNA.kuning), 0.36, 1.1, 0.12),
  );
}

export function dispenser() {
  return grup(
    di(kotak(0.5, 0.95, 0.5, WARNA.putih, 0.08), 0, 0, 0),
    di(kotak(0.16, 0.08, 0.05, WARNA.biruKaca, 0.02), 0, 0.6, 0.26),
    di(silinder(0.2, 0.22, 0.55, 0x9fd0f2), 0, 0.95, 0),
  );
}

export function mejaRapat() {
  const g = meja(2.6, 1.3, WARNA.kayu);
  for (const x of [-0.8, 0, 0.8]) {
    const depan = kursi(WARNA.sage);
    depan.position.set(x, 0, 0.95);
    depan.rotation.y = Math.PI;
    const belakang = kursi(WARNA.sage);
    belakang.position.set(x, 0, -0.95);
    g.add(depan, belakang);
  }
  g.add(di(tanaman(0.55), 0, 0.86, 0));
  return g;
}

export function sofa(warna: ColorRepresentation = WARNA.sage) {
  return grup(
    di(kotak(2.2, 0.5, 0.95, warna, 0.18), 0, 0, 0),
    di(kotak(2.2, 0.8, 0.3, warna, 0.15), 0, 0.2, -0.33),
    di(kotak(0.3, 0.7, 0.95, warna, 0.14), -1.0, 0, 0),
    di(kotak(0.3, 0.7, 0.95, warna, 0.14), 1.0, 0, 0),
    di(kotak(0.6, 0.18, 0.5, WARNA.putih, 0.09), -0.45, 0.5, -0.05),
  );
}

export function karpet(w: number, d: number, warna: ColorRepresentation = WARNA.lavender) {
  const k = kotak(w, 0.03, d, warna, 0.015);
  k.castShadow = false;
  return k;
}

/** Treadmill: alas bersabuk gelap, pegangan dan konsol; pengguna berjalan di tempat di atas sabuk. */
export function treadmill() {
  return grup(
    di(kotak(0.9, 0.22, 2.0, WARNA.abu, 0.08), 0, 0, 0),
    di(kotak(0.72, 0.04, 1.7, WARNA.gelap, 0.02), 0, 0.22, 0.05),
    di(kotak(0.08, 1.2, 0.08, WARNA.abu, 0.03), -0.4, 0.2, -0.85),
    di(kotak(0.08, 1.2, 0.08, WARNA.abu, 0.03), 0.4, 0.2, -0.85),
    di(kotak(0.9, 0.3, 0.25, WARNA.lavender, 0.08), 0, 1.3, -0.85),
    di(kotak(0.5, 0.14, 0.02, 0x9fe0b8, 0.01, 0.6), 0, 1.38, -0.72),
  );
}

/** Sepeda statis: pengguna duduk, kaki mengayuh. */
export function sepedaStatis() {
  const g = grup(
    di(kotak(0.4, 0.12, 1.3, WARNA.abu, 0.05), 0, 0, 0),
    di(kotak(0.12, 0.7, 0.12, WARNA.gelap, 0.04), 0, 0.1, 0.2),
    di(kotak(0.36, 0.1, 0.4, WARNA.gelap, 0.05), 0, 0.8, 0.2),
    di(kotak(0.1, 0.9, 0.1, WARNA.gelap, 0.04), 0, 0.1, -0.45),
    di(kotak(0.6, 0.08, 0.1, WARNA.abu, 0.04), 0, 1.0, -0.45),
  );
  // roda gila tegak di sisi rangka
  const roda = silinder(0.3, 0.3, 0.12, WARNA.sage);
  roda.rotation.z = Math.PI / 2;
  roda.position.set(0.06, 0.4, -0.2);
  g.add(roda);
  return g;
}

/** Rak dumbel kecil berisi beban warna-warni. */
export function rakDumbel() {
  const g = grup(di(kotak(1.4, 0.7, 0.5, WARNA.abu, 0.06), 0, 0, 0));
  [WARNA.merah, WARNA.kuning, WARNA.sage, WARNA.lavender].forEach((w, i) => {
    g.add(di(kotak(0.24, 0.16, 0.16, w, 0.07), -0.48 + i * 0.32, 0.7, -0.08), di(kotak(0.24, 0.16, 0.16, w, 0.07), -0.48 + i * 0.32, 0.7, 0.12));
  });
  return g;
}
