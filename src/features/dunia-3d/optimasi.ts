// Benda bergerak (orang, truk, forklift) ditandai `userData.gerak` dan diberi bayangan bulat lembut
// karena peta bayangan hanya dipanggang sekali.
import { CircleGeometry, Mesh, MeshBasicMaterial, type Object3D } from 'three';

/** Tandai objek bergerak agar tidak ikut digabung. */
export function bergerak<T extends Object3D>(o: T): T {
  o.userData.gerak = true;
  return o;
}

const bahanBayang = new MeshBasicMaterial({ color: 0x2b2440, transparent: true, opacity: 0.18, depthWrite: false });
const piringan = new CircleGeometry(1, 24);
piringan.rotateX(-Math.PI / 2);
/** Bayangan bulat di bawah benda bergerak (radius r, lonjong ke arah z bila `panjang` > 1). */
export function bayanganBulat(r: number, panjang = 1) {
  const m = new Mesh(piringan, bahanBayang);
  m.scale.set(r, 1, r * panjang);
  m.position.y = 0.02;
  m.renderOrder = -1;
  return m;
}

