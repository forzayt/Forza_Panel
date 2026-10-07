"use client";

interface AreaChartProps {
  data: number[]; // 0-100, oldest -> newest
  color: string; // stroke color
  id: string; // unique gradient id
  xLabels?: string[];
  height?: number;
}

function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

export default function AreaChart({ data, color, id, xLabels = [], height = 190 }: AreaChartProps) {
  const W = 600;
  const H = 200;
  const PAD_L = 34;
  const PAD_B = 18;

  const pts = data.map((v, i) => ({
    x: PAD_L + (i / Math.max(1, data.length - 1)) * (W - PAD_L - 4),
    y: 4 + (1 - Math.min(100, Math.max(0, v)) / 100) * (H - PAD_B - 8),
  }));
  const line = smoothPath(pts);
  const area = line ? `${line} L ${pts[pts.length - 1].x},${H - PAD_B} L ${pts[0].x},${H - PAD_B} Z` : "";

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} role="img">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0, 25, 50, 75, 100].map((g) => {
          const y = 4 + (1 - g / 100) * (H - PAD_B - 8);
          return (
            <g key={g}>
              <line x1={PAD_L} x2={W - 4} y1={y} y2={y} stroke="#1e293b" strokeWidth="1" strokeDasharray={g === 0 ? "" : "3 4"} opacity="0.7" />
              <text x={2} y={y + 3} fill="#475569" fontSize="10">{g}%</text>
            </g>
          );
        })}
        {area && <path d={area} fill={`url(#${id})`} />}
        {line && <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />}
      </svg>
      {xLabels.length > 0 && (
        <div className="flex justify-between pl-9 pr-1 font-mono-tech text-[10px] text-slate-500">
          {xLabels.map((l) => (
            <span key={l}>{l}</span>
          ))}
        </div>
      )}
    </div>
  );
}
