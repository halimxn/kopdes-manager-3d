'use client';
import { useLayoutEffect, useRef, useState, type InputHTMLAttributes } from 'react';
import { Input } from './Input';

function grouped(value: string) {
  return /^-?\d*$/.test(value) ? value.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : value;
}

export function IntegerInput({
  name,
  defaultValue,
  min,
  max,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  const initial = String(defaultValue ?? '');
  const [rawValue, setRawValue] = useState(initial);
  const display = grouped(rawValue);
  const input = useRef<HTMLInputElement>(null);
  const stored = useRef<HTMLInputElement>(null);
  const caret = useRef<number | null>(null);

  function validate(element: HTMLInputElement, raw: string) {
    const value = Number(raw);
    const message =
      raw === ''
        ? ''
        : !/^-?\d+$/.test(raw) || !Number.isSafeInteger(value)
          ? 'Masukkan bilangan bulat.'
          : min !== undefined && value < Number(min)
            ? `Nilai minimal ${grouped(String(min))}.`
            : max !== undefined && value > Number(max)
              ? `Nilai maksimal ${grouped(String(max))}.`
              : '';
    element.setCustomValidity(message);
  }

  useLayoutEffect(() => {
    if (!input.current) return;
    validate(input.current, stored.current?.value ?? '');
    if (caret.current !== null) {
      input.current.setSelectionRange(caret.current, caret.current);
      caret.current = null;
    }
  });

  return (
    <>
      <Input
        {...props}
        ref={input}
        type="text"
        inputMode="numeric"
        min={min}
        max={max}
        value={display}
        onChange={(event) => {
          const element = event.currentTarget;
          const text = element.value;
          let raw = text.replaceAll('.', '');
          let position = text
            .slice(0, element.selectionStart ?? text.length)
            .replaceAll('.', '').length;
          const inputType = (event.nativeEvent as InputEvent).inputType;
          // Menghapus pemisah juga menghapus digit di sebelahnya, agar Backspace tidak terasa macet.
          if (raw === display.replaceAll('.', '') && inputType?.startsWith('delete')) {
            const index = inputType === 'deleteContentBackward' ? position - 1 : position;
            if (index >= 0) {
              raw = raw.slice(0, index) + raw.slice(index + 1);
              position = index;
            }
          }
          const formatted = grouped(raw);
          let cursor = 0;
          let count = 0;
          while (cursor < formatted.length && count < position) {
            if (formatted[cursor] !== '.') count++;
            cursor++;
          }
          caret.current = cursor;
          // Draf formulir dibaca saat event berubah, sebelum React merender ulang.
          if (stored.current) stored.current.value = raw;
          validate(element, raw);
          setRawValue(raw);
        }}
      />
      <input ref={stored} type="hidden" name={name} value={rawValue} disabled={props.disabled} />
    </>
  );
}
