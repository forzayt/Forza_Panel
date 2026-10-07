interface UsageBarProps {
  value: number; // 0-100
  tone?: "green" | "blue" | "amber" | "red" | "violet";
}

const tones: Record<NonNullable<UsageBarProps["tone"]>, string> = {
  green: "bg-emerald-500",
  blue: "bg-sky-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  violet: "bg-violet-500",
};

export default function UsageBar({ value, tone = "green" }: UsageBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-zinc-800"
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full transition-all duration-500 ${tones[tone]}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
