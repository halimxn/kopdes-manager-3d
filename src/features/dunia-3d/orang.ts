// Bagian figur orang yang dianimasikan dan geraknya; figur sendiri dibangun di karakter.ts.
import type { Group } from 'three';

export type Orang = {
  akar: Group;
  /** Bagian yang dianimasikan: badan untuk bernapas, lengan untuk mengetik/melambai. */
  badan: Group;
  lenganKiri: Group;
  lenganKanan: Group;
  /** Sendi pinggul kiri/kanan; diputar pada sumbu x untuk melangkah. */
  kaki: Group[];
};

/** Gerak idle: bernapas pelan; `mengetik` menggerakkan lengan bergantian di depan badan. */
export function gerakOrang(o: Orang, t: number, fase: number, mengetik: boolean) {
  o.badan.position.y = 0.5 + Math.sin(t * 2 + fase) * 0.015;
  if (mengetik) {
    o.lenganKiri.rotation.x = -1.1 + Math.sin(t * 9 + fase) * 0.12;
    o.lenganKanan.rotation.x = -1.1 + Math.sin(t * 9 + fase + Math.PI) * 0.12;
  } else {
    o.lenganKiri.rotation.x = Math.sin(t * 1.5 + fase) * 0.05;
    o.lenganKanan.rotation.x = -Math.sin(t * 1.5 + fase) * 0.05;
  }
}

/** Langkah berjalan: kaki dan lengan berayun berlawanan, badan memantul kecil. */
export function langkahOrang(o: Orang, t: number, fase: number) {
  const a = Math.sin(t * 8 + fase);
  o.kaki[0].rotation.x = a * 0.5;
  o.kaki[1].rotation.x = -a * 0.5;
  o.lenganKiri.rotation.x = -a * 0.45;
  o.lenganKanan.rotation.x = a * 0.45;
  o.badan.position.y = 0.5 + Math.abs(Math.cos(t * 8 + fase)) * 0.04;
}
