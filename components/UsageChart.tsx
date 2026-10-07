"use client";

interface UsageChartProps {
  data: number[]; // 0-100 values, oldest -> newest
  label: string;
  color?: string;
  height?: number;
}

export default function UsageChart({
  data,
  label,
  color = "#34d399",
  height = 96,
}: UsageChartProps) {
  const W = 300;
  const H = 100;
  const points =
    data.length < 2
      ? ""
      : data
          .map((v, i) => {
            const x = (i / (data.length - 1)) * W;
            const y = H - (Math.min(100, Math.max(0, v)) / 100) * H;
            return `${x.toFixed(1)},${y.toFixed(1)}`;
          })
          .join(" ");

  const area = points ? `0,${H} ${points} ${W},${H}` : "";
  const latest = data.length ? data[data.length - 1] : 0;

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-xs text-zinc-500">{label}</span>
        <span className="font-mono-tech text-sm text-zinc-200">
          {latest.toFixed(1)}%
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="w-full rounded-lg border border-zinc-800 bg-zinc-950"
        style={{ height }}
        role="img"
        aria-label={`${label} live chart, current ${latest.toFixed(1)} percent`}
      >
        {/* grid lines */}
        {[25, 50, 75].map((g) => (
          <line
            key={g}
            x1="0"
            x2={W}
            y1={H - g}
            y2={H - g}
            stroke="#27272a"
            strokeWidth="1"
          />
        ))}
        {area && (
          <polygon points={area} fill={color} opacity="0.12" />
        )}
        {points && (
          <polyline
            points={points}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
      </svg>
    </div>
  );
}
