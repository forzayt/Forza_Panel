import { Badge } from "@/components/tailgrids/core/badge";
import { Button } from "@/components/tailgrids/core/button";
import { Card, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import {
  TableCell,
  TableHead,
  TableHeader,
  TableRoot,
  TableRow,
} from "@/components/tailgrids/core/table";

// Static placeholder rows — real service discovery comes in a later phase.
const SERVICES = [
  { icon: "M", iconBg: "bg-amber-700/40 text-amber-300", name: "minecraft", type: "Game Server", cpu: "2.4%", mem: "1.2 GB", uptime: "3d 2h" },
  { icon: "N", iconBg: "bg-slate-600/50 text-slate-200", name: "web-app", type: "Website", cpu: "0.8%", mem: "512 MB", uptime: "1d 4h" },
  { icon: "P", iconBg: "bg-sky-700/40 text-sky-300", name: "postgres", type: "Database", cpu: "1.1%", mem: "256 MB", uptime: "5d 12h" },
  { icon: "R", iconBg: "bg-red-700/40 text-red-300", name: "redis", type: "Database", cpu: "0.3%", mem: "128 MB", uptime: "5d 12h" },
  { icon: "N", iconBg: "bg-emerald-700/40 text-emerald-300", name: "nginx", type: "Proxy", cpu: "0.5%", mem: "64 MB", uptime: "5d 12h" },
];

export default function ServicesTable() {
  return (
    <Card>
      <CardHeader className="mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-tertiary">🧊</span>
          <CardTitle>Running Services</CardTitle>
        </div>
        <Button variant="primary" appearance="outline" size="xs">
          View All
        </Button>
      </CardHeader>
      <TableRoot>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>CPU</TableHead>
            <TableHead>Memory</TableHead>
            <TableHead>Uptime</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <tbody>
          {SERVICES.map((s) => (
            <TableRow key={s.name}>
              <TableCell>
                <span className="flex items-center gap-2 font-mono-tech">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${s.iconBg}`}
                  >
                    {s.icon}
                  </span>
                  {s.name}
                </span>
              </TableCell>
              <TableCell className="text-text-secondary">{s.type}</TableCell>
              <TableCell>
                <Badge color="success" size="sm">
                  Running
                </Badge>
              </TableCell>
              <TableCell className="font-mono-tech">{s.cpu}</TableCell>
              <TableCell className="font-mono-tech">{s.mem}</TableCell>
              <TableCell className="font-mono-tech text-text-secondary">
                {s.uptime}
              </TableCell>
              <TableCell>
                <span className="flex gap-1.5">
                  {["■", "↻", "⋯"].map((a) => (
                    <Button
                      key={a}
                      variant="primary"
                      appearance="ghost"
                      size="xs"
                      iconOnly
                      aria-label={a}
                    >
                      {a}
                    </Button>
                  ))}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </tbody>
      </TableRoot>
    </Card>
  );
}
