// FEI-integration mod https://data.fei.org/Horse/Search.aspx.
//
// Søgesiden er ASP.NET WebForms — den svarer ikke på simple GET med
// query-parametre. Flowet er:
//   1. GET Search.aspx → udtrk skjulte tokens (__VIEWSTATE,
//      __EVENTVALIDATION, __VIEWSTATEGENERATOR) + cookies.
//   2. POST samme URL med tokens + søgefeltet (typisk noget i stil med
//      ctl00$ContentPlaceHolder1$txtName) + __EVENTTARGET sat til
//      søge-knappen.
//   3. Parse den genererede tabel.
//
// FEI ændrer feltnavnene jævnligt. Hvis dette pludselig holder op med at
// returnere resultater: åbn Search.aspx i Chrome DevTools → Network → udfør
// en søgning, kopier form-bodyen og afstem feltnavnene nedenfor.

import * as cheerio from "cheerio";
import { buildCookieHeader, defaultUserAgent, squish } from "../utils";
import type { SourceHit } from "../types";

const FEI_BASE = process.env.FEI_BASE_URL ?? "https://data.fei.org";
const SEARCH_URL = `${FEI_BASE}/Horse/Search.aspx`;

export interface FeiSearchOptions {
  query: string;
  feiId?: string;
}

interface AspNetSession {
  cookieHeader: string;
  viewState: string;
  viewStateGenerator: string;
  eventValidation: string;
  // Det rigtige form-feltnavn for søgeinputtet — hentes dynamisk fra siden
  // hvis muligt, ellers falder vi tilbage til de mest almindelige defaults.
  nameField: string;
  feiIdField?: string;
  submitTarget?: string;
}

async function bootstrap(): Promise<AspNetSession> {
  const res = await fetch(SEARCH_URL, {
    headers: {
      "User-Agent": defaultUserAgent(),
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    redirect: "follow",
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(
      `FEI bootstrap fejlede med status ${res.status} ${res.statusText}`,
    );
  }
  const setCookieRaw =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : (res.headers.get("set-cookie") ?? "");
  const cookieHeader = buildCookieHeader(setCookieRaw);
  const html = await res.text();
  const $ = cheerio.load(html);

  const viewState = String(
    $('input[name="__VIEWSTATE"]').first().val() ?? "",
  );
  const viewStateGenerator = String(
    $('input[name="__VIEWSTATEGENERATOR"]').first().val() ?? "",
  );
  const eventValidation = String(
    $('input[name="__EVENTVALIDATION"]').first().val() ?? "",
  );

  if (!viewState) {
    throw new Error(
      "Kunne ikke finde __VIEWSTATE på FEI Search.aspx — siden har sandsynligvis ændret struktur.",
    );
  }

  // Find input-feltet til navn-søgning. ASP.NET prefix er typisk
  // "ctl00$ContentPlaceHolder1$" + et meningsfuldt suffix.
  const inputs = $("input[type='text'], input:not([type])").toArray();
  let nameField = "";
  let feiIdField: string | undefined;
  for (const el of inputs) {
    const n = String($(el).attr("name") ?? "");
    const id = String($(el).attr("id") ?? "");
    if (!n) continue;
    const lower = (id + " " + n).toLowerCase();
    if (lower.includes("name") && !nameField) nameField = n;
    if (lower.includes("fei") || lower.includes("feinr")) feiIdField = n;
  }
  if (!nameField) nameField = "ctl00$ContentPlaceHolder1$txtName";

  // Find submit-knappen så vi kan sætte __EVENTTARGET korrekt.
  const searchButton = $(
    "input[type='submit'][value*='Search' i], input[type='submit'][value*='Søg' i], button[type='submit']",
  )
    .first()
    .attr("name");

  return {
    cookieHeader,
    viewState,
    viewStateGenerator,
    eventValidation,
    nameField,
    feiIdField,
    submitTarget: searchButton,
  };
}

export async function searchFei(opts: FeiSearchOptions): Promise<SourceHit[]> {
  if (opts.feiId && !opts.query) {
    const direct = await fetchFeiHorse(opts.feiId);
    return direct ? [direct] : [];
  }

  const session = await bootstrap();

  const body = new URLSearchParams();
  body.set("__VIEWSTATE", session.viewState);
  if (session.viewStateGenerator)
    body.set("__VIEWSTATEGENERATOR", session.viewStateGenerator);
  if (session.eventValidation)
    body.set("__EVENTVALIDATION", session.eventValidation);
  if (opts.feiId && session.feiIdField) {
    body.set(session.feiIdField, opts.feiId);
  }
  body.set(session.nameField, opts.query ?? "");
  if (session.submitTarget) body.set(session.submitTarget, "Search");

  const res = await fetch(SEARCH_URL, {
    method: "POST",
    headers: {
      "User-Agent": defaultUserAgent(),
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: session.cookieHeader,
      Referer: SEARCH_URL,
      Origin: FEI_BASE,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    body,
    redirect: "follow",
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(
      `FEI søgning fejlede med status ${res.status} ${res.statusText} (felt: ${session.nameField})`,
    );
  }
  const html = await res.text();
  return parseFeiSearchResults(html);
}

export function parseFeiSearchResults(html: string): SourceHit[] {
  const $ = cheerio.load(html);
  const hits: SourceHit[] = [];

  // FEI bruger en <table> med kolonner: FEI ID, Name, Sex, Year of Birth, Country.
  const tables = $("table").toArray();
  const target = tables.find((el) => {
    const headers = $(el)
      .find("th")
      .toArray()
      .map((th) => squish($(th).text()).toLowerCase());
    return headers.some(
      (h) => h.includes("fei id") || h === "name" || h.includes("horse"),
    );
  });
  if (!target) return hits;

  const headers = $(target)
    .find("th")
    .toArray()
    .map((th) => squish($(th).text()).toLowerCase());

  $(target)
    .find("tbody tr, tr")
    .each((_, tr) => {
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
      const name = get("name", "horse") ?? cells[1] ?? "";
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

// Hent en specifik hest via FEI ID. FEI eksponerer typisk Horse/Detail.aspx?id=...
async function fetchFeiHorse(feiId: string): Promise<SourceHit | null> {
  const url = `${FEI_BASE}/Horse/Detail.aspx?id=${encodeURIComponent(feiId)}`;
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
  const name = squish($("h1, .horse-name, #lblHorseName").first().text());
  if (!name) return null;
  const text = squish($("body").text());
  const birthYear = extractYear(text);
  return {
    source: "fei",
    rawId: feiId,
    name,
    birthYear,
    feiId,
    url: `${FEI_BASE}/Horse/Detail.aspx?id=${feiId}`,
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
