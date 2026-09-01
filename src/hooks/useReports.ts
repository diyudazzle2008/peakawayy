import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  computeCrowdStats,
  placeKey,
  type CrowdLevel,
  type CrowdReport,
  type CrowdStats,
} from "@/lib/crowd";

export interface AggregatedPlace {
  key: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  stats: CrowdStats;
  reports: CrowdReport[];
}

async function fetchReports(): Promise<CrowdReport[]> {
  const since = new Date(Date.now() - 48 * 3600_000).toISOString();
  const { data, error } = await supabase
    .from("crowd_reports")
    .select("*")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) throw new Error(error.message);
  return (data ?? []) as CrowdReport[];
}

export function useReports() {
  return useQuery({
    queryKey: ["crowd-reports"],
    queryFn: fetchReports,
    refetchInterval: 60_000,
    staleTime: 20_000,
  });
}

export function aggregate(reports: CrowdReport[]): AggregatedPlace[] {
  const map = new Map<string, CrowdReport[]>();
  for (const r of reports) {
    const list = map.get(r.place_key);
    if (list) list.push(r);
    else map.set(r.place_key, [r]);
  }
  return [...map.entries()]
    .map(([key, list]) => {
      const first = list[0]!;
      return {
        key,
        name: first.place_name,
        address: first.address,
        lat: first.lat,
        lng: first.lng,
        stats: computeCrowdStats(list),
        reports: list,
      };
    })
    .sort((a, b) => (b.stats.lastReportAt ?? "").localeCompare(a.stats.lastReportAt ?? ""));
}

export interface NewReport {
  name: string;
  address: string;
  lat: number;
  lng: number;
  level: CrowdLevel;
  note?: string;
}

function sessionId() {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem("cs-session");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("cs-session", id);
  }
  return id;
}

export function useSubmitReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (report: NewReport) => {
      const { error } = await supabase.from("crowd_reports").insert({
        place_key: placeKey(report.lat, report.lng),
        place_name: report.name,
        address: report.address,
        lat: report.lat,
        lng: report.lng,
        level: report.level,
        note: report.note ?? null,
        session_id: sessionId(),
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crowd-reports"] }),
  });
}
