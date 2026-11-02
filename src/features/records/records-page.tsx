'use client';
import type { ReactNode } from 'react';
import { PAGES, type PageId } from '@/components/layout/nav';
import { PageHeader } from '@/components/layout/page-header';
import { Tabs } from '@/components/ui/tabs';
import { ErrorState, Skeleton } from '@/components/ui/states';
import { useWorkspace } from '@/features/workspace/use-workspace';
import type { Entity } from './schemas';
import { administrationEntities, logisticsEntities, operationEntities } from './constants';
import { catalog } from './catalog';
import { RecordsView } from './records-view';
import { ENTITY_VIEWS } from './entity-views';
import { useRecordParams } from './use-record-params';

/** Status modul yang butuh migrasi: jelaskan alasan dan migrasinya, bukan daftar kosong. */
export function entityReady(
  entity: Entity,
  caps: { operations: boolean; logistics: boolean; administration: boolean },
) {
  if (operationEntities.includes(entity) && !caps.operations)
    return 'Pencatatan belum diaktifkan. Database perlu diperbarui dengan migrasi pencatatan sebelum data bisa disimpan.';
  if (logisticsEntities.includes(entity) && !caps.logistics)
    return 'Pengiriman dan mutasi stok belum aktif. Pasang migrasi 8 (20261006000008_world_logistics.sql) setelah disetujui.';
  if (administrationEntities.includes(entity) && !caps.administration)
    return 'Halaman ini belum aktif. Pasang migrasi 10 (20261015000010_administrasi_usaha.sql) setelah disetujui.';
  return '';
}

export function PageLoading() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Memuat">
      <Skeleton className="h-10 w-56" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    </div>
  );
}

/**
 * Halaman pencatatan bertab (Dokumen, Kontak, Gerai, Barang, Aset, Anggota, Kas, Tim, Agenda, Catatan).
 * Tab dipilih lewat ?tab=; tautan lama ?bagian=<jenis catatan> tetap memilih tab yang sesuai.
 */
export function RecordsPage({
  page,
  extraTabs = {},
  subtitle,
}: {
  page: PageId;
  extraTabs?: Record<string, ReactNode>;
  subtitle?: ReactNode;
}) {
  const info = PAGES[page];
  const tabs = info.tabs || [];
  const { params, setParam } = useRecordParams();
  const legacy = params.get('bagian');
  const requested = params.get('tab') || tabs.find((tab) => tab.entity === legacy)?.id;
  const current = tabs.find((tab) => tab.id === requested) || tabs[0];
  const workspace = useWorkspace(page);
  const { data, loading, error, refresh, more, loadMore, fetching } = workspace;
  const caps = {
    operations: workspace.operations,
    logistics: workspace.logistics,
    administration: workspace.administration,
  };
  const entity = current?.entity;
  const view = entity ? ENTITY_VIEWS[entity] : undefined;
  const blocked = entity ? entityReady(entity, caps) : '';
  const header = (stats?: ReactNode) => (
    <PageHeader
      title={info.label}
      sections={stats || undefined}
      subtitle={subtitle ?? (entity ? catalog[entity].description : undefined)}
      actions={
        tabs.length > 1 ? (
          <Tabs
            label={`Bagian ${info.label}`}
            items={tabs.map((tab) => ({
              id: tab.id,
              label: tab.label,
              count: tab.entity && !loading ? (data[tab.entity] || []).length : undefined,
            }))}
            value={current.id}
            onChange={(id) => setParam('tab', id === tabs[0].id ? null : id)}
          />
        ) : undefined
      }
    />
  );
  return (
    <div className="flex flex-col gap-5">
      {error ? (
        <>
          {header()}
          <ErrorState message={error} onRetry={() => void refresh()} />
        </>
      ) : loading ? (
        <>
          {header()}
          <PageLoading />
        </>
      ) : current && extraTabs[current.id] ? (
        <>
          {header()}
          {extraTabs[current.id]}
        </>
      ) : entity ? (
        <RecordsView
          key={entity}
          entity={entity}
          ws={data}
          refresh={refresh}
          ready={!blocked}
          notReadyText={blocked}
          metrics={view?.metrics ? (rows) => view.metrics!(rows, data) : undefined}
          details={view?.details ? (rows) => view.details!(rows, data) : undefined}
          header={header}
          quickFilters={view?.quickFilters}
          columns={view?.columns}
          cardExtra={view?.cardExtra ? (row) => view.cardExtra!(row, data) : undefined}
          defaultSort={view?.sort}
          more={more[entity] !== undefined}
          onLoadMore={() => void loadMore(entity)}
          loadingMore={fetching === entity}
        />
      ) : null}
    </div>
  );
}
