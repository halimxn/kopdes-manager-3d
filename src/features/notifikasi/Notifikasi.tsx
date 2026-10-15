'use client';
// Pengingat dihitung dari catatan yang sudah ada (tanpa tabel baru): tenggat, rapat 7 hari,
// dokumen yang akan habis, isu, tinjauan risiko, stok minimum, selisih opname, dan tenggat besok.
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/lib/client';
import { addDays, today } from '@/lib/date';
import { usePreference } from '@/lib/usePreference';
import { logisticsEntities, operationEntities, type Entity, type Item } from '../records/schemas';
import { loadCapabilities, type Workspace } from '../workspace/useWorkspace';
import { getFollowUps, recordHref, type FollowUp } from '../workspace/workspace-navigation';

const ENTITAS: Entity[] = ['work-items', 'meetings', 'documents', 'issues', 'risks', 'inventory-items', 'stock-counts'];

// Dimuat sekali per sesi agar setiap halaman tidak menambah permintaan; dibuka ulang = dimuat ulang.
let muatan: Promise<Workspace> | null = null;
function muatCatatan(segar = false): Promise<Workspace> {
  if (segar) muatan = null;
  muatan ??= (async () => {
    const kemampuan = await loadCapabilities();
    const dipilih = ENTITAS.filter((e) => kemampuan.operations || !operationEntities.includes(e)).filter(
      (e) => kemampuan.logistics || !logisticsEntities.includes(e),
    );
    const halaman = await Promise.all(
      dipilih.map((e) => api<{ items: Item[] }>(`${e}?limit=100&scope=current`).then((p) => [e, p.items] as const)),
    );
    return Object.fromEntries(halaman) as Workspace;
  })().catch((galat) => {
    muatan = null;
    throw galat;
  });
  return muatan;
}

export function susunPengingat(data: Workspace, tanggal: string): FollowUp[] {
  const besok = addDays(tanggal, 1);
  const tenggatBesok = (data['work-items'] || [])
    .filter((row) => row.data.due_date === besok && !['selesai', 'dibatalkan'].includes(String(row.data.status)))
    .map((row) => ({
      id: `besok:${row.id}`,
      title: String(row.data.title),
      reason: 'Tenggat besok',
      kind: 'Tugas',
      href: recordHref('work-items', row),
      urgent: false,
    }));
  return [...getFollowUps(data, tanggal), ...tenggatBesok];
}

export function Notifikasi() {
  const [buka, setBuka] = useState(false);
  const [daftar, setDaftar] = useState<FollowUp[] | null>(null);
  const [galat, setGalat] = useState('');
  const [dilihatTeks, setDilihatTeks] = usePreference('hub-notifikasi-dilihat', '[]');
  const dilihat = new Set<string>((() => {
    try {
      const nilai = JSON.parse(dilihatTeks);
      return Array.isArray(nilai) ? nilai.map(String) : [];
    } catch {
      return [];
    }
  })());
  const baru = (daftar || []).filter((item) => !dilihat.has(item.id)).length;

  async function muat(segar = false) {
    try {
      setDaftar(susunPengingat(await muatCatatan(segar), today()));
      setGalat('');
    } catch (e) {
      setGalat((e as Error).message);
    }
  }
  useEffect(() => {
    // Tunggu halaman selesai dimuat dulu supaya pengingat tidak memperlambat halaman.
    const timer = window.setTimeout(() => void muat(), 1500);
    return () => window.clearTimeout(timer);
  }, []);

  function bukaPanel() {
    setBuka(true);
    void muat(true);
  }
  function tutupPanel() {
    setBuka(false);
    if (daftar) setDilihatTeks(JSON.stringify(daftar.map((item) => item.id)));
  }

  const mendesak = (daftar || []).filter((item) => item.urgent);
  const lainnya = (daftar || []).filter((item) => !item.urgent);
  return (
    <>
      <Button
        className="notifikasi-tombol"
        aria-label={baru ? `Pengingat, ${baru} baru` : 'Pengingat'}
        title="Pengingat"
        onClick={bukaPanel}
      >
        <Bell size={19} />
        {baru > 0 && <span className="notifikasi-angka" aria-hidden="true">{baru > 99 ? '99+' : baru}</span>}
      </Button>
      {buka && (
        <Modal className="notifikasi-panel" aria-labelledby="notifikasi-judul" onDismiss={tutupPanel}>
          <div className="notifikasi-kepala">
            <h2 id="notifikasi-judul">Pengingat</h2>
            <Button aria-label="Tutup pengingat" onClick={tutupPanel}>
              <X size={18} />
            </Button>
          </div>
          {galat ? (
            <p className="notice error">Pengingat belum dapat dimuat: {galat}</p>
          ) : !daftar ? (
            <p className="notifikasi-kosong">Memuat pengingat…</p>
          ) : daftar.length === 0 ? (
            <p className="notifikasi-kosong">Tidak ada pengingat. Tenggat, rapat, stok, dan dokumen dalam keadaan aman.</p>
          ) : (
            [['Mendesak', mendesak], ['Perlu dicek', lainnya]].map(([judul, isi]) =>
              (isi as FollowUp[]).length ? (
                <section key={String(judul)} className="notifikasi-kelompok" aria-label={String(judul)}>
                  <h3>
                    {String(judul)} <span>{(isi as FollowUp[]).length}</span>
                  </h3>
                  <ul>
                    {(isi as FollowUp[]).map((item) => (
                      <li key={item.id}>
                        <Link href={item.href} onClick={tutupPanel}>
                          <span className={`notifikasi-jenis${item.urgent ? ' is-mendesak' : ''}`}>{item.kind}</span>
                          <span className="notifikasi-teks">
                            <strong>{item.title}</strong>
                            <small>{item.reason}</small>
                          </span>
                          {!dilihat.has(item.id) && (
                            <span className="notifikasi-titik">
                              <span className="sr-only">Baru</span>
                            </span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null,
            )
          )}
        </Modal>
      )}
    </>
  );
}
