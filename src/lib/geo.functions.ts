import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export interface GeoPlace {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  category?: string;
}

const UA = "CrowdSenseIndia/1.0 (crowd intelligence demo)";

function shape(raw: any): GeoPlace {
  const display: string = raw.display_name ?? "";
  const name: string =
    raw.name && raw.name.length > 0 ? raw.name : display.split(",")[0] || "Unnamed place";
  return {
    id: String(raw.place_id ?? `${raw.lat},${raw.lon}`),
    name,
    address: display,
    lat: Number(raw.lat),
    lng: Number(raw.lon),
    category: raw.type ?? raw.class,
  };
}

export const searchPlaces = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ query: z.string().min(1) }).parse(data))
  .handler(async ({ data }): Promise<GeoPlace[]> => {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", data.query);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("countrycodes", "in");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", "8");
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
    if (!res.ok) throw new Error("Search is unavailable right now");
    const json = (await res.json()) as any[];
    return json.map(shape);
  });

export const reverseGeocode = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ lat: z.number(), lng: z.number() }).parse(data))
  .handler(async ({ data }): Promise<GeoPlace> => {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("lat", String(data.lat));
    url.searchParams.set("lon", String(data.lng));
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("zoom", "18");
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
    if (!res.ok) throw new Error("Could not read that location");
    const raw = (await res.json()) as any;
    if (raw.error) {
      return {
        id: `${data.lat},${data.lng}`,
        name: "Dropped pin",
        address: `${data.lat.toFixed(5)}, ${data.lng.toFixed(5)}`,
        lat: data.lat,
        lng: data.lng,
      };
    }
    const place = shape(raw);
    return { ...place, lat: data.lat, lng: data.lng };
  });
