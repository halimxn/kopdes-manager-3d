import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { KartuPekerjaan } from '@/features/dashboard/KartuPekerjaan';
import { Dashboard } from '@/features/dashboard/Dashboard';
import { schemas } from '@/features/records/schemas';
import { hariSeminggu, today } from '@/lib/date';

const P1 = 'c0de0000-0000-4000-8000-000000000001';
const baris = (id: string, data: Record<string, unknown>) => ({ id, created_at: '', updated_at: '', data });
const tugas = (id: string, isi: Record<string, unknown>) => baris(id, schemas['work-items'].parse(isi));
vi.mock('@/lib/client', () => ({ api: vi.fn(async () => ({ items: [], hasMore: false, nextOffset: 0 })) }));
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.useRealTimers();
});

it('kartu pekerjaan menampilkan judul, progres bertulis, dan tautan', () => {
  render(<KartuPekerjaan judul="Siapkan rak gerai" hub="usaha" href="/tugas?task=1" progres={40} tenggat="20 Okt" />);
  expect(screen.getByRole('link', { name: /Siapkan rak gerai/ }).getAttribute('href')).toBe('/tugas?task=1');
  expect(screen.getByText('40%')).toBeTruthy();
  expect(screen.getByText(/20 Okt/)).toBeTruthy();
});

it('nama aksesibel kartu pekerjaan ringkas: judul, progres, tenggat', () => {
  render(<KartuPekerjaan judul="Siapkan rak gerai" hub="usaha" href="/tugas?task=1" progres={40} tenggat="20 Okt" keterangan="Aktif · 3 tugas" />);
  expect(screen.getByRole('link', { name: 'Siapkan rak gerai, progres 40%, 20 Okt' })).toBeTruthy();
  cleanup();
  render(<KartuPekerjaan judul="Rapat pengurus" hub="catatan" href="/rapat" progres={null} />);
  expect(screen.getByRole('link', { name: 'Rapat pengurus, progres belum dinilai' })).toBeTruthy();
});

it('kartu tanpa progres menulis "Belum dinilai", bukan 0%', () => {
  render(<KartuPekerjaan judul="Rapat pengurus" hub="catatan" href="/rapat" progres={null} />);
  expect(screen.getByText('Belum dinilai')).toBeTruthy();
  expect(screen.queryByText('0%')).toBeNull();
});

it('Beranda mendahulukan rutin dan agenda, lalu tindakan, minggu ini, dan pekerjaan berjalan', () => {
  const now = today();
  render(
    <Dashboard
      data={{
        workstreams: [baris(P1, { title: 'Gerai sembako', status: 'aktif', code: 'GS' })],
        'work-items': [tugas('t1', { title: 'Susun rak', workstream_id: P1, status: 'selesai', due_date: now })],
      }}
    />,
  );
  const judul = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
  expect(judul.slice(1, 6)).toEqual(['Rutin harian', 'Agenda hari ini', 'Perlu tindakan', 'Minggu ini', 'Pekerjaan berjalan']);
  const berjalan = screen.getByRole('region', { name: 'Pekerjaan berjalan' });
  const kartu = within(berjalan).getByRole('link', { name: /Gerai sembako/ });
  expect(kartu.getAttribute('href')).toBe('/proyek?id=' + P1);
  expect(within(kartu).getByText('100%')).toBeTruthy();
});

it('tambah cepat membuka form tugas terisi dari satu kalimat', () => {
  const terima = vi.fn();
  window.addEventListener('hub-task', terima);
  render(
    <Dashboard
      data={{
        staff: [baris('s1', { title: 'Budi Darma' })],
        workstreams: [baris(P1, { title: 'Gerai sembako', status: 'aktif' })],
      }}
    />,
  );
  const isian = screen.getByLabelText('Tambah tugas') as HTMLInputElement;
  fireEvent.change(isian, { target: { value: 'Cek stok gula @budi #gerai !tinggi' } });
  fireEvent.click(screen.getByRole('button', { name: 'Buat' }));
  window.removeEventListener('hub-task', terima);
  expect((terima.mock.calls[0][0] as CustomEvent).detail).toEqual({
    title: 'Cek stok gula',
    assignee: 'Budi Darma',
    workstream_id: P1,
    priority: 'tinggi',
  });
  expect(isian.value).toBe('');
});

