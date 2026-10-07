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
    <section className="rounded-xl border border-white/5 bg-[#111832]/80 p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">🧊</span>
          <h2 className="text-[13px] font-semibold text-white">Running Services</h2>
        </div>
        <button className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-slate-300 hover:bg-white/5">
          View All
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-xs">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-slate-500">
              <th className="py-2 pr-2 font-medium">Name</th>
              <th className="py-2 pr-2 font-medium">Type</th>
              <th className="py-2 pr-2 font-medium">Status</th>
              <th className="py-2 pr-2 font-medium">CPU</th>
              <th className="py-2 pr-2 font-medium">Memory</th>
              <th className="py-2 pr-2 font-medium">Uptime</th>
              <th className="py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {SERVICES.map((s) => (
              <tr key={s.name} className="border-t border-white/5">
                <td className="py-2.5 pr-2">
                  <span className="flex items-center gap-2 font-mono-tech text-slate-200">
                    <span className={`flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${s.iconBg}`}>
                      {s.icon}
                    </span>
                    {s.name}
                  </span>
                </td>
                <td className="py-2.5 pr-2 text-slate-400">{s.type}</td>
                <td className="py-2.5 pr-2">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Running
                  </span>
                </td>
                <td className="py-2.5 pr-2 font-mono-tech text-slate-300">{s.cpu}</td>
                <td className="py-2.5 pr-2 font-mono-tech text-slate-300">{s.mem}</td>
                <td className="py-2.5 pr-2 font-mono-tech text-slate-400">{s.uptime}</td>
                <td className="py-2.5">
                  <span className="flex gap-1.5">
                    {["■", "↻", "⋯"].map((a) => (
                      <button key={a} className="flex h-6 w-6 items-center justify-center rounded-md bg-white/5 text-[11px] text-slate-300 hover:bg-white/10">
                        {a}
                      </button>
                    ))}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
