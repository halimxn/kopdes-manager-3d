'use client';
import Link from 'next/link';
import { useState } from 'react';
import { DropdownMenu } from 'radix-ui';
import {
  ChevronLeft,
  ChevronRight,
  Circle,
  CircleCheck,
  CircleDot,
  CircleSlash,
  Copy,
  Ellipsis,
  ExternalLink,
  FileText,
  Flag,
  Globe2,
  Link2,
  Plus,
  Repeat,
  Send,
  SquarePen,
  Trash2,
  UserRound,
  Video,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Item, Task } from '@/features/records/schemas';
import type { Workspace } from '@/features/workspace/use-workspace';
import { organizationInfo } from '@/features/workspace/use-loaded-workspace';
import { relatedGroups, entityTitle } from '@/features/records/related';
import { assigneeOptions } from '@/features/records/assignees';
import { RecordFormSheet } from '@/features/records/lazy';
import { meetingJoinUrl } from '@/features/agenda/meeting';
import { worldHref } from '@/features/world/world-link';
import { isProjectHistory } from '@/features/projects/lifecycle';
import { recordLink } from '@/components/layout/nav';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Check } from '@/components/ui/check';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { DateField, TimeField } from '@/components/ui/date-time-field';
import { Avatar } from '@/components/ui/avatar';
import { useConfirm } from '@/components/ui/confirm';
import { MenuContent, MenuItem } from '@/components/ui/menu';
import { projectTone } from '@/lib/tones';
import { taskProgress } from '@/lib/progress';
import { formatDateTime } from '@/lib/date';
import { cn } from '@/lib/utils';
import { cancelTask, saveTask, setTaskStatus } from './task-actions';
import { dueText } from './task-card';
import type { TaskStatus } from '@/lib/task-status';

const STATUSES: [TaskStatus, string][] = [
  ['rencana', 'Rencana'],
  ['proses', 'Dikerjakan'],
  ['selesai', 'Selesai'],
];
const PRIORITIES = [
  ['rendah', 'Rendah'],
  ['normal', 'Normal'],
  ['tinggi', 'Tinggi'],
  ['mendesak', 'Mendesak'],
] as const;
const RECURRENCE = [
  ['tidak', 'Tidak berulang'],
  ['harian', 'Setiap hari'],
  ['mingguan', 'Setiap minggu'],
  ['bulanan', 'Setiap bulan'],
] as const;

const ICON_BUTTON =
  'grid size-10 place-items-center rounded-full text-ink-2 transition hover:bg-surface-2 hover:text-ink [&_svg]:size-[18px]';
/** Nilai sifat tugas: kolom lunak berikon yang jelas bisa diubah; menyala saat dipilih. */
const PROPERTY =
  'h-10 rounded-full border-transparent bg-surface-2 font-medium hover:border-transparent hover:bg-surface-3';
const BADGE = 'tabular shrink-0 rounded-md px-1.5 py-0.5 text-xs font-semibold';

/** Ikon status seperti lingkaran "Started" pada acuan: kosong untuk rencana, setengah untuk dikerjakan, centang untuk selesai. */
function StatusIcon({ status }: { status: string }) {
  if (status === 'selesai') return <CircleCheck className="text-done-ink" />;
  if (status === 'proses') return <CircleDot className="text-accent-strong" />;
  if (status === 'dibatalkan') return <CircleSlash />;
  return <Circle className="text-accent-strong" />;
}

type Activity = { id: string; user: string; text: string; created_at: string; type: string };

/**
 * Laci detail tugas: semua perubahan langsung tersimpan dan tercatat di riwayat tugas.
 * Formulir lengkap tetap tersedia untuk kolom yang jarang dipakai.
 */
