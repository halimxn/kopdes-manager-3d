'use client';
import { useRef, useState, type ReactNode } from 'react';
import {
  Check,
  ChevronRight,
  Download,
  KeyRound,
  LockKeyhole,
  Moon,
  Pencil,
  Sun,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace } from '@/features/workspace/use-workspace';
import { RecordFormSheet } from '@/features/records/lazy';
import { PageLoading } from '@/features/records/records-page';
import { PageHeader } from '@/components/layout/page-header';
import { Sheet } from '@/components/ui/sheet';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { ErrorState } from '@/components/ui/states';
import { useConfirm } from '@/components/ui/confirm';
import { ACCENTS, useTheme } from '@/lib/theme';
import { api, resetAuthNavigation } from '@/lib/client';
import { formatDate } from '@/lib/date';

const CARD = 'rounded-[var(--radius-card)] bg-surface shadow-card ring-1 ring-line';

/**
 * Pengaturan dalam satu halaman, tanpa tab: kartu profil di atas, tampilan dipilih lewat pratinjau
 * kecil, lalu keamanan dan data sebagai baris berkelompok seperti pengaturan di HP.
 */
export function SettingsPage() {
  const { data, loading, error, refresh } = useWorkspace('settings');
  const [editing, setEditing] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const organization = data.organization?.[0];
  const manager = String(organization?.data.manager || '') || 'Manajer';
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Pengaturan" subtitle="Profil, tampilan, keamanan, dan cadangan data" />
      {error ? (
        <ErrorState message={error} onRetry={() => void refresh()} />
      ) : loading ? (
        <PageLoading />
      ) : (
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-5">
            <section aria-label="Profil" className={`${CARD} flex flex-col gap-4 p-5 md:p-6`}>
              <div className="flex flex-wrap items-center gap-4">
                <Avatar name={manager} className="size-14 text-base ring-0" />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-[19px] font-medium text-ink">{manager}</h2>
                  <p className="truncate text-[13px] text-ink-2">
                    Manajer ·{' '}
                    {organization ? String(organization.data.title) : 'Profil koperasi belum diisi'}
                  </p>
                  {organization && (
                    <p className="truncate text-xs text-ink-3">
                      {[
                        organization.data.village,
                        organization.data.district,
                        organization.data.regency,
                      ]
                        .filter(Boolean)
                        .map(String)
                        .join(', ') || 'Alamat belum diisi'}
                    </p>
                  )}
                </div>
                <Button onClick={() => setEditing(true)}>
                  <Pencil />
                  {organization ? 'Ubah' : 'Isi profil'}
                </Button>
              </div>
              {organization && (
                <dl className="form-group detail-rows text-sm">
                  {[
                    ['Mulai bekerja', formatDate(String(organization.data.start_date || ''))],
                    ['Target pembukaan', formatDate(String(organization.data.target_date || ''))],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-ink-3">{label}</dt>
                      <dd className="font-medium text-ink">{value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              <p className="text-xs text-ink-3">
                Nama manajer dipakai di sapaan, laporan, dan pilihan penanggung jawab.
              </p>
            </section>
            <Appearance />
          </div>
          <div className="flex flex-col gap-5">
            <SettingsGroup title="Keamanan">
              <SettingsRow
                icon={<KeyRound />}
                title="Ganti PIN"
                description="PIN 6–12 digit untuk membuka aplikasi"
                onClick={() => setPinOpen(true)}
              />
              <SettingsRow
                icon={<LockKeyhole />}
                title="Kunci aplikasi sekarang"
                description="Keluar dan minta PIN lagi"
                onClick={async () => {
                  try {
                    await api('auth/pin', { action: 'logout' });
                  } finally {
                    resetAuthNavigation('/pin');
                  }
                }}
              />
            </SettingsGroup>
            <Backup refresh={refresh} />
          </div>
        </div>
      )}
      <Sheet
        open={pinOpen}
        onOpenChange={setPinOpen}
        title="Ganti PIN"
        description="Setelah diganti, Anda diminta masuk lagi."
      >
        <ChangePin />
      </Sheet>
      <RecordFormSheet
        open={editing}
        entity="organization"
        item={organization}
        workspace={data}
        refresh={refresh}
        onClose={() => setEditing(false)}
      />
    </div>
  );
}

function SettingsGroup({
  title,
  children,
  note,
}: {
  title: string;
  children: ReactNode;
  note?: ReactNode;
}) {
  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <h2 className="px-1 text-[15px] font-medium text-ink">{title}</h2>
      <div className={`${CARD} divide-y divide-line overflow-hidden`}>{children}</div>
      {note && <p className="px-1 text-xs text-ink-3">{note}</p>}
    </section>
  );
}

function SettingsRow({
  icon,
  title,
  description,
  onClick,
  busy,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  onClick?: () => void;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="flex min-h-16 w-full items-center gap-3.5 px-4 py-3 text-left transition hover:bg-surface-2 disabled:opacity-60"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-ink-2 ring-1 ring-line [&_svg]:size-[18px]">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14.5px] text-ink">{title}</span>
        <span className="block truncate text-[13px] text-ink-3">{description}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-ink-3" />
    </button>
  );
}

/** Pratinjau mini satu tema: memakai token tema itu sendiri lewat data-theme pada pembungkus. */
function ThemePreview({ value }: { value: 'light' | 'dark' }) {
  return (
    <span
      data-theme={value}
      data-accent="lime"
      className="flex h-20 w-full gap-1.5 overflow-hidden rounded-xl p-1.5 ring-1 ring-line [background:var(--ground)]"
      aria-hidden="true"
    >
      <span className="flex w-5 flex-col gap-1 rounded-md bg-surface p-1">
        <span className="h-1.5 rounded-full bg-accent-strong" />
        <span className="h-1 rounded-full bg-line" />
        <span className="h-1 rounded-full bg-line" />
      </span>
      <span className="flex flex-1 flex-col gap-1.5">
        <span className="h-3 rounded-md bg-surface" />
        <span className="flex flex-1 gap-1.5">
          <span className="flex-1 rounded-md bg-late" />
          <span className="flex-1 rounded-md bg-doing" />
        </span>
      </span>
    </span>
  );
}

function Appearance() {
  const { theme, setTheme, accent, setAccent } = useTheme();
  return (
    <section aria-label="Tampilan" className={`${CARD} flex flex-col gap-5 p-5 md:p-6`}>
      <div>
        <h2 className="text-[15px] font-medium">Tema</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {(['light', 'dark'] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={theme === value}
              onClick={(event) => setTheme(value, event.currentTarget)}
              className="flex flex-col gap-2.5 rounded-[1.25rem] p-2 text-left ring-1 ring-line transition hover:bg-surface-2 aria-pressed:ring-2 aria-pressed:ring-accent-strong"
            >
              <ThemePreview value={value} />
              <span className="flex items-center gap-2 px-1 pb-0.5 text-sm">
                {value === 'light' ? <Sun className="size-4" /> : <Moon className="size-4" />}
                {value === 'light' ? 'Terang' : 'Gelap'}
                {theme === value && (
                  <Check className="ml-auto size-4 text-accent-strong" strokeWidth={3} />
                )}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <h2 className="text-[15px] font-medium">Warna sorotan</h2>
        <p className="text-[13px] text-ink-3">
          Untuk menu aktif, tab, hari terpilih, dan fokus. Warna kartu tetap mengikuti proyek.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {ACCENTS.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={accent === option.id}
              onClick={() => setAccent(option.id)}
              className="flex h-10 items-center gap-2 rounded-full pr-3.5 pl-1.5 text-sm text-ink-2 ring-1 ring-line transition hover:bg-surface-2 aria-pressed:text-ink aria-pressed:ring-2 aria-pressed:ring-accent-strong"
            >
              <span
                className="grid size-7 place-items-center rounded-full text-on-bar"
                style={{ background: `var(--swatch-${option.id})` }}
              >
                {accent === option.id && <Check className="size-4" strokeWidth={3} />}
              </span>
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-ink-3">Pilihan tampilan disimpan di peramban ini.</p>
    </section>
  );
}

function ChangePin() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setBusy(true);
        setMessage('');
        try {
          await api('auth/pin', {
            action: 'change',
            pin: form.get('pin'),
            newPin: form.get('newPin'),
          });
          toast.success('PIN diganti. Silakan masuk lagi.');
          resetAuthNavigation('/pin');
        } catch (error) {
          setMessage((error as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Field label="PIN sekarang">
        <Input
          name="pin"
          type="password"
          inputMode="numeric"
          pattern="[0-9]{6,12}"
          required
          autoComplete="current-password"
        />
      </Field>
      <Field label="PIN baru" hint="6–12 digit angka.">
        <Input
          name="newPin"
          type="password"
          inputMode="numeric"
          pattern="[0-9]{6,12}"
          required
          autoComplete="new-password"
        />
      </Field>
      {message && (
        <p role="alert" className="rounded-2xl bg-late p-3 text-sm font-semibold text-late-ink">
          {message}
        </p>
      )}
      <Button type="submit" variant="primary" busy={busy}>
        <LockKeyhole />
        Simpan PIN baru
      </Button>
    </form>
  );
}

function Backup({ refresh }: { refresh: () => Promise<void> | void }) {
  const confirm = useConfirm();
  const input = useRef<HTMLInputElement>(null);
  const download = useRef<HTMLAnchorElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <SettingsGroup
        title="Data"
        note="Berkas cadangan tidak dienkripsi; simpan di tempat aman. Pemulihan dibatalkan seluruhnya bila ada data yang tidak sah."
      >
        <SettingsRow
          icon={<Download />}
          title="Unduh cadangan"
          description="Semua catatan dan laporan sebagai berkas JSON"
          onClick={() => download.current?.click()}
        />
        <SettingsRow
          icon={<Upload />}
          title="Pulihkan dari berkas"
          description="Ganti semua catatan dengan isi cadangan"
          busy={busy}
          onClick={() => input.current?.click()}
        />
      </SettingsGroup>
      <a ref={download} href="/api/backup" download hidden aria-hidden="true" tabIndex={-1} />
      <input
        ref={input}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (!file) return;
          if (file.size > 5 * 1024 * 1024) return toast.error('Berkas cadangan maksimal 5 MB.');
          if (
            !(await confirm({
              title: 'Pulihkan data dari cadangan?',
              description:
                'Semua catatan yang ada sekarang akan diganti isi berkas ini. Tindakan ini tidak dapat diurungkan.',
              confirmLabel: 'Pulihkan',
              danger: true,
            }))
          )
            return;
          setBusy(true);
          try {
            await api('backup', JSON.parse(await file.text()));
            toast.success('Data ruang kerja berhasil dipulihkan secara penuh.');
            await refresh();
          } catch (error) {
            toast.error(
              error instanceof SyntaxError
                ? 'Berkas bukan cadangan JSON yang sah.'
                : (error as Error).message,
            );
          } finally {
            setBusy(false);
          }
        }}
      />
    </>
  );
}
