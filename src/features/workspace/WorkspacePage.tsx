'use client';
import { Button } from '@/components/ui/Button';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useWorkspace } from './useWorkspace';
import { pages, catalog } from '../records/catalog';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Entity, Item } from '../records/schemas';
import { administrationEntities, schemas } from '../records/schemas';
import { today } from '@/lib/date';
import { SkeletonLoading } from '@/components/ui/SkeletonLoading';
import { pageEntities, recordingPaths } from './workspace-scope';
import { ManagerGuide } from './ManagerGuide';
import { TabHub } from '@/components/layout/TabHub';
// Tiap halaman hanya memuat komponennya sendiri agar unduhan JS awal kecil.
// Nama tab bila satu halaman memuat beberapa jenis catatan; selain ini memakai judul katalog.
const tabLabels: Partial<Record<Entity, string>> = {
  deliveries: 'Pengiriman',
  'stock-movements': 'Mutasi stok',
  organization: 'Profil koperasi',
  workstreams: 'Bidang kerja',
  decisions: 'Keputusan',
  meetings: 'Rapat',
  issues: 'Isu lapangan',
  risks: 'Risiko',
  interactions: 'Riwayat interaksi',
  trainings: 'Pelatihan',
  staff: 'Tim',
  stakeholders: 'Mitra & kontak',
};
const Records = dynamic(() => import('../records/Records').then((module) => module.Records), {
  loading: () => <SkeletonLoading slug="tugas" />,
});
const Dashboard = dynamic(
  () => import('../dashboard/Dashboard').then((module) => module.Dashboard),
  {
    loading: () => <SkeletonLoading slug="beranda" />,
  },
);
const Operations = dynamic(
  () => import('../operations/Operations').then((module) => module.Operations),
  {
    loading: () => <SkeletonLoading slug="pencatatan" />,
  },
);
const TodayView = dynamic(
  () => import('../dashboard/TodayView').then((module) => module.TodayView),
  {
    loading: () => <SkeletonLoading slug="hari-ini" />,
  },
);
const FollowUps = dynamic(() =>
  import('../follow-ups/FollowUps').then((module) => module.FollowUps),
);
const RingkasanAdministrasi = dynamic(() =>
  import('../administrasi/RingkasanAdministrasi').then((module) => module.RingkasanAdministrasi),
);
const Editor = dynamic(() => import('../records/Editor').then((module) => module.Editor));
const MonitoringDashboard = dynamic(() =>
  import('../dunia-3d/MonitoringDashboard').then((module) => module.MonitoringDashboard),
);
const Roadmap = dynamic(() => import('../roadmap/Roadmap').then((module) => module.Roadmap), {
  loading: () => <SkeletonLoading slug="roadmap" />,
});
const Settings = dynamic(() => import('../settings/Settings').then((module) => module.Settings), {
  loading: () => <SkeletonLoading slug="pengaturan" />,
});
const Reports = dynamic(() => import('../reports/Reports').then((module) => module.Reports), {
  loading: () => <SkeletonLoading slug="laporan" />,
});
const Projects = dynamic(() => import('../projects/Projects').then((module) => module.Projects), {
  loading: () => <SkeletonLoading slug="proyek" />,
});
export function WorkspacePage({ slug }: { slug: string }) {
  const query = useSearchParams();
  const router = useRouter();
  const requestedSection = query.get('bagian');
  const taskScope = ['proyek', 'riwayat-proyek'].includes(slug)
    ? 'all'
    : ['selesai', 'dibatalkan'].includes(query.get('status') || '')
      ? 'history'
      : 'current';
  const requestedRecord =
    query.get('record') ||
    query.get('task') ||
    (['proyek', 'riwayat-proyek'].includes(slug) ? query.get('id') : null);
  const selectedEntity = (
    query.get('task')
      ? 'work-items'
      : ['proyek', 'riwayat-proyek'].includes(slug) && query.get('id')
        ? 'workstreams'
        : query.get('bagian') || pages[slug]?.[0]
  ) as Entity | undefined;
  const detail =
    requestedRecord &&
    selectedEntity &&
    pageEntities(slug).includes(selectedEntity) &&
    /^[a-f\d-]{36}$/i.test(requestedRecord)
      ? { entity: selectedEntity, id: requestedRecord }
      : undefined;
  const {
      data,
      loading,
      error,
      refresh,
      operations,
      logistics,
      administration,
      more,
      loadMore,
      fetching,
    } = useWorkspace(
      slug,
      {
        scope: taskScope,
        ...(['proyek', 'riwayat-proyek'].includes(slug) &&
        /^[a-f\d-]{36}$/i.test(query.get('id') || '')
          ? { project: query.get('id')! }
          : {}),
      },
      detail,
    ),
    [tabChoice, setTabChoice] = useState<{ section: string | null; index: number } | null>(null),
    [draft, setDraft] = useState<Item>();
  useEffect(() => {
    const callback = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      setDraft({
        id: '',
        created_at: '',
        updated_at: '',
        data: schemas['work-items'].parse({ title: 'Tugas baru', ...detail, due_date: today() }),
      });
    };
    window.addEventListener('hub-task', callback);
    return () => window.removeEventListener('hub-task', callback);
  }, []);
  // Halaman yang butuh migrasi tambahan: tampilkan alasan, bukan daftar kosong.
  const belumAktif =
    slug === 'pengiriman' && !logistics
      ? 'Pengiriman dan mutasi stok belum aktif. Pasang migrasi 8 (20261006000008_world_logistics.sql) setelah disetujui; data belum dapat dicatat di sini.'
      : pages[slug]?.some((entity) => administrationEntities.includes(entity)) && !administration
        ? 'Halaman ini belum aktif. Pasang migrasi 10 (20261015000010_administrasi_usaha.sql) setelah disetujui; data belum dapat dicatat di sini.'
        : '';
  const sectionIndex = pages[slug]?.findIndex((entity) => entity === requestedSection) ?? -1;
  const tab = tabChoice?.section === requestedSection ? tabChoice.index : Math.max(0, sectionIndex);
  if (slug === 'dunia-koperasi')
    return (
      <MonitoringDashboard
        data={data}
        loading={loading}
        error={error}
        refresh={refresh}
        more={more}
        loadMore={loadMore}
        fetching={fetching}
        operations={operations}
        logistics={logistics}
      />
    );
  // Tab hub tampil juga saat memuat/galat: tidak bergeser, dan halaman saudara tetap bisa dibuka.
  if (loading)
    return (
      <>
        <TabHub path={`/${slug}`} />
        <SkeletonLoading slug={slug} />
      </>
    );
  if (error)
    return (
      <>
      <TabHub path={`/${slug}`} />
      <section className="card empty">
        <h2>Ruang kerja belum dapat dimuat</h2>
        <p role="alert">{error}</p>
        <Button onClick={() => void refresh()}>Coba lagi</Button>
        <p>
          Data kosong tidak ditampilkan sebagai capaian. Periksa koneksi dan konfigurasi server.
        </p>
      </section>
      </>
    );
  return (
    <div className={`workspace-page page-${slug}`}>
      <TabHub path={`/${slug}`} />
      {slug === 'tugas' && (
        <div className="workspace-scope-control" role="group" aria-label="Rentang tugas">
          <Button
            type="button"
            aria-pressed={taskScope === 'current'}
            onClick={() => {
              const next = new URLSearchParams(query.toString());
              next.delete('status');
              router.replace(`/tugas${next.size ? '?' + next.toString() : ''}`);
            }}
          >
            Aktif dan terbaru
          </Button>
          <Button
            type="button"
            aria-pressed={taskScope === 'history'}
            onClick={() => {
              const next = new URLSearchParams(query.toString());
              next.set('status', 'selesai');
              router.replace(`/tugas?${next.toString()}`);
            }}
          >
            Riwayat selesai
          </Button>
        </div>
      )}
      {Object.keys(more).length > 0 && (
        <p className="workspace-partial-note">
          Menampilkan catatan yang sudah dimuat. Angka pada halaman ini dapat bertambah saat Anda
          memuat catatan lain.
        </p>
      )}
      {slug === 'tindak-lanjut' && <FollowUps data={data} />}
      {slug === 'beranda' && <Dashboard data={data} />}
      {['proyek', 'riwayat-proyek'].includes(slug) && (
        <Projects
          key={query.get('tab') || slug}
          data={data}
          refresh={refresh}
          history={slug === 'riwayat-proyek' || query.get('tab') === 'riwayat'}
        />
      )}
      {recordingPaths.includes(slug) && (
        <Operations
          key={slug + query.toString()}
          slug={slug}
          data={data}
          ready={operations}
          refresh={refresh}
        />
      )}
      {slug === 'roadmap' && <Roadmap data={data} refresh={refresh} />}
      {slug === 'laporan' && <Reports />}
      {slug === 'pengaturan' && (
        <Settings refresh={refresh} organization={data.organization?.[0]} />
      )}
      {slug === 'hari-ini' && <TodayView workspace={data} refresh={refresh} />}
      {belumAktif ? (
        <p className="workspace-partial-note" role="status">
          {belumAktif}
        </p>
      ) : (
        pages[slug] &&
        slug !== 'pengaturan' && (
          <>
            <Records
              key={pages[slug][tab] + (query.get('record') || '') + (query.get('task') || '')}
              tabs={
                pages[slug].length > 1 && (
                  <div className="tabs" role="tablist" aria-label="Bagian halaman">
                    {pages[slug].map((entity, index) => (
                      <Button
                        role="tab"
                        aria-selected={tab === index}
                        key={entity}
                        onClick={() => setTabChoice({ section: requestedSection, index })}
                      >
                        {tabLabels[entity] ?? catalog[entity].title}
                      </Button>
                    ))}
                  </div>
                )
              }
              ringkasan={
                administrationEntities.includes(pages[slug][tab]) && (
                  <RingkasanAdministrasi entity={pages[slug][tab]} data={data} />
                )
              }
              entity={pages[slug][tab]}
              workspace={data}
              refresh={refresh}
            />
            {more[pages[slug][tab]] !== undefined && (
              <Button
                className="workspace-load-more"
                type="button"
                disabled={fetching !== null}
                onClick={() => void loadMore(pages[slug][tab])}
              >
                {fetching === pages[slug][tab]
                  ? 'Memuat…'
                  : `Muat 50 ${pages[slug][tab] === 'work-items' ? 'tugas' : 'catatan'} lagi`}
              </Button>
            )}
          </>
        )
      )}
      {slug === 'beranda' && more['work-items'] !== undefined && (
        <Button
          className="workspace-load-more"
          type="button"
          disabled={fetching !== null}
          onClick={() => void loadMore('work-items')}
        >
          {fetching === 'work-items' ? 'Memuat…' : 'Muat 50 tugas lagi'}
        </Button>
      )}
      {!pages[slug] && slug !== 'beranda' && Object.keys(more).length > 0 && (
        <details className="workspace-more-details">
          <summary>Catatan lain yang belum dimuat</summary>
          <div className="workspace-more-actions">
            {(Object.keys(more) as Entity[]).map((entity) => (
              <Button
                className="workspace-load-more"
                key={entity}
                type="button"
                disabled={fetching !== null}
                onClick={() => void loadMore(entity)}
              >
                {fetching === entity
                  ? 'Memuat…'
                  : `Muat 50 ${catalog[entity].title.toLowerCase()} lagi`}
              </Button>
            ))}
          </div>
        </details>
      )}
      {slug === 'panduan' && <ManagerGuide />}
      {draft && (
        <Editor
          entity="work-items"
          item={draft}
          workspace={data}
          onClose={() => setDraft(undefined)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
