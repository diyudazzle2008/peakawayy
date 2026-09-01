import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Search, Loader2, MapPin, LocateFixed, X } from "lucide-react";
import { searchPlaces, type GeoPlace } from "@/lib/geo.functions";

interface Props {
  onSelect: (place: GeoPlace) => void;
  onLocate: () => void;
  locating?: boolean;
}

export function SearchBar({ onSelect, onLocate, locating }: Props) {
  const search = useServerFn(searchPlaces);
  const [value, setValue] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value.trim()), 400);
    return () => clearTimeout(t);
  }, [value]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const { data, isFetching, isError } = useQuery({
    queryKey: ["geo-search", debounced],
    queryFn: () => search({ data: { query: debounced } }),
    enabled: debounced.length >= 3,
    staleTime: 5 * 60_000,
  });

  const results = data ?? [];

  return (
    <div ref={boxRef} className="relative w-full">
      <div className="glass flex items-center gap-2 rounded-2xl px-3 py-2 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.9)] transition-colors focus-within:border-primary/60">
        <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search any place in India — colleges, stations, malls, temples…"
          className="w-full bg-transparent py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/80"
          aria-label="Search places in India"
        />
        {value && (
          <button
            onClick={() => {
              setValue("");
              setOpen(false);
            }}
            className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={onLocate}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-primary/15 px-3 py-2 text-xs font-semibold text-primary transition-all hover:bg-primary/25 active:scale-95"
        >
          {locating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LocateFixed className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">My location</span>
        </button>
      </div>

      {open && debounced.length >= 3 && (
        <div className="glass scrollbar-slim absolute z-[1200] mt-2 max-h-80 w-full overflow-y-auto rounded-2xl p-1.5 animate-rise">
          {isFetching && (
            <div className="space-y-2 p-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-11 animate-pulse rounded-xl bg-secondary/70" />
              ))}
            </div>
          )}
          {!isFetching && isError && (
            <p className="p-4 text-sm text-destructive">
              Search failed. Check your connection and try again.
            </p>
          )}
          {!isFetching && !isError && results.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">
              No matches in India for “{debounced}”. Try a nearby landmark or city.
            </p>
          )}
          {!isFetching &&
            results.map((place) => (
              <button
                key={place.id}
                onClick={() => {
                  onSelect(place);
                  setOpen(false);
                  setValue(place.name);
                }}
                className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-secondary/80"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {place.name}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {place.address}
                  </span>
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
