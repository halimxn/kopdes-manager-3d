import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react';
import { Dashboard } from '@/features/dashboard/Dashboard';
import { SprintModal } from '@/features/projects/SprintModal';
import { TaskDetailDrawer } from '@/features/tasks/TaskDetailDrawer';
import { Records } from '@/features/records/Records';
import { AppShell } from '@/components/layout/AppShell';
import { invalidateWorkspaceCache, useWorkspace } from '@/features/workspace/useWorkspace';
import { schemas, type Item } from '@/features/records/schemas';
import { today } from '@/lib/date';
import { usePreference } from '@/lib/usePreference';

const mocks = vi.hoisted(() => ({ api: vi.fn(), replace: vi.fn() }));
vi.mock('@/lib/client', () => ({ api: mocks.api, resetAuthNavigation: vi.fn() }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/tugas',
  useSearchParams: () => new URLSearchParams(window.location.search),
  useRouter: () => ({ replace: mocks.replace }),
}));
vi.mock('@/lib/ThemeContext', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}));

const task = (id: string, title: string): Item => ({
  id,
  created_at: '',
  updated_at: '',
  data: schemas['work-items'].parse({ title, due_date: today() }),
});

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  invalidateWorkspaceCache();
  window.history.replaceState(null, '', '/tugas');
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
});
it('dunia membaca seluruh halaman dan anggota, dengan lingkup semua catatan', async () => {
  mocks.api.mockImplementation(async (path: string) => {
    if (path === 'capabilities') return { operations: true, logistics: true };
    if (path.startsWith('work-items?')) return path.includes('offset=50')
      ? { items: [task('first', 'Duplikat'), task('last', 'Halaman kedua')], hasMore: false, nextOffset: 52 }
      : { items: [task('first', 'Halaman pertama')], hasMore: true, nextOffset: 50 };
    if (path.startsWith('members?')) return { items: [{ id: 'member', data: { status: 'aktif' } }], hasMore: false, nextOffset: 1 };
    return { items: [], hasMore: false, nextOffset: 0 };
  });
  const hook = renderHook(() => useWorkspace('dunia-koperasi'));
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  expect(hook.result.current.error).toBe('');
  expect(hook.result.current.data['work-items']?.map((r) => r.id)).toEqual(['first', 'last']);
  expect(hook.result.current.data.members?.[0].id).toBe('member');
  expect(hook.result.current.more).toEqual({});
  expect(mocks.api.mock.calls.filter(([p]) => p !== 'capabilities').every(([p]) => p.includes('scope=all'))).toBe(true);
});
it('cursor dunia yang tidak maju gagal jelas dan tidak menyimpan ringkasan parsial', async () => {
  mocks.api.mockImplementation(async (path: string) => path === 'capabilities'
    ? { operations: true, logistics: true }
    : { items: [], hasMore: true, nextOffset: 0 });
  const hook = renderHook(() => useWorkspace('dunia-koperasi'));
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  expect(hook.result.current.error).toContain('belum dapat dimuat lengkap');
  expect(hook.result.current.data).toEqual({});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it('a preference stays usable for the session when browser storage rejects writes', () => {
  vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
    throw new Error('Storage blocked');
  });
  const hook = renderHook(() => usePreference('blocked-storage-preference', 'initial'));
  act(() => hook.result.current[1]('chosen'));
  expect(hook.result.current[0]).toBe('chosen');
});

