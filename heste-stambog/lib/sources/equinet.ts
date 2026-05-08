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

// Parse den returnerede HTML. APEX genererer en interaktiv rapport-tabel.
// Vi accepterer at struktur kan ændres, og forsøger at læse <table> med en
// header-række der matcher de kendte kolonnenavne.
export function parseEquinetResults(html: string): SourceHit[] {
  const $ = cheerio.load(html);
  const hits: SourceHit[] = [];

  const tables = $("table").toArray();
  const target = tables.find((el) => {
    const headers = $(el)
      .find("th, thead td")
      .toArray()
      .map((th) => squish($(th).text()).toLowerCase());
    return headers.some(
      (h) =>
        h.includes("ident") ||
        h.includes("navn") ||
        h.includes("chip") ||
        h.includes("hest"),
    );
  });
  if (!target) return hits;

  const headers = $(target)
    .find("th, thead td")
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

      const ident = get("ident") ?? cells[0];
      const name = get("navn", "name") ?? cells[1] ?? "";
      if (!name && !ident) return;

      const birthRaw = get("født", "fodt", "year");
      const birthYear = birthRaw ? extractYear(birthRaw) : undefined;
      const sexRaw = get("køn", "kon", "sex");
      const chip = get("chip");
      const studbook = get("stambog", "studbook");

      const link = $(tr).find("a").first().attr("href");
      const url = link ? new URL(link, EQUINET_BASE).toString() : undefined;

      hits.push({
        source: "equinet",
        rawId: ident,
        name,
        birthYear,
        sex: sexFromDanishCode(sexRaw),
        chipNumber: chip,
        danishIdent: ident,
        studbook,
        country: "DK",
        url,
      });
    });

  return hits;
}

function extractYear(value: string): number | undefined {
  const m = value.match(/\b(19|20)\d{2}\b/);
  return m ? Number(m[0]) : undefined;
}

function sexFromDanishCode(
  value: string | null | undefined,
): SourceHit["sex"] {
  if (!value) return undefined;
  const v = value.trim().toLowerCase();
  if (v.startsWith("hingst") || v === "h" || v === "s") return "stallion";
  if (v.startsWith("vall") || v === "v" || v === "g") return "gelding";
  if (v.startsWith("hop") || v === "ho" || v === "m" || v === "f")
    return "mare";
  return undefined;
}
