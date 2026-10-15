import { beforeEach, describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { DailyTasksView } from '@/features/tasks/DailyTasksView';
import { TaskDetailDrawer } from '@/features/tasks/TaskDetailDrawer';
import { SprintCard } from '@/features/projects/SprintCard';
import { ScrumBoardView } from '@/features/tasks/ScrumBoardView';
import { TodayView } from '@/features/dashboard/TodayView';
import { Editor } from '@/features/records/Editor';
import { Records } from '@/features/records/Records';
import { Operations } from '@/features/operations/Operations';
import { type Item } from '@/features/records/schemas';
import { today, addDays } from '@/lib/date';

const mocks = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('@/lib/client', () => ({ api: mocks.api }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});
afterEach(cleanup);

describe('Fitur Redesain Behance', () => {
  it('DailyTasksView menampilkan tugas dan subtugas dengan kode unik', () => {
    const task: Item = {
      id: 'task-100',
      created_at: '',
      updated_at: '',
      data: {
        title: 'Verifikasi Stok Gerai',
        due_date: today(),
        status: 'rencana',
        code: 'KD-44008',
        subtasks: [
          { title: 'Cek rak display', done: false, code: 'KD-44008-1' },
          { title: 'Hitung kardus gudang', done: true, code: 'KD-44008-2' },
        ],
      },
    };

    render(
      <DailyTasksView
        tasks={[task]}
        workspace={{}}
        onOpenTask={vi.fn()}
        onCreateTask={vi.fn()}
        onRefresh={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(screen.getByText('KD-44008')).toBeTruthy();
    expect(screen.getByText('Verifikasi Stok Gerai')).toBeTruthy();
    expect(screen.getByText('KD-44008-1')).toBeTruthy();
    expect(screen.getByText('Cek rak display')).toBeTruthy();
  });

  it('DailyTasksView menggunakan desain terbuka tanpa dropdown accordion', () => {
    const todayStr = today();
    const taskToday: Item = {
      id: 'task-today-1',
      created_at: '',
      updated_at: '',
      data: {
        title: 'Mengerjakan tugas di Lark',
        due_date: todayStr,
        status: 'rencana',
        code: 'TGS-F2A4',
      },
    };
    const overdueTask: Item = {
      id: 'task-overdue-1',
      created_at: '',
      updated_at: '',
      data: {
        title: 'Audit stok beras',
        due_date: addDays(todayStr, -10),
        status: 'rencana',
        code: 'TGS-OLD1',
      },
    };

    render(
      <DailyTasksView
        tasks={[taskToday, overdueTask]}
        workspace={{}}
        onOpenTask={vi.fn()}
        onCreateTask={vi.fn()}
        onRefresh={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    // No collapsible accordion dropdown chevron buttons
    expect(screen.queryByLabelText(/buka tutup/i)).toBeNull();

    // Active day and tasks are directly rendered open
    expect(screen.getByText('Mengerjakan tugas di Lark')).toBeTruthy();
    expect(screen.getByText('TGS-F2A4')).toBeTruthy();

    // Overdue tasks are displayed in open card without accordion dropdown
    expect(screen.getByText(/Tugas Terlewat \/ Perlu Tindak Lanjut/i)).toBeTruthy();
    expect(screen.getByText('Audit stok beras')).toBeTruthy();

    // View mode switch to 'Semua Pekan' displays all days openly
    const allWeekTab = screen.getByRole('button', { name: /Semua Pekan/i });
    fireEvent.click(allWeekTab);
    expect(screen.getByText('Senin')).toBeTruthy();
    expect(screen.getByText('Minggu')).toBeTruthy();
    expect(screen.getByText('Mengerjakan tugas di Lark')).toBeTruthy();
  });

  it('TaskDetailDrawer menampilkan metadata pribadi dan aktivitas tugas', async () => {
    const task: Item = {
      id: 'task-detail-1',
      created_at: '2026-10-01T08:00:00Z',
      updated_at: '2026-10-01T08:00:00Z',
      data: {
        title: 'Persiapan Rapat Anggota Tahunan',
        due_date: '2026-10-05',
        status: 'rencana',
        code: 'KD-44006',
        description: 'Menyiapkan berkas LPJ dan laporan keuangan.',
        assignee: 'Budi Santoso',
        activities: [
          {
            id: 'act-1',
            user: 'Budi Santoso',
            role: 'Manajer Koperasi',
            text: 'membuat tugas ini',
            created_at: '2026-10-01T08:00:00Z',
            type: 'creation',
          },
        ],
      },
    };

    render(
      <TaskDetailDrawer
        task={task}
        workspace={{}}
        onClose={vi.fn()}
        onUpdated={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(screen.getByText('KD-44006')).toBeTruthy();
    expect(screen.getByText('Dibuat oleh')).toBeTruthy();
    expect(screen.getByText('Penanggung jawab')).toBeTruthy();
    expect(screen.queryByText('PEMANGKU / TIM')).toBeNull();
    expect(screen.getByText(/membuat tugas ini/)).toBeTruthy();

    // Verify status & priority select controls
    expect(screen.getByRole('button', { name: /Ubah status tugas/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Ubah prioritas tugas/i })).toBeTruthy();

    // Verify submission card renders cleanly with exactly one setup button (no duplicates)
    expect(screen.getByText('Link Pengumpulan & Bukti Hasil')).toBeTruthy();
    expect(screen.getByText('Belum Ada Tautan')).toBeTruthy();
    const addLinkBtns = screen.getAllByRole('button', { name: /Pasang Link Pengumpulan/i });
    expect(addLinkBtns.length).toBe(1);
  });

  it('SprintCard merangkum progres dan jumlah tugas dalam sprint', () => {
    const sprint: Item = {
      id: 'sprint-1',
      created_at: '',
      updated_at: '',
      data: {
        title: 'Sprint 1 Gerai',
        goal: 'Kesiapan rak dan barang',
        duration: '2 minggu',
        status: 'aktif',
      },
    };

    const taskDone: Item = {
      id: 't-1',
      created_at: '',
      updated_at: '',
      data: { title: 'Tugas 1', sprint_id: 'sprint-1', status: 'selesai' },
    };
    const taskPlan: Item = {
      id: 't-2',
      created_at: '',
      updated_at: '',
      data: { title: 'Tugas 2', sprint_id: 'sprint-1', status: 'rencana' },
    };

    render(
      <SprintCard
        sprint={sprint}
        tasks={[taskDone, taskPlan, { ...taskPlan, id: 'cancelled', data: { ...taskPlan.data, status: 'dibatalkan' } }]}
        onEdit={vi.fn()}
        onRefresh={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(screen.getByText('Sprint 1 Gerai')).toBeTruthy();
    expect(screen.getByText('50%')).toBeTruthy();
    expect(screen.getByText('1 dari 2 tugas selesai')).toBeTruthy();
  });

  it('ScrumBoardView menampilkan kolom Backlog, To Do, dan kartu tugas dengan tombol Add Task', () => {
    const task: Item = {
      id: 'task-scrum-1',
      created_at: '',
      updated_at: '',
      data: {
        title: 'Penataan Rak Etalase Gerai',
        status: 'rencana',
        code: 'KD-44010',
        due_date: '2026-10-01',
        description: 'Menyusun barang sembako di rak depan',
      },
    };

    render(
      <ScrumBoardView
        tasks={[task]}
        workspace={{}}
        onOpenTask={vi.fn()}
        onCreateTask={vi.fn()}
        onRefresh={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Rencana' })).toBeTruthy();
    expect(screen.getAllByText('Dibatalkan')[0]).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Dikerjakan' })).toBeTruthy();

    expect(screen.getAllByText('Selesai')[0]).toBeTruthy();
    expect(screen.getByText('KD-44010')).toBeTruthy();
    expect(screen.getByText('Penataan Rak Etalase Gerai')).toBeTruthy();
    expect(screen.getByText('Mulai Kerja →')).toBeTruthy();
    expect(screen.getByText('Manajer')).toBeTruthy();
    expect(screen.getAllByText('Tambah tugas').length).toBeGreaterThan(0);
  });

  it('ScrumBoardView menampilkan kartu tugas dengan indikator subtugas dan tombol status yang tepat', () => {
    const taskWithSubtasks: Item = {
      id: 'task-scrum-2',
      created_at: '',
      updated_at: '',
      data: {
        title: 'Mengerjakan tugas di Lark',
        status: 'proses',
        code: 'TGS-F2A4',
        due_date: '2026-10-03',
        priority: 'tinggi',
        subtasks: [
          { title: 'Subtugas 1', done: false },
        ],
      },
    };

    render(
      <ScrumBoardView
        tasks={[taskWithSubtasks]}
        workspace={{}}
        onOpenTask={vi.fn()}
        onCreateTask={vi.fn()}
        onRefresh={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(screen.getByText('TGS-F2A4')).toBeTruthy();
    expect(screen.getByText('Mengerjakan tugas di Lark')).toBeTruthy();
    expect(screen.getByText('tinggi')).toBeTruthy();
    expect(screen.getByText('0/1')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tandai tugas selesai' })).toBeTruthy();
    expect(screen.getByText('← Rencana')).toBeTruthy();
  });

  it('TodayView menampilkan tugas hari ini, tugas terlambat, dan agenda rapat', () => {
    const todayTask: Item = {
      id: 'today-1',
      created_at: '',
      updated_at: '',
      data: {
        title: 'Cek kas harian',
        status: 'rencana',
        due_date: today(),
      },
    };
    const overdueTask: Item = {
      id: 'overdue-1',
      created_at: '',
      updated_at: '',
      data: {
        title: 'LPJ Bulanan',
        status: 'rencana',
        due_date: addDays(today(), -5),
      },
    };
    const meeting: Item = {
      id: 'meeting-1',
      created_at: '',
      updated_at: '',
      data: {
        title: 'Rapat Pengurus KDMP',
        date: today(),
        time: '14:00',
        mode: 'Tatap muka',
      },
    };

    render(
      <TodayView
        workspace={{
          'work-items': [todayTask, overdueTask],
          meetings: [meeting],
        }}
        refresh={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(screen.getByText('Fokus kerja hari ini')).toBeTruthy();
    expect(screen.getByText('Cek kas harian')).toBeTruthy();
    expect(screen.getByText('Tugas Terlambat')).toBeTruthy();
    expect(screen.getByText('LPJ Bulanan')).toBeTruthy();
    expect(screen.getByText('Rapat Pengurus KDMP')).toBeTruthy();
    expect(screen.getByText('14:00 WIB')).toBeTruthy();

    const formBtn = screen.getByRole('button', { name: /Form lengkap/i });
    expect(formBtn).toBeTruthy();
    fireEvent.click(formBtn);
    expect(screen.getByRole('heading', { name: /Tambah tugas/i })).toBeTruthy();
  });

  it('Editor mitra menyediakan kategori Agrinas tanpa nama orang rekaan', () => {
    render(
      <Editor
        entity="stakeholders"
        workspace={{}}
        onClose={vi.fn()}
        onSaved={vi.fn().mockResolvedValue(undefined)}
      />,
    );
    expect(screen.getByText('Jenis kontak')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Agrinas' }));
    expect((screen.getByLabelText(/Nama orang atau lembaga/i) as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Kategori', { exact: true }) as HTMLSelectElement).value).toBe('Agrinas');
    expect(screen.queryByLabelText(/Tingkat wewenang/i)).toBeNull();
  });

  it('Records mitra menampilkan kontak dan tindak lanjut tersimpan', () => {
    const contact: Item = {
      id: 'stk-1',
      created_at: '',
      updated_at: '',
      data: {
        title: 'Kontak uji',
        category: 'Agrinas',
        contact: '081234567890',
        influence: 3,
        interest: 3,
        last_contact: '2026-09-28',
        follow_up: 'Hubungi PIC',
      },
    };
    render(
      <Records
        entity="stakeholders"
        workspace={{ stakeholders: [contact] }}
        refresh={vi.fn().mockResolvedValue(undefined)}
      />,
    );
    expect(screen.getAllByText('Kontak uji').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Agrinas/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('WhatsApp ↗')).toBeTruthy();
    expect(screen.getByText('Telepon')).toBeTruthy();
    expect(screen.getByText(/Hubungi PIC/)).toBeTruthy();
    expect(screen.queryByText(/Peta pengaruh/i)).toBeNull();
  });

  it('Editor meetings menyesuaikan input lokasi dan online meeting berdasarkan pilihan format rapat', () => {
    render(
      <Editor
        entity="meetings"
        workspace={{}}
        onClose={vi.fn()}
        onSaved={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    // Default mode is 'tatap muka': location is shown, meeting_url is hidden
    expect(screen.getByLabelText(/Ruangan \/ Tempat Rapat/i)).toBeTruthy();
    expect(screen.queryByLabelText(/Tautan Rapat Online/i)).toBeNull();

    // Switch to 'online': meeting_url is shown, location is hidden
    const modeSelect = screen.getByLabelText('Format Rapat', { exact: true }) as HTMLSelectElement;
    fireEvent.change(modeSelect, { target: { value: 'online' } });

    expect(screen.getByLabelText(/Tautan Rapat Online/i)).toBeTruthy();
    expect(screen.queryByLabelText(/Ruangan \/ Tempat Rapat/i)).toBeNull();

    // Switch to 'hybrid': both location and meeting_url are shown
    fireEvent.change(modeSelect, { target: { value: 'hybrid' } });

    expect(screen.getByLabelText(/Ruangan \/ Tempat Rapat/i)).toBeTruthy();
    expect(screen.getByLabelText(/Tautan Rapat Online/i)).toBeTruthy();
  });

  it('Operations menampilkan tabel kas dengan lencana arah transaksi, nominal rapi, dan tombol aksi', () => {
    const cashItem: Item = {
      id: 'cash-1',
      created_at: '',
      updated_at: '',
      data: {
        title: 'Penjualan Beras',
        date: '2026-10-01',
        direction: 'masuk',
        amount: 150000,
        category: 'Operasional',
        account: 'Kas Utama',
      },
    };

    render(
      <Operations
        slug="keuangan"
        data={{ 'cash-entries': [cashItem] }}
        ready
        refresh={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(screen.getByText('Penjualan Beras')).toBeTruthy();
    expect(screen.getByText('+ Masuk')).toBeTruthy();
    expect(screen.getByText('+ Rp 150.000')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ubah' })).toBeTruthy();
  });

  it('Records mode kalender menampilkan agenda terpilih dan calendar-task-card modern', async () => {
    const todayStr = today();
    const task: Item = {
      id: 'task-cal-1',
      created_at: '',
      updated_at: '',
      data: {
        title: 'Mengerjakan tugas di Lark',
        due_date: todayStr,
        status: 'rencana',
        priority: 'tinggi',
        code: 'TGS-F2A4',
        subtasks: [{ title: 'teest', done: false }],
      },
    };

    const { container } = render(
      <Records
        entity="work-items"
        workspace={{
          'work-items': [task],
          workstreams: [{ id: 'p-1', created_at: '', updated_at: '', data: { title: 'KDMP Mart', color: '#10b981' } } as Item],
        }}
        refresh={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    // Switch to kalender view
    fireEvent.click(screen.getByRole('button', { name: 'Kalender' }));

    // Select today
    fireEvent.click(await screen.findByRole('button', { name: 'Hari ini' }));

    // Check modern calendar task card is rendered
    const taskCard = container.querySelector('.calendar-task-card') as HTMLElement;
    expect(taskCard).toBeTruthy();
    expect(within(taskCard).getByText('TGS-F2A4')).toBeTruthy();
    expect(within(taskCard).getByText('Mengerjakan tugas di Lark')).toBeTruthy();
    expect(within(taskCard).getByText('teest')).toBeTruthy();
    expect(within(taskCard).getByText('0/1 subtugas selesai (0%)')).toBeTruthy();

    // Check action buttons
    expect(screen.getByRole('button', { name: '+1 hari' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Buka catatan' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Selesai' })).toBeTruthy();
  });
});




