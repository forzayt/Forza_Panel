import { cn } from "@/utils/cn";
import { formatSize } from "./file-row";

function FolderArt() {
  return (
    <svg viewBox="0 0 64 64" fill="none" className="h-14 w-14">
      <path
        d="M6 14a6 6 0 0 1 6-6h12l6 7h22a6 6 0 0 1 6 6v27a6 6 0 0 1-6 6H12a6 6 0 0 1-6-6V14z"
        fill="#FBBF24"
        opacity="0.25"
      />
      <path
        d="M6 20a6 6 0 0 1 6-6h12l6 7h22a6 6 0 0 1 6 6v21a6 6 0 0 1-6 6H12a6 6 0 0 1-6-6V20z"
        fill="#F59E0B"
        opacity="0.85"
      />
    </svg>
  );
}

function FileArt({ tone }: { tone: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className="h-14 w-14">
      <path
        d="M16 4h24l12 12v42a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4z"
        fill={tone}
        opacity="0.2"
      />
      <path
        d="M16 4h24l12 12v42a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4z"
        stroke={tone}
        strokeWidth="3"
      />
      <path d="M40 4v12h12" stroke={tone} strokeWidth="3" strokeLinejoin="round" />
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

export default function FileGridTile({
  name,
  isDirectory,
  size,
  onOpen,
}: {
  name: string;
  isDirectory: boolean;
  size: number;
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
      className={cn(
        "group flex flex-col items-center gap-2 rounded-xl border border-card-border",
        "bg-card-background p-4 transition-all hover:-translate-y-0.5",
        "hover:border-button-primary-outline-stroke outline-none",
        "focus-visible:ring-2 focus-visible:ring-button-primary-focus-ring"
      )}
    >
      {isDirectory ? <FolderArt /> : <FileArt tone={tone} />}
      <span className="w-full truncate text-center text-xs font-medium text-text-primary">
        {name}
      </span>
      <span className="font-mono-tech text-[10px] text-text-tertiary">
        {isDirectory ? "Folder" : formatSize(size)}
      </span>
    </button>
  );
}
