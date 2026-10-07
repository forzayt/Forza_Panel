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
    <section className="rounded-xl border border-white/5 bg-[#111832]/80 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">◷</span>
          <h2 className="text-[13px] font-semibold text-white">Recent Activity</h2>
        </div>
        <button className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-slate-300 hover:bg-white/5">
          View All
        </button>
      </div>
      <ul className="space-y-3.5">
        {EVENTS.map((e) => (
          <li key={e.title + e.time} className="flex items-start gap-2.5">
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${e.chip}`}>
              {e.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-slate-200">{e.title}</p>
              <p className="truncate font-mono-tech text-[11px] text-slate-500">{e.sub}</p>
            </div>
            <span className="shrink-0 text-[10px] text-slate-500">{e.time}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
