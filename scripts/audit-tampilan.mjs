// Audit tampilan lewat Chrome DevTools Protocol: buka setiap halaman, tampilan, tab, laci, editor, dan dialog
// (lipatan terbuka), lalu laporkan kontrol berukuran janggal, teks luber, elemen keluar layar, isi tombol meluap,
// ikon yang terpisah dari teksnya, dan elemen yang saling menimpa. Tangkapan layar ikut disimpan untuk dilihat.
// Pakai: `npm run dev:demo -- -p 3200`, lalu `npm run audit:tampilan -- 375 812 [filter-nama]`.
// Lingkungan: AUDIT_URL (bawaan http://localhost:3200), CHROME (path Chrome/Chromium).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const [, , lebarArg = '375', tinggiArg = '812', filter] = process.argv;
const lebar = Number(lebarArg), tinggi = Number(tinggiArg);
const dasar = process.env.AUDIT_URL || 'http://localhost:3200';
const tmp = path.join(os.tmpdir(), 'kopdes-audit');
const out = path.join(tmp, String(lebar));
fs.mkdirSync(out, { recursive: true });
const chromeBawaan = {
  win32: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  darwin: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
}[process.platform] || 'google-chrome';

const bukaLipatan = `document.querySelectorAll('main details:not(.record-options):not(.view-extra-actions)').forEach(d => d.open = true)`;
const klik = (sel) => `(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (e) e.click(); return !!e; })()`;
const klikTeks = (sel, teks) => `(() => { const e = [...document.querySelectorAll(${JSON.stringify(sel)})].find(x => x.textContent.includes(${JSON.stringify(teks)})); if (e) e.click(); return !!e; })()`;

const halaman = ['beranda', 'hari-ini', 'tugas', 'proyek', 'roadmap', 'jurnal', 'pencatatan', 'keuangan', 'barang', 'stok-opname', 'pengiriman', 'anggota', 'gerai', 'kesiapan', 'risiko', 'laporan', 'rapat', 'dokumen', 'mitra', 'tim', 'pengaturan', 'panduan'];
const keadaan = [
  ...halaman.map((r) => ({ nama: r, rute: r, aksi: [bukaLipatan] })),
  ...['harian', 'papan', 'kalender', 'gantt'].map((v) => ({ nama: `tugas-${v}`, rute: `tugas?view=${v}`, aksi: [bukaLipatan] })),
  ...['papan', 'kalender', 'gantt'].map((v) => ({ nama: `jurnal-${v}`, rute: `jurnal?view=${v}`, aksi: [bukaLipatan] })),
  ...['Profil koperasi', 'Keamanan PIN', 'Cadangan data'].map((t) => ({ nama: `pengaturan-${t}`, rute: 'pengaturan', aksi: [klikTeks('.settings-tab-btn', t)] })),
  ...['Keputusan', 'Riwayat interaksi', 'Isu'].map((t) => ({ nama: `tab-${t}`, rute: t === 'Keputusan' ? 'rapat' : t === 'Isu' ? 'risiko' : 'mitra', aksi: [klikTeks('.workspace-page > .tabs .ui-btn', t)] })),
  { nama: 'proyek-detail', rute: 'proyek', aksi: [klik('.project-card a, a.project-card, .project-card'), bukaLipatan] },
  { nama: 'dialog-tambah', rute: 'beranda', aksi: [klik('.quick-action-hub-btn')] },
  { nama: 'dialog-cari', rute: 'beranda', aksi: [`(() => { const b = [...document.querySelectorAll('header button')].find(x => /cari/i.test(x.getAttribute('aria-label') || '')); b?.click(); return !!b; })()`] },
  { nama: 'laci-tugas', rute: 'tugas', aksi: [klik('.ui-btn.task-title-btn')] },
  ...['tugas', 'keuangan', 'barang', 'rapat', 'mitra', 'gerai', 'anggota', 'pengiriman', 'risiko'].map((r) => ({ nama: `editor-${r}`, rute: `${r}?baru=1`, aksi: [] })),
  ...['rapat', 'gerai', 'mitra', 'dokumen'].map((r) => ({ nama: `laci-${r}`, rute: r, aksi: [klikTeks('.record .ui-btn', 'Buka catatan')] })),
  { nama: 'dialog-periode', rute: 'tugas', aksi: [`(() => { const d = document.querySelector('.view-extra-actions'); if (d) d.open = true; return !!d; })()`, klik('.btn-sprint-trigger')] },
  { nama: 'dialog-csv', rute: 'tugas', aksi: [`(() => { const d = document.querySelector('.view-extra-actions'); if (d) d.open = true; return !!d; })()`, klik('.btn-csv-trigger')] },
  { nama: 'dialog-rutinitas', rute: 'beranda', aksi: [`(() => { const d = document.querySelector('.dashboard-routines'); if (d) d.open = true; return !!d; })()`, klik('.btn-routine-config')] },
  { nama: 'dialog-jadwal-berkala', rute: 'tugas', aksi: [klik('.ui-btn.task-title-btn'), klik('.btn-drawer-action[title="Atur Jadwal Berkala"]')] },
  { nama: 'dialog-milestone', rute: 'roadmap', aksi: [klik('.btn-add-milestone')] },
  { nama: 'gantt-penuh', rute: 'tugas?view=gantt', aksi: [klik('.timeline-fullscreen-launch-btn')] },
].filter((k) => !filter || k.nama.includes(filter));

