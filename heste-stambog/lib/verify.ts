// Verifikationslogik: sammenlign data fra forskellige kilder og udled
// status + flags pr. felt.

import type {
  Horse,
  SourceName,
  VerificationFieldComparison,
  VerificationFlag,
  VerificationReport,
  VerificationStatus,
} from "./types";

interface SourcedValue {
  source: SourceName;
  value: string | number | null;
}

const FIELDS_TO_CHECK: { key: keyof Horse; label: string }[] = [
  { key: "name", label: "name" },
  { key: "birthYear", label: "birthYear" },
  { key: "sex", label: "sex" },
  { key: "ueln", label: "ueln" },
  { key: "chipNumber", label: "chipNumber" },
  { key: "studbook", label: "studbook" },
];

// Givet en samlet hest og det rå data pr. kilde, beregn et VerificationReport.
export function buildVerificationReport(
  horse: Horse,
  sourceData: Partial<Record<SourceName, Partial<Horse>>>,
): VerificationReport {
  const fields: VerificationFieldComparison[] = [];
  const flags: VerificationFlag[] = [];

  for (const { key, label } of FIELDS_TO_CHECK) {
    const values: SourcedValue[] = [];
    for (const [src, data] of Object.entries(sourceData) as [
      SourceName,
      Partial<Horse>,
    ][]) {
      const raw = data[key];
      if (raw === undefined || raw === null || raw === "") continue;
      values.push({ source: src, value: raw as string | number });
    }

    if (values.length === 0) {
      fields.push({ field: label, values: [], agreement: "missing" });
      continue;
    }

    const normalized = values.map((v) => normalize(v.value));
    const allMatch = normalized.every((v) => v === normalized[0]);
    if (allMatch) {
      fields.push({ field: label, values, agreement: "match" });
    } else {
      fields.push({ field: label, values, agreement: "conflict" });
      flags.push({
        field: label,
        severity: "conflict",
        message: `Uoverensstemmelse på "${label}" mellem kilder: ${values
          .map((v) => `${v.source}=${v.value}`)
          .join(", ")}`,
        sources: values.map((v) => v.source),
      });
    }
  }

  // Manglende kilder eller manglende ID-numre udløser warnings.
  if (horse.sources.length < 2) {
    flags.push({
      field: "sources",
      severity: "warning",
      message: "Kun én datakilde fundet — krydscheck er begrænset.",
      sources: horse.sources.map((s) => s.name),
    });
  }
  if (!horse.ueln && !horse.feiId && !horse.danishIdent) {
    flags.push({
      field: "identifiers",
      severity: "warning",
      message: "Ingen unikke ID-numre (UELN, FEI ID eller dansk ident) fundet.",
      sources: [],
    });
  }

  const status = deriveStatus(fields, flags, horse.sources.length);

  return {
    horseId: horse.id,
    status,
    flags,
    fields,
    generatedAt: new Date().toISOString(),
  };
}

function normalize(value: string | number | null): string {
  if (value === null) return "";
  if (typeof value === "number") return String(value);
  return value.toString().trim().toLowerCase();
}

function deriveStatus(
  fields: VerificationFieldComparison[],
  flags: VerificationFlag[],
  sourceCount: number,
): VerificationStatus {
  if (flags.some((f) => f.severity === "conflict")) return "conflict";
  const matched = fields.filter((f) => f.agreement === "match").length;
  if (sourceCount >= 2 && matched >= 3) return "verified";
  if (sourceCount >= 1) return "partial";
  return "unknown";
}