it('a changed scope hides preceding records while a cached scope renders immediately', async () => {
  let finishHistory: (value: {
    items: Item[];
    hasMore: boolean;
    nextOffset: number;
  }) => void = () => {};
  const pendingHistory = new Promise<{ items: Item[]; hasMore: boolean; nextOffset: number }>(
    (resolve) => {
      finishHistory = resolve;
    },
  );
  mocks.api.mockImplementation(async (path: string) => {
    if (path === 'capabilities') return { operations: false };
    if (path.startsWith('work-items?')) {
      if (path.includes('scope=history')) return pendingHistory;
      return { items: [task('active', 'Tugas aktif')], hasMore: false, nextOffset: 0 };
    }
    return { items: [], hasMore: false, nextOffset: 0 };
  });
  const hook = renderHook(({ scope }) => useWorkspace('tugas', { scope }), {
    initialProps: { scope: 'current' as 'current' | 'history' },
  });
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  expect(hook.result.current.data['work-items']?.[0].id).toBe('active');
  hook.rerender({ scope: 'history' });
  expect(hook.result.current.loading).toBe(true);
  expect(hook.result.current.data).toEqual({});
  await act(async () => {
    finishHistory({ items: [task('archived', 'Tugas lama')], hasMore: false, nextOffset: 0 });
  });
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  expect(hook.result.current.data['work-items']?.[0].id).toBe('archived');
  hook.rerender({ scope: 'current' });
  expect(hook.result.current.loading).toBe(false);
  expect(hook.result.current.data['work-items']?.[0].id).toBe('active');
});

it('switching a detail task resets its edit fields to the newly selected task', () => {
  const props = { workspace: {}, onClose: vi.fn(), onUpdated: vi.fn() };
  const view = render(<TaskDetailDrawer task={task('a', 'Tugas pertama')} {...props} />);
  fireEvent.click(screen.getByTitle('Ubah Judul'));
  fireEvent.change(document.querySelector('.title-input-field')!, {
    target: { value: 'Draf lama' },
  });
  view.rerender(<TaskDetailDrawer task={task('b', 'Tugas kedua')} {...props} />);
  expect(screen.queryByText('Tugas pertama')).toBeNull();
  fireEvent.click(screen.getByTitle('Ubah Judul'));
  expect((document.querySelector('.title-input-field') as HTMLInputElement).value).toBe(
    'Tugas kedua',
  );
});

it('an empty saved routine configuration stays empty and stale completions do not inflate counts', () => {
  localStorage.setItem('kdmp_manager_routine_config', '[]');
  localStorage.setItem(`kdmp_manager_routine_${today()}`, '["removed-routine"]');
  render(<Dashboard data={{}} />);
  expect(screen.queryByText('Buka gerai & cek kas modal awal')).toBeNull();
  expect(screen.getByText('0/0 selesai')).toBeTruthy();
});

it('invalid routine storage does not crash the dashboard', () => {
  localStorage.setItem('kdmp_manager_routine_config', '[{"id":3,"title":null}]');
  localStorage.setItem(`kdmp_manager_routine_${today()}`, '{}');
  render(<Dashboard data={{}} />);
  expect(screen.getByText('Buka gerai & cek kas modal awal')).toBeTruthy();
  expect(screen.getByText('0/6 selesai')).toBeTruthy();
});

it('the period editor is a native modal and cannot close while saving', async () => {
  let rejectSave: (reason: Error) => void = () => {};
  mocks.api.mockImplementation(
    () =>
      new Promise((_, reject) => {
        rejectSave = reject;
      }),
  );
  const close = vi.fn();
  render(<SprintModal onClose={close} onSaved={vi.fn()} />);
  const dialog = screen.getByRole('dialog');
  expect(dialog).toBeInstanceOf(HTMLDialogElement);
  fireEvent.click(screen.getByRole('button', { name: 'Simpan' }));
  expect((screen.getByRole('button', { name: 'Tutup modal' }) as HTMLButtonElement).disabled).toBe(
    true,
  );
  fireEvent(dialog, new Event('cancel', { bubbles: false, cancelable: true }));
  expect(close).not.toHaveBeenCalled();
  await act(async () => {
    rejectSave(new Error('Koneksi terputus'));
  });
  expect(screen.getByRole('alert').textContent).toContain('Koneksi terputus');
  fireEvent(dialog, new Event('cancel', { bubbles: false, cancelable: true }));
  expect(close).toHaveBeenCalledOnce();
});

