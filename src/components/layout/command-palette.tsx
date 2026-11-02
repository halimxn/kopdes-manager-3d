'use client';
import { Command } from 'cmdk';
import { Dialog } from 'radix-ui';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { ListPlus, Moon, Search, Sun, X, Zap } from 'lucide-react';
import { PageIcon } from '@/components/ui/icon';
import { Kbd } from '@/components/ui/kbd';
import { Highlight } from '@/components/ui/highlight';
import { NAV_FOOTER, NAV_GROUPS, PAGES, entityHome, recordLink } from './nav';
import { useLoadedWorkspace } from '@/features/workspace/use-loaded-workspace';
import { searchWorkspace } from '@/features/notifications/follow-ups';
import { parseQuickAdd } from '@/features/home/quick-add';
import type { Entity } from '@/features/records/schemas';
import { useTheme } from '@/lib/theme';
import { formatDate, today } from '@/lib/date';
import { cn } from '@/lib/utils';
import { QUICK_ACTIONS } from './quick-actions';

const ITEM =
  'flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl px-2.5 py-1.5 text-sm font-semibold text-ink-2 data-[selected=true]:bg-accent data-[selected=true]:text-accent-ink';
const GROUP =
  '[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:text-ink-3';
/** Ubin ikon di kiri hasil; warnanya membedakan catatan, menu, dan perintah. */
const TILE = 'grid size-9 shrink-0 place-items-center rounded-full [&_svg]:size-[18px]';
/** Label jenis di kanan hasil: Tugas, Proyek, Menu, Perintah. */
const KIND = 'shrink-0 text-xs text-ink-3';
const NEUTRAL_TILE = 'bg-surface-2 text-ink-2 ring-1 ring-line ring-inset';
// Label Perintah/Menu hanya saat mencari: tanpa kata kunci, judul kelompok sudah cukup.
const NEUTRAL_KIND = 'hidden group-data-[searching]/palette:inline';

function recordMarker(entity: Entity, kind: string) {
  const { page } = entityHome(entity);
  return {
    icon: PAGES[page].icon,
    // Nama tab lebih pendek dari judul katalog ("Proyek", bukan "Proyek & bidang kerja").
    label: PAGES[page].tabs?.find((tab) => tab.entity === entity)?.label ?? kind,
  };
}

/**
 * Palet Ctrl K: buka halaman, jalankan perintah, cari catatan yang sudah dimuat, atau buat tugas
 * dari kalimat. Pencarian tidak dikirim ke layanan lain.
 */
