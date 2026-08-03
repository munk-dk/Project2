// Delte typer for hele Ladepause-PoC'en (pipeline + webapp).

/** De faste "bedst til"-tags. Holdt som en lukket enum, så både Claude-prompten,
 *  databasen og UI'et er enige om det samme sæt. */
export const TAG_KEYS = [
  "kaffe",
  "frokost",
  "indkoeb",
  "familiepause",
  "arbejde",
  "hundepause",
] as const;

export type TagKey = (typeof TAG_KEYS)[number];

export interface TagMeta {
  key: TagKey;
  emoji: string;
  label: string;
}

export const TAGS: Record<TagKey, TagMeta> = {
  kaffe: { key: "kaffe", emoji: "☕", label: "Kaffe" },
  frokost: { key: "frokost", emoji: "🍽️", label: "Frokost" },
  indkoeb: { key: "indkoeb", emoji: "🛒", label: "Indkøb" },
  familiepause: { key: "familiepause", emoji: "👨‍👩‍👧", label: "Familiepause" },
  arbejde: { key: "arbejde", emoji: "💻", label: "Arbejde" },
  hundepause: { key: "hundepause", emoji: "🐕", label: "Hundepause" },
};

export function isTagKey(value: string): value is TagKey {
  return (TAG_KEYS as readonly string[]).includes(value);
}

/** POI-kategorier vi bryder os om — bruges til filtrering/visning. */
export type PoiCategory =
  | "cafe"
  | "restaurant"
  | "supermarket"
  | "bakery"
  | "playground"
  | "toilet"
  | "dog_area"
  | "park"
  | "other";

export interface Poi {
  id: string;
  stationId: string;
  name: string;
  category: PoiCategory;
  lat: number;
  lng: number;
  /** Gåafstand i meter (fugleflugt * korrektionsfaktor, eller rutet hvis tilgængeligt). */
  distanceMeters: number;
  rating: number | null;
  userRatingsTotal: number | null;
  /** Hvor data kom fra: google | osm | placeholder */
  source: "google" | "osm" | "placeholder";
  /** Et par korte, repræsentative anmeldelses-uddrag (til Claude-prompten). */
  reviews?: string[];
}

/** En ladestation med statiske grunddata (fra OCM) + evt. beriget indhold. */
export interface Station {
  id: string;
  name: string;
  address: string;
  city: string;
  country: "DK" | "DE";
  lat: number;
  lng: number;
  connectorCount: number | null;
  connectorType: string | null;
  powerKw: number | null;
  operator: string;
  source: "ocm" | "seed";
}

/** Det AI-genererede resumé + tags for en station. */
export interface Summary {
  stationId: string;
  summaryText: string;
  tags: TagKey[];
  model: string;
  promptVersion: string;
  /** "claude" for rigtige kald, "placeholder" for eksempeldata i repoet. */
  generatedBy: "claude" | "placeholder";
  generatedAt: string;
}

/** Det fladede objekt webappen arbejder med (station + resumé + POI'er). */
export interface EnrichedStation extends Station {
  summary: Summary | null;
  pois: Poi[];
}
