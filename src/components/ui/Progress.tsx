'use client';
import { useMotionEntry } from './useMotionEntry';

export function Progress({
  value,
  label,
  tampilkanAngka = false,
}: {
  value: number | null;
  label: string;
  tampilkanAngka?: boolean;
}) {
  const { ref, entered } = useMotionEntry<HTMLDivElement>();
  const percentage = value === null ? 0 : Math.min(100, Math.max(0, value));
  const bar = (
    <div
      ref={ref}
      className="ui-progress"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value === null ? undefined : percentage}
      aria-valuetext={value === null ? 'Belum dinilai' : `${value}%`}
    >
      <span style={{ transform: `scaleX(${entered ? percentage / 100 : 0})` }} />
    </div>
  );
  if (!tampilkanAngka) return bar;
  // Kartu Taskflow menulis persen di atas bilah; progres yang belum dinilai tidak boleh tampak 0%.
  return (
    <div className="ui-progress-baris">
      <span className="ui-progress-label">{label}</span>
      <span className="ui-progress-angka">{value === null ? 'Belum dinilai' : `${percentage}%`}</span>
      {bar}
    </div>
  );
}