it('a query-only navigation switches task views while preserving local filters', () => {
  const props = {
    entity: 'work-items' as const,
    workspace: { 'work-items': [task('a', 'Tugas saya')] },
    refresh: vi.fn(),
  };
  const view = render(<Records {...props} />);
  fireEvent.click(screen.getByRole('button', { name: /^Prioritas:/ }));
  fireEvent.click(screen.getByRole('option', { name: 'Tinggi' }));
  window.history.replaceState(null, '', '/tugas?view=papan');
  view.rerender(<Records {...props} />);
  expect(screen.getByRole('button', { name: 'Papan' }).getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByRole('button', { name: 'Prioritas: Tinggi' })).toBeTruthy();
});

it('rel ikon membuka panel kelompok berlabel dan lembar menu ponsel tetap inert', () => {
  render(
    <AppShell>
      <p>Isi ruang kerja</p>
    </AppShell>,
  );
  const grup = screen.getByRole('button', { name: 'Buku koperasi' });
  fireEvent.click(grup);
  expect(grup.getAttribute('aria-expanded')).toBe('true');
  const panel = screen.getByRole('dialog', { name: 'Buku koperasi' });
  const links = panel.querySelectorAll('.rel-panel-item');
  expect(links.length).toBeGreaterThan(5);
  expect([...links].every((link) => Boolean(link.getAttribute('aria-label')))).toBe(true);
  expect(screen.getByRole('link', { name: 'Buku kas' }).getAttribute('href')).toBe('/keuangan');
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('dialog', { name: 'Buku koperasi' })).toBeNull();
  const sheet = document.querySelector('.mobile-app-sheet')!;
  expect(sheet.hasAttribute('inert')).toBe(true);
  expect(sheet.getAttribute('aria-hidden')).toBe('true');
});

it('pagination deduplicates records and preserves loaded pages when revisiting a scope', async () => {
  mocks.api.mockImplementation(async (path: string) => {
    if (path === 'capabilities') return { operations: false };
    if (path.startsWith('work-items?') && path.includes('scope=current')) {
      if (path.includes('offset=50'))
        return {
          items: [task('a', 'Awal'), task('b', 'Lanjutan')],
          hasMore: true,
          nextOffset: 100,
        };
      return { items: [task('a', 'Awal')], hasMore: true, nextOffset: 50 };
    }
    return { items: [], hasMore: false, nextOffset: 0 };
  });
  const hook = renderHook(({ scope }) => useWorkspace('tugas', { scope }), {
    initialProps: { scope: 'current' as 'current' | 'history' },
  });
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  await act(async () => {
    await Promise.all([
      hook.result.current.loadMore('work-items'),
      hook.result.current.loadMore('work-items'),
    ]);
  });
  expect(hook.result.current.data['work-items']?.map((row) => row.id)).toEqual(['a', 'b']);
  expect(mocks.api.mock.calls.filter(([path]) => String(path).includes('offset=50'))).toHaveLength(
    1,
  );
  hook.rerender({ scope: 'history' });
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  hook.rerender({ scope: 'current' });
  expect(hook.result.current.data['work-items']?.map((row) => row.id)).toEqual(['a', 'b']);
  expect(hook.result.current.more['work-items']).toBe(100);
});

it('a rejected pagination request from an obsolete scope cannot replace the current page error', async () => {
  let rejectPage: (reason: Error) => void = () => {};
  mocks.api.mockImplementation(async (path: string) => {
    if (path === 'capabilities') return { operations: false };
    if (path.startsWith('work-items?') && path.includes('scope=current')) {
      if (path.includes('offset=50'))
        return new Promise((_, reject) => {
          rejectPage = reject;
        });
      return { items: [task('a', 'Awal')], hasMore: true, nextOffset: 50 };
    }
    return { items: [], hasMore: false, nextOffset: 0 };
  });
  const hook = renderHook(({ scope }) => useWorkspace('tugas', { scope }), {
    initialProps: { scope: 'current' as 'current' | 'history' },
  });
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  let pending: Promise<void>;
  act(() => {
    pending = hook.result.current.loadMore('work-items');
  });
  hook.rerender({ scope: 'history' });
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  await act(async () => {
    rejectPage(new Error('Galat halaman lama'));
    await pending;
  });
  expect(hook.result.current.error).toBe('');
  expect(hook.result.current.fetching).toBeNull();
});
