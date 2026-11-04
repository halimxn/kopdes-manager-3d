'use client';
import * as motion from 'motion/react-m';
import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type TabItem = { id: string; label: ReactNode; count?: number; icon?: ReactNode };

/** Tab dengan penanda yang bergeser mulus ke tab aktif. */
export function Tabs({
  items,
  value,
  onChange,
  label,
  className,
}: {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  label: string;
  className?: string;
}) {
  const layoutId = useId();
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        'scrollbar-none inline-flex max-w-full min-w-0 gap-1 overflow-x-auto rounded-full bg-surface-2 p-1 ring-1 ring-line',
        className,
      )}
    >
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={cn(
              'relative flex h-9 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors [&_svg]:size-4',
              active ? 'text-ink' : 'text-ink-2 hover:text-ink',
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-full bg-surface-solid shadow-card ring-1 ring-line dark:bg-surface-3 dark:shadow-none"
                transition={{ type: 'spring', stiffness: 420, damping: 36 }}
              />
            )}
            <span className="relative flex items-center gap-2">
              {item.icon}
              {item.label}
              {item.count !== undefined && (
                <span
                  className={cn(
                    'tabular rounded-full px-1.5 text-xs',
                    active ? 'bg-surface-2' : 'bg-surface-3',
                  )}
                >
                  {item.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
