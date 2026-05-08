// Equinet/SEGES scraping-klient.
//
// Equinet kører på Oracle APEX (https://equinet.seges.dk/ords/prod/f?p=1000:2).
// Der findes intet offentligt API, så vi:
//   1. Henter forsiden og udtrækker APEX session-tokens (p_instance, p_flow_id,
//      p_flow_step_id, p_page_submission_id) samt cookies.
//   2. POSTer søgekriterierne til wwv_flow.show med samme session.
//   3. Parser HTML-tabellen med cheerio.
//
// Vigtigt: feltnavnene (P2_SOEGEKRITERIE etc.) skal verificeres ved at
// inspicere et rigtigt netværksrequest i DevTools på equinet-siden. APEX
// genererer ofte item-navne pr. side så de kan variere.

import * as cheerio from "cheerio";
import { buildCookieHeader, defaultUserAgent, squish } from "../utils";
import type { SourceHit } from "../types";

const EQUINET_BASE =
  process.env.EQUINET_BASE_URL ?? "https://equinet.seges.dk";
const SEARCH_PAGE = `${EQUINET_BASE}/ords/prod/f?p=1000:2`;
const FLOW_SHOW = `${EQUINET_BASE}/ords/prod/wwv_flow.show`;

interface ApexSession {
  cookieHeader: string;
  pInstance: string;
  pFlowId: string;
  pFlowStepId: string;
  pPageSubmissionId?: string;
  ajaxIdentifier?: string;
}

export type EquinetSearchType = "name" | "ident" | "chip";

export interface EquinetSearchOptions {
  type: EquinetSearchType;
  query: string;
}

// Hent session-tokens og cookies fra forsiden.
async function bootstrapSession(): Promise<ApexSession> {
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

  const pInstance = String(
    $('input[name="p_instance"]').first().val() ?? "",
  );
  const pFlowId = String($('input[name="p_flow_id"]').first().val() ?? "");
  const pFlowStepId = String(
    $('input[name="p_flow_step_id"]').first().val() ?? "",
  );
  const pPageSubmissionId = String(
    $('input[name="p_page_submission_id"]').first().val() ?? "",
  );
  // APEX gemmer også et ajax_identifier til Page Submit-AJAX kald.
  const ajaxMatch = html.match(/"ajaxIdentifier"\s*:\s*"([^"]+)"/);

  if (!pInstance || !pFlowId || !pFlowStepId) {
    throw new Error("Kunne ikke udtrække APEX session-tokens fra Equinet");
  }

  return {
    cookieHeader,
    pInstance,
    pFlowId,
    pFlowStepId,
    pPageSubmissionId: pPageSubmissionId || undefined,
    ajaxIdentifier: ajaxMatch?.[1],
  };
}

// Map vores søgetype til APEX-feltnavne. Disse antages at matche
// formfelterne på siden — verificér med DevTools på equinet.seges.dk.
function searchFieldFor(type: EquinetSearchType): string {
  switch (type) {
    case "name":
      return "NAVN";
    case "ident":
      return "IDENT";
    case "chip":
      return "CHIP";
  }
}

export async function searchEquinet(
  opts: EquinetSearchOptions,
): Promise<SourceHit[]> {
  const session = await bootstrapSession();

  const body = new URLSearchParams({
    p_flow_id: session.pFlowId,
    p_flow_step_id: session.pFlowStepId,
    p_instance: session.pInstance,
    p_request: "SEARCH",
    P2_SOEGEKRITERIE: searchFieldFor(opts.type),
    P2_SOEGETEKST: opts.query,
  });
  if (session.pPageSubmissionId) {
    body.set("p_page_submission_id", session.pPageSubmissionId);
  }

  const res = await fetch(FLOW_SHOW, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": defaultUserAgent(),
      Cookie: session.cookieHeader,
      Referer: SEARCH_PAGE,
      Origin: EQUINET_BASE,
    },
    body,
    redirect: "follow",
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(
      `Equinet søgning fejlede med status ${res.status} ${res.statusText}`,
    );
  }
  const html = await res.text();
  return parseEquinetResults(html);
}

// Parse den returnerede HTML. APEX genererer en interaktiv rapport-tabel.
// Vi accepterer at struktur kan ændres, og forsøger at læse <table> med en
// header-række der matcher de kendte kolonnenavne (Ident, Navn, Født, Køn,
// Chip, Stambog).
export function parseEquinetResults(html: string): SourceHit[] {
  const $ = cheerio.load(html);
  const hits: SourceHit[] = [];

  // Find første tabel hvor header-rækken indeholder "Ident" eller "Navn".
  const tables = $("table").toArray();
  const target = tables.find((el) => {
    const headers = $(el)
      .find("th, thead td")
      .toArray()
      .map((th) => squish($(th).text()).toLowerCase());
    return headers.some((h) => h.includes("ident") || h.includes("navn"));
  });
  if (!target) return hits;

  const headers = $(target)
    .find("th, thead td")
    .toArray()
    .map((th) => squish($(th).text()).toLowerCase());

  $(target).find("tbody tr").each((_, tr) => {
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

    // APEX-rapporter har som regel et detalje-link i ident-kolonnen.
    const link = $(tr).find("a").first().attr("href");
    const url = link
      ? new URL(link, EQUINET_BASE).toString()
      : undefined;

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
