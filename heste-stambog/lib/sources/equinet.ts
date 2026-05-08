// Equinet/SEGES scraping-klient.
//
// Equinet kører på Oracle APEX (https://equinet.seges.dk/ords/prod/f?p=1000:2).
// Der findes intet offentligt API, så vi:
//   1. Henter forsiden og parser hele <form id="wwvFlowForm"> som-er
//      (alle hidden inputs, valgte options, hidden constants).
//   2. Identificerer søgefelterne via APEX item-IDs (P2_SOEGETEKST og
//      P2_SOEGEKRITERIE) — APEX genererer i øvrigt navne som p_t09/p_v08
//      der skifter pr. session, så vi MÅ ikke hardcode dem.
//   3. POSTer den fulde form-body til wwv_flow.accept (ikke .show!) og
//      følger 302-redirect til resultatsiden.
//   4. Parser HTML-tabellen.
//
// Verificeret mod et rigtigt request 2026-05 med p_request=SUBMIT og
// p_t10=FIND_HEST_SOEGEKRITERIER som constants.

import * as cheerio from "cheerio";
import { buildCookieHeader, defaultUserAgent, squish } from "../utils";
import type { SourceHit } from "../types";

const EQUINET_BASE =
  process.env.EQUINET_BASE_URL ?? "https://equinet.seges.dk";
const SEARCH_PAGE = `${EQUINET_BASE}/ords/prod/f?p=1000:2`;
const ACCEPT_URL = `${EQUINET_BASE}/ords/prod/wwv_flow.accept`;

// Værdier for søgekriterie-dropdownen. "ident" verificeret via DevTools;
// de andre er kvalificerede gæt baseret på dansk APEX-konvention.
const CRITERION_VALUES: Record<EquinetSearchType, string> = {
  ident: "ident",
  name: "navn",
  chip: "chip",
};

interface ApexFormState {
  cookieHeader: string;
  // Form-felterne i DOM-rækkefølge — vi sender dem alle videre uændret,
  // bortset fra dem brugeren har redigeret.
  fields: Array<[string, string]>;
  // APEX item-id → faktisk form-name (fx "P2_SOEGETEKST" -> "p_t09").
  itemNameById: Map<string, string>;
}

export type EquinetSearchType = "name" | "ident" | "chip";

export interface EquinetSearchOptions {
  type: EquinetSearchType;
  query: string;
}