// Pemeriksaan di halaman; lingkup = dialog terbuka bila ada, selain itu <main>.
const PERIKSA = `(() => {
  const W = document.documentElement.clientWidth;
  const dialog = [...document.querySelectorAll('dialog[open]')].pop();
  const akar = dialog || document.querySelector('main') || document.body;
  const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0'; };
  const nama = (e) => { const c = (e.className && typeof e.className === 'string') ? '.' + e.className.trim().split(/\\s+/).slice(0, 3).join('.') : ''; const t = (e.innerText || e.getAttribute('aria-label') || '').trim().replace(/\\s+/g, ' ').slice(0, 40); return e.tagName.toLowerCase() + c + (t ? ' "' + t + '"' : ''); };
  const temuan = [];
  const tambah = (jenis, e, info) => temuan.push(jenis + ' | ' + nama(e) + (info ? ' | ' + info : ''));
  const klip = (e) => { for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) { const o = getComputedStyle(p); if (/(auto|scroll|hidden|clip)/.test(o.overflowX)) return true; } return false; };
  const tersembunyi = (e) => { const cs = getComputedStyle(e); return cs.clip === 'rect(0px, 0px, 0px, 0px)' || (parseFloat(cs.width) <= 1 && cs.position === 'absolute') || e.classList.contains('sr-only'); };
  const semua = [...akar.querySelectorAll('*')].filter(e => vis(e) && !e.closest('svg') && !tersembunyi(e) && !(e.parentElement && tersembunyi(e.parentElement)));
  for (const e of semua) {
    const cs = getComputedStyle(e); const r = e.getBoundingClientRect();
    if (e.matches('input[type=checkbox], input[type=radio]') && (r.width > 26 || r.height > 26)) tambah('KONTROL-JANGGAL', e, Math.round(r.width) + 'x' + Math.round(r.height));
    if (r.right > W + 1 && cs.position !== 'fixed' && !klip(e)) tambah('KELUAR-LAYAR', e, 'kanan=' + Math.round(r.right) + ' > ' + W);
    const teksLangsung = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (teksLangsung && e.scrollWidth > e.clientWidth + 2 && e.clientWidth > 0 && !/(auto|scroll)/.test(cs.overflowX) && cs.textOverflow !== 'ellipsis' && cs.display !== 'inline') tambah('TEKS-LUBER', e, e.scrollWidth + '>' + e.clientWidth);
    if (e.matches('.ui-btn, button') && [...e.children].some(k => { if (/(absolute|fixed)/.test(getComputedStyle(k).position)) return false; const rk = k.getBoundingClientRect(); if (rk.width === 0 || rk.height === 0) return false; return rk.right > r.right + 2 || rk.bottom > r.bottom + 2 || rk.left < r.left - 2; })) tambah('TOMBOL-MELUAP', e, e.scrollWidth + 'x' + e.scrollHeight + ' dalam ' + e.clientWidth + 'x' + e.clientHeight);
    // Ikon svg di wadah non-flex yang juga berisi teks: preflight membuat svg block sehingga ikon turun ke baris sendiri
    const ikonAnak = [...e.children].find(k => k.tagName === 'svg');
    if (ikonAnak && teksLangsung && !/(flex|grid)/.test(cs.display)) { const ri = ikonAnak.getBoundingClientRect(); const rangeT = document.createRange(); const tn = [...e.childNodes].find(n => n.nodeType === 3 && n.textContent.trim()); rangeT.selectNodeContents(tn); const rt = rangeT.getBoundingClientRect(); if (rt.top >= ri.bottom - 2 || ri.top >= rt.bottom - 2) tambah('IKON-TERPISAH', e, cs.display); }
    // Saudara yang saling menimpa (hanya aliran normal)
    const anak = [...e.children].filter(k => vis(k) && !/(absolute|fixed|sticky)/.test(getComputedStyle(k).position));
    if (anak.length > 1 && anak.length < 60) {
      const kotak = anak.map(k => [k, k.getBoundingClientRect()]);
      for (let i = 0; i < kotak.length; i++) for (let j = i + 1; j < kotak.length; j++) {
        const [a, ra] = kotak[i], [b, rb] = kotak[j];
        const lx = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), ly = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
        if (lx > 4 && ly > 4) tambah('MENIMPA', a, 'dengan ' + nama(b) + ' ' + Math.round(lx) + 'x' + Math.round(ly));
      }
    }
  }
  return { lingkup: dialog ? 'dialog.' + dialog.className : 'main', temuan: [...new Set(temuan)].slice(0, 60) };
})()`;

