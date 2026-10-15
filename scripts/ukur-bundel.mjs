// Ukuran JS awal halaman operasional dari hasil `npm run build` (chunk yang dimuat sebelum komponen dinamis).
// Pakai setelah build: `npm run ukur:bundel`. Batas menjaga halaman tetap cepat; naikkan hanya dengan alasan.
import fs from 'node:fs';

const BATAS_KB = 300;
const manifest = '.next/server/app/(app)/[slug]/page_client-reference-manifest.js';
if (!fs.existsSync(manifest)) throw new Error('Jalankan `npm run build` dulu.');
const chunks = [...new Set(fs.readFileSync(manifest, 'utf8').match(/static\/chunks\/[^"]+\.js/g) || [])];
const kb = Math.round(chunks.reduce((total, chunk) => total + fs.statSync(`.next/${chunk}`).size, 0) / 1024);
console.log(`JS awal halaman operasional: ${kb} KB dari ${chunks.length} chunk (batas ${BATAS_KB} KB).`);
if (kb > BATAS_KB) {
  console.error('Melebihi batas: periksa impor statis baru di WorkspacePage/Records; pakai next/dynamic untuk komponen per halaman.');
  process.exit(1);
}
