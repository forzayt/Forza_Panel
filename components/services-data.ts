// Static placeholder rows — real service discovery comes in a later phase.
export interface Service {
  icon: string;
  iconBg: string;
  name: string;
  type: string;
  cpu: string;
  mem: string;
  uptime: string;
}

export const SERVICES: Service[] = [
  { icon: "M", iconBg: "bg-amber-700/40 text-amber-300", name: "minecraft", type: "Game Server", cpu: "2.4%", mem: "1.2 GB", uptime: "3d 2h" },
  { icon: "N", iconBg: "bg-slate-600/50 text-slate-200", name: "web-app", type: "Website", cpu: "0.8%", mem: "512 MB", uptime: "1d 4h" },
  { icon: "P", iconBg: "bg-sky-700/40 text-sky-300", name: "postgres", type: "Database", cpu: "1.1%", mem: "256 MB", uptime: "5d 12h" },
  { icon: "R", iconBg: "bg-red-700/40 text-red-300", name: "redis", type: "Database", cpu: "0.3%", mem: "128 MB", uptime: "5d 12h" },
  { icon: "N", iconBg: "bg-emerald-700/40 text-emerald-300", name: "nginx", type: "Proxy", cpu: "0.5%", mem: "64 MB", uptime: "5d 12h" },
];

export function getService(name: string): Service | undefined {
  return SERVICES.find((s) => s.name === decodeURIComponent(name));
}
