interface StatusIndicatorProps {
  online?: boolean;
  label?: string;
}

export default function StatusIndicator({
  online = true,
  label = "Online",
}: StatusIndicatorProps) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-300">
      <span className="relative flex h-2 w-2">
        {online && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
        )}
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${
            online ? "bg-emerald-400" : "bg-red-500"
          }`}
        />
      </span>
      {label}
    </span>
  );
}
