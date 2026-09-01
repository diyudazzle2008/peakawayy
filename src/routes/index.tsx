import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Activity, Layers, MapPinned, Radar, Users } from "lucide-react";

import { SearchBar } from "@/components/SearchBar";
import { PlaceDetails, type SelectedPlace } from "@/components/PlaceDetails";
import { PlanMyDay, type Preference } from "@/components/PlanMyDay";
import { CrowdBadge } from "@/components/CrowdBadge";
import { aggregate, useReports, useSubmitReport } from "@/hooks/useReports";
import { computeCrowdStats, placeKey, type CrowdLevel } from "@/lib/crowd";
import { reverseGeocode, type GeoPlace } from "@/lib/geo.functions";
import type { MapMarker } from "@/components/map/CrowdMap";

const CrowdMap = lazy(() => import("@/components/map/CrowdMap"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CrowdSense India — Live crowd levels for any place in India" },
      {
        name: "description",
        content:
          "Search any address, campus, station or market in India, see live crowd-sourced busyness, report what you see, and plan your day around the quiet hours.",
      },
      { property: "og:title", content: "CrowdSense India — Live crowd intelligence" },
      {
        property: "og:description",
        content:
          "Crowd-sourced busyness for every place in India. Search, report, and plan your day around the crowds.",
      },
    ],
  }),
  component: Home,
});

const MapFallback = () => (
  <div className="grid h-full w-full place-items-center bg-background">
    <div className="flex flex-col items-center gap-3">
      <div className="relative h-12 w-12">
        <span className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
        <span className="absolute inset-2 rounded-full bg-primary/70" />
      </div>
      <p className="text-xs text-muted-foreground">Loading the map of India…</p>
    </div>
  </div>
);

