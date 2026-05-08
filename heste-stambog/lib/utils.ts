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
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// Returnér en User-Agent vi kan genbruge på tværs af scrapere.
// Vi sletter ikke vores identitet for sjov — flere registre 403'er
// hvis User-Agent ser "for-server-agtigt" ud (Cloudflare).
export function defaultUserAgent(): string {
  return USER_AGENT;
}

// Browser-lignende headers for sites der bruger Cloudflare bot-protection.
export function browserishHeaders(referer?: string): Record<string, string> {
  return {
    "User-Agent": USER_AGENT,
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "da-DK,da;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    "Sec-Ch-Ua":
      '"Chromium";v="124", "Not.A/Brand";v="24", "Google Chrome";v="124"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"macOS"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": referer ? "same-origin" : "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
    ...(referer ? { Referer: referer } : {}),
  };
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
// UELN: 15 tegn der starter med 3-cifret ISO-landekode. Standarden er kun
// cifre, men flere registre (også DK-equivalente) bruger varianter med
// indlejrede bogstaver, fx 208333DW2232349.
// FEI ID: 3 bogstaver + cifre.
// Chip: 15 cifre.
// Dansk ident: DK + cifre, eller 8-11 cifre.
export function detectSearchType(
  query: string,
): Exclude<SearchType, "all"> {
  const q = query.replace(/\s+/g, "").toUpperCase();
  // ISO-3 land-prefixes vi kender til
  const ISO3 =
    /^(208|276|250|380|528|056|578|752|826|040|642|724|620|703)/;
  if (q.length === 15 && ISO3.test(q)) return "ueln";
  if (/^[0-9]{15}$/.test(q)) return "chip";
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
