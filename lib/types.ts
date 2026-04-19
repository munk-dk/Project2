// Typer der dækker de ODA-felter vi faktisk bruger.
// Det fulde skema er dokumenteret på https://oda.ft.dk/Help

export type VoteType = 1 | 2 | 3 | 4;
// 1 = for, 2 = imod, 3 = fravær, 4 = hverken for eller imod (afstår)

export const VOTE_LABEL: Record<VoteType, string> = {
  1: "For",
  2: "Imod",
  3: "Fraværende",
  4: "Afstår",
};

export const VOTE_TONE: Record<VoteType, "for" | "against" | "absent" | "abstain"> = {
  1: "for",
  2: "against",
  3: "absent",
  4: "abstain",
};

export interface OdaActor {
  id: number;
  navn: string;
  fornavn?: string | null;
  efternavn?: string | null;
  typeid: number;
  gruppenavnkort?: string | null;
  startdato?: string | null;
  slutdato?: string | null;
  biografi?: string | null;
  opdateringsdato?: string | null;
}

export interface OdaCase {
  id: number;
  titel: string;
  titelkort?: string | null;
  resume?: string | null;
  nummer?: string | null;
  typeid?: number;
  kategoriid?: number | null;
  statusid?: number | null;
  opdateringsdato?: string | null;
}

export interface OdaCaseStep {
  id: number;
  sagid?: number | null;
  titel?: string | null;
  typeid?: number | null;
  Sag?: OdaCase | null;
}

export interface OdaVoting {
  id: number;
  konklusion?: string | null;
  vedtaget?: boolean | null;
  kommentar?: string | null;
  mødeid?: number | null;
  typeid?: number | null;
  sagstrinid?: number | null;
  opdateringsdato?: string | null;
  Sag?: OdaCase | null;
  Sagstrin?: OdaCaseStep | null;
  Stemme?: OdaVote[];
}

export interface OdaVote {
  id: number;
  typeid: VoteType;
  afstemningid: number;
  aktørid: number;
  opdateringsdato?: string | null;
  Aktør?: OdaActor | null;
  Afstemning?: OdaVoting | null;
}

export interface VoteStats {
  for: number;
  against: number;
  abstain: number;
  absent: number;
  total: number;
}

export interface PartyVoteStats extends VoteStats {
  party: string;
}
