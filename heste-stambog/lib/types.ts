// Delte typer for hele applikationen.

export type Sex = "stallion" | "mare" | "gelding";

export type SourceName = "equinet" | "fei" | "ueln" | "wbfsh" | "drf";

export type SearchType = "all" | "name" | "ident" | "chip" | "feiid" | "ueln";

export type VerificationStatus =
  | "verified"
  | "partial"
  | "conflict"
  | "unknown";

export type FlagSeverity = "info" | "warning" | "conflict";

export interface LineageEntry {
  name: string;
  ueln?: string;
  studbook?: string;
  birthYear?: number;
}

export interface DataSource {
  name: SourceName;
  fetchedAt: string;
  status: "ok" | "not_found" | "error";
  rawId?: string;
  message?: string;
}

export interface VerificationFlag {
  field: string;
  severity: FlagSeverity;
  message: string;
  sources: SourceName[];
}

export interface CompetitionResult {
  date: string;
  event: string;
  discipline: string;
  level: string;
  score: number;
  placement?: number;
  rider: string;
  source: SourceName;
}

export interface VaccinationRecord {
  type: string;
  date: string;
  validUntil?: string;
  vet?: string;
}

export interface Horse {
  id: string;
  ueln?: string;
  feiId?: string;
  danishIdent?: string;
  chipNumber?: string;
  name: string;
  birthYear?: number;
  sex?: Sex;
  color?: string;
  studbook?: string;
  studBookNumber?: string;
  sire?: LineageEntry;
  dam?: LineageEntry;
  damSire?: LineageEntry;
  owner?: string;
  trainer?: string;
  country?: string;
  passportStatus?: "valid" | "expired" | "unknown";
  passportIssuingOrg?: string;
  vaccinations?: VaccinationRecord[];
  competitionHistory?: CompetitionResult[];
  currentRanking?: number;
  highestScore?: number;
  sources: DataSource[];
  verificationStatus: VerificationStatus;
  verificationFlags: VerificationFlag[];
  lastUpdated: string;
}

// Resultat fra én enkelt kilde — minimum nok til at vise i søgeresultatlisten.
export interface SourceHit {
  source: SourceName;
  rawId: string;
  name: string;
  birthYear?: number;
  sex?: Sex;
  studbook?: string;
  studBookNumber?: string;
  ueln?: string;
  feiId?: string;
  danishIdent?: string;
  chipNumber?: string;
  country?: string;
  owner?: string;
  url?: string;
}

export interface HorseSearchResult {
  // Kombineret nøgle: <source>:<rawId>, fx "equinet:DK20051234".
  id: string;
  name: string;
  birthYear?: number;
  sex?: Sex;
  studbook?: string;
  ueln?: string;
  feiId?: string;
  danishIdent?: string;
  chipNumber?: string;
  country?: string;
  hits: SourceHit[];
}

export interface VerificationFieldComparison {
  field: string;
  values: { source: SourceName; value: string | number | null }[];
  agreement: "match" | "conflict" | "missing";
}

export interface VerificationReport {
  horseId: string;
  status: VerificationStatus;
  flags: VerificationFlag[];
  fields: VerificationFieldComparison[];
  generatedAt: string;
}
