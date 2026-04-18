// Danske partier: forkortelser, officielle navne og farver.
// Farver bruges kun til partitags - UI er i øvrigt neutralt.

export type PartyKey =
  | "S"
  | "V"
  | "SF"
  | "EL"
  | "RV"
  | "KF"
  | "DF"
  | "LA"
  | "M"
  | "DD"
  | "ALT"
  | "UFG"
  | "UNKNOWN";

export interface PartyInfo {
  key: PartyKey;
  short: string;
  name: string;
  color: string;
  textColor: string;
}

export const PARTIES: Record<PartyKey, PartyInfo> = {
  S: { key: "S", short: "S", name: "Socialdemokratiet", color: "#A82721", textColor: "#ffffff" },
  V: { key: "V", short: "V", name: "Venstre", color: "#254F85", textColor: "#ffffff" },
  SF: { key: "SF", short: "SF", name: "Socialistisk Folkeparti", color: "#E07EA8", textColor: "#1f2937" },
  EL: { key: "EL", short: "EL", name: "Enhedslisten", color: "#9C1F2E", textColor: "#ffffff" },
  RV: { key: "RV", short: "RV", name: "Radikale Venstre", color: "#733280", textColor: "#ffffff" },
  KF: { key: "KF", short: "KF", name: "Det Konservative Folkeparti", color: "#12683C", textColor: "#ffffff" },
  DF: { key: "DF", short: "DF", name: "Dansk Folkeparti", color: "#EAC73E", textColor: "#1f2937" },
  LA: { key: "LA", short: "LA", name: "Liberal Alliance", color: "#3C5FA8", textColor: "#ffffff" },
  M: { key: "M", short: "M", name: "Moderaterne", color: "#8BB8E8", textColor: "#1f2937" },
  DD: { key: "DD", short: "DD", name: "Danmarksdemokraterne", color: "#C95A0B", textColor: "#ffffff" },
  ALT: { key: "ALT", short: "ALT", name: "Alternativet", color: "#2B8738", textColor: "#ffffff" },
  UFG: { key: "UFG", short: "UFG", name: "Uden for folketingsgrupperne", color: "#6B7280", textColor: "#ffffff" },
  UNKNOWN: { key: "UNKNOWN", short: "?", name: "Ukendt", color: "#9CA3AF", textColor: "#ffffff" },
};

const ALIASES: Record<string, PartyKey> = {
  "socialdemokratiet": "S",
  "socialdemokratiet (s)": "S",
  "s": "S",
  "venstre": "V",
  "venstre, danmarks liberale parti": "V",
  "v": "V",
  "sf": "SF",
  "socialistisk folkeparti": "SF",
  "enhedslisten": "EL",
  "enhedslisten - de rød-grønne": "EL",
  "el": "EL",
  "ø": "EL",
  "radikale venstre": "RV",
  "det radikale venstre": "RV",
  "rv": "RV",
  "b": "RV",
  "det konservative folkeparti": "KF",
  "konservative": "KF",
  "kf": "KF",
  "c": "KF",
  "dansk folkeparti": "DF",
  "df": "DF",
  "o": "DF",
  "liberal alliance": "LA",
  "la": "LA",
  "i": "LA",
  "moderaterne": "M",
  "m": "M",
  "danmarksdemokraterne": "DD",
  "danmarksdemokraterne - inger støjberg": "DD",
  "dd": "DD",
  "alternativet": "ALT",
  "alt": "ALT",
  "å": "ALT",
  "uden for folketingsgrupperne": "UFG",
  "ufg": "UFG",
};

export function resolveParty(input?: string | null): PartyInfo {
  if (!input) return PARTIES.UNKNOWN;
  const key = ALIASES[input.trim().toLowerCase()];
  if (key) return PARTIES[key];
  // try looking for the short letter token in the beginning
  const first = input.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  if (first && ALIASES[first]) return PARTIES[ALIASES[first]];
  return { ...PARTIES.UNKNOWN, short: input.slice(0, 3).toUpperCase(), name: input };
}
