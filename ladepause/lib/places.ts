import type { Poi, PoiCategory, Station } from "./types";
import { walkingMeters } from "./geo";

/**
 * Google Places-klient (Places API "New" — Nearby Search + Place Details).
 *
 * OMKOSTNINGSSTYRING (jf. brief):
 *   - Kaldes KUN fra pipelinen, én gang pr. station. Aldrig live fra webappen.
 *   - Resultatet caches permanent i databasen.
 *   - Husk budgetloft på $10 (billing alert/quota) i Google Cloud-projektet.
 *
 * Docs: https://developers.google.com/maps/documentation/places/web-service/nearby-search
 */

const NEARBY_URL = "https://places.googleapis.com/v1/places:searchNearby";

// Hvilke Google-place-typer vi henter, og hvordan de mapper til vores kategorier.
const INCLUDED_TYPES = [
  "cafe",
  "restaurant",
  "supermarket",
  "bakery",
  "park",
  "playground",
];

function mapType(types: string[]): PoiCategory {
  if (types.includes("cafe")) return "cafe";
  if (types.includes("bakery")) return "bakery";
  if (types.includes("supermarket") || types.includes("grocery_store"))
    return "supermarket";
  if (types.includes("playground")) return "playground";
  if (types.includes("park")) return "park";
  if (types.includes("restaurant") || types.includes("meal_takeaway"))
    return "restaurant";
  return "other";
}

interface GooglePlace {
  id: string;
  displayName?: { text?: string };
  types?: string[];
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  reviews?: Array<{ text?: { text?: string }; originalText?: { text?: string } }>;
}

export interface PlacesFetchOptions {
  apiKey: string;
  radiusMeters: number;
  maxResults?: number;
}

/**
 * Henter nærliggende POI'er for én station via Google Places Nearby Search.
 * Field mask er bevidst afgrænset, så vi kun betaler for de felter vi bruger
 * (inkl. reviews, som er hovedkilden til de "bløde" data til Claude).
 */
export async function fetchNearbyPois(
  station: Station,
  opts: PlacesFetchOptions,
): Promise<Poi[]> {
  const body = {
    includedTypes: INCLUDED_TYPES,
    maxResultCount: opts.maxResults ?? 20,
    locationRestriction: {
      circle: {
        center: { latitude: station.lat, longitude: station.lng },
        radius: opts.radiusMeters,
      },
    },
    rankPreference: "DISTANCE",
    languageCode: station.country === "DE" ? "de" : "da",
  };

  const res = await fetch(NEARBY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": opts.apiKey,
      // Field mask: kun det vi bruger → lavere pris pr. kald.
      "X-Goog-FieldMask": [
        "places.id",
        "places.displayName",
        "places.types",
        "places.location",
        "places.rating",
        "places.userRatingCount",
        "places.reviews",
      ].join(","),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Places svarede ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = (await res.json()) as { places?: GooglePlace[] };
  const places = data.places ?? [];

  return places.map((p): Poi => {
    const lat = p.location?.latitude ?? station.lat;
    const lng = p.location?.longitude ?? station.lng;
    const reviews = (p.reviews ?? [])
      .map((r) => r.originalText?.text ?? r.text?.text ?? "")
      .filter(Boolean)
      .slice(0, 3);

    return {
      id: `gp-${p.id}`,
      stationId: station.id,
      name: p.displayName?.text ?? "Ukendt sted",
      category: mapType(p.types ?? []),
      lat,
      lng,
      distanceMeters: walkingMeters(station.lat, station.lng, lat, lng),
      rating: p.rating ?? null,
      userRatingsTotal: p.userRatingCount ?? null,
      source: "google",
      reviews,
    };
  });
}
