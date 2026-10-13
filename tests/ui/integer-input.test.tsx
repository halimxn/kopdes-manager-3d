import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { IntegerInput } from '@/components/ui/IntegerInput';
afterEach(cleanup);

it('memformat ribuan saat mengetik dan menyimpan angka mentah untuk formulir serta draf', () => {
  let draft = '';
  const { container } = render(
    <form
      onChange={(e) => {
        draft = String(new FormData(e.currentTarget).get('amount'));
      }}
    >
      <IntegerInput
        name="amount"
        aria-label="Nominal"
        defaultValue="25000"
        required
        min={1}
        max={1000000000000}
      />
    </form>,
  );
  const input = screen.getByRole('textbox') as HTMLInputElement;
  expect(input.value).toBe('25.000');
  fireEvent.change(input, { target: { value: '1250000' } });
  expect(input.value).toBe('1.250.000');
  expect(draft).toBe('1250000');
  expect(new FormData(container.querySelector('form')!).get('amount')).toBe('1250000');
  fireEvent.change(input, { target: { value: '' } });
  expect(input.value).toBe('');
  expect(input.checkValidity()).toBe(false);
});

it('mempertahankan batas angka dan menolak pecahan tanpa mengubahnya menjadi bilangan lain', () => {
  render(
    <IntegerInput aria-label="Jumlah" name="quantity" defaultValue="0" min={0} max={1000000000} />,
  );
  const input = screen.getByRole('textbox') as HTMLInputElement;
  expect(input.checkValidity()).toBe(true);
  for (const value of ['-1', '1000000001', '1,5', 'abc']) {
    fireEvent.change(input, { target: { value } });
    expect(input.checkValidity()).toBe(false);
  }
  fireEvent.change(input, { target: { value: '1.234.567' } });
  expect(input.value).toBe('1.234.567');
  expect(input.checkValidity()).toBe(true);
});

it('menjaga posisi kursor saat menyisipkan digit di tengah', () => {
  render(<IntegerInput aria-label="Nominal" defaultValue="12345" />);
  const input = screen.getByRole('textbox') as HTMLInputElement;
  fireEvent.change(input, { target: { value: '129.345', selectionStart: 3 } });
  expect(input.value).toBe('129.345');
  expect(input.selectionStart).toBe(3);
});

it('Backspace pada pemisah tidak macet dan nilai read-only tetap masuk formulir', () => {
  const { container } = render(
    <form>
      <IntegerInput aria-label="Stok buku" name="book" defaultValue="1234" readOnly />
      <IntegerInput aria-label="Jumlah" name="quantity" defaultValue="1234" />
    </form>,
  );
  const input = screen.getByRole('textbox', { name: 'Jumlah' }) as HTMLInputElement;
  fireEvent.input(input, {
    target: { value: '1234', selectionStart: 1 },
    inputType: 'deleteContentBackward',
  });
  expect(input.value).toBe('234');
  expect(new FormData(container.querySelector('form')!).get('quantity')).toBe('234');
  expect(new FormData(container.querySelector('form')!).get('book')).toBe('1234');
});
