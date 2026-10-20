'use client';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

import Link from 'next/link';
import { useState, type KeyboardEvent } from 'react';
import { AlarmClock, ArrowUpRight, CalendarPlus, FileSearch, NotebookPen, Plus, Search, UserPlus, Wallet } from 'lucide-react';
import { navigation } from '../records/catalog';
import { searchWorkspace } from './workspace-navigation';
import type { Workspace } from './useWorkspace';
import { IkonHalaman } from '@/components/ui/IkonHalaman';
import { bacaTambahCepat } from '../dashboard/beranda-bantu';
import { today } from '@/lib/date';

const scopes = [
  ['all', 'Semua'],
  ['work-items', 'Tugas'],
  ['workstreams', 'Proyek'],
  ['documents', 'Dokumen'],
  ['meetings', 'Agenda'],
] as const;

// Perintah yang paling sering dipakai manajer; semuanya membuka form terisi atau halaman, tidak menulis sendiri.
const PERINTAH = [
  { label: 'Tambah tugas', href: '/tugas?baru=1', Ikon: Plus },
  { label: 'Jadwalkan agenda', href: '/rapat?baru=1', Ikon: CalendarPlus },
  { label: 'Catat kegiatan', href: '/jurnal?baru=1', Ikon: NotebookPen },
  { label: 'Catat uang masuk atau keluar', href: '/keuangan?baru=1', Ikon: Wallet },
  { label: 'Tambah anggota Tim', href: '/tim?baru=1', Ikon: UserPlus },
  { label: 'Lihat tugas terlambat', href: '/tugas?status=terlambat', Ikon: AlarmClock },
];

/** Tautan form tugas terisi dari kalimat bebas (@nama, #proyek, !prioritas, kata waktu). */
export function tautanBuatTugas(teks: string, workspace: Workspace | null): string {
  const isian = bacaTambahCepat(teks, {
    hariIni: today(),
    staf: (workspace?.staff || []).map((row) => String(row.data.title || '')).filter(Boolean),
    proyek: (workspace?.workstreams || []).map((row) => ({ id: row.id, title: String(row.data.title) })),
  });
  const query = new URLSearchParams({ baru: '1' });
  for (const [kolom, nilai] of Object.entries(isian)) if (nilai) query.set(`isi.${kolom}`, nilai);
  return `/tugas?${query}`;
}

/** Panah atas/bawah berpindah antara kolom cari dan setiap hasil; Enter di kolom membuka hasil pertama. */
function geserFokus(event: KeyboardEvent<HTMLDivElement>) {
  if (!['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) return;
  const akar = event.currentTarget;
  const butir = [...akar.querySelectorAll<HTMLElement>('.workspace-search-results a')];
  const kolom = akar.querySelector<HTMLInputElement>('input');
  const sekarang = butir.indexOf(document.activeElement as HTMLElement);
  if (event.key === 'Enter') {
    if (document.activeElement === kolom && butir[0]) {
      event.preventDefault();
      butir[0].click();
    }
    return;
  }
  event.preventDefault();
  const berikut = event.key === 'ArrowDown' ? sekarang + 1 : sekarang - 1;
  if (berikut < 0) kolom?.focus();
  else butir[Math.min(berikut, butir.length - 1)]?.focus();
}

export function WorkspaceSearch({
  workspace,
  onNavigate,
}: {
  workspace: Workspace | null;
  onNavigate: () => void;
}) {
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState<string>('all');
  const query = search.trim();
  const kecil = query.toLocaleLowerCase('id');
  const results = workspace ? searchWorkspace(workspace, query, scope) : [];
  const pages = scope === 'all' ? navigation.filter(([, label]) => label.toLocaleLowerCase('id').includes(kecil)) : [];
  const perintah = scope === 'all' ? PERINTAH.filter((p) => p.label.toLocaleLowerCase('id').includes(kecil)) : [];

  return (
    <div className="workspace-search" onKeyDown={geserFokus}>
      <label className="workspace-search-field">
        <Search size={20} aria-hidden="true" />
        <Input
          autoFocus
          className="ui-search-input"
          aria-label="Cari halaman atau isi catatan"
          type="search"
          placeholder="Cari, buka halaman, atau tulis tugas baru…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      <div className="workspace-search-scopes" role="group" aria-label="Jenis hasil pencarian">
        {scopes.map(([value, label]) => (
          <Button key={value} type="button" aria-pressed={scope === value} onClick={() => setScope(value)}>
            {label}
          </Button>
        ))}
      </div>
      <p className="workspace-search-hint">
        <kbd>↑</kbd> <kbd>↓</kbd> pindah · <kbd>Enter</kbd> buka · catatan dicari dari data yang sudah dimuat, maksimal 30 hasil.
      </p>
      <div className="workspace-search-results" aria-live="polite">
        {query && scope === 'all' && (
          <Link className="is-perintah is-buat" href={tautanBuatTugas(query, workspace)} onClick={onNavigate}>
            <span className="workspace-search-icon">
              <Plus size={18} aria-hidden="true" />
            </span>
            <span className="workspace-search-copy">
              <strong>Buat tugas: {query}</strong>
              <small>Form tugas terisi; @nama, #proyek, !prioritas, dan besok/lusa dikenali</small>
            </span>
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        )}
        {perintah.length > 0 && (
          <div className="workspace-search-group">
            Perintah <span>{perintah.length}</span>
          </div>
        )}
        {perintah.map(({ label, href, Ikon }) => (
          <Link key={href} className="is-perintah" href={href} onClick={onNavigate}>
            <span className="workspace-search-icon">
              <Ikon size={18} aria-hidden="true" />
            </span>
            <span className="workspace-search-copy">
              <strong>{label}</strong>
            </span>
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        ))}
        {query && (
          <>
            <div className="workspace-search-group">
              Catatan <span>{results.length}</span>
            </div>
            {results.map((result) => (
              <Link key={result.id} href={result.href} onClick={onNavigate}>
                <span className="workspace-search-icon">
                  <FileSearch size={18} />
                </span>
                <span className="workspace-search-copy">
                  <strong>{result.title}</strong>
                  <small>
                    {result.kind}
                    {result.context && ` · ${result.context}`}
                  </small>
                </span>
                <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            ))}
            {!results.length && (
              <p>
                {workspace
                  ? 'Tidak ada catatan yang cocok pada data yang dimuat.'
                  : 'Catatan belum dimuat. Pencarian halaman tetap tersedia.'}
              </p>
            )}
          </>
        )}
        {pages.length > 0 && (
          <div className="workspace-search-group">
            Halaman <span>{pages.length}</span>
          </div>
        )}
        {pages.map(([href, label]) => (
          <Link key={href} href={href} onClick={onNavigate}>
            <span className="workspace-search-icon" aria-hidden="true">
              <IkonHalaman href={href} size={18} />
            </span>
            <span className="workspace-search-copy">
              <strong>{label}</strong>
            </span>
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        ))}
      </div>
    </div>
  );
}
