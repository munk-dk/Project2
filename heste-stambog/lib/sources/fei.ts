// FEI-integration. https://data.fei.org tilbyder en offentlig søgeside
// (https://data.fei.org/Horse/Search.aspx). Der er intet officielt API
// uden registrering, så vi falder tilbage til simpel HTML/JSON-scraping
// af søgesiden hvis et JSON-endpoint ikke er tilgængeligt.
//
// Bemærk: FEI ændrer endpoints relativt ofte — verificér via DevTools
// hvis denne fil pludselig holder op med at returnere resultater.

import * as cheerio from "cheerio";
import { defaultUserAgent, squish } from "../utils";
import type { SourceHit } from "../types";

const FEI_BASE = process.env.FEI_BASE_URL ?? "https://data.fei.org";

export interface FeiSearchOptions {
  query: string;
  feiId?: string;
}

export async function searchFei(opts: FeiSearchOptions): Promise<SourceHit[]> {
  if (opts.feiId) {
    const direct = await fetchFeiHorse(opts.feiId);
    return direct ? [direct] : [];
  }

  const url = `${FEI_BASE}/Horse/Search.aspx?Name=${encodeURIComponent(opts.query)}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": defaultUserAgent(),
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    redirect: "follow",
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(
      `FEI søgning fejlede med status ${res.status} ${res.statusText}`,
    );
  }
  const html = await res.text();
  return parseFeiSearchResults(html);
}

export function parseFeiSearchResults(html: string): SourceHit[] {
  const $ = cheerio.load(html);
  const hits: SourceHit[] = [];

  // FEI bruger en tabel med klassen "horseSearchResults" eller en generisk
  // <table> med kolonner: FEI ID, Name, Sex, Year of Birth, Country.
  const tables = $("table").toArray();
  const target = tables.find((el) => {
    const headers = $(el)
      .find("th")
      .toArray()
      .map((th) => squish($(th).text()).toLowerCase());
    return headers.some((h) => h.includes("fei id") || h === "name");
  });
  if (!target) return hits;

  const headers = $(target)
    .find("th")
    .toArray()
    .map((th) => squish($(th).text()).toLowerCase());

  $(target).find("tbody tr, tr").each((_, tr) => {
    const cells = $(tr)
      .find("td")
      .map((_, td) => squish($(td).text()))
      .get();
    if (cells.length === 0) return;

    const get = (...names: string[]): string | undefined => {
      for (const name of names) {
        const idx = headers.findIndex((h) => h.includes(name));
        if (idx >= 0 && cells[idx]) return cells[idx];
      }
      return undefined;
    };

    const feiId = get("fei id", "feiid") ?? cells[0];
    const name = get("name") ?? cells[1] ?? "";
    if (!feiId || !name) return;

    const birthRaw = get("year of birth", "birth", "year");
    const birthYear = birthRaw ? extractYear(birthRaw) : undefined;
    const sexRaw = get("sex");
    const country = get("country", "nation");

    const link = $(tr).find("a").first().attr("href");
    const url = link ? new URL(link, FEI_BASE).toString() : undefined;

    hits.push({
      source: "fei",
      rawId: feiId,
      name,
      birthYear,
      sex: sexFromFeiCode(sexRaw),
      feiId,
      country,
      url,
    });
  });

  return hits;
}

// Hent en specifik hest via FEI ID.
async function fetchFeiHorse(feiId: string): Promise<SourceHit | null> {
  const url = `${FEI_BASE}/Horse/Detail/${encodeURIComponent(feiId)}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": defaultUserAgent(),
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    redirect: "follow",
    cache: "no-store",
  });
  if (!res.ok) return null;
  const html = await res.text();
  return parseFeiHorseDetail(html, feiId);
}

export function parseFeiHorseDetail(
  html: string,
  feiId: string,
): SourceHit | null {
  const $ = cheerio.load(html);
  const name = squish($("h1, .horse-name").first().text());
  if (!name) return null;
  const text = squish($("body").text());
  const birthYear = extractYear(text);
  return {
    source: "fei",
    rawId: feiId,
    name,
    birthYear,
    feiId,
    url: `${FEI_BASE}/Horse/Detail/${feiId}`,
  };
}

function extractYear(value: string): number | undefined {
  const m = value.match(/\b(19|20)\d{2}\b/);
  return m ? Number(m[0]) : undefined;
}

function sexFromFeiCode(value: string | null | undefined): SourceHit["sex"] {
  if (!value) return undefined;
  const v = value.trim().toLowerCase();
  if (v.startsWith("stall") || v === "s" || v === "st") return "stallion";
  if (v.startsWith("geld") || v === "g") return "gelding";
  if (v.startsWith("mare") || v === "m" || v === "f") return "mare";
  return undefined;
}
