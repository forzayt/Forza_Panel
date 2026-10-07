import type { ReactNode } from "react";

interface SystemCardProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

export default function SystemCard({ title, icon, children, footer }: SystemCardProps) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-400">
          {title}
        </h2>
        {icon && <span className="text-zinc-500">{icon}</span>}
      </div>
      {children}
      {footer && (
        <div className="mt-4 border-t border-zinc-800 pt-3 text-xs text-zinc-500">
          {footer}
        </div>
      )}
    </section>
  );
}
