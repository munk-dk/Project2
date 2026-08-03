import type { Poi, PoiCategory, Station } from "./types";
import { walkingMeters } from "./geo";

/**
 * OpenStreetMap / Overpass-klient (gratis). Supplerer Google på steder hvor OSM
 * har tagget ting Google typisk mangler: offentlige toiletter, legepladser og
 * hundeområder/-skove. Bruges som supplement, ikke erstatning.
 *
 * Docs: https://wiki.openstreetmap.org/wiki/Overpass_API
 */

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function classify(tags: Record<string, string>): PoiCategory | null {
  if (tags.amenity === "toilets") return "toilet";
  if (tags.leisure === "playground") return "playground";
  if (tags.leisure === "dog_park") return "dog_area";
  if (tags.leisure === "park") return "park";
  return null;
}

function nameFor(category: PoiCategory, tags: Record<string, string>): string {
  if (tags.name) return tags.name;
  switch (category) {
    case "toilet":
      return "Offentligt toilet";
    case "playground":
      return "Legeplads";
    case "dog_area":
      return "Hundeområde";
    case "park":
      return "Grønt område";
    default:
      return "POI";
  }
}

/**
 * Henter supplerende OSM-POI'er (toiletter, legepladser, hundeområder, parker)
 * inden for radius omkring en station.
 */
export async function fetchOsmPois(
  station: Station,
  radiusMeters: number,
): Promise<Poi[]> {
  const r = radiusMeters;
  const { lat, lng } = station;
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="toilets"](around:${r},${lat},${lng});
      way["amenity"="toilets"](around:${r},${lat},${lng});
      node["leisure"="playground"](around:${r},${lat},${lng});
      way["leisure"="playground"](around:${r},${lat},${lng});
      node["leisure"="dog_park"](around:${r},${lat},${lng});
      way["leisure"="dog_park"](around:${r},${lat},${lng});
    );
    out center tags;`;

  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!res.ok) {
    throw new Error(`Overpass svarede ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as { elements?: OverpassElement[] };
  const out: Poi[] = [];

  for (const el of data.elements ?? []) {
    const tags = el.tags ?? {};
    const category = classify(tags);
    if (!category) continue;

    const pLat = el.lat ?? el.center?.lat;
    const pLng = el.lon ?? el.center?.lon;
    if (pLat == null || pLng == null) continue;

    out.push({
      id: `osm-${el.type}-${el.id}`,
      stationId: station.id,
      name: nameFor(category, tags),
      category,
      lat: pLat,
      lng: pLng,
      distanceMeters: walkingMeters(lat, lng, pLat, pLng),
      rating: null,
      userRatingsTotal: null,
      source: "osm",
    });
  }

  return out;
}
