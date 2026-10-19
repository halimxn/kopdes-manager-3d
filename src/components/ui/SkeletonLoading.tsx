'use client';

export function SkeletonLoading({ slug = 'beranda' }: { slug?: string }) {
  if (slug === 'tugas' || slug === 'jurnal') {
    return (
      <div className="skeleton-screen-container" role="status" aria-label="Memuat data ruang kerja">
        {/* Header Skeleton */}
        <div className="skeleton-header-row">
          <div className="skeleton-title-group">
            <div className="skeleton-pill skeleton-eyebrow" />
            <div className="skeleton-pill skeleton-title-bar" />
          </div>
          <div className="skeleton-pill skeleton-btn-pill" />
        </div>

        {/* View Tabs Bar Skeleton */}
        <div className="skeleton-filters-row" style={{ marginTop: '16px' }}>
          <div className="skeleton-pill" style={{ width: '80px', height: '36px' }} />
          <div className="skeleton-pill" style={{ width: '75px', height: '36px' }} />
          <div className="skeleton-pill" style={{ width: '85px', height: '36px' }} />
          <div className="skeleton-pill" style={{ width: '90px', height: '36px' }} />
        </div>

        {/* Quick Add Bar Skeleton */}
        <div className="skeleton-banner-card" style={{ height: '48px', marginTop: '12px' }}>
          <div className="skeleton-circle-xs" />
          <div className="skeleton-text-line" style={{ width: '220px' }} />
        </div>

        {/* Table Skeleton */}
        <div className="skeleton-table-card" style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: '16px',
          padding: '16px',
          marginTop: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '10px 0',
              borderBottom: i < 4 ? '1px solid var(--line)' : 'none'
            }}>
              <div className="skeleton-pill" style={{ width: '60px', height: '22px' }} />
              <div className="skeleton-text-line" style={{ width: `${35 + ((i * 17) % 35)}%` }} />
              <div className="skeleton-pill" style={{ width: '70px', height: '24px', marginLeft: 'auto' }} />
              <div className="skeleton-pill" style={{ width: '60px', height: '22px' }} />
              <div className="skeleton-text-line" style={{ width: '80px' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (slug === 'proyek') {
    return (
      <div className="skeleton-screen-container" role="status" aria-label="Memuat data proyek">
        <div className="skeleton-header-row">
          <div className="skeleton-title-group">
            <div className="skeleton-pill skeleton-eyebrow" />
            <div className="skeleton-pill skeleton-title-bar" />
          </div>
          <div className="skeleton-pill skeleton-btn-pill" />
        </div>

        <div className="skeleton-filters-row" style={{ marginTop: '16px' }}>
          <div className="skeleton-pill" style={{ width: '65px', height: '32px' }} />
          <div className="skeleton-pill" style={{ width: '65px', height: '32px' }} />
          <div className="skeleton-pill" style={{ width: '65px', height: '32px' }} />
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '16px',
          marginTop: '16px'
        }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: '16px',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="skeleton-pill" style={{ width: '55px', height: '22px' }} />
                <div className="skeleton-pill" style={{ width: '60px', height: '20px' }} />
              </div>
              <div className="skeleton-text-line" style={{ width: '80%', height: '18px' }} />
              <div className="skeleton-text-line" style={{ width: '95%' }} />
              <div className="skeleton-progress-bar" style={{ marginTop: '6px' }} />
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <div className="skeleton-pill" style={{ width: '90px', height: '22px' }} />
                <div className="skeleton-pill" style={{ width: '70px', height: '22px' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Beranda: sapaan, tambah cepat, empat kartu (rutin, agenda, tindakan, minggu) dengan grid yang sama.
  return (
    <div className="skeleton-screen-container" role="status" aria-label="Memuat data dasbor">
      <div className="skeleton-header-row">
        <div className="skeleton-title-group">
          <div className="skeleton-pill skeleton-title-bar" />
          <div className="skeleton-text-line" style={{ width: '240px' }} />
        </div>
        <div className="skeleton-pill skeleton-btn-pill" />
      </div>
      <div className="skeleton-banner-card">
        <div className="skeleton-pill" style={{ width: '100%', height: '44px' }} />
      </div>
      <div className="beranda-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton-panel-card">
            <div className="skeleton-panel-head">
              <div className="skeleton-text-line" style={{ width: '130px' }} />
              <div className="skeleton-circle-sm" />
            </div>
            <div className="skeleton-project-rows">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="skeleton-project-row">
                  <div className="skeleton-circle-xs" />
                  <div className="skeleton-text-line" style={{ width: '40px' }} />
                  <div className="skeleton-text-line" style={{ width: '60%' }} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