function Home() {
  const [selected, setSelected] = useState<SelectedPlace | null>(null);
  const [resolving, setResolving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; zoom?: number; nonce: number } | null>(
    null,
  );
  const [tab, setTab] = useState<"place" | "plan">("place");
  const [stops, setStops] = useState<SelectedPlace[]>([]);
  const [preference, setPreference] = useState<Preference>("quietest");
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);

  const reverse = useServerFn(reverseGeocode);
  const { data: reports = [], isLoading, isError, refetch } = useReports();
  const submit = useSubmitReport();

  useEffect(() => {
    const raw = localStorage.getItem("cs-plan");
    if (raw) {
      try {
        setStops(JSON.parse(raw));
      } catch {
        /* ignore malformed plan */
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("cs-plan", JSON.stringify(stops));
  }, [stops]);

  const places = useMemo(() => aggregate(reports), [reports]);

  const markers: MapMarker[] = useMemo(
    () =>
      places.map((p) => ({
        key: p.key,
        name: p.name,
        lat: p.lat,
        lng: p.lng,
        level: p.stats.level,
        count: p.stats.reportCount,
      })),
    [places],
  );

  const selectedKey = selected ? placeKey(selected.lat, selected.lng) : null;
  const selectedReports = useMemo(
    () => (selectedKey ? reports.filter((r) => r.place_key === selectedKey) : []),
    [reports, selectedKey],
  );
  const selectedStats = useMemo(() => computeCrowdStats(selectedReports), [selectedReports]);

  const network = useMemo(() => {
    const live = places.filter((p) => p.stats.freshness === "live").length;
    return { places: places.length, reports: reports.length, live };
  }, [places, reports]);

  const focusPlace = useCallback((p: SelectedPlace, zoom = 16) => {
    setSelected(p);
    setTab("place");
    setFlyTo({ lat: p.lat, lng: p.lng, zoom, nonce: Date.now() });
  }, []);

  const pickCoords = useCallback(
    async (lat: number, lng: number, fly = false) => {
      setResolving(true);
      setTab("place");
      setSelected({ name: "Locating…", address: "Reading the address…", lat, lng });
      try {
        const place = await reverse({ data: { lat, lng } });
        setSelected({ name: place.name, address: place.address, lat, lng });
        if (fly) setFlyTo({ lat, lng, zoom: 16, nonce: Date.now() });
      } catch {
        setSelected({
          name: "Dropped pin",
          address: `${lat.toFixed(5)}, ${lng.toFixed(5)} — address lookup unavailable`,
          lat,
          lng,
        });
        toast.error("Couldn't read that address, but you can still report here.");
      } finally {
        setResolving(false);
      }
    },
    [reverse],
  );

  const handleSearchSelect = (place: GeoPlace) => {
    focusPlace({ name: place.name, address: place.address, lat: place.lat, lng: place.lng });
  };

  const handleLocate = () => {
    if (!navigator.geolocation) {
      toast.error("Your browser doesn't support location access.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { latitude, longitude } = pos.coords;
        setOrigin({ lat: latitude, lng: longitude });
        void pickCoords(latitude, longitude, true);
      },
      () => {
        setLocating(false);
        toast.error("Location permission denied. Tap the map to drop a pin instead.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleReport = (level: CrowdLevel, note: string) => {
    if (!selected) return;
    submit.mutate(
      { ...selected, level, note },
      {
        onSuccess: () => toast.success("Report added — thanks for keeping India moving."),
        onError: () => toast.error("Could not save your report. Please try again."),
      },
    );
  };

  const addToPlan = (place: SelectedPlace) => {
    const key = placeKey(place.lat, place.lng);
    if (stops.some((s) => placeKey(s.lat, s.lng) === key)) {
      toast("Already in your plan.");
      setTab("plan");
      return;
    }
    setStops((prev) => [...prev, place]);
    setTab("plan");
    toast.success(`${place.name} added to your day.`);
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="hero-glow">
        <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
              <Radar className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <p className="font-display text-base font-bold tracking-tight">CrowdSense</p>
              <p className="text-[11px] uppercase tracking-[0.2em] text-primary">India</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 text-xs text-muted-foreground md:flex">
            <Pill icon={<MapPinned className="h-3.5 w-3.5" />} label={`${network.places} places`} />
            <Pill icon={<Users className="h-3.5 w-3.5" />} label={`${network.reports} reports / 48h`} />
            <Pill icon={<Activity className="h-3.5 w-3.5" />} label={`${network.live} live now`} />
          </div>
        </header>

        <section className="mx-auto max-w-7xl px-4 pb-6 pt-2 sm:px-6 sm:pb-10 sm:pt-6">
          <h1 className="max-w-2xl text-3xl font-bold leading-[1.1] sm:text-5xl">
            <span className="text-gradient">Know how crowded it is</span>
            <br />
            before you leave home.
          </h1>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
            Live, crowd-sourced busyness for any place in India — campuses, stations, clinics,
            markets and everything in between.
          </p>
          <div className="mt-5 max-w-2xl">
            <SearchBar onSelect={handleSearchSelect} onLocate={handleLocate} locating={locating} />
          </div>
        </section>
      </div>

      <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6">
        <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
          <div className="glass relative h-[52vh] overflow-hidden rounded-3xl lg:h-[72vh]">
            <ClientOnly fallback={<MapFallback />}>
              <Suspense fallback={<MapFallback />}>
                <CrowdMap
                  markers={markers}
                  selected={selected}
                  flyTo={flyTo}
                  onPick={(lat, lng) => void pickCoords(lat, lng)}
                  onMarkerSelect={(m) => {
                    const place = places.find((p) => p.key === m.key);
                    if (place)
                      focusPlace({
                        name: place.name,
                        address: place.address,
                        lat: place.lat,
                        lng: place.lng,
                      });
                  }}
                />
              </Suspense>
            </ClientOnly>
            <div className="glass pointer-events-none absolute bottom-4 left-4 z-[600] rounded-2xl px-3 py-2 text-[11px] text-muted-foreground">
              Tap the map to drop a pin · drag the pin to fine-tune
            </div>
          </div>

          <aside className="glass flex h-[72vh] flex-col overflow-hidden rounded-3xl">
            <div className="flex gap-1 border-b border-border p-2">
              <TabButton active={tab === "place"} onClick={() => setTab("place")} icon={<Layers className="h-4 w-4" />}>
                Place
              </TabButton>
              <TabButton active={tab === "plan"} onClick={() => setTab("plan")} icon={<MapPinned className="h-4 w-4" />}>
                Plan my day{stops.length > 0 ? ` · ${stops.length}` : ""}
              </TabButton>
            </div>
            <div className="min-h-0 flex-1">
              {tab === "place" ? (
                <PlaceDetails
                  place={selected}
                  loading={resolving && !selected}
                  stats={selectedStats}
                  reports={selectedReports}
                  submitting={submit.isPending}
                  onReport={handleReport}
                  onAddToPlan={addToPlan}
                />
              ) : (
                <PlanMyDay
                  stops={stops}
                  reports={reports}
                  origin={origin ?? (selected ? { lat: selected.lat, lng: selected.lng } : null)}
                  preference={preference}
                  onPreference={setPreference}
                  onRemove={(key) => setStops((prev) => prev.filter((s) => placeKey(s.lat, s.lng) !== key))}
                  onFocus={(p) => focusPlace(p)}
                />
              )}
            </div>
          </aside>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Trending across India
            </h2>
            {isError && (
              <button
                onClick={() => void refetch()}
                className="rounded-lg border border-destructive/40 px-3 py-1 text-xs font-semibold text-destructive"
              >
                Retry loading reports
              </button>
            )}
          </div>
          {isLoading ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-2xl bg-surface/70" />
              ))}
            </div>
          ) : places.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No reports yet across the network. Search a place and file the very first CrowdSense
              report.
            </p>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {places.slice(0, 8).map((p) => (
                <button
                  key={p.key}
                  onClick={() =>
                    focusPlace({ name: p.name, address: p.address, lat: p.lat, lng: p.lng })
                  }
                  className="glass rounded-2xl p-4 text-left transition-all hover:-translate-y-1 hover:border-primary/40"
                >
                  <p className="truncate text-sm font-semibold">{p.name}</p>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{p.address}</p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <CrowdBadge level={p.stats.level} size="sm" />
                    <span className="text-[11px] text-muted-foreground">
                      {p.stats.confidence}% conf.
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        CrowdSense India · community-powered crowd intelligence · map data © OpenStreetMap
      </footer>
    </main>
  );
}

function Pill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5">
      {icon}
      {label}
    </span>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
        active
          ? "bg-primary/15 text-primary ring-1 ring-primary/30"
          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}
