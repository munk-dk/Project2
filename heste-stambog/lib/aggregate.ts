// Aggregeringslag: tager rå hits fra hver kilde og samler dem til én Horse.

import type {
  DataSource,
  Horse,
  HorseSearchResult,
  SourceHit,
  SourceName,
} from "./types";
import { buildVerificationReport } from "./verify";

// Samler hits på tværs af kilder hvis de matcher på UELN, FEI ID, dansk ident
// eller chip-nummer. Falder tilbage til navn+fødselsår hvis intet ID matcher.
export function mergeHits(allHits: SourceHit[]): HorseSearchResult[] {
  const groups: SourceHit[][] = [];

  outer: for (const hit of allHits) {
    for (const group of groups) {
      if (group.some((h) => sameHorse(h, hit))) {
        group.push(hit);
        continue outer;
      }
    }
    groups.push([hit]);
  }

  return groups.map((group) => {
    const first = group[0];
    return {
      id: `${first.source}:${first.rawId}`,
      name: first.name,
      birthYear: pickFirst(group, "birthYear"),
      sex: pickFirst(group, "sex"),
      studbook: pickFirst(group, "studbook"),
      ueln: pickFirst(group, "ueln"),
      feiId: pickFirst(group, "feiId"),
      danishIdent: pickFirst(group, "danishIdent"),
      chipNumber: pickFirst(group, "chipNumber"),
      country: pickFirst(group, "country"),
      hits: group,
    };
  });
}

function sameHorse(a: SourceHit, b: SourceHit): boolean {
  if (a.ueln && b.ueln && a.ueln === b.ueln) return true;
  if (a.feiId && b.feiId && a.feiId === b.feiId) return true;
  if (a.danishIdent && b.danishIdent && a.danishIdent === b.danishIdent)
    return true;
  if (a.chipNumber && b.chipNumber && a.chipNumber === b.chipNumber) return true;
  // Sidste fallback: navn + fødselsår
  if (
    a.name &&
    b.name &&
    a.birthYear &&
    b.birthYear &&
    a.name.toLowerCase() === b.name.toLowerCase() &&
    a.birthYear === b.birthYear
  ) {
    return true;
  }
  return false;
}

function pickFirst<K extends keyof SourceHit>(
  group: SourceHit[],
  key: K,
): SourceHit[K] {
  for (const hit of group) {
    if (hit[key] !== undefined && hit[key] !== null && hit[key] !== "")
      return hit[key];
  }
  return undefined as SourceHit[K];
}

// Saml en samling SourceHits til en fuld Horse-profil og kør verifikation.
export function buildHorse(
  id: string,
  hits: SourceHit[],
  meta: {
    sources: DataSource[];
  },
): Horse {
  const partial: Horse = {
    id,
    name: pickFirst(hits, "name") ?? "",
    birthYear: pickFirst(hits, "birthYear"),
    sex: pickFirst(hits, "sex"),
    studbook: pickFirst(hits, "studbook"),
    ueln: pickFirst(hits, "ueln"),
    feiId: pickFirst(hits, "feiId"),
    danishIdent: pickFirst(hits, "danishIdent"),
    chipNumber: pickFirst(hits, "chipNumber"),
    country: pickFirst(hits, "country"),
    owner: pickFirst(hits, "owner"),
    sources: meta.sources,
    verificationStatus: "unknown",
    verificationFlags: [],
    lastUpdated: new Date().toISOString(),
  };

  const sourceData: Partial<Record<SourceName, Partial<Horse>>> = {};
  for (const hit of hits) {
    sourceData[hit.source] = {
      name: hit.name,
      birthYear: hit.birthYear,
      sex: hit.sex,
      ueln: hit.ueln,
      feiId: hit.feiId,
      danishIdent: hit.danishIdent,
      chipNumber: hit.chipNumber,
      studbook: hit.studbook,
      country: hit.country,
    };
  }

  const report = buildVerificationReport(partial, sourceData);
  partial.verificationStatus = report.status;
  partial.verificationFlags = report.flags;
  return partial;
}
