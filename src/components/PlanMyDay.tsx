import { useMemo } from "react";
import { CalendarCheck, Route, Trash2, Sparkles, Navigation } from "lucide-react";
import { CrowdBadge } from "@/components/CrowdBadge";
import {
  computeCrowdStats,
  haversineKm,
  levelMeta,
  placeKey,
  timeAgo,
  type CrowdReport,
} from "@/lib/crowd";
import type { SelectedPlace } from "@/components/PlaceDetails";

export type Preference = "quietest" | "closest" | "freshest";

interface Props {
  stops: SelectedPlace[];
  reports: CrowdReport[];
  origin: { lat: number; lng: number } | null;
  preference: Preference;
  onPreference: (p: Preference) => void;
  onRemove: (key: string) => void;
  onFocus: (place: SelectedPlace) => void;
}

const PREFS: { id: Preference; label: string }[] = [
  { id: "quietest", label: "Least crowded" },
  { id: "closest", label: "Closest first" },
  { id: "freshest", label: "Best data" },
];

export function PlanMyDay({
  stops,
  reports,
  origin,
  preference,
  onPreference,
  onRemove,
  onFocus,
}: Props) {
  const ranked = useMemo(() => {
    const byKey = new Map<string, CrowdReport[]>();
    for (const r of reports) {
      const list = byKey.get(r.place_key);
      if (list) list.push(r);
      else byKey.set(r.place_key, [r]);
    }
    const maxDist = Math.max(
      1,
      ...stops.map((s) => (origin ? haversineKm(origin, s) : 0)),
    );

    const weights =
      preference === "quietest"
        ? { crowd: 0.6, fresh: 0.2, dist: 0.2 }
        : preference === "closest"
          ? { crowd: 0.25, fresh: 0.15, dist: 0.6 }
          : { crowd: 0.3, fresh: 0.5, dist: 0.2 };

    return stops
      .map((stop) => {
        const key = placeKey(stop.lat, stop.lng);
        const stats = computeCrowdStats(byKey.get(key) ?? []);
        const crowdScore = stats.level ? 1 - (levelMeta(stats.level).value - 1) / 3 : 0.45;
        const freshScore =
          stats.freshness === "live"
            ? 1
            : stats.freshness === "recent"
              ? 0.7
              : stats.freshness === "stale"
                ? 0.35
                : 0.1;
        const distKm = origin ? haversineKm(origin, stop) : 0;
        const distScore = origin ? 1 - distKm / maxDist : 0.5;
        const score =
          weights.crowd * crowdScore + weights.fresh * freshScore + weights.dist * distScore;
        return { stop, key, stats, distKm, score: Math.round(score * 100) };
      })
      .sort((a, b) => b.score - a.score);
  }, [stops, reports, origin, preference]);

  return (
    <div className="scrollbar-slim h-full overflow-y-auto p-5">
      <div className="flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-accent/15 text-accent">
          <CalendarCheck className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Plan My Day</h2>
          <p className="text-xs text-muted-foreground">
            Ranked by crowd, data freshness and distance
          </p>
        </div>
      </div>

      <div className="mt-4 flex gap-1.5 rounded-xl border border-border bg-surface/60 p-1">
        {PREFS.map((p) => (
          <button
            key={p.id}
            onClick={() => onPreference(p.id)}
            className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition-all ${
              preference === p.id
                ? "bg-primary text-primary-foreground shadow-[var(--shadow-glow)]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {stops.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-8 text-center">
          <Sparkles className="h-6 w-6 text-accent" />
          <h3 className="text-sm font-semibold">Your day is empty</h3>
          <p className="max-w-xs text-xs text-muted-foreground">
            Search or tap places on the map, then hit “Add to Plan My Day”. We'll order your stops so
            you hit the quiet ones at the right time.
          </p>
        </div>
      ) : (
        <ol className="mt-4 space-y-2">
          {ranked.map((item, i) => (
            <li
              key={item.key}
              className="group rounded-2xl border border-border bg-surface/60 p-3 transition-all hover:-translate-y-0.5 hover:border-primary/40 animate-rise"
            >
              <div className="flex items-start gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/15 text-xs font-bold text-primary">
                  {i + 1}
                </span>
                <button onClick={() => onFocus(item.stop)} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-semibold">{item.stop.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{item.stop.address}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <CrowdBadge level={item.stats.level} size="sm" />
                    {item.stats.lastReportAt && (
                      <span className="text-[11px] text-muted-foreground">
                        {timeAgo(item.stats.lastReportAt)}
                      </span>
                    )}
                    {origin && (
                      <span className="text-[11px] text-muted-foreground">
                        {item.distKm.toFixed(1)} km
                      </span>
                    )}
                    <span className="ml-auto text-[11px] font-semibold text-primary">
                      {item.score}/100
                    </span>
                  </div>
                </button>
                <div className="flex shrink-0 flex-col gap-1">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${item.stop.lat},${item.stop.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    aria-label={`Directions to ${item.stop.name}`}
                  >
                    <Navigation className="h-3.5 w-3.5" />
                  </a>
                  <button
                    onClick={() => onRemove(item.key)}
                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/20 hover:text-destructive"
                    aria-label={`Remove ${item.stop.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      {stops.length > 1 && (
        <p className="mt-4 flex items-start gap-2 rounded-xl bg-accent/10 p-3 text-[11px] text-muted-foreground">
          <Route className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
          Start with <strong className="text-foreground">{ranked[0]?.stop.name}</strong> — it scores
          best on your “{PREFS.find((p) => p.id === preference)?.label}” preference right now.
        </p>
      )}
    </div>
  );
}