async function bootstrap(): Promise<ApexFormState> {
  const res = await fetch(SEARCH_PAGE, {
    headers: {
      "User-Agent": defaultUserAgent(),
      "Accept-Language": "da-DK,da;q=0.9,en;q=0.8",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    },
    redirect: "follow",
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(
      `Equinet bootstrap fejlede med status ${res.status} ${res.statusText}`,
    );
  }
  const setCookieRaw =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : (res.headers.get("set-cookie") ?? "");
  const cookieHeader = buildCookieHeader(setCookieRaw);
  const html = await res.text();
  const $ = cheerio.load(html);

  const form = $("form#wwvFlowForm");
  if (form.length === 0) {
    throw new Error("Equinet returnerede ikke en wwvFlowForm — siden har ændret struktur.");
  }

  const fields: Array<[string, string]> = [];
  const itemNameById = new Map<string, string>();

  form.find("input, select, textarea").each((_, el) => {
    const $el = $(el);
    const name = String($el.attr("name") ?? "");
    const id = String($el.attr("id") ?? "");
    if (!name) return;

    if ($el.is("select")) {
      const selected = $el.find("option[selected]").first().attr("value");
      const fallback = $el.find("option").first().attr("value");
      fields.push([name, String(selected ?? fallback ?? "")]);
    } else {
      const type = String($el.attr("type") ?? "text").toLowerCase();
      if (type === "checkbox" || type === "radio") {
        // Kun "checked" inputs bliver submittet.
        if ($el.attr("checked") === undefined) return;
        fields.push([name, String($el.attr("value") ?? "on")]);
      } else if (type === "submit" || type === "button" || type === "image") {
        // Submit-knapper sendes ikke automatisk.
        return;
      } else {
        fields.push([name, String($el.attr("value") ?? "")]);
      }
    }

    if (id) itemNameById.set(id, name);
  });

  return { cookieHeader, fields, itemNameById };
}

export async function searchEquinet(
  opts: EquinetSearchOptions,
): Promise<SourceHit[]> {
  const { html } = await fetchSearchHtml(opts);
  return parseEquinetResults(html);
}

// Returnerer både den parsede liste og den rå HTML — bruges af /api/sources/equinet
// med ?debug=1 så vi kan diagnosticere hvad der faktisk kommer tilbage.
export async function searchEquinetWithRaw(
  opts: EquinetSearchOptions,
): Promise<{ hits: SourceHit[]; html: string; finalUrl: string }> {
  const { html, finalUrl } = await fetchSearchHtml(opts);
  return { hits: parseEquinetResults(html), html, finalUrl };
}

async function fetchSearchHtml(
  opts: EquinetSearchOptions,
): Promise<{ html: string; finalUrl: string }> {
  const session = await bootstrap();

  const textName = session.itemNameById.get("P2_SOEGETEKST");
  const critName = session.itemNameById.get("P2_SOEGEKRITERIE");
  if (!textName) {
    throw new Error(
      "Kunne ikke finde APEX item P2_SOEGETEKST på Equinet-siden.",
    );
  }

  const body = new URLSearchParams();
  let textOverridden = false;
  let critOverridden = false;
  let requestOverridden = false;

  for (const [name, value] of session.fields) {
    if (name === textName && !textOverridden) {
      body.append(name, opts.query);
      textOverridden = true;
    } else if (critName && name === critName && !critOverridden) {
      body.append(name, CRITERION_VALUES[opts.type]);
      critOverridden = true;
    } else if (name === "p_request") {
      body.append(name, "SUBMIT");
      requestOverridden = true;
    } else {
      body.append(name, value);
    }
  }
  if (!requestOverridden) body.append("p_request", "SUBMIT");

  // Manuelt redirect-flow: APEX sætter typisk nye cookies på 302-svaret,
  // som bliver tabt hvis vi lader fetch følge redirectet automatisk.
  const postRes = await fetch(ACCEPT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": defaultUserAgent(),
      Cookie: session.cookieHeader,
      Referer: SEARCH_PAGE,
      Origin: EQUINET_BASE,
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    body,
    redirect: "manual",
    cache: "no-store",
  });

  // Hvis POSTet IKKE er en redirect (fx en fejlside), så læs HTML direkte.
  if (postRes.status >= 200 && postRes.status < 300) {
    const html = await postRes.text();
    return { html, finalUrl: ACCEPT_URL };
  }

  if (postRes.status < 300 || postRes.status >= 400) {
    throw new Error(
      `Equinet søgning fejlede: status ${postRes.status} ${postRes.statusText}`,
    );
  }

  const location = postRes.headers.get("location");
  if (!location) {
    throw new Error(
      `Equinet returnerede ${postRes.status} uden Location-header.`,
    );
  }
  const target = new URL(location, EQUINET_BASE).toString();

  // Saml cookies: dem fra bootstrap + nye fra accept-svaret.
  const newCookieRaw =
    typeof postRes.headers.getSetCookie === "function"
      ? postRes.headers.getSetCookie()
      : (postRes.headers.get("set-cookie") ?? "");
  const newCookieHeader = buildCookieHeader(newCookieRaw);
  const cookieHeader = [session.cookieHeader, newCookieHeader]
    .filter(Boolean)
    .join("; ");

  const getRes = await fetch(target, {
    method: "GET",
    headers: {
      "User-Agent": defaultUserAgent(),
      Cookie: cookieHeader,
      Referer: SEARCH_PAGE,
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    redirect: "follow",
    cache: "no-store",
  });
  if (!getRes.ok) {
    throw new Error(
      `Equinet resultatside fejlede: status ${getRes.status} ${getRes.statusText}`,
    );
  }
  const html = await getRes.text();
  return { html, finalUrl: target };
}

// Parse Equinets resultattabel.
//
// APEX-siden indeholder mange <table>'er (form-layout, header, sidebar osv.),
// så header-baseret tabel-detektion gav falske positives. Den robuste
// signatur er at hest-rækker har et detalje-link med href-pattern
// "f?p=1000:3:...:P3_HEST_ID,P3_HEST_NAVN:<id>,<navn>". Vi finder alle
// sådanne links, går op til deres <tr> og læser cellerne der.
const DETAIL_LINK_RE =
  /f\?p=1000:3:[^"']*P3_HEST_ID,P3_HEST_NAVN:([^,]+),([^"'&)]+)/i;

export function parseEquinetResults(html: string): SourceHit[] {
  // Fjern <script>-blokke så indholdet ikke forurener tekstaflæsninger.
  const cleaned = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  const $ = cheerio.load(cleaned);
  const hits: SourceHit[] = [];

  // Find resultattabellen: den indeholder mindst én <a> med detalje-href.
  const tables = $("table").toArray();
  const resultsTable = tables.find((table) => {
    return $(table)
      .find("a[href]")
      .toArray()
      .some((a) => DETAIL_LINK_RE.test(String($(a).attr("href") ?? "")));
  });
  if (!resultsTable) return hits;

  // Læs headers (lowercase) i kolonnernes rækkefølge.
  const headers: string[] = [];
  $(resultsTable)
    .find("tr")
    .first()
    .find("th, td")
    .each((_, cell) => {
      headers.push(squish($(cell).text()).toLowerCase());
    });

  const colIndex = (...names: string[]): number => {
    for (const name of names) {
      const idx = headers.findIndex((h) => h.includes(name));
      if (idx >= 0) return idx;
    }
    return -1;
  };
  const idxIdent = colIndex("ident");
  const idxNavn = colIndex("navn");
  const idxAvlsforbund = colIndex("avlsforbund", "stambog");
  const idxLand = colIndex("land");

  // Iterér rækker og pluk dem der har et detalje-link.
  const seen = new Set<string>();
  $(resultsTable).find("tr").each((_, tr) => {
    const $tr = $(tr);
    const detailHref = $tr
      .find("a[href]")
      .toArray()
      .map((a) => String($(a).attr("href") ?? ""))
      .find((h) => DETAIL_LINK_RE.test(h));
    if (!detailHref) return;

    const match = detailHref.match(DETAIL_LINK_RE);
    if (!match) return;
    const horseId = decodeURIComponent(match[1]);
    const horseName = decodeURIComponent(match[2]);

    const cells = $tr
      .find("td")
      .toArray()
      .map((td) => squish($(td).text()));
    if (cells.length === 0) return;

    const ident =
      (idxIdent >= 0 ? cells[idxIdent] : undefined) ?? cells[0] ?? "";
    const name =
      (idxNavn >= 0 ? cells[idxNavn] : undefined) ?? horseName;
    const studbook =
      idxAvlsforbund >= 0 ? cells[idxAvlsforbund] : undefined;
    const land = idxLand >= 0 ? cells[idxLand] : "Danmark";

    const dedupKey = ident || horseId;
    if (seen.has(dedupKey)) return;
    seen.add(dedupKey);

    const url = detailHref.startsWith("http")
      ? detailHref
      : new URL(detailHref, EQUINET_BASE).toString();

    hits.push({
      source: "equinet",
      rawId: ident,
      name,
      danishIdent: ident,
      studbook: studbook || undefined,
      country: countryToIso(land),
      url,
    });
  });

  return hits;
}

function countryToIso(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const v = value.trim().toLowerCase();
  if (v.startsWith("danmark") || v === "dk") return "DK";
  if (v.startsWith("tysk") || v === "de") return "DE";
  if (v.startsWith("nederland") || v.startsWith("holland") || v === "nl")
    return "NL";
  if (v.startsWith("svensk") || v === "se") return "SE";
  if (v.startsWith("norsk") || v === "no") return "NO";
  return value;
}

