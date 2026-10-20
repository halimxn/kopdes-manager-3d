'use client';
import { useRef, type PointerEvent } from 'react';

const AMBANG = 72;

/** Lepas jejak geser visual dari kartu. */
function lepasJejak(kartu: HTMLElement | null) {
  if (!kartu) return;
  kartu.style.removeProperty('translate');
  delete kartu.dataset.geser;
  delete kartu.dataset.menggeser;
}

/**
 * Swipe horizontal pada badan kartu; kontrol form dan scroll vertikal dikecualikan.
 * Selama digeser kartu ikut bergerak dan diberi `data-geser="kanan|kiri"` (warna aksi di CSS);
 * aksi baru berjalan bila jarak melewati ambang saat jari dilepas.
 */
export function useSwipeAction(onRight: (id: string) => void, onLeft: (id: string) => void, disabled: boolean) {
  const gesture = useRef<{ id: string; pointer: number; x: number; y: number; kartu: HTMLElement | null } | null>(null);
  // Klik sesudah geser hanya ditahan pada kartu yang digeser (tombol lain, misalnya Batalkan, tetap bisa ditekan).
  const tahanKlik = useRef<{ sampai: number; kartu: HTMLElement | null }>({ sampai: 0, kartu: null });
  return {
    onPointerDown(event: PointerEvent<HTMLElement>) {
      if (disabled || event.pointerType === 'mouse' || window.innerWidth >= 768 || !event.isPrimary) return;
      const target = event.target instanceof Element ? event.target : null;
      // Kontrol lain tidak ikut menggeser; judul kartu yang berupa tombol boleh (data-boleh-geser).
      const kontrol = target?.closest('button, a, input, select, textarea, [role="listbox"]');
      if (!target || (kontrol && !kontrol.hasAttribute('data-boleh-geser'))) return;
      const kartu = target.closest<HTMLElement>('[data-swipe-task]');
      const id = kartu?.dataset.swipeTask;
      if (id) gesture.current = { id, pointer: event.pointerId, x: event.clientX, y: event.clientY, kartu };
    },
    onPointerMove(event: PointerEvent<HTMLElement>) {
      const current = gesture.current;
      if (!current?.kartu || current.pointer !== event.pointerId) return;
      const dx = event.clientX - current.x, dy = event.clientY - current.y;
      // Gerak yang lebih vertikal adalah gulir halaman: jangan ikut menggeser kartu.
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy) * 1.5) return lepasJejak(current.kartu);
      current.kartu.dataset.menggeser = '';
      current.kartu.style.translate = `${Math.max(-120, Math.min(120, dx * 0.7))}px 0`;
      if (Math.abs(dx) >= AMBANG) current.kartu.dataset.geser = dx > 0 ? 'kanan' : 'kiri';
      else delete current.kartu.dataset.geser;
    },
    onPointerUp(event: PointerEvent<HTMLElement>) {
      const current = gesture.current;
      gesture.current = null;
      lepasJejak(current?.kartu ?? null);
      if (!current || disabled || current.pointer !== event.pointerId) return;
      const dx = event.clientX - current.x, dy = event.clientY - current.y;
      if (Math.abs(dx) < AMBANG || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      tahanKlik.current = { sampai: Date.now() + 500, kartu: current.kartu };
      if (dx > 0) onRight(current.id); else onLeft(current.id);
    },
    onPointerCancel() {
      lepasJejak(gesture.current?.kartu ?? null);
      gesture.current = null;
    },
    onClickCapture(event: React.MouseEvent<HTMLElement>) {
      const { sampai, kartu } = tahanKlik.current;
      if (Date.now() < sampai && kartu?.contains(event.target as Node)) {
        tahanKlik.current = { sampai: 0, kartu: null };
        event.preventDefault();
        event.stopPropagation();
      }
    },
  };
}
