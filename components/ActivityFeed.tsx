import { Button } from "@/components/tailgrids/core/button";
import { Card, CardHeader, CardTitle } from "@/components/tailgrids/core/card";

// Static placeholder feed — real event log comes in a later phase.
const EVENTS = [
  { icon: "+", chip: "bg-emerald-500/20 text-emerald-400", title: "Container started", sub: "minecraft", time: "2 minutes ago" },
  { icon: "⇩", chip: "bg-sky-500/20 text-sky-400", title: "System updated", sub: "Ubuntu packages", time: "1 hour ago" },
  { icon: "▤", chip: "bg-amber-500/20 text-amber-400", title: "File uploaded", sub: "/var/www/html", time: "3 hours ago" },
  { icon: "↻", chip: "bg-sky-500/20 text-sky-400", title: "Container restarted", sub: "web-app", time: "5 hours ago" },
  { icon: "🗄", chip: "bg-purple-500/20 text-purple-400", title: "New database created", sub: "production_db", time: "6 hours ago" },
];

export default function ActivityFeed() {
  return (
    <Card>
      <CardHeader className="mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-tertiary">◷</span>
          <CardTitle>Recent Activity</CardTitle>
        </div>
        <Button variant="primary" appearance="outline" size="xs">
          View All
        </Button>
      </CardHeader>
      <ul className="space-y-3.5">
        {EVENTS.map((e) => (
          <li key={e.title + e.time} className="flex items-start gap-2.5">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${e.chip}`}
            >
              {e.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-text-primary">
                {e.title}
              </p>
              <p className="truncate font-mono-tech text-[11px] text-text-tertiary">
                {e.sub}
              </p>
            </div>
            <span className="shrink-0 text-[10px] text-text-tertiary">
              {e.time}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
