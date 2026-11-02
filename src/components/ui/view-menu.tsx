'use client';
import type { ReactNode } from 'react';
import { DropdownMenu } from 'radix-ui';
import { Check, ChevronDown } from 'lucide-react';
import { MenuContent, MenuItem } from './menu';

type ViewItem = { id: string; label: string; icon?: ReactNode };

/** Pemilih tampilan bergaya "Board — Daily Task ⌄" pada acuan: nama tampilan besar, keterangan kecil, panah. */
export function ViewMenu({
  label,
  caption,
  value,
  items,
  onChange,
}: {
  label: string;
  caption: string;
  value: string;
  items: ViewItem[];
  onChange: (id: string) => void;
}) {
  const current = items.find((item) => item.id === value) || items[0];
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={`${label}: ${current.label}`}
        className="group flex h-11 shrink-0 items-center gap-2 rounded-full bg-surface-2 pr-3 pl-3.5 text-left ring-1 ring-line-strong outline-none transition hover:bg-surface-3 focus-visible:ring-2 focus-visible:ring-accent-strong [&>svg]:shrink-0"
      >
        <span className="text-accent-strong [&_svg]:size-[18px]">{current.icon}</span>
        <span className="text-sm font-medium text-ink">{current.label}</span>
        <span className="hidden text-[13px] text-ink-3 xl:inline">{caption}</span>
        <ChevronDown className="size-4 text-ink-2 transition-transform duration-200 group-data-[state=open]:rotate-180" />
      </DropdownMenu.Trigger>
      <MenuContent align="start" className="w-56">
        {items.map((item) => (
          <MenuItem
            key={item.id}
            onSelect={() => onChange(item.id)}
            className={item.id === current.id ? 'text-ink' : undefined}
          >
            {item.icon}
            {item.label}
            {item.id === current.id && <Check className="ml-auto text-accent-strong" />}
          </MenuItem>
        ))}
      </MenuContent>
    </DropdownMenu.Root>
  );
}