const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn(process.env.CHROME || chromeBawaan, [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${tmp}/profil-${port}`,
  '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars', '--no-first-run', 'about:blank',
], { stdio: 'ignore' });
const tunggu = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 60 && !target; i++) {
  try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page'); } catch {}
  if (!target) await tunggu(250);
}
if (!target) throw new Error('Chrome tidak dapat dijalankan; atur CHROME ke path Chrome/Chromium.');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const menunggu = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && menunggu.has(m.id)) { menunggu.get(m.id)(m); menunggu.delete(m.id); } });
const kirim = (method, params = {}) => new Promise((r) => { const n = ++id; menunggu.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
const nilai = async (expr) => (await kirim('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.result?.value;

await kirim('Page.enable');
await kirim('Emulation.setDeviceMetricsOverride', { width: lebar, height: tinggi, deviceScaleFactor: 1, mobile: lebar < 1024 });
await kirim('Emulation.setTouchEmulationEnabled', { enabled: lebar < 1024, maxTouchPoints: 5 });

const laporan = [];
for (const k of keadaan) {
  await kirim('Page.navigate', { url: `${dasar}/${k.rute}` });
  await tunggu(1500);
  for (let i = 0; i < 120; i++) {
    if (await nilai(`document.readyState==='complete' && !document.querySelector('[class*=skeleton]') && !!document.querySelector('main')`)) break;
    await tunggu(500);
  }
  await tunggu(800);
  let ok = true;
  for (const a of k.aksi) { const v = await nilai(a); if (v === false) ok = false; await tunggu(700); }
  const hasil = await nilai(PERIKSA);
  const shot = await kirim('Page.captureScreenshot', { format: 'png' });
  if (shot.result?.data) fs.writeFileSync(path.join(out, `${k.nama.replace(/[^\w-]/g, '_')}.png`), Buffer.from(shot.result.data, 'base64'));
  const n = hasil?.temuan?.length ?? -1;
  laporan.push(`## ${k.nama} (${hasil?.lingkup})${ok ? '' : ' [aksi tidak menemukan elemen]'} — ${n} temuan\n${(hasil?.temuan || []).map((t) => '- ' + t).join('\n')}`);
  console.log(`${k.nama}: ${n}${ok ? '' : ' (aksi gagal)'}`);
}
fs.writeFileSync(path.join(out, 'laporan.md'), laporan.join('\n\n'));
console.log(`Laporan dan tangkapan: ${out}`);
ws.close();
chrome.kill();
