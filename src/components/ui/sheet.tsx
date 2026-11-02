'use client';
import { Dialog } from 'radix-ui';
import { X } from 'lucide-react';
import { useRef, type PointerEvent, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

const PHONE = '(max-width: 767px)';

/**
 * Laci untuk membuat dan mengubah data: panel kanan di tablet/laptop, lembar bawah di HP.
 * Menggantikan semua modal formulir lama; konteks halaman tetap terlihat di belakangnya.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  headerExtra,
  wide,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  headerExtra?: ReactNode;
  wide?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    id: number;
    startY: number;
    startT: number;
    lastY: number;
    lastT: number;
    speed: number;
  }>(null);

  // Lembar bawah di HP bisa ditarik turun dari pegangan/kepala untuk menutup, seperti lembar bawaan ponsel.
  const move = (offset: number, transition?: string) => {
    if (!panel.current || !overlay.current) return;
    const height = panel.current.offsetHeight || 1;
    panel.current.style.transition = transition ?? 'none';
    overlay.current.style.transition = transition ? 'opacity 0.3s ease-out' : 'none';
    panel.current.style.transform = offset ? `translateY(${offset}px)` : '';
    overlay.current.style.opacity = offset > 0 ? String(1 - offset / height) : '';
  };
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !window.matchMedia(PHONE).matches) return;
    // Tombol di kepala laci (tutup, menu, navigasi) tetap berfungsi sebagai tombol.
    if ((event.target as HTMLElement).closest('button, a, input, select, textarea')) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      id: event.pointerId,
      startY: event.clientY,
      startT: event.timeStamp,
      lastY: event.clientY,
      lastT: event.timeStamp,
      speed: 0,
    };
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state || state.id !== event.pointerId) return;
    const elapsed = event.timeStamp - state.lastT;
    if (elapsed > 0) state.speed = (event.clientY - state.lastY) / elapsed;
    state.lastY = event.clientY;
    state.lastT = event.timeStamp;
    const offset = event.clientY - state.startY;
    // Ke atas hanya sedikit melawan, ke bawah mengikuti jari.
    move(offset > 0 ? offset : offset / 6);
  };
  const onPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state || state.id !== event.pointerId) return;
    drag.current = null;
    const offset = event.clientY - state.startY;
    const height = panel.current?.offsetHeight ?? 0;
    // Kibasan singkat bisa hanya punya satu gerakan; kecepatan rata-rata jadi cadangan.
    const speed = Math.max(state.speed, offset / Math.max(1, event.timeStamp - state.startT));
    // Tutup bila ditarik lebih dari sepertiga (maks. 140 px) atau dikibas cepat ke bawah;
    // getaran kecil saat mengetuk kepala laci tidak dihitung kibasan.
    if (
      event.type === 'pointerup' &&
      (offset > Math.min(140, height / 3) || (offset > 24 && speed > 0.6))
    )
      onOpenChange(false);
    else move(0, 'transform 0.35s var(--ease-sheet)');
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          ref={overlay}
          className="overlay fixed inset-0 z-50 bg-[var(--scrim)] backdrop-blur-[2px]"
        />
        <Dialog.Content
          ref={panel}
          className={cn(
            'sheet fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col overflow-hidden rounded-t-[1.75rem] bg-surface shadow-float ring-1 ring-line-strong outline-none',
            'md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-[min(30rem,100vw)] md:rounded-none md:rounded-l-[1.75rem]',
            wide && 'md:w-[min(44rem,100vw)]',
          )}
        >
          <div
            className="shrink-0 touch-none md:touch-auto"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
          >
            <span
              className="mx-auto mt-2.5 block h-1.5 w-11 rounded-full bg-line-strong md:hidden"
              aria-hidden="true"
            />
            {/* Hanya baris tutup yang tetap; judul ikut bergulir agar isi tidak tertutup di layar pendek. */}
            <header className="flex items-center gap-2 px-5 pt-2 pb-1 md:px-7 md:pt-4">
              <Dialog.Close
                className="-ml-2 grid size-10 shrink-0 place-items-center rounded-full text-ink-2 transition hover:bg-surface-2 hover:text-ink active:scale-95"
                aria-label="Tutup"
              >
                <X className="size-5" />
              </Dialog.Close>
              <span className="flex-1" />
              {headerExtra}
            </header>
          </div>
          <div className="sheet-body min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 md:px-7">
            <div className="pt-1 pb-4">
              <Dialog.Title className="text-[24px] leading-tight font-normal tracking-[-0.02em] text-ink md:text-[28px]">
                {title}
              </Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-sm text-ink-3">
                  {description}
                </Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">Formulir</Dialog.Description>
              )}
            </div>
            {children}
          </div>
          {footer && (
            <footer className="flex items-center gap-2 border-t border-line px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-7">
              {footer}
            </footer>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
