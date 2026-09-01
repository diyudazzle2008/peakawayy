export type CrowdLevel = "quiet" | "moderate" | "busy" | "very_busy";

export interface CrowdReport {
  id: string;
  place_key: string;
  place_name: string;
  address: string;
  lat: number;
  lng: number;
  level: CrowdLevel;
  note: string | null;
  created_at: string;
}

export const LEVELS: {
  id: CrowdLevel;
  label: string;
  value: number;
  token: string;
  hint: string;
}[] = [
  { id: "quiet", label: "Quiet", value: 1, token: "var(--quiet)", hint: "Walk right in" },
  { id: "moderate", label: "Moderate", value: 2, token: "var(--moderate)", hint: "Some waiting" },
  { id: "busy", label: "Busy", value: 3, token: "var(--busy)", hint: "Expect a queue" },
  { id: "very_busy", label: "Very Busy", value: 4, token: "var(--verybusy)", hint: "Packed" },
];

export const levelMeta = (level: CrowdLevel) => LEVELS.find((l) => l.id === level) ?? LEVELS[1]!;

export const placeKey = (lat: number, lng: number) => `${lat.toFixed(4)},${lng.toFixed(4)}`;

const HALF_LIFE_HOURS = 3;

export interface CrowdStats {
  level: CrowdLevel | null;
  score: number;
  confidence: number;
  reportCount: number;
  recentCount: number;
  lastReportAt: string | null;
  trend: "rising" | "falling" | "steady" | "unknown";
  freshness: "live" | "recent" | "stale" | "none";
}

const ageHours = (iso: string, now: number) => (now - new Date(iso).getTime()) / 3_600_000;

const weightFor = (hours: number) => Math.pow(0.5, hours / HALF_LIFE_HOURS);

export function computeCrowdStats(reports: CrowdReport[], now = Date.now()): CrowdStats {
  if (reports.length === 0) {
    return {
      level: null,
      score: 0,
      confidence: 0,
      reportCount: 0,
      recentCount: 0,
      lastReportAt: null,
      trend: "unknown",
      freshness: "none",
    };
  }

  let weighted = 0;
  let weights = 0;
  let recentCount = 0;
  let newW = 0;
  let newWeights = 0;
  let oldW = 0;
  let oldWeights = 0;
  let latest = 0;

  for (const r of reports) {
    const hours = Math.max(0, ageHours(r.created_at, now));
    if (hours > 48) continue;
    const w = weightFor(hours);
    const v = levelMeta(r.level).value;
    weighted += w * v;
    weights += w;
    if (hours <= 6) recentCount += 1;
    if (hours <= 2) {
      newW += w * v;
      newWeights += w;
    } else {
      oldW += w * v;
      oldWeights += w;
    }
    latest = Math.max(latest, new Date(r.created_at).getTime());
  }

  if (weights === 0) {
    return {
      level: null,
      score: 0,
      confidence: 0,
      reportCount: reports.length,
      recentCount: 0,
      lastReportAt: reports[0]?.created_at ?? null,
      trend: "unknown",
      freshness: "stale",
    };
  }

  const score = weighted / weights;
  const rounded = Math.min(4, Math.max(1, Math.round(score)));
  const level = (LEVELS.find((l) => l.value === rounded) ?? LEVELS[1]!).id;
  const confidence = Math.round(Math.min(1, weights / 4) * 100);

  const lastHours = ageHours(new Date(latest).toISOString(), now);
  const freshness: CrowdStats["freshness"] =
    lastHours <= 1 ? "live" : lastHours <= 6 ? "recent" : "stale";

  let trend: CrowdStats["trend"] = "unknown";
  if (newWeights > 0 && oldWeights > 0) {
    const delta = newW / newWeights - oldW / oldWeights;
    trend = delta > 0.35 ? "rising" : delta < -0.35 ? "falling" : "steady";
  } else if (newWeights > 0) {
    trend = "steady";
  }

  return {
    level,
    score,
    confidence,
    reportCount: reports.length,
    recentCount,
    lastReportAt: new Date(latest).toISOString(),
    trend,
    freshness,
  };
}

export function timeAgo(iso: string | null, now = Date.now()) {
  if (!iso) return "no reports yet";
  const mins = Math.floor((now - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(la1) * Math.cos(la2);
  return 2 * R * Math.asin(Math.sqrt(h));
}
