import { cn } from '@/lib/utils';

/** Tanda Kopdes: atap gerai koperasi dengan centang di dalamnya — tempat kerja yang beres. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'grid size-11 shrink-0 place-items-center rounded-[14px] bg-brand text-on-brand',
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-[62%]"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.3}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3.5 10.2 12 3.8l8.5 6.4" />
        <path d="M6 8.6V18a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8.6" />
        <path d="m9 13.6 2.2 2.2 4-4.3" />
      </svg>
    </span>
  );
}

/** Logo lengkap: tanda + nama produk. */
export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <LogoMark />
      {!compact && (
        <span className="text-[24px] leading-none font-medium tracking-[-0.03em] text-ink">
          Kopdes
        </span>
      )}
    </span>
  );
}
