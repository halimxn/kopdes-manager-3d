'use client';
import { Check as CheckIcon } from 'lucide-react';
import * as motion from 'motion/react-m';
import { cn } from '@/lib/utils';

/** Centang bundar untuk tugas, subtugas, dan rutin; animasi pop saat dicentang. */
export function Check({
  checked,
  onChange,
  label,
  size = 'md',
  disabled,
  className,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  size?: 'sm' | 'md';
  disabled?: boolean;
  className?: string;
}) {
  return (
    <motion.button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      whileTap={{ scale: 0.85 }}
      animate={checked ? { scale: [1, 1.2, 1] } : { scale: 1 }}
      transition={{ duration: 0.35 }}
      onClick={(event) => {
        event.stopPropagation();
        onChange();
      }}
      className={cn(
        'relative grid shrink-0 place-items-center rounded-full border-2 transition-colors before:absolute before:-inset-2.5 disabled:opacity-50',
        size === 'md' ? 'size-6' : 'size-5',
        checked
          ? 'border-[var(--tone-bar,var(--action))] bg-[var(--tone-bar,var(--action))] text-on-action'
          : 'border-ink-3/70 bg-surface-2 text-transparent hover:border-[var(--tone-bar,var(--action))]',
        className,
      )}
    >
      <CheckIcon className={size === 'md' ? 'size-3.5' : 'size-3'} strokeWidth={3.2} />
    </motion.button>
  );
}
