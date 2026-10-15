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

  // Default / Beranda Dashboard Skeleton
  return (
    <div className="skeleton-screen-container" role="status" aria-label="Memuat data dasbor">
      {/* Top Header Skeleton */}
      <div className="skeleton-header-row">
        <div className="skeleton-title-group">
          <div className="skeleton-pill skeleton-eyebrow" />
          <div className="skeleton-pill skeleton-title-bar" />
        </div>
        <div className="skeleton-pill skeleton-btn-pill" />
      </div>

      {/* Stat Cards 4 Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '14px',
        margin: '18px 0'
      }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: '16px',
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div className="skeleton-text-line" style={{ width: '90px' }} />
            <div className="skeleton-pill" style={{ width: '50px', height: '28px' }} />
            <div className="skeleton-text-line" style={{ width: '120px' }} />
          </div>
        ))}
      </div>

      {/* Main Grid: Left Tasks Area, Right Overview Panels */}
      <div className="skeleton-main-grid">
        {/* Left Column: Meeting Banner + Tasks List */}
        <div className="skeleton-work-col">
          {/* Top Banner Skeleton */}
          <div className="skeleton-banner-card">
            <div className="skeleton-circle-icon" />
            <div className="skeleton-banner-text">
              <div className="skeleton-text-line w-28" />
              <div className="skeleton-text-line w-64" />
            </div>
            <div className="skeleton-circle-sm ml-auto" />
          </div>

          {/* Filter Pills Row */}
          <div className="skeleton-filters-row">
            <div className="skeleton-pill w-24 h-9" />
            <div className="skeleton-pill w-24 h-9" />
            <div className="skeleton-pill w-20 h-9" />
          </div>

          {/* Task Card Items */}
          <div className="skeleton-task-cards-list">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="skeleton-task-card">
                <div className="skeleton-card-top">
                  <div className="skeleton-pill w-24" />
                  <div className="skeleton-circle-xs ml-auto" />
                </div>
                <div className="skeleton-text-line w-3/4" />
                <div className="skeleton-card-meta">
                  <div className="skeleton-pill w-28" />
                  <div className="skeleton-pill w-16" />
                </div>
                <div className="skeleton-progress-bar" />
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Overview & Projects */}
        <div className="skeleton-side-col">
          {/* Panel 1: Routine card skeleton */}
          <div className="skeleton-panel-card">
            <div className="skeleton-panel-head">
              <div className="skeleton-text-line" style={{ width: '130px' }} />
              <div className="skeleton-pill" style={{ width: '65px', height: '22px' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="skeleton-circle-xs" />
                  <div className="skeleton-text-line" style={{ width: '40px' }} />
                  <div className="skeleton-text-line" style={{ width: '70%' }} />
                </div>
              ))}
            </div>
          </div>

          {/* Panel 2: Projects List */}
          <div className="skeleton-panel-card">
            <div className="skeleton-panel-head">
              <div className="skeleton-text-line w-28" />
            </div>
            <div className="skeleton-project-rows">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton-project-row">
                  <div className="skeleton-circle-dot" />
                  <div className="skeleton-text-line w-40" />
                  <div className="skeleton-pill w-12 ml-auto" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