it('salin laporan menyalin laporan harian lalu memberi tahu tempat menempelnya', async () => {
  const tulis = vi.fn<(teks: string) => Promise<void>>(async () => {});
  Object.defineProperty(navigator, 'clipboard', { value: { writeText: tulis }, configurable: true });
  render(<Dashboard data={{ 'work-items': [tugas('t1', { title: 'Cek timbangan', status: 'proses', due_date: today() })] }} />);
  fireEvent.click(screen.getByRole('button', { name: /Salin laporan/ }));
  expect(await screen.findByText(/Tempel di grup WhatsApp pengurus/)).toBeTruthy();
  expect(tulis.mock.calls[0][0]).toContain('Laporan kerja harian');
  expect(tulis.mock.calls[0][0]).toContain('Jatuh tempo hari ini (1)\n- Cek timbangan');
});

it('bila peramban menolak clipboard, laporan tampil di dialog untuk disalin sendiri', async () => {
  const tolak = vi.fn(async () => {
    throw new Error('ditolak');
  });
  Object.defineProperty(navigator, 'clipboard', { value: { writeText: tolak }, configurable: true });
  render(<Dashboard data={{}} />);
  fireEvent.click(screen.getByRole('button', { name: /Salin laporan/ }));
  const isi = (await screen.findByLabelText('Isi laporan')) as HTMLTextAreaElement;
  expect(isi.value).toContain('Laporan kerja harian');
});

it('centang rutin terakhir merayakan rutin yang beres semua', () => {
  render(<Dashboard data={{}} />);
  const rutin = screen.getByRole('region', { name: 'Rutin harian' });
  for (const kotak of within(rutin).getAllByRole('checkbox')) fireEvent.click(kotak);
  expect(within(rutin).getByText('6/6')).toBeTruthy();
  expect(screen.getByText('Rutin hari ini beres semua.')).toBeTruthy();
});

it('agenda menghitung mundur ke rapat berikutnya dan menawarkan Catat hasil untuk rapat yang lewat', () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  // 10.00 WIB, Senin 19 Oktober 2026.
  vi.setSystemTime(new Date('2026-10-19T03:00:00Z'));
  render(
    <Dashboard
      data={{
        meetings: [
          baris('m1', { title: 'Rapat pengurus', date: '2026-10-19', time: '08:00', duration: 60 }),
          baris('m2', { title: 'Kunjungan pemasok', date: '2026-10-19', time: '11:00', duration: 60, mode: 'online', meeting_url: 'https://meet.example/abc' }),
        ],
      }}
    />,
  );
  const agenda = screen.getByRole('region', { name: 'Agenda hari ini' });
  expect(within(agenda).getByText('1 jam lagi')).toBeTruthy();
  const catat = new URL(within(agenda).getByRole('link', { name: 'Catat hasil' }).getAttribute('href')!, 'http://x');
  expect(catat.pathname).toBe('/jurnal');
  expect(catat.searchParams.get('isi.meeting_id')).toBe('m1');
  expect(catat.searchParams.get('isi.title')).toBe('Hasil: Rapat pengurus');
  expect(within(agenda).getByRole('link', { name: /Gabung/ }).getAttribute('href')).toBe('https://meet.example/abc');
  const nanti = within(agenda).getByRole('link', { name: 'Kunjungan pemasok' }).closest('li')!;
  expect(nanti.getAttribute('data-kini')).toBe('10.00 sekarang');
});

it('pita minggu menampilkan tugas pada hari yang dipilih', () => {
  const now = today();
  const hari = hariSeminggu(now).find((tanggal) => tanggal !== now)!;
  render(<Dashboard data={{ 'work-items': [tugas('t1', { title: 'Antar faktur', status: 'rencana', due_date: hari })] }} />);
  const minggu = screen.getByRole('region', { name: 'Minggu ini' });
  expect(within(minggu).queryByText('Antar faktur')).toBeNull();
  const tombol = within(minggu).getByRole('button', { name: /1 tugas, 0 agenda/ });
  fireEvent.click(tombol);
  expect(tombol.getAttribute('aria-pressed')).toBe('true');
  expect(within(minggu).getByText('Antar faktur')).toBeTruthy();
});
