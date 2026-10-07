"use client";

interface MiniSparkProps {
  data: number[];
  color: string;
  width?: number;
  height?: number;
  bars?: boolean;
}

export default function MiniSpark({ data, color, width = 64, height = 22, bars = false }: MiniSparkProps) {
  if (bars) {
    const max = Math.max(1, ...data);
    return (
      <div className="flex items-end gap-[2px]" style={{ width, height }}>
        {data.map((v, i) => (
          <span
            key={i}
            className="flex-1 rounded-[1px]"
            style={{ height: `${Math.max(12, (v / max) * 100)}%`, backgroundColor: color, opacity: 0.55 + (v / max) * 0.45 }}
          />
        ))}
      </div>
    );
  }
  const W = 100;
  const H = 30;
  const pts = data
    .map((v, i) => `${((i / Math.max(1, data.length - 1)) * W).toFixed(1)},${(H - 2 - (Math.min(100, Math.max(0, v)) / 100) * (H - 4)).toFixed(1)}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width, height }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