export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const data = useLoadedWorkspace();
  const { theme, setTheme } = useTheme();
  const [query, setQuery] = useState('');
  const results = useMemo(
    () => (query.trim().length > 1 ? searchWorkspace(data, query) : []),
    [data, query],
  );
  const go = (href: string) => {
    onOpenChange(false);
    setQuery('');
    router.push(href);
  };
  const draft = query.trim()
    ? parseQuickAdd(query, {
        today: today(),
        staff: (data.staff || []).map((row) => String(row.data.title)),
        projects: (data.workstreams || []).map((row) => ({
          id: row.id,
          title: String(row.data.title),
        })),
      })
    : null;
  const draftHref = draft
    ? '/tasks?new=1&' +
      new URLSearchParams(
        Object.entries(draft)
          .filter(([, value]) => value)
          .map(([key, value]) => [`fill.${key}`, String(value)]),
      ).toString()
    : '';
  const draftDetails = draft
    ? [
        draft.due_date && formatDate(draft.due_date),
        draft.assignee,
        draft.workstream_id &&
          `#${String(data.workstreams?.find((row) => row.id === draft.workstream_id)?.data.title)}`,
        draft.priority && draft.priority !== 'normal' && `Prioritas ${draft.priority}`,
      ]
        .filter(Boolean)
        .join(' · ')
    : '';
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay fixed inset-0 z-50 bg-[var(--scrim)]" />
        <Dialog.Content
          data-searching={query ? '' : undefined}
          className="group/palette palette fixed top-[10vh] left-1/2 z-50 w-[min(42rem,calc(100vw-1.5rem))] -translate-x-1/2 overflow-hidden rounded-[1.75rem] bg-surface shadow-float ring-1 ring-line-strong outline-none max-md:top-3"
        >
          <Dialog.Title className="sr-only">Cari dan buka</Dialog.Title>
          <Dialog.Description className="sr-only">
            Cari halaman, perintah, atau catatan
          </Dialog.Description>
          <Command label="Cari dan buka" loop>
            <div className="flex items-center gap-3 border-b border-line px-5">
              <Search className="size-5 shrink-0 text-ink-3" aria-hidden="true" />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder="Cari tugas, menu, atau tulis tugas baru…"
                className="h-16 min-w-0 flex-1 bg-transparent text-[17px] text-ink outline-none placeholder:text-ink-3"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Hapus pencarian"
                  className="grid size-8 shrink-0 animate-[item-in_0.2s_var(--ease-out)] place-items-center rounded-full text-ink-3 transition-colors hover:bg-surface-3 hover:text-ink"
                >
                  <X className="size-4" />
                </button>
              )}
              <Dialog.Close className="-mr-1 h-11 shrink-0 rounded-full px-2 text-sm text-ink-2 md:hidden">
                Batal
              </Dialog.Close>
            </div>
            <Command.List className="overflow-y-auto overscroll-contain p-2">
              <Command.Empty className="p-6 text-center text-sm text-ink-3">
                Tidak ada yang cocok. Coba kata lain.
              </Command.Empty>
              {results.length > 0 && (
                <Command.Group heading="Hasil" className={GROUP}>
                  {results.map((result) => {
                    const marker = recordMarker(result.entity, result.kind);
                    return (
                      <Command.Item
                        key={result.id}
                        value={`${result.title} ${result.kind} ${result.context} ${result.id}`}
                        onSelect={() => go(recordLink(result.entity, result.id.split(':')[1]))}
                        className={ITEM}
                      >
                        <span className={cn(TILE, NEUTRAL_TILE)}>
                          <PageIcon name={marker.icon} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-ink">
                            <Highlight text={result.title} query={query} />
                          </span>
                          {result.context && (
                            <span className="block truncate text-xs text-ink-3">
                              {result.context}
                            </span>
                          )}
                        </span>
                        <span className={KIND}>{marker.label}</span>
                      </Command.Item>
                    );
                  })}
                </Command.Group>
              )}
              <Command.Group heading="Perintah" className={GROUP}>
                {QUICK_ACTIONS.flatMap((group) => group.items).map((action) => (
                  <Command.Item
                    key={action.href}
                    value={`tambah ${action.label}`}
                    onSelect={() => go(action.href)}
                    className={ITEM}
                  >
                    <span className={cn(TILE, NEUTRAL_TILE)}>
                      <action.icon />
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      Tambah {action.label.toLowerCase()}
                    </span>
                    <span className={cn(KIND, NEUTRAL_KIND)}>Perintah</span>
                  </Command.Item>
                ))}
                <Command.Item
                  value="lihat tugas terlambat"
                  onSelect={() => go('/tasks?status=terlambat')}
                  className={ITEM}
                >
                  <span className={cn(TILE, NEUTRAL_TILE)}>
                    <Zap />
                  </span>
                  <span className="min-w-0 flex-1 truncate">Lihat tugas terlambat</span>
                  <span className={cn(KIND, NEUTRAL_KIND)}>Perintah</span>
                </Command.Item>
                <Command.Item
                  value={theme === 'dark' ? 'pakai tema terang' : 'pakai tema gelap'}
                  onSelect={() => {
                    setTheme(
                      theme === 'dark' ? 'light' : 'dark',
                      document.querySelector<HTMLElement>('main'),
                    );
                    onOpenChange(false);
                  }}
                  className={ITEM}
                >
                  <span className={cn(TILE, NEUTRAL_TILE)}>
                    {theme === 'dark' ? <Sun /> : <Moon />}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {theme === 'dark' ? 'Pakai tema terang' : 'Pakai tema gelap'}
                  </span>
                  <span className={cn(KIND, NEUTRAL_KIND)}>Perintah</span>
                </Command.Item>
              </Command.Group>
              <Command.Group heading="Menu" className={GROUP}>
                {[...NAV_GROUPS.flatMap((group) => group.pages), ...NAV_FOOTER].map((id) => {
                  const page = PAGES[id];
                  const tabs = page.tabs && page.tabs.length > 1 ? page.tabs : [];
                  return (
                    <Command.Item
                      key={id}
                      value={`buka ${page.label}`}
                      onSelect={() => go(`/${id}`)}
                      className={ITEM}
                    >
                      <span className={cn(TILE, NEUTRAL_TILE)}>
                        <PageIcon name={page.icon} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-ink">{page.label}</span>
                        {tabs.length > 0 && (
                          <span className="block truncate text-xs text-ink-3">
                            {tabs.map((tab) => tab.label).join(' · ')}
                          </span>
                        )}
                      </span>
                      <span className={cn(KIND, NEUTRAL_KIND)}>Menu</span>
                    </Command.Item>
                  );
                })}
              </Command.Group>
              {/* Paling bawah: kalimat yang cocok dengan catatan, perintah, atau menu membuka itu dulu;
                  kalimat tugas baru biasanya tidak cocok apa pun sehingga "Buat" jadi satu-satunya pilihan. */}
              {draft && (
                <Command.Group heading="Buat" className={GROUP}>
                  <Command.Item
                    value={`buat tugas ${query}`}
                    onSelect={() => go(draftHref)}
                    className={ITEM}
                  >
                    <span className={cn(TILE, 'bg-action text-on-action')}>
                      <ListPlus />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">
                        Buat tugas: <span className="text-ink">{draft.title || '…'}</span>
                      </span>
                      {draftDetails && (
                        <span className="block truncate text-xs text-ink-3">{draftDetails}</span>
                      )}
                    </span>
                    <span className={cn(KIND, NEUTRAL_KIND)}>Baru</span>
                  </Command.Item>
                </Command.Group>
              )}
            </Command.List>
            <div className="hidden items-center gap-4 border-t border-line px-5 py-2.5 text-xs text-ink-3 md:flex">
              <span className="flex items-center gap-1.5">
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd>
                pilih
              </span>
              <span className="flex items-center gap-1.5">
                <Kbd>↵</Kbd>
                buka
              </span>
              <span className="ml-auto flex items-center gap-1.5">
                <Kbd>Esc</Kbd>
                tutup
              </span>
            </div>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
