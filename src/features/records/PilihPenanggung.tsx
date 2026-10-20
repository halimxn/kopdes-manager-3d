'use client';
import { useState } from 'react';
import { inisialOrang, warnaOrang } from '@/lib/orang';
import type { Item } from './schemas';

type Calon = { nama: string; peran: string };

/**
 * Daftar orang yang bisa dipilih sebagai penanggung jawab tugas: manajer (dari profil), lalu staf Tim
 * yang tidak nonaktif. Nama lama yang tidak ada di Tim tetap ditawarkan agar data lama tidak hilang.
 */
export function calonPenanggung(staf: Item[], manajer: string, nilai: string): Calon[] {
  const calon: Calon[] = [];
  const ada = (nama: string) => calon.some((c) => c.nama.toLowerCase() === nama.trim().toLowerCase());
  if (manajer.trim()) calon.push({ nama: manajer.trim(), peran: 'Manajer' });
  for (const orang of staf) {
    const nama = String(orang.data.title || '').trim();
    if (!nama || orang.data.status === 'nonaktif' || ada(nama)) continue;
    calon.push({ nama, peran: String(orang.data.role || '') || 'Tim' });
  }
  if (nilai.trim() && !ada(nilai)) calon.push({ nama: nilai.trim(), peran: 'Tidak ada di Tim' });
  return calon;
}

/** Pemilih penanggung jawab berupa kartu orang; nilainya terkirim lewat radio bernama `assignee`. */
export function PilihPenanggung({ id, label, nilai, staf, manajer }: {
  id: string; label: string; nilai: string; staf: Item[]; manajer: string;
}) {
  const calon = calonPenanggung(staf, manajer, nilai);
  // Nama tersimpan bisa beda huruf besar-kecil dengan Tim; pilih kartu orang yang sama.
  const [pilihan, setPilihan] = useState(() => calon.find((c) => c.nama.toLowerCase() === nilai.trim().toLowerCase())?.nama ?? '');
  const opsi = (nama: string, peran: string, avatar: string, warna: string) => (
    <label key={nama || 'kosong'} className="pilih-orang-butir">
      <input type="radio" name="assignee" value={nama} checked={pilihan === nama} onChange={() => setPilihan(nama)} />
      <span className={`avatar-warna is-${warna}`} aria-hidden="true">{avatar}</span>
      <span className="pilih-orang-teks">
        <strong>{nama || 'Belum ada'}</strong>
        <small>{peran}</small>
      </span>
    </label>
  );
  return (
    <fieldset className="pilih-orang field-wide" id={id}>
      <legend className="ui-field-label">{label}</legend>
      <div className="pilih-orang-daftar">
        {opsi('', 'Tentukan nanti', '–', 'kosong')}
        {calon.map((c) => opsi(c.nama, c.peran, inisialOrang(c.nama), warnaOrang(c.nama)))}
      </div>
      {staf.length === 0 && (
        <small className="ui-field-helper">
          Daftar Tim masih kosong. <a href="/tim?baru=1" target="_blank" rel="noreferrer">Tambah anggota Tim</a> agar bisa dipilih di sini.
        </small>
      )}
    </fieldset>
  );
}
