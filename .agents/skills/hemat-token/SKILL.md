---
name: hemat-token
description: Wajib di awal setiap sesi kerja proyek Kopdes (Claude, Codex, Antigravity) dan saat tugas panjang — cara membaca, mengedit, memeriksa, dan melapor dengan token sedikit tanpa menurunkan hasil; juga urutan Git di awal sesi (cabang kerja aktif). Pakai bersama skill global ponytail untuk menjaga perubahan tetap kecil.
---

# Hemat token, hasil tetap sama

Penghematan hanya pada cara kerja dan laporan. Pemeriksaan wajib di `AGENTS.md` tetap dijalankan.

## Awal sesi (urut)
1. `git status -sb` dan `git branch`. Ada cabang kerja yang belum masuk `main`? Lanjutkan di situ; jangan membuat cabang baru (aturan Git di `AGENTS.md`).
2. Baca `docs/LANJUTAN-AI.md`; dokumen lain hanya bagian yang relevan.
3. Aktifkan `ponytail` (skill global) untuk perubahan kode: perubahan terkecil yang lengkap.

## Membaca
- `grep -n` / `rg` untuk menemukan baris, lalu baca potongan (`sed -n a,bp` atau Read dengan offset). Jangan membaca ulang berkas yang baru diedit.
- Berkas besar jangan dibuka utuh: `Records.tsx`, `Operations.tsx`, `MonitoringDashboard.tsx`, `monitoring-scene.ts`, `Editor.tsx`, `src/styles/halaman/catatan.css`.
- Graphify opsional, hanya bila pemilik meminta. Abaikan `not-use/`.

## Mengedit
- Banyak penggantian: satu skrip Python/Node di scratchpad (baca → `replace` → `assert` teks lama ada → tulis). Tulis skrip dengan alat Write; heredoc bash menelan backslash.
- Jangan mengubah gaya kode di luar baris yang disentuh.

## Memeriksa (urut, keluaran diringkas)
1. `npx tsc --noEmit` → `npm run lint` → `npm run lint:ui`.
2. Tes terfokus, lalu seluruh tes `npm test -- --maxWorkers=2`. Tes gagal karena timeout saat mesin sibuk (audit/build berjalan): ulangi berkas itu saja sebelum menyimpulkan; jangan menjalankan tes bersamaan dengan audit.
3. `npm run build`, lalu `npm run ukur:bundel` (JS awal halaman ≤ 300 KB).
4. Tampilan: skill `ui-ux-kopdes` (audit:tampilan). Dunia: skill `dunia-koperasi`.
5. Setelah build: `git checkout -- next-env.d.ts` bila ikut berubah.

## Melapor
- Bahasa Indonesia sederhana: apa berubah, bukti pemeriksaan (angka), yang belum diperiksa, langkah berikut. Tanpa mengulang kode atau daftar berkas panjang.
- Commit per paket tanpa atribusi AI; push hanya bila pemilik meminta.
