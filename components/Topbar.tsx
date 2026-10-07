"use client";

export default function Topbar() {
  return (
    <div className="flex items-center gap-3 border-b border-white/5 bg-[#0a0f1e]/80 px-6 py-3">
      {/* Search (decorative for now) */}
      <div className="flex max-w-md flex-1 items-center gap-2 rounded-lg border border-white/5 bg-[#111832] px-3 py-1.5 text-[13px] text-slate-500">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
        <span className="flex-1">Search anything...</span>
        <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono-tech text-[10px] text-slate-400">
          Ctrl K
        </kbd>
      </div>

      <div className="flex-1" />

      <button className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-slate-200" aria-label="Theme">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-[18px] w-[18px]">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      </button>
      <button className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-slate-200" aria-label="Notifications">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M10.3 21a2 2 0 0 0 3.4 0" />
        </svg>
      </button>
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-white">
          V
        </span>
        <span className="text-[13px] text-slate-300">Vishnu</span>
      </div>
    </div>
  );
}
