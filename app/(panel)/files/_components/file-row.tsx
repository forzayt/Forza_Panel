function FolderIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" className="h-8 w-8 shrink-0">
      <path
        d="M6 20a6 6 0 0 1 6-6h12l6 7h22a6 6 0 0 1 6 6v21a6 6 0 0 1-6 6H12a6 6 0 0 1-6-6V20z"
        fill="#F59E0B"
        opacity="0.85"
      />
    </svg>
  );
}

function FileIcon({ tone }: { tone: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className="h-8 w-8 shrink-0">
      <path
        d="M16 4h24l12 12v42a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4z"
        fill={tone}
        opacity="0.2"
      />
      <path
        d="M16 4h24l12 12v42a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4z"
        stroke={tone}
        strokeWidth="4"
      />
      <path d="M40 4v12h12" stroke={tone} strokeWidth="4" strokeLinejoin="round" />
    </svg>
  );
}

const CODE_EXT = new Set([
  "ts", "tsx", "js", "jsx", "mjs", "json", "css", "md", "sh", "yml", "yaml",
  "toml", "html", "sql", "py", "env", "lock", "config", "attributes",
]);

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

export function formatSize(bytes: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

export function formatDate(iso: string): string {
  const t = new Date(iso).getTime();
  if (!iso || Number.isNaN(t)) return "—";
  return new Date(t).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function FileRow({
  name,
  isDirectory,
  size,
  modified,
  onOpen,
}: {
  name: string;
  isDirectory: boolean;
  size: number;
  modified: string;
  onOpen: () => void;
}) {
  const ext = extOf(name);
  const tone = isDirectory
    ? ""
    : CODE_EXT.has(ext)
      ? "#60A5FA"
      : ["png", "jpg", "jpeg", "gif", "svg", "webp", "ico"].includes(ext)
        ? "#C084FC"
        : ["zip", "tar", "gz", "xz", "7z"].includes(ext)
          ? "#F87171"
          : "#94A3B8";

  return (
    <button
      onClick={onOpen}
      title={name}
      className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors outline-none hover:bg-background-gray-primary focus-visible:bg-background-gray-primary"
    >
      {isDirectory ? <FolderIcon /> : <FileIcon tone={tone} />}
      <span className="min-w-0 flex-1 truncate font-mono-tech text-sm font-medium text-text-primary">
        {name}
      </span>
      <span className="hidden w-24 shrink-0 text-right font-mono-tech text-xs text-text-tertiary sm:block">
        {isDirectory ? "Folder" : formatSize(size)}
      </span>
      <span className="hidden w-28 shrink-0 text-right font-mono-tech text-[11px] text-text-tertiary md:block">
        {formatDate(modified)}
      </span>
      <span className="shrink-0 text-text-tertiary">{isDirectory ? "›" : "⤢"}</span>
    </button>
  );
}
