import { Fragment, type ReactNode } from 'react';

/** Garis tegak pemisah bagian di bilah kepala, seperti bilah atas TaskTrack. */
export function HeaderDivider() {
  return <span className="hidden h-11 w-px bg-line lg:block" aria-hidden="true" />;
}

/**
 * Kepala halaman langsung di atas latar (acuan dashboard 25 Okt): judul (satu-satunya h1) dan ringkasan
 * di kiri, bagian tambahan dipisah garis tegak, aksi utama di kanan.
 */
export function PageHeader({
  title,
  subtitle,
  sections,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  sections?: ReactNode[];
  actions?: ReactNode;
}) {
  return (
    <div className="flex animate-[item-in_0.4s_var(--ease-out)] flex-wrap items-center gap-x-3 gap-y-3 px-1 py-1 lg:gap-x-6">
      {/* Judul minimal 11rem: bila aksi tidak muat, aksi turun ke baris berikut, judul tidak terjepit. */}
      <div className="min-w-44 flex-1 lg:flex-none">
        <h1 className="text-[24px] leading-tight font-extrabold tracking-tight text-ink md:text-[28px]">
          {title}
        </h1>
        {subtitle && <p className="text-[13px] font-semibold text-ink-3">{subtitle}</p>}
      </div>
      {sections?.map((section, index) => (
        <Fragment key={index}>
          <HeaderDivider />
          {section}
        </Fragment>
      ))}
      {actions && (
        <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2 lg:ml-auto">
          {actions}
        </div>
      )}
    </div>
  );
}
