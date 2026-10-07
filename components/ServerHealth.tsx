import { Card, CardTitle } from "@/components/tailgrids/core/card";
import MiniSpark from "./MiniSpark";

// Placeholder sparklines for metrics we don't track live yet (UI only).
const DEMO_DISK = [34, 35, 35, 36, 35, 36, 36, 37, 36, 36, 37, 36];
const DEMO_NET_IN = [8, 11, 9, 13, 10, 12, 14, 11, 12, 13, 12, 14];
const DEMO_NET_OUT = [6, 8, 7, 9, 8, 7, 9, 8, 9, 8, 9, 8];
const DEMO_NET_BARS = [5, 8, 6, 10, 7, 12, 9, 13, 8, 11, 9, 14, 10, 12, 8, 11];

interface ServerHealthProps {
  cpu: number;
  memory: number;
  disk: number;
  cpuHistory: number[];
  memHistory: number[];
}

export default function ServerHealth({
  cpu,
  memory,
  disk,
  cpuHistory,
  memHistory,
}: ServerHealthProps) {
  const rows = [
    { label: "CPU", value: `${cpu.toFixed(0)}%`, data: cpuHistory, color: "#4ade80", bars: false },
    { label: "Memory", value: `${memory.toFixed(0)}%`, data: memHistory, color: "#60a5fa", bars: false },
    { label: "Disk", value: `${disk.toFixed(0)}%`, data: DEMO_DISK, color: "#c084fc", bars: false },
    // Network throughput is UI-only until a later phase (no backend measurement yet).
    { label: "Network (In)", value: "12.4 MB/s", data: DEMO_NET_IN, color: "#4ade80", bars: true },
    { label: "Network (Out)", value: "8.1 MB/s", data: DEMO_NET_OUT, color: "#4ade80", bars: true },
  ];

  return (
    <Card>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-sm text-text-tertiary">⚡</span>
        <CardTitle>Server Health</CardTitle>
      </div>
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-2 text-xs">
            <span className="w-24 shrink-0 truncate text-text-tertiary">▫ {r.label}</span>
            <span className="w-20 shrink-0 text-right font-mono-tech text-[11px] text-text-primary">
              {r.value}
            </span>
            <div className="flex flex-1 justify-end">
              {r.bars ? (
                <MiniSpark data={DEMO_NET_BARS} color={r.color} width={64} height={20} bars />
              ) : (
                <MiniSpark data={r.data} color={r.color} width={64} height={20} />
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
