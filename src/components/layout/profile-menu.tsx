'use client';
import Link from 'next/link';
import { DropdownMenu } from 'radix-ui';
import { LockKeyhole, Settings } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { api, resetAuthNavigation } from '@/lib/client';
import { useLoadedWorkspace, organizationInfo } from '@/features/workspace/use-loaded-workspace';
import { MenuContent, MenuItem, MenuSeparator } from '@/components/ui/menu';
import { cn } from '@/lib/utils';

/** Profil manajer: pengaturan dan kunci aplikasi. Tema dan warna sorotan ada di halaman Pengaturan. */
export function ProfileMenu({ compact }: { compact?: boolean }) {
  const data = useLoadedWorkspace();
  const { manager, name: organization } = organizationInfo(data);
  const name = manager || 'Manajer';
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className={cn(
          'grid place-items-center rounded-full transition hover:ring-4 hover:ring-surface-3 active:scale-95',
          'size-11',
        )}
        aria-label="Profil dan tampilan"
      >
        <Avatar name={name} className="size-10 ring-0" />
      </DropdownMenu.Trigger>
      <MenuContent
        side={compact ? 'right' : 'bottom'}
        align="end"
        sideOffset={10}
        className="w-64 rounded-3xl p-2"
      >
        <div className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
          <Avatar name={name} className="size-11 ring-0" />
          <div className="min-w-0">
            <p className="truncate font-bold">{name}</p>
            <p className="truncate text-xs text-ink-3">{organization || 'Manajer koperasi'}</p>
          </div>
        </div>
        <MenuSeparator />
        <MenuItem asChild>
          <Link href="/settings">
            <Settings />
            Pengaturan
          </Link>
        </MenuItem>
        <MenuItem
          onSelect={async () => {
            try {
              await api('auth/pin', { action: 'logout' });
            } finally {
              resetAuthNavigation('/pin');
            }
          }}
        >
          <LockKeyhole />
          Kunci aplikasi
        </MenuItem>
      </MenuContent>
    </DropdownMenu.Root>
  );
}
