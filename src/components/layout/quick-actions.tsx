'use client';
import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarPlus,
  ClipboardCheck,
  FilePlus2,
  ListPlus,
  NotebookPen,
  PackagePlus,
  PiggyBank,
  ReceiptText,
  ShieldAlert,
  UserPlus,
  UserCheck,
  type LucideIcon,
} from 'lucide-react';

type Action = { label: string; href: string; icon: LucideIcon; key?: string };

/** Pintasan membuat catatan; semuanya hanya membuka formulir di halaman tujuan, tidak menulis data. */
export const QUICK_ACTIONS: { group: string; items: Action[] }[] = [
  {
    group: 'Pekerjaan',
    items: [
      { label: 'Tugas', href: '/tasks?new=1', icon: ListPlus, key: '1' },
      { label: 'Agenda', href: '/agenda?new=1', icon: CalendarPlus, key: '2' },
      { label: 'Kegiatan', href: '/notes?new=1', icon: NotebookPen, key: '3' },
      {
        label: 'Laporan kerja',
        href: '/notes?tab=reports&new=1',
        icon: FilePlus2,
        key: '4',
      },
      {
        label: 'Risiko',
        href: '/projects?tab=risks&new=1',
        icon: ShieldAlert,
        key: '5',
      },
    ],
  },
  {
    group: 'Buku koperasi',
    items: [
      {
        label: 'Kas masuk',
        href: '/cash?new=1&direction=masuk',
        icon: ArrowDownLeft,
        key: '6',
      },
      {
        label: 'Kas keluar',
        href: '/cash?new=1&direction=keluar',
        icon: ArrowUpRight,
        key: '7',
      },
      { label: 'Anggota', href: '/members?new=1', icon: UserPlus, key: '8' },
      { label: 'Barang', href: '/goods?new=1', icon: PackagePlus, key: '9' },
      {
        label: 'Stok opname',
        href: '/goods?tab=counts&new=1',
        icon: ClipboardCheck,
      },
    ],
  },
  {
    group: 'Usaha harian',
    items: [
      { label: 'Penjualan', href: '/store?tab=sales&new=1', icon: ReceiptText },
      { label: 'Simpanan', href: '/members?tab=savings&new=1', icon: PiggyBank },
      { label: 'Absensi', href: '/team?tab=attendance&new=1', icon: UserCheck },
    ],
  },
];

export function QuickActionsPanel({ onPick }: { onPick: () => void }) {
  const router = useRouter();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const action = QUICK_ACTIONS.flatMap((group) => group.items).find(
        (item) => item.key === event.key,
      );
      if (!action) return;
      event.preventDefault();
      onPick();
      router.push(action.href);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onPick, router]);
  return (
    <div className="grid gap-x-4 gap-y-3 sm:grid-cols-3">
      {QUICK_ACTIONS.map((group, groupIndex) => (
        <section key={group.group}>
          <h3 className="mb-1 px-2 text-xs text-ink-3">{group.group}</h3>
          <ul>
            {group.items.map((item, index) => (
              <li
                key={item.label}
                // Baris naik berurutan lintas kelompok.
                style={{ animationDelay: `${(groupIndex * 5 + index) * 22}ms` }}
                className="animate-[item-in_0.36s_var(--ease-out)_backwards]"
              >
                <Link
                  href={item.href}
                  onClick={onPick}
                  className="group flex min-h-11 items-center gap-2.5 rounded-2xl px-2 text-[13.5px] text-ink transition-colors hover:bg-surface-2"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-ink-2 ring-1 ring-line transition-colors group-hover:bg-action group-hover:text-on-action group-hover:ring-transparent">
                    <item.icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.key && (
                    <kbd className="hidden text-[11px] text-ink-3 sm:block">{item.key}</kbd>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
