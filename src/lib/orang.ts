const WARNA_ORANG = ['aksen', 'ungu', 'oranye', 'teal', 'pink'] as const;
export type WarnaOrang = (typeof WARNA_ORANG)[number];

/** Warna avatar tetap per nama (kelas `.avatar-warna.is-<warna>`): orang yang sama selalu berwarna sama. */
export function warnaOrang(nama: string): WarnaOrang {
  let h = 0;
  for (const huruf of nama.trim().toLowerCase()) h = (h * 31 + huruf.charCodeAt(0)) >>> 0;
  return WARNA_ORANG[h % WARNA_ORANG.length];
}

/** Dua huruf awal nama untuk avatar; "?" bila nama kosong. */
export function inisialOrang(nama: string): string {
  return (
    nama
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((kata) => kata[0].toUpperCase())
      .join('') || '?'
  );
}
