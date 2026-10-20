import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useSwipeAction } from '@/components/ui/useSwipeAction';
import { Button } from '@/components/ui/Button';
function Harness({ right, left, open }: { right: (id: string) => void; left: (id: string) => void; open: () => void }) {
  const swipe = useSwipeAction(right, left, false);
  return <div {...swipe}><div data-swipe-task="task" onClick={open}><span>Kartu</span><Button>Aksi</Button></div></div>;
}
function pointer(type: string, target: Element, x: number, y: number) {
  const event = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y });
  Object.defineProperties(event, { pointerId: { value: 1 }, pointerType: { value: 'touch' }, isPrimary: { value: true } });
  fireEvent(target, event);
}
beforeEach(() => vi.stubGlobal('innerWidth', 360));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('swipe horizontal menjalankan satu aksi dan menahan klik pembuka detail', () => {
  const right = vi.fn(), left = vi.fn(), open = vi.fn();
  render(<Harness right={right} left={left} open={open} />);
  const card = screen.getByText('Kartu');
  pointer('pointerdown', card, 100, 100); pointer('pointerup', card, 200, 104); fireEvent.click(card);
  expect(right).toHaveBeenCalledExactlyOnceWith('task'); expect(open).not.toHaveBeenCalled();
  pointer('pointerdown', card, 200, 100); pointer('pointerup', card, 100, 104);
  expect(left).toHaveBeenCalledExactlyOnceWith('task');
});
it('scroll vertikal dan sentuhan pada tombol tidak menjalankan swipe', () => {
  const right = vi.fn(), left = vi.fn();
  render(<Harness right={right} left={left} open={vi.fn()} />);
  const card = screen.getByText('Kartu');
  pointer('pointerdown', card, 100, 100); pointer('pointerup', card, 180, 200);
  const button = screen.getByRole('button');
  pointer('pointerdown', button, 100, 100); pointer('pointerup', button, 200, 100);
  expect(right).not.toHaveBeenCalled(); expect(left).not.toHaveBeenCalled();
});

it('kartu ikut bergeser dan ditandai arah aksi selama digeser, lalu kembali saat dilepas', () => {
  render(<Harness right={vi.fn()} left={vi.fn()} open={vi.fn()} />);
  const card = screen.getByText('Kartu');
  const kartu = card.closest('[data-swipe-task]') as HTMLElement;
  pointer('pointerdown', card, 100, 100);
  pointer('pointermove', card, 200, 102);
  expect(kartu.dataset.geser).toBe('kanan');
  expect(kartu.style.translate).toBe('70px 0');
  pointer('pointerup', card, 200, 102);
  expect(kartu.dataset.geser).toBeUndefined();
  expect(kartu.style.translate).toBe('');
});
