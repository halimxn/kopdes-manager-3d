'use client';
import Link from 'next/link';
import { Popover } from 'radix-ui';
import { Bell, CircleAlert, Clock } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { apiBatch } from '@/lib/client';
import { addDays, today } from '@/lib/date';
import { usePreference } from '@/lib/use-preference';
import { loadCapabilities, type Workspace } from '@/features/workspace/use-workspace';
import type { Entity, Item } from '@/features/records/schemas';
import {
  administrationEntities,
  logisticsEntities,
  operationEntities,
} from '@/features/records/constants';
import { getFollowUps, recordHref, type FollowUp } from './follow-ups';
import { PopoverContent } from '@/components/ui/menu';
import { cn } from '@/lib/utils';

const ENTITIES: Entity[] = [
  'work-items',
  'meetings',
  'documents',
  'issues',
  'risks',
  'inventory-items',
  'stock-counts',
];

async function loadReminders(): Promise<FollowUp[]> {
  const capabilities = await loadCapabilities();
  const allowed = ENTITIES.filter(
    (entity) =>
      (capabilities.operations || !operationEntities.includes(entity)) &&
      (capabilities.logistics || !logisticsEntities.includes(entity)) &&
      (capabilities.administration || !administrationEntities.includes(entity)),
  );
  // Satu permintaan untuk semua jenis catatan pengingat.
  const pages = await apiBatch<{ items: Item[] }>(
    allowed.map((entity) => `${entity}?limit=100&scope=current`),
  );
  const data: Workspace = Object.fromEntries(
    allowed.map((entity, index) => [entity, pages[index].items]),
  );
  const date = today();
  const tomorrow = (data['work-items'] || [])
    .filter(
      (row) =>
        !['selesai', 'dibatalkan'].includes(String(row.data.status)) &&
        row.data.due_date === addDays(date, 1),
    )
    .map((row) => ({
      id: `work-items:${row.id}:besok`,
      title: String(row.data.title),
      reason: 'Tenggat besok',
      kind: 'Tugas',
      href: recordHref('work-items', row),
      urgent: false,
    }));
  return [...getFollowUps(data, date), ...tomorrow];
}

/** Lonceng pengingat: tenggat, rapat, dokumen kedaluwarsa, stok menipis, dan selisih opname. */
export function NotificationBell() {
  const [items, setItems] = useState<FollowUp[]>([]);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [seenText, setSeenText] = usePreference('kopdes-seen-reminders', '[]');
  const seen = new Set<string>(JSON.parse(seenText || '[]'));
  const unseen = items.filter((item) => !seen.has(item.id)).length;
  const refresh = useCallback(async () => {
    try {
      setItems(await loadReminders());
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 1500);
    return () => window.clearTimeout(timer);
  }, [refresh]);
  const groups = [
    { label: 'Mendesak', rows: items.filter((item) => item.urgent) },
    { label: 'Perlu dicek', rows: items.filter((item) => !item.urgent) },
  ].filter((group) => group.rows.length);
  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) void refresh();
        else setSeenText(JSON.stringify(items.map((item) => item.id)));
      }}
    >
      <Popover.Trigger
        className="relative grid size-10 place-items-center rounded-full bg-surface text-ink transition hover:bg-surface-2 md:size-11"
        aria-label={unseen ? `Pengingat, ${unseen} baru` : 'Pengingat'}
      >
        <Bell className="size-5" />
        {unseen > 0 && (
          <span
            className="absolute top-2 right-2.5 size-2.5 rounded-full bg-brand ring-2 ring-surface"
            aria-hidden="true"
          />
        )}
      </Popover.Trigger>
      <PopoverContent
        align="end"
        collisionPadding={12}
        className="w-[min(24rem,calc(100vw-1.5rem))] p-2"
      >
        <p className="px-3 pt-2 pb-1 text-base font-bold">Pengingat</p>
        <div className="max-h-[60vh] overflow-y-auto">
          {error && <p className="m-2 rounded-2xl bg-late p-3 text-sm text-late-ink">{error}</p>}
          {!error && !groups.length && (
            <p className="m-2 rounded-2xl bg-surface-2 p-4 text-sm text-ink-3">
              Tidak ada pengingat. Semua tenggat dan stok aman.
            </p>
          )}
          {groups.map((group) => (
            <section key={group.label} className="py-1">
              <h3 className="px-3 py-1.5 text-xs font-bold text-ink-3 uppercase">{group.label}</h3>
              {group.rows.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex gap-3 rounded-2xl px-3 py-2.5 transition hover:bg-surface-2"
                >
                  <span
                    className={cn(
                      'mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl',
                      item.urgent ? 'bg-late text-late-ink' : 'bg-warn text-warn-ink',
                    )}
                  >
                    {item.urgent ? (
                      <CircleAlert className="size-4" />
                    ) : (
                      <Clock className="size-4" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink">
                      {item.title}
                    </span>
                    <span className="block text-xs text-ink-3">
                      {item.kind} · {item.reason}
                    </span>
                  </span>
                </Link>
              ))}
            </section>
          ))}
        </div>
      </PopoverContent>
    </Popover.Root>
  );
}
