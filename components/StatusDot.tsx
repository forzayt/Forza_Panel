interface StatusDotProps {
  online?: boolean;
}

export default function StatusDot({ online = true }: StatusDotProps) {
  return (
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
  );
}
