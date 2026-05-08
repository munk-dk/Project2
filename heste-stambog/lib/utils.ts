import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { SearchType, Sex } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("da-DK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 HesteStambogBot/0.1";

// Returnér en User-Agent vi kan genbruge på tværs af scrapere.
export function defaultUserAgent(): string {
  return USER_AGENT;
}

// Saml flere "set-cookie" header-værdier til en enkelt "Cookie:"-streng.
// Next.js samler dem normalt med komma — vi splitter forsigtigt så vi ikke
// brækker værdier der selv indeholder kommaer (fx "Expires=Thu, 01 Jan 2099").
export function buildCookieHeader(setCookies: string[] | string | null): string {
  if (!setCookies) return "";
  const arr = Array.isArray(setCookies)
    ? setCookies
    : splitSetCookieHeader(setCookies);
  const pairs: string[] = [];
  const seen = new Set<string>();
  for (const sc of arr) {
    const first = sc.split(";")[0]?.trim();
    if (!first) continue;
    const name = first.split("=")[0];
    if (!name || seen.has(name)) continue;
    seen.add(name);
    pairs.push(first);
  }
  return pairs.join("; ");
}

// Split en samlet "set-cookie" header-streng tilbage til separate cookies.
function splitSetCookieHeader(header: string): string[] {
  const out: string[] = [];
  let buf = "";
  const parts = header.split(",");
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    // En komma der efterfølges af "<dag>" hører til Expires-attributten.
    if (/^\s*(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/.test(part) && buf) {
      buf += "," + part;
    } else {
      if (buf) out.push(buf);
      buf = part;
    }
  }
  if (buf) out.push(buf);
  return out.map((s) => s.trim()).filter(Boolean);
}

// Rens en streng for ekstra mellemrum og linjeskift.
export function squish(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/\s+/g, " ").trim();
}

// Kategoriser et søgeudtryk hvis brugeren har valgt "all".
// UELN: 15 cifre med ISO-3 land-prefix.
// FEI ID: 9-10 alfanumeriske, ofte 3 bogstaver + cifre.
// Chip: 15 cifre.
// Dansk ident: typisk DK + cifre, eller 8-11 cifre.
export function detectSearchType(
  query: string,
): Exclude<SearchType, "all"> {
  const q = query.replace(/\s+/g, "").toUpperCase();
  if (/^[0-9]{15}$/.test(q)) {
    // 208=DK, 276=DE, 250=FR, 528=NL, 056=BE, 752=SE, 380=IT, 826=GB, 040=AT
    if (/^(208|276|250|380|528|056|578|752|826|040|642)/.test(q)) return "ueln";
    return "chip";
  }
  if (/^[A-Z]{3}[0-9]{6,}$/.test(q)) return "feiid";
  if (/^DK[0-9]{6,}$/i.test(q) || /^[0-9]{8,11}$/.test(q)) return "ident";
  return "name";
}

export function compactObject<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out as T;
}

export function sexFromCode(code: string | null | undefined): Sex | undefined {
  if (!code) return undefined;
  const c = code.trim().toLowerCase();
  if (c.startsWith("hingst") || c.startsWith("stallion") || c === "s")
    return "stallion";
  if (c.startsWith("vall") || c === "g" || c.startsWith("geld"))
    return "gelding";
  if (c.startsWith("hop") || c.startsWith("mare") || c === "m" || c === "f")
    return "mare";
  return undefined;
}
