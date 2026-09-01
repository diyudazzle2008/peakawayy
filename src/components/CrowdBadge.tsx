import { levelMeta, type CrowdLevel } from "@/lib/crowd";

export function CrowdBadge({
  level,
  size = "md",
}: {
  level: CrowdLevel | null;
  size?: "sm" | "md";
}) {
  if (!level) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs font-medium text-muted-foreground">
        <span className="h-2 w-2 rounded-full bg-muted-foreground/60" />
        No reports yet
      </span>
    );
  }
  const meta = levelMeta(level);
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 font-semibold ${
        size === "sm" ? "py-0.5 text-[11px]" : "py-1 text-xs"
      }`}
      style={{
        color: meta.token,
        borderColor: `color-mix(in oklab, ${meta.token} 45%, transparent)`,
        background: `color-mix(in oklab, ${meta.token} 14%, transparent)`,
      }}
    >
      <span className="h-2 w-2 rounded-full" style={{ background: meta.token }} />
      {meta.label}
    </span>
  );
}
