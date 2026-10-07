"use client";

import StatusDot from "./StatusDot";

interface SidebarProps {
  uptime: string;
  online: boolean;
}

const NAV = [
  { label: "Dashboard", active: true, icon: "M3 10.5 12 3l9 7.5M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" },
  { label: "Servers", icon: "M4 5h16v6H4zM4 13h16v6H4zM7 8h.01M7 16h.01" },
  { label: "Websites", icon: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM3 12h18M12 3c2.5 2.6 3.9 5.7 3.9 9S14.5 18.4 12 21c-2.5-2.6-3.9-5.7-3.9-9S9.5 5.6 12 3Z" },
  { label: "Databases", icon: "M12 3c4.4 0 8 1.1 8 2.5S16.4 8 12 8 4 6.9 4 5.5 7.6 3 12 3Zm8 2.5V11c0 1.4-3.6 2.5-8 2.5S4 12.4 4 11V5.5M4 11v6c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5v-6" },
  { label: "Containers", icon: "M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3ZM12 12l8-4.5M12 12v9M12 12 4 7.5" },
  { label: "Files", icon: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" },
  { label: "Terminal", icon: "m5 7 4 4-4 4M11 17h8M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" },
  { label: "Backups", icon: "M12 3a9 9 0 1 0 9 9M12 7v5l3 2M18 3v4h-4" },
  { label: "Network", icon: "M6 6a2 2 0 1 0 0-.01M18 6a2 2 0 1 0 0-.01M12 18a2 2 0 1 0 0-.01M7.5 7 11 16M16.5 7 13 16M8.5 6h7" },
  { label: "Settings", icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2-1.2L14.2 3H9.8l-.4 2.7a7 7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2 1.2l.4 2.7h4.4l.4-2.7a7 7 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c.06-.4.1-.8.1-1.2Z" },
];

export default function Sidebar({ uptime, online }: SidebarProps) {
  return (
    <aside className="hidden w-52 shrink-0 flex-col border-r border-white/5 bg-[#0c1226] lg:flex">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 pb-6 pt-5">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-sky-400 to-blue-600 text-lg font-black italic text-white">
          F
        </span>
        <span className="text-[15px] font-semibold tracking-tight text-white">
          ForzaPanel
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-3">
        {NAV.map((item) => (
          <button
            key={item.label}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-colors ${
              item.active
                ? "bg-blue-600/20 font-medium text-white"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`h-[17px] w-[17px] ${item.active ? "text-sky-400" : ""}`}
            >
              <path d={item.icon} />
            </svg>
            {item.label}
          </button>
        ))}
      </nav>

      {/* Server status footer */}
      <div className="border-t border-white/5 p-4">
        <div className="flex items-center gap-2">
          <StatusDot online={online} />
          <span className="text-xs text-slate-400">Server Status</span>
        </div>
        <p className={`mt-1 text-xs font-medium ${online ? "text-emerald-400" : "text-red-400"}`}>
          {online ? "Online" : "Offline"}
        </p>
        <p className="mt-0.5 font-mono-tech text-[11px] text-slate-500">
          Uptime&nbsp;&nbsp;{uptime}
        </p>
      </div>
    </aside>
  );
}
