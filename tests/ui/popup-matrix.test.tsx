import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Editor } from '@/features/records/Editor';
import { popupEntities, popupWorkspace } from '@/features/qa/popup-fixtures';
import { schemas } from '@/features/records/schemas';
import { api } from '@/lib/client';
vi.mock('@/lib/client', () => ({ api: vi.fn().mockResolvedValue({}) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), useSearchParams: () => new URLSearchParams() }));
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
afterEach(cleanup);
for (const entity of popupEntities) {
  for (const filled of [false, true]) {
    it(`form ${entity} ${filled ? 'ubah terisi' : 'tambah'} memiliki dialog, kontrol dan label`, () => {
      const item = popupWorkspace[entity]![0];
      expect(schemas[entity].safeParse(item.data).success).toBe(true);
      const { container } = render(<Editor entity={entity} item={filled ? item : undefined} workspace={popupWorkspace} draftScope="qa-popup" onClose={() => {}} onSaved={async () => {}} />);
      expect(screen.getByRole('dialog')).toBeTruthy();
      expect(screen.getByRole('button', { name: /^Simpan$/ })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Tutup formulir' })).toBeTruthy();
      for (const control of container.querySelectorAll('input:not([aria-hidden="true"]):not([type="hidden"]), textarea')) {
        expect(control.getAttribute('aria-label') || control.getAttribute('aria-labelledby') || (control as HTMLInputElement).labels?.length).toBeTruthy();
      }
    }, 15000);
  }
}

it('tugas cepat menyimpan penanggung jawab dan gerai untuk dunia', async () => {
  const onSaved = vi.fn().mockResolvedValue(undefined);
  const { container } = render(<Editor entity="work-items" quick workspace={popupWorkspace} onClose={() => {}} onSaved={onSaved} />);
  fireEvent.change(screen.getByRole('textbox', { name: 'Nama / judul' }), { target: { value: 'Periksa rak' } });
  // Penanggung jawab dipilih dari daftar Tim, bukan diketik bebas.
  const anggota = String(popupWorkspace.staff![0].data.title);
  fireEvent.click(screen.getByRole('radio', { name: new RegExp(anggota) }));
  fireEvent.change(container.querySelector('select[name="unit_id"]')!, { target: { value: popupWorkspace.units![0].id } });
  fireEvent.submit(container.querySelector('form')!);
  await waitFor(() => expect(api).toHaveBeenCalledWith('work-items', expect.objectContaining({ data: expect.objectContaining({ assignee: String(popupWorkspace.staff![0].data.title), unit_id: popupWorkspace.units![0].id }) })));
  expect(onSaved).toHaveBeenCalled();
});

it('harga barang adalah angka nonnegatif dan gerai langsung tersedia', () => {
  render(<Editor entity="inventory-items" workspace={popupWorkspace} onClose={() => {}} onSaved={async () => {}} />);
  const price = screen.getByRole('textbox', { name: 'Harga satuan (Rp)' });
  expect(price.getAttribute('min')).toBe('0');
  expect(price.closest('details')).toBeNull();
  expect(screen.getByRole('button', { name: /^Gerai:/ }).closest('details')).toBeNull();
});

it('nominal terformat disimpan ke API sebagai angka tanpa titik', async () => {
  const { container } = render(<Editor entity="cash-entries" item={popupWorkspace['cash-entries']![0]} workspace={popupWorkspace} onClose={() => {}} onSaved={async () => {}} />);
  const amount = screen.getByRole('textbox', { name: 'Nominal (Rp)' }) as HTMLInputElement;
  fireEvent.change(amount, { target: { value: '1250000' } });
  expect(amount.value).toBe('1.250.000');
  fireEvent.submit(container.querySelector('form')!);
  await waitFor(() => expect(api).toHaveBeenCalledWith('cash-entries', expect.objectContaining({ data: expect.objectContaining({ amount: 1250000 }) })));
});
