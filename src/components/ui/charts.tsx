'use client';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export type ChartPoint = { label: string; value: number };

/** Ukuran wadah: grafik digambar sesuai piksel asli agar teks sumbu tidak melar di HP. */
function useSize() {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!box.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height }),
    );
    observer.observe(box.current);
    return () => observer.disconnect();
  }, []);
  return { box, ...size };
}

/** Puncak sumbu yang enak dibaca (1, 2, 5, 10, …), tidak kurang dari nilai terbesar. */
export function niceMax(value: number) {
  if (value <= 0) return 1;
  const base = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 5, 10].find((candidate) => candidate * base >= value) ?? 10;
  return step * base;
}

/** Garis melengkung halus yang tidak melewati puncak data (kontrol mendatar di tengah dua titik). */
function smoothPath(points: { x: number; y: number }[]) {
  return points.reduce((path, point, index) => {
    if (!index) return `M${point.x} ${point.y}`;
    const previous = points[index - 1];
    const middle = (previous.x + point.x) / 2;
    return `${path}C${middle} ${previous.y} ${middle} ${point.y} ${point.x} ${point.y}`;
  }, '');
}

const PAD = { top: 10, right: 12, bottom: 24, left: 46 };

function Axis({
  width,
  height,
  max,
  format,
}: {
  width: number;
  height: number;
  max: number;
  format: (value: number) => string;
}) {
  const chart = height - PAD.top - PAD.bottom;
  return (
    <>
      {/* Garis tengah hanya bila nilainya bulat: "3" di garis 2,5 akan menyesatkan. */}
      {(Number.isInteger(max / 2) ? [0, 0.5, 1] : [0, 1]).map((share) => {
        const y = PAD.top + chart * (1 - share);
        return (
          <g key={share}>
            <line
              x1={PAD.left}
              x2={width - PAD.right}
              y1={y}
              y2={y}
              strokeDasharray={share === 1 ? '4 5' : undefined}
              className="stroke-line"
            />
            <text x={0} y={y + 4} className="fill-ink-3 text-[11px]">
              {format(max * share)}
            </text>
          </g>
        );
      })}
    </>
  );
}

/**
 * Grafik garis dengan isian datar: garis tergambar dari kiri saat muncul. Warna mengikuti nada induk
 * (`data-tone`). Tanpa gradasi; isian di bawah garis satu warna tembus. Mengisi tinggi induknya.
 */
export function AreaChart({
  points,
  label,
  format = (value) => String(Math.round(value)),
  className,
}: {
  points: ChartPoint[];
  label: string;
  format?: (value: number) => string;
  className?: string;
}) {
  const { box, width, height } = useSize();
  const max = niceMax(Math.max(...points.map((point) => point.value), 0));
  const chart = height - PAD.top - PAD.bottom;
  const inner = width - PAD.left - PAD.right;
  const placed = points.map((point, index) => ({
    x: PAD.left + (points.length > 1 ? (index / (points.length - 1)) * inner : inner / 2),
    y: PAD.top + chart * (1 - point.value / max),
  }));
  const line = smoothPath(placed);
  const end = placed[placed.length - 1];
  // Label bulan dijarangkan di HP agar tidak saling menimpa.
  const every = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor(inner / 56))));
  return (
    <div ref={box} className={cn('relative min-h-52 w-full flex-1', className)}>
      {width > 0 && points.length > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={label}
          className="absolute inset-0"
        >
          <Axis width={width} height={height} max={max} format={format} />
          <path
            d={`${line}L${end.x} ${PAD.top + chart}L${placed[0].x} ${PAD.top + chart}Z`}
            className="chart-fill fill-tone-bar/15"
          />
          <path
            d={line}
            pathLength={1}
            fill="none"
            strokeWidth={2.25}
            strokeLinecap="round"
            className="chart-line stroke-tone-bar"
          />
          <circle cx={end.x} cy={end.y} r={4} className="chart-fill fill-tone-bar" />
          {points.map(
            (point, index) =>
              (points.length - 1 - index) % every === 0 && (
                <text
                  key={point.label + index}
                  x={placed[index].x}
                  y={height - 6}
                  // Label terakhir rata kanan agar tidak terpotong tepi grafik.
                  textAnchor={index === points.length - 1 ? 'end' : 'middle'}
                  className="fill-ink-3 text-[11px]"
                >
                  {point.label}
                </text>
              ),
          )}
        </svg>
      )}
    </div>
  );
}

/** Grafik batang berdampingan per kelompok; batang tumbuh berurutan dari dasar saat muncul. */
export function BarChart({
  rows,
  series,
  label,
  height = 210,
  format = (value) => String(Math.round(value)),
  className,
}: {
  rows: { label: string; values: number[] }[];
  series: { label: string; className: string }[];
  label: string;
  height?: number;
  format?: (value: number) => string;
  className?: string;
}) {
  const { box, width } = useSize();
  const max = niceMax(Math.max(...rows.flatMap((row) => row.values), 0));
  const chart = height - PAD.top - PAD.bottom;
  const slot = rows.length ? (width - PAD.left - PAD.right) / rows.length : 0;
  const barWidth = Math.min(20, (slot * 0.68) / series.length);
  return (
    <div className={className}>
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
        {series.map((item) => (
          <span key={item.label} className="flex items-center gap-1.5">
            <svg className="size-2.5" viewBox="0 0 10 10" aria-hidden="true">
              <rect width="10" height="10" rx="3" className={item.className} />
            </svg>
            {item.label}
          </span>
        ))}
      </div>
      <div ref={box} className="w-full" style={{ height }}>
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label={label}>
            <Axis width={width} height={height} max={max} format={format} />
            {rows.map((row, rowIndex) => {
              const groupWidth = barWidth * series.length + 3 * (series.length - 1);
              const start = PAD.left + slot * rowIndex + (slot - groupWidth) / 2;
              return (
                <g key={row.label}>
                  {row.values.map((value, index) => {
                    const barHeight = (value / max) * chart;
                    return (
                      value > 0 && (
                        <rect
                          key={series[index].label}
                          x={start + index * (barWidth + 3)}
                          y={PAD.top + chart - barHeight}
                          width={barWidth}
                          height={barHeight}
                          rx={Math.min(5, barWidth / 2)}
                          className={cn('chart-bar', series[index].className)}
                          style={{ animationDelay: `${rowIndex * 55 + index * 25}ms` }}
                        />
                      )
                    );
                  })}
                  <text
                    x={PAD.left + slot * rowIndex + slot / 2}
                    y={height - 6}
                    textAnchor="middle"
                    className="fill-ink-3 text-[11px]"
                  >
                    {row.label}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
}

/** Batang bertumpuk satu baris (kartu ringkasan): lebar tiap ruas menurut nilainya, dengan celah. */
export function StackBar({
  parts,
  label,
  className,
}: {
  parts: { value: number; className: string }[];
  label: string;
  className?: string;
}) {
  return (
    <div role="img" aria-label={label} className={cn('flex h-2 gap-1', className)}>
      {parts
        .filter((part) => part.value > 0)
        .map((part, index) => (
          <span
            key={index}
            style={{ flexGrow: part.value, animationDelay: `${150 + index * 120}ms` }}
            className={cn(
              'block min-w-1.5 origin-left animate-[bar-x_0.9s_var(--ease-out)_backwards] rounded-full',
              part.className,
            )}
          />
        ))}
    </div>
  );
}
