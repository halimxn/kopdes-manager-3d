import type { ReactNode } from 'react';

/**
 * Kepala halaman langsung di atas latar (acuan 2 Nov): judul besar yang ringan (satu-satunya h1) dan
 * ringkasan di kiri, angka berikon bulat di sebelahnya, aksi utama di kanan.
 */
export function PageHeader({
  title,
  subtitle,
  sections,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  sections?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 py-1 lg:gap-x-8">
      {/* Judul minimal 11rem: bila aksi tidak muat, aksi turun ke baris berikut, judul tidak terjepit. */}
      <div className="min-w-44 flex-1 lg:flex-none">
        <h1 className="text-[30px] leading-[1.1] font-normal tracking-[-0.02em] text-balance text-ink md:text-[36px]">
          {title}
        </h1>
        {subtitle && <p className="mt-1 line-clamp-2 max-w-sm text-sm text-ink-3">{subtitle}</p>}
      </div>
      {/* HP dan tablet: judul dan aksi sebaris, angka di baris sendiri; laptop: semua sebaris. */}
      {sections && (
        <div className="order-3 flex w-full flex-wrap items-center gap-x-8 gap-y-3 lg:order-2 lg:w-auto">
          {sections}
        </div>
      )}
      {actions && (
        <div className="order-2 flex max-w-full min-w-0 flex-wrap items-center gap-2 lg:order-3 lg:ml-auto">
          {actions}
        </div>
      )}
    </div>
  );
}
