import type { Station } from "./types";

/**
 * Open Charge Map-klient. Henter ladestationer for et geografisk område og
 * filtrerer til KUN Tesla Superchargere (jf. brief). OCM tagger Tesla-stationer
 * via operator-id'er, så vi kan filtrere specifikt.
 *
 * Docs: https://openchargemap.org/site/develop/api
 */

const OCM_BASE = "https://api.openchargemap.io/v3/poi";

// OCM OperatorInfo-id'er der repræsenterer Tesla (inkl. Supercharger-netværket).
// 23 = "Tesla (Destination)", 3534 = "Tesla Supercharger". Vi tager begge og
// filtrerer yderligere på Supercharger-niveau nedenfor.
const TESLA_OPERATOR_IDS = [23, 3534];

// Bounding box for DK + Nordtyskland (nord for ca. Hamborg).
// [nord, vest, syd, øst]
export const DK_NORDTYSKLAND_BBOX = {
  north: 57.9,
  west: 8.0,
  south: 53.3,
  east: 13.0,
};

interface OcmConnection {
  PowerKW?: number | null;
  ConnectionType?: { Title?: string | null } | null;
  Quantity?: number | null;
}

interface OcmPoi {
  ID: number;
  OperatorInfo?: { ID?: number | null; Title?: string | null } | null;
  AddressInfo?: {
    Title?: string | null;
    AddressLine1?: string | null;
    Town?: string | null;
    Postcode?: string | null;
    CountryID?: number | null;
    Country?: { ISOCode?: string | null } | null;
    Latitude?: number | null;
    Longitude?: number | null;
  } | null;
  Connections?: OcmConnection[] | null;
}

export interface OcmFetchOptions {
  apiKey?: string;
  bbox?: typeof DK_NORDTYSKLAND_BBOX;
  maxResults?: number;
}

/**
 * Henter Tesla Supercharger-stationer fra OCM. Returnerer normaliserede Station-
 * objekter. Kaster hvis netværket fejler, så kalderen kan falde tilbage til seed.
 */
export async function fetchTeslaSuperchargers(
  opts: OcmFetchOptions = {},
): Promise<Station[]> {
  const bbox = opts.bbox ?? DK_NORDTYSKLAND_BBOX;
  const params = new URLSearchParams({
    output: "json",
    // OCM boundingbox-format: (nord,vest),(syd,øst)
    boundingbox: `(${bbox.north},${bbox.west}),(${bbox.south},${bbox.east})`,
    operatorid: TESLA_OPERATOR_IDS.join(","),
    maxresults: String(opts.maxResults ?? 500),
    compact: "true",
    verbose: "false",
  });
  if (opts.apiKey) params.set("key", opts.apiKey);

  const res = await fetch(`${OCM_BASE}?${params.toString()}`, {
    headers: { "User-Agent": "Ladepause-PoC/0.1 (+github.com/munk-dk)" },
  });
  if (!res.ok) {
    throw new Error(`OCM svarede ${res.status} ${res.statusText}`);
  }
  const pois = (await res.json()) as OcmPoi[];

  return pois
    .filter(isSupercharger)
    .map(normalize)
    .filter((s): s is Station => s !== null);
}

function isSupercharger(poi: OcmPoi): boolean {
  const opTitle = poi.OperatorInfo?.Title?.toLowerCase() ?? "";
  const name = poi.AddressInfo?.Title?.toLowerCase() ?? "";
  // Supercharger = høj effekt + Tesla-operator/navn. Vi ekskluderer langsomme
  // "Destination"-ladere ved at kræve mindst én connection >= 100 kW.
  const hasFast = (poi.Connections ?? []).some((c) => (c.PowerKW ?? 0) >= 100);
  const looksTesla = opTitle.includes("tesla") || name.includes("supercharger");
  return looksTesla && hasFast;
}

function normalize(poi: OcmPoi): Station | null {
  const a = poi.AddressInfo;
  if (!a?.Latitude || !a?.Longitude) return null;

  const iso = a.Country?.ISOCode?.toUpperCase();
  const country: Station["country"] = iso === "DE" ? "DE" : "DK";

  const conns = poi.Connections ?? [];
  const powerKw = conns.reduce((max, c) => Math.max(max, c.PowerKW ?? 0), 0) || null;
  const connectorCount =
    conns.reduce((sum, c) => sum + (c.Quantity ?? 0), 0) || null;
  const connectorType =
    conns.find((c) => c.ConnectionType?.Title)?.ConnectionType?.Title ?? null;

  const address = [a.AddressLine1, a.Postcode, a.Town].filter(Boolean).join(", ");

  return {
    id: `ocm-${poi.ID}`,
    name: a.Title ?? "Tesla Supercharger",
    address: address || "Ukendt adresse",
    city: a.Town ?? "",
    country,
    lat: a.Latitude,
    lng: a.Longitude,
    connectorCount,
    connectorType,
    powerKw,
    operator: poi.OperatorInfo?.Title ?? "Tesla",
    source: "ocm",
  };
}
