'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * Angka yang menghitung naik ke nilainya (ubin ringkasan, persen progres). Gerak berkurang di
 * perangkat: langsung tampil nilai akhir.
 */
export function CountUp({ value, duration = 700 }: { value: number; duration?: number }) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const start = from.current;
    if (start === value) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const began = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      const t = reduce ? 1 : Math.min(1, (now - began) / duration);
      // Melambat di akhir (ease-out kubik) agar berhenti lembut di angka akhir.
      const next = Math.round(start + (value - start) * (1 - (1 - t) ** 3));
      from.current = next;
      setShown(next);
      if (t < 1) frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);
  return <span className="tabular">{shown}</span>;
}
