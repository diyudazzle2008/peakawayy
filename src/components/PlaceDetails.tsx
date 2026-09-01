import { useState } from "react";
import {
  Activity,
  Clock,
  Compass,
  Loader2,
  MapPin,
  Navigation,
  Plus,
  Signal,
  TrendingDown,
  TrendingUp,
  Minus,
} from "lucide-react";
import { CrowdBadge } from "@/components/CrowdBadge";
import { LEVELS, timeAgo, type CrowdLevel, type CrowdStats, type CrowdReport } from "@/lib/crowd";

export interface SelectedPlace {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

interface Props {
  place: SelectedPlace | null;
  loading: boolean;
  stats: CrowdStats;
  reports: CrowdReport[];
  submitting: boolean;
  onReport: (level: CrowdLevel, note: string) => void;
  onAddToPlan: (place: SelectedPlace) => void;
}

const trendIcon = {
  rising: TrendingUp,
  falling: TrendingDown,
  steady: Minus,
  unknown: Minus,
};

export function PlaceDetails({
  place,
  loading,
  stats,
  reports,
  submitting,
  onReport,
  onAddToPlan,
}: Props) {
  const [note, setNote] = useState("");
  const [picked, setPicked] = useState<CrowdLevel | null>(null);

  if (loading) {
    return (
      <div className="space-y-3 p-5">
        <div className="h-6 w-2/3 animate-pulse rounded-lg bg-secondary" />
        <div className="h-4 w-full animate-pulse rounded-lg bg-secondary/70" />
        <div className="h-24 w-full animate-pulse rounded-2xl bg-secondary/60" />
        <div className="h-32 w-full animate-pulse rounded-2xl bg-secondary/50" />
      </div>
    );
  }

  if (!place) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/12 text-primary">
          <Compass className="h-7 w-7" />
        </div>
        <h3 className="text-lg font-semibold">Pick a place to begin</h3>
        <p className="max-w-xs text-sm text-muted-foreground">
          Search for any address in India, tap anywhere on the map, or use your location. You'll get
          a live crowd read and can add your own report.
        </p>
      </div>
    );
  }

  const TrendIcon = trendIcon[stats.trend];

  return (
    <div className="scrollbar-slim h-full overflow-y-auto p-5 animate-rise">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-bold">{place.name}</h2>
          <p className="mt-1 flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="line-clamp-2">{place.address}</span>
          </p>
        </div>
        <CrowdBadge level={stats.level} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Stat
          icon={<Signal className="h-3.5 w-3.5" />}
          label="Confidence"
          value={`${stats.confidence}%`}
          bar={stats.confidence}
        />
        <Stat
          icon={<Activity className="h-3.5 w-3.5" />}
          label="Recent reports"
          value={`${stats.recentCount} in 6h`}
          sub={`${stats.reportCount} total`}
        />
        <Stat
          icon={<Clock className="h-3.5 w-3.5" />}
          label="Last updated"
          value={timeAgo(stats.lastReportAt)}
          sub={
            stats.freshness === "live"
              ? "Live data"
              : stats.freshness === "recent"
                ? "Fresh"
                : stats.freshness === "stale"
                  ? "Ageing"
                  : "Awaiting reports"
          }
        />
        <Stat
          icon={<TrendIcon className="h-3.5 w-3.5" />}
          label="Trend"
          value={stats.trend === "unknown" ? "—" : stats.trend}
          sub={`${place.lat.toFixed(4)}, ${place.lng.toFixed(4)}`}
        />
      </div>

      <div className="mt-5 rounded-2xl border border-border bg-surface-2/50 p-4">
        <h3 className="text-sm font-semibold">How crowded is it right now?</h3>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {LEVELS.map((l) => {
            const active = picked === l.id;
            return (
              <button
                key={l.id}
                onClick={() => setPicked(l.id)}
                className="rounded-xl border px-3 py-2.5 text-left transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                style={{
                  borderColor: active
                    ? `color-mix(in oklab, ${l.token} 70%, transparent)`
                    : "var(--border)",
                  background: active
                    ? `color-mix(in oklab, ${l.token} 16%, transparent)`
                    : "color-mix(in oklab, var(--surface) 60%, transparent)",
                }}
              >
                <span
                  className="block text-sm font-semibold"
                  style={{ color: active ? l.token : "var(--foreground)" }}
                >
                  {l.label}
                </span>
                <span className="block text-[11px] text-muted-foreground">{l.hint}</span>
              </button>
            );
          })}
        </div>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={120}
          placeholder="Add a detail (optional) — e.g. long queue at gate 2"
          className="mt-3 w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary/60"
        />
        <div className="mt-3 flex gap-2">
          <button
            disabled={!picked || submitting}
            onClick={() => {
              if (!picked) return;
              onReport(picked, note.trim());
              setNote("");
              setPicked(null);
            }}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Submit report
          </button>
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-xl border border-border bg-secondary/60 px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-secondary"
          >
            <Navigation className="h-4 w-4" />
            Directions
          </a>
        </div>
        <button
          onClick={() => onAddToPlan(place)}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 px-4 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
        >
          <Plus className="h-3.5 w-3.5" />
          Add to Plan My Day
        </button>
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-semibold">Recent reports</h3>
        {reports.length === 0 ? (
          <p className="mt-2 rounded-2xl border border-dashed border-border p-4 text-xs text-muted-foreground">
            Nobody has reported here in the last 48 hours. Be the first — your report powers everyone
            else's read.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {reports.slice(0, 8).map((r) => (
              <li
                key={r.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-border bg-surface/50 px-3 py-2"
              >
                <div className="min-w-0">
                  <CrowdBadge level={r.level} size="sm" />
                  {r.note && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.note}</p>
                  )}
                </div>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {timeAgo(r.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  sub,
  bar,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  bar?: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface/50 p-3">
      <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </span>
      <p className="mt-1 text-sm font-semibold capitalize">{value}</p>
      {bar !== undefined && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all duration-700"
            style={{ width: `${Math.max(4, bar)}%` }}
          />
        </div>
      )}
      {sub && <p className="mt-1 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