export function TaskSheet({
  task,
  ws,
  open,
  onClose,
  refresh,
  siblings = [],
  onNavigate,
}: {
  task?: Item;
  ws: Workspace;
  open: boolean;
  onClose: () => void;
  refresh: () => Promise<void> | void;
  siblings?: Item[];
  onNavigate?: (id: string) => void;
}) {
  const confirm = useConfirm();
  const manager = organizationInfo(ws).manager || 'Manajer';
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [subtask, setSubtask] = useState('');
  const [comment, setComment] = useState('');
  const [fullForm, setFullForm] = useState(false);
  // Isian mengikuti data terbaru setiap kali tugas tersimpan atau berganti (pola penyesuaian saat render).
  const [synced, setSynced] = useState<unknown>(null);
  if (task && synced !== task.data) {
    setSynced(task.data);
    setTitle(String(task.data.title || ''));
    setDescription(String(task.data.description || ''));
    setLink(String(task.data.link || ''));
  }
  if (!task) return null;
  const d = task.data;
  const project = ws.workstreams?.find((row) => row.id === d.workstream_id);
  const subtasks = (d.subtasks as { title: string; done: boolean }[]) || [];
  const activities = [...((d.activities as Activity[]) || [])].reverse();
  const index = siblings.findIndex((row) => row.id === task.id);
  const due = dueText(task);
  const meeting = ws.meetings?.find((row) => row.id === d.meeting_id);
  const join = meetingJoinUrl(meeting);
  const document = ws.documents?.find((row) => row.id === d.document_id);
  const groups = relatedGroups('work-items', task, ws).filter(
    (group) => group.entity !== 'workstreams',
  );

  const save = async (changes: Record<string, unknown>, note: string) => {
    try {
      await saveTask(task, changes, note, manager);
      await refresh();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };
  const copyLink = () => {
    const url = `${window.location.origin}/tasks?task=${task.id}`;
    void navigator.clipboard.writeText(url).then(
      () => toast('Tautan tugas tersalin'),
      () => window.prompt('Salin tautan ini:', url),
    );
  };
  const people = assigneeOptions(
    ws.staff || [],
    organizationInfo(ws).manager,
    String(d.assignee || ''),
  );
  const projects = (ws.workstreams || []).filter(
    (row) => !isProjectHistory(row) || row.id === d.workstream_id,
  );

  return (
    <>
      <Sheet
        open={open && !fullForm}
        onOpenChange={(next) => !next && onClose()}
        wide
        title={<span className="sr-only">{String(d.title)}</span>}
        headerExtra={
          siblings.length > 1 && onNavigate ? (
            <span className="flex gap-1">
              <Button
                size="icon"
                variant="ghost"
                aria-label="Tugas sebelumnya"
                disabled={index <= 0}
                onClick={() => onNavigate(siblings[index - 1].id)}
              >
                <ChevronLeft />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Tugas berikutnya"
                disabled={index < 0 || index >= siblings.length - 1}
                onClick={() => onNavigate(siblings[index + 1].id)}
              >
                <ChevronRight />
              </Button>
            </span>
          ) : undefined
        }
      >
        {/* Dua kolom di layar lebar: isi kerja di kiri, sifat dan jadwal tugas di kanan. */}
        <div className="flex flex-col gap-5">
          {/* Kepala detail seperti panel acuan: judul besar, lalu deretan ikon aksi kecil. */}
          <div className="flex flex-col gap-1.5">
            <textarea
              value={title}
              rows={1}
              aria-label="Judul tugas"
              maxLength={200}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  event.currentTarget.blur();
                }
                if (event.key === 'Escape') setTitle(String(d.title));
              }}
              onBlur={() =>
                title.trim() &&
                title.trim() !== d.title &&
                void save({ title: title.trim() }, 'mengubah judul')
              }
              className={cn(
                'field-sizing-content -mx-2 w-[calc(100%+1rem)] resize-none rounded-xl bg-transparent px-2 py-1 text-[30px] leading-tight font-normal tracking-[-0.02em] text-ink outline-none transition-[background-color,box-shadow] hover:bg-surface-2 focus:bg-surface-2 focus:ring-2 focus:ring-accent',
                d.status === 'selesai' && 'text-ink-3 line-through',
              )}
            />
            <div className="-ml-2 flex items-center gap-0.5 text-ink">
              <button
                type="button"
                aria-label="Salin tautan tugas"
                title="Salin tautan tugas"
                onClick={copyLink}
                className={ICON_BUTTON}
              >
                <Link2 />
              </button>
              <Link
                href={worldHref('work-items', task.id)}
                aria-label="Lihat di Dunia Koperasi"
                title="Lihat di Dunia Koperasi"
                className={ICON_BUTTON}
              >
                <Globe2 />
              </Link>
              <DropdownMenu.Root>
                <DropdownMenu.Trigger
                  aria-label="Aksi lain"
                  title="Aksi lain"
                  className={ICON_BUTTON}
                >
                  <Ellipsis />
                </DropdownMenu.Trigger>
                {/* Di atas laci (z-50), jadi menu memakai lapisan berikutnya. */}
                <MenuContent align="start" className="z-[60] w-56">
                  <MenuItem onSelect={() => setFullForm(true)}>
                    <SquarePen />
                    Formulir lengkap
                  </MenuItem>
                  {d.status !== 'dibatalkan' && (
                    <MenuItem
                      danger
                      onSelect={async () => {
                        if (
                          await confirm({
                            title: `Batalkan tugas "${String(d.title)}"?`,
                            description:
                              'Tugas pindah ke arsip dibatalkan dan bisa dibuka lagi kapan saja.',
                            confirmLabel: 'Batalkan tugas',
                            danger: true,
                          })
                        ) {
                          await cancelTask(task, refresh, manager);
                          onClose();
                        }
                      }}
                    >
                      <XCircle />
                      Batalkan tugas
                    </MenuItem>
                  )}
                </MenuContent>
              </DropdownMenu.Root>
              {d.code ? (
                <span className="ml-auto text-xs font-semibold text-ink-3">{String(d.code)}</span>
              ) : null}
            </div>
          </div>

          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
            <aside className="flex flex-col gap-4 lg:sticky lg:top-0 lg:order-last">
              {/* Sifat tugas: label di kiri, nilai berikon di kanan, seperti panel detail acuan. */}
              <dl className="flex flex-col gap-1 rounded-[1.25rem] bg-surface-2 p-3 text-sm ring-1 ring-line [&>dt]:mt-1.5 [&>dt]:px-1 [&>dt]:text-xs [&>dt:first-child]:mt-0 [&>dd]:flex [&>dd]:min-w-0 [&>dd]:items-center [&>dd]:gap-2 [&>dd>span.block]:flex-1">
                <dt className="text-ink-3">Penanggung jawab</dt>
                <dd>
                  <Select
                    value={String(d.assignee || '')}
                    aria-label="Penanggung jawab"
                    icon={
                      d.assignee ? (
                        <Avatar name={String(d.assignee)} className="size-6 text-[9px] ring-0" />
                      ) : (
                        <UserRound />
                      )
                    }
                    onChange={(event) =>
                      void save(
                        { assignee: event.target.value },
                        event.target.value
                          ? `menugaskan ke ${event.target.value}`
                          : 'mengosongkan penanggung jawab',
                      )
                    }
                    className={cn(PROPERTY, Boolean(d.assignee) && 'pl-11')}
                  >
                    <option value="">Belum ada</option>
                    {people.map((person) => (
                      <option key={person.name} value={person.name}>
                        {person.name}
                      </option>
                    ))}
                  </Select>
                </dd>
                <dt className="text-ink-3">Status</dt>
                <dd>
                  <Select
                    value={String(d.status)}
                    aria-label="Status"
                    icon={<StatusIcon status={String(d.status)} />}
                    onChange={(event) =>
                      void setTaskStatus(task, event.target.value as TaskStatus, refresh, manager)
                    }
                    className={PROPERTY}
                  >
                    {STATUSES.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                    {d.status === 'dibatalkan' && <option value="dibatalkan">Dibatalkan</option>}
                  </Select>
                  {subtasks.length > 0 && (
                    <span className={cn(BADGE, 'bg-accent text-accent-ink')}>
                      {taskProgress(d as unknown as Task)}%
                    </span>
                  )}
                </dd>
                <dt className="text-ink-3">Prioritas</dt>
                <dd>
                  <Select
                    value={String(d.priority || 'normal')}
                    aria-label="Prioritas"
                    icon={
                      <Flag
                        className={
                          ['tinggi', 'mendesak'].includes(String(d.priority))
                            ? 'text-late-ink'
                            : undefined
                        }
                      />
                    }
                    onChange={(event) =>
                      void save(
                        { priority: event.target.value },
                        `mengubah prioritas menjadi ${PRIORITIES.find(([v]) => v === event.target.value)?.[1]}`,
                      )
                    }
                    className={PROPERTY}
                  >
                    {PRIORITIES.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </dd>
                <dt className="text-ink-3">Tenggat</dt>
                <dd>
                  <DateField
                    aria-label="Tenggat"
                    value={String(d.due_date || '')}
                    onChange={(value) =>
                      value && void save({ due_date: value }, `memindah tenggat ke ${value}`)
                    }
                    className={cn(PROPERTY, 'flex-1')}
                  />
                  {due.late && (
                    <span className={cn(BADGE, 'bg-late text-late-ink')}>{due.text}</span>
                  )}
                </dd>
                <dt className="text-ink-3">Proyek</dt>
                <dd data-tone={projectTone(project)}>
                  <Select
                    value={String(d.workstream_id || '')}
                    aria-label="Proyek"
                    icon={<span className="block size-3 rounded-[4px] bg-tone-bar" />}
                    onChange={(event) =>
                      void save(
                        { workstream_id: event.target.value, milestone_id: '' },
                        'mengubah proyek',
                      )
                    }
                    className={PROPERTY}
                  >
                    <option value="">Tugas mandiri (tanpa proyek)</option>
                    {projects.map((row) => (
                      <option key={row.id} value={row.id}>
                        {String(row.data.title)}
                      </option>
                    ))}
                  </Select>
                </dd>
              </dl>
              <section className="flex flex-col gap-2">
                <h3 className="text-[13px] font-semibold text-ink-3">Jadwal berulang</h3>
                <div className="form-group form-compact">
                  <Field label="Ulangi">
                    <Select
                      value={String(d.recurrence || 'tidak')}
                      icon={<Repeat />}
                      onChange={(event) =>
                        void save(
                          {
                            recurrence: event.target.value,
                            ...(event.target.value === 'tidak'
                              ? { recurrence_time: '09:00', recurrence_end_date: '' }
                              : {}),
                          },
                          'mengubah jadwal berulang',
                        )
                      }
                    >
                      {RECURRENCE.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Jam">
                    <TimeField
                      aria-label="Jam"
                      disabled={d.recurrence === 'tidak'}
                      value={String(d.recurrence_time || '09:00')}
                      onChange={(value) =>
                        void save({ recurrence_time: value }, 'mengubah jam pengulangan')
                      }
                    />
                  </Field>
                  <Field label="Sampai tanggal">
                    <DateField
                      aria-label="Berulang sampai"
                      placeholder="Tanpa batas"
                      clearable
                      disabled={d.recurrence === 'tidak'}
                      value={String(d.recurrence_end_date || '')}
                      onChange={(value) =>
                        void save({ recurrence_end_date: value }, 'mengubah batas pengulangan')
                      }
                    />
                  </Field>
                </div>
                <p className="text-xs text-ink-3">
                  Saat tugas berulang ditandai selesai, tugas berikutnya dibuat otomatis. Jam bukan
                  pengingat.
                </p>
              </section>
            </aside>
            <div className="flex min-w-0 flex-col gap-6">
              <section className="flex flex-col gap-1">
                <h3 className="text-[13px] font-medium text-ink-3">Uraian</h3>
                <Textarea
                  value={description}
                  rows={2}
                  placeholder="Tulis uraian singkat tugas ini"
                  aria-label="Uraian"
                  onChange={(event) => setDescription(event.target.value)}
                  onBlur={() =>
                    description !== String(d.description || '') &&
                    void save({ description }, 'mengubah uraian')
                  }
                  className={cn(
                    PROPERTY,
                    'field-sizing-content min-h-20 resize-none rounded-[1.25rem] text-sm',
                  )}
                />
              </section>

              <section className="flex flex-col gap-2">
                <h3 className="flex justify-between text-[13px] font-semibold text-ink-3">
                  Subtugas{' '}
                  <span className="tabular">
                    {subtasks.filter((s) => s.done).length}/{subtasks.length}
                  </span>
                </h3>
                {/* Subtugas berupa kapsul dengan centang di kanan, seperti acuan. */}
                <ul
                  className="flex flex-col gap-2"
                  style={{ ['--tone-bar' as string]: 'var(--accent-strong)' }}
                >
                  {subtasks.map((item, i) => (
                    <li
                      key={i}
                      className={cn(
                        'group flex min-h-11 items-center gap-2 rounded-full border py-1 pr-1.5 pl-4 transition',
                        item.done
                          ? 'border-transparent bg-accent'
                          : 'border-line hover:bg-surface-2',
                      )}
                    >
                      <span
                        className={cn(
                          'flex-1 text-sm font-semibold',
                          item.done ? 'text-accent-ink' : 'text-ink',
                        )}
                      >
                        {item.title}
                      </span>
                      <button
                        type="button"
                        aria-label={`Hapus subtugas ${item.title}`}
                        onClick={() =>
                          void save(
                            { subtasks: subtasks.filter((_, j) => j !== i) },
                            `menghapus subtugas "${item.title}"`,
                          )
                        }
                        className="grid size-8 place-items-center rounded-full text-ink-3 opacity-0 transition group-hover:opacity-100 hover:bg-late hover:text-late-ink focus:opacity-100 max-md:opacity-100"
                      >
                        <Trash2 className="size-4" />
                      </button>
                      <Check
                        size="sm"
                        checked={item.done}
                        label={item.title}
                        onChange={() =>
                          void save(
                            {
                              subtasks: subtasks.map((s, j) =>
                                j === i ? { ...s, done: !s.done } : s,
                              ),
                            },
                            `${item.done ? 'membuka' : 'menyelesaikan'} subtugas "${item.title}"`,
                          )
                        }
                        className="mr-1"
                      />
                    </li>
                  ))}
                </ul>
                <form
                  className="flex gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!subtask.trim()) return;
                    void save(
                      {
                        subtasks: [
                          ...subtasks,
                          { title: subtask.trim().slice(0, 200), done: false },
                        ],
                      },
                      `menambah subtugas "${subtask.trim()}"`,
                    );
                    setSubtask('');
                  }}
                >
                  <Input
                    value={subtask}
                    onChange={(event) => setSubtask(event.target.value)}
                    placeholder="Tambah subtugas"
                    aria-label="Subtugas baru"
                    icon={<Plus />}
                    wrapperClassName="flex-1"
                    className="rounded-full"
                  />
                  <Button
                    type="submit"
                    variant="secondary"
                    disabled={!subtask.trim()}
                    className="rounded-full"
                  >
                    Tambah
                  </Button>
                </form>
              </section>

              <section className="flex flex-col gap-2">
                <h3 className="text-[13px] font-semibold text-ink-3">Tautan hasil kerja</h3>
                <div className="flex gap-2">
                  <Input
                    type="url"
                    placeholder="https://"
                    aria-label="Tautan hasil kerja"
                    icon={<Link2 />}
                    wrapperClassName="flex-1"
                    value={link}
                    onChange={(event) => setLink(event.target.value)}
                    onBlur={() =>
                      link !== String(d.link || '') &&
                      void save(
                        { link },
                        link ? 'memperbarui tautan hasil' : 'menghapus tautan hasil',
                      )
                    }
                  />
                  {Boolean(d.link) && (
                    <>
                      <Button
                        size="icon"
                        className="size-11"
                        aria-label="Salin tautan"
                        onClick={() =>
                          void navigator.clipboard
                            .writeText(String(d.link))
                            .then(() => toast('Tautan tersalin'))
                        }
                      >
                        <Copy />
                      </Button>
                      <Button size="icon" className="size-11" asChild>
                        <a
                          href={String(d.link)}
                          target="_blank"
                          rel="noreferrer"
                          aria-label="Buka tautan"
                        >
                          <ExternalLink />
                        </a>
                      </Button>
                    </>
                  )}
                </div>
              </section>

              {(meeting || document || groups.length > 0) && (
                <section className="flex flex-col gap-2">
                  <h3 className="text-[13px] font-semibold text-ink-3">Terkait</h3>
                  <div className="flex flex-wrap gap-2">
                    {join && (
                      <Button asChild size="sm" variant="primary">
                        <a href={join} target="_blank" rel="noreferrer">
                          <Video />
                          Gabung rapat
                        </a>
                      </Button>
                    )}
                    {document && (
                      <Button asChild size="sm">
                        <Link href={recordLink('documents', document.id)}>
                          <FileText />
                          {String(document.data.title)}
                        </Link>
                      </Button>
                    )}
                  </div>
                  <ul className="flex flex-col gap-1">
                    {groups.flatMap((group) =>
                      group.rows.slice(0, 6).map((row) => (
                        <li key={group.entity + row.id}>
                          <Link
                            href={recordLink(group.entity, row.id)}
                            className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2 text-sm font-semibold hover:bg-surface-3"
                          >
                            <span className="truncate">
                              {String(row.data.title || entityTitle(group.entity))}
                            </span>
                            <span className="shrink-0 text-xs text-ink-3">{group.title}</span>
                          </Link>
                        </li>
                      )),
                    )}
                  </ul>
                </section>
              )}

              <section className="flex flex-col gap-3">
                <h3 className="text-[13px] font-semibold text-ink-3">Catatan & riwayat</h3>
                <form
                  className="flex gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!comment.trim()) return;
                    void save({}, `menambahkan catatan: "${comment.trim()}"`);
                    setComment('');
                  }}
                >
                  <Input
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    placeholder="Tulis catatan untuk tugas ini"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    variant="primary"
                    className="size-11"
                    aria-label="Kirim catatan"
                    disabled={!comment.trim()}
                  >
                    <Send />
                  </Button>
                </form>
                <ol className="flex flex-col gap-3 border-l-2 border-line pl-4">
                  {activities.slice(0, 30).map((entry) => (
                    <li key={entry.id} className="text-sm">
                      <span
                        className={cn(
                          'font-semibold',
                          entry.type === 'comment' ? 'text-ink' : 'text-ink-2',
                        )}
                      >
                        {entry.user} {entry.text}
                      </span>
                      <span className="block text-xs text-ink-3">
                        {formatDateTime(entry.created_at)}
                      </span>
                    </li>
                  ))}
                  <li className="text-xs text-ink-3">Dibuat {formatDateTime(task.created_at)}</li>
                </ol>
              </section>
            </div>
          </div>
        </div>
      </Sheet>
      <RecordFormSheet
        open={fullForm}
        entity="work-items"
        item={task}
        workspace={ws}
        refresh={refresh}
        onClose={() => setFullForm(false)}
      />
    </>
  );
}
