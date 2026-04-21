// Analytics helpers: beregn parti-DNA, rebeller og enigheds-matrix.

import type { OdaVoting, PartyVoteStats, VoteType } from "./types";
import { resolveParty } from "./parties";

export type BlocVote = "for" | "against" | "split" | "absent";

// Udregn et partis bloc-stemme for en given afstemning.
// "split" = ingen klar majoritet. "absent" = ingen tilstedeværende.
export function partyBlocVote(
  voting: OdaVoting,
  partyKey: string,
): { bloc: BlocVote; breakdown: PartyVoteStats } {
  const row: PartyVoteStats = {
    party: partyKey,
    for: 0,
    against: 0,
    abstain: 0,
    absent: 0,
    total: 0,
  };
  for (const stemme of voting.Stemme ?? []) {
    if (resolveParty(stemme.Aktør?.gruppenavnkort).key !== partyKey) continue;
    if (stemme.typeid === 1) row.for++;
    else if (stemme.typeid === 2) row.against++;
    else if (stemme.typeid === 3) row.absent++;
    else if (stemme.typeid === 4) row.abstain++;
    row.total++;
  }
  const present = row.for + row.against + row.abstain;
  let bloc: BlocVote = "absent";
  if (present === 0) bloc = "absent";
  else if (row.for > row.against && row.for > row.abstain) bloc = "for";
  else if (row.against > row.for && row.against > row.abstain) bloc = "against";
  else bloc = "split";
  return { bloc, breakdown: row };
}

// Beregn hvilke partier der findes i datasættet.
export function distinctParties(votings: OdaVoting[]): string[] {
  const set = new Set<string>();
  for (const v of votings) {
    for (const stemme of v.Stemme ?? []) {
      const key = resolveParty(stemme.Aktør?.gruppenavnkort).key;
      if (key !== "UNKNOWN") set.add(key);
    }
  }
  return Array.from(set);
}

// Enigheds-matrix: procent af afstemninger hvor parti A og B stemte ens
// (begge for, begge imod eller begge splittet). Absent tælles ikke.
export interface AgreementCell {
  a: string;
  b: string;
  agree: number;
  compared: number;
  percent: number;
}

export function agreementMatrix(
  votings: OdaVoting[],
  parties: string[],
): AgreementCell[] {
  const cells: AgreementCell[] = [];
  for (const a of parties) {
    for (const b of parties) {
      if (a === b) {
        cells.push({ a, b, agree: 0, compared: 0, percent: 100 });
        continue;
      }
      let agree = 0;
      let compared = 0;
      for (const v of votings) {
        const ba = partyBlocVote(v, a).bloc;
        const bb = partyBlocVote(v, b).bloc;
        if (ba === "absent" || bb === "absent") continue;
        compared++;
        if (ba === bb) agree++;
      }
      const percent = compared === 0 ? 0 : Math.round((agree / compared) * 100);
      cells.push({ a, b, agree, compared, percent });
    }
  }
  return cells;
}

// Find MF'ere der stemte mod deres partis flertal i en given afstemning.
export interface Rebel {
  actorId: number;
  actorName: string;
  party: string;
  voteType: VoteType;
  partyMajority: BlocVote;
}

export function findRebels(voting: OdaVoting): Rebel[] {
  const rebels: Rebel[] = [];
  // Udregn parti-majoritet først
  const partyBlocs = new Map<string, BlocVote>();
  const partyKeysInVote = new Set<string>();
  for (const stemme of voting.Stemme ?? []) {
    partyKeysInVote.add(resolveParty(stemme.Aktør?.gruppenavnkort).key);
  }
  for (const key of partyKeysInVote) {
    if (key === "UNKNOWN") continue;
    partyBlocs.set(key, partyBlocVote(voting, key).bloc);
  }

  for (const stemme of voting.Stemme ?? []) {
    if (stemme.typeid === 3) continue; // Fraværende tæller ikke som rebel
    const partyKey = resolveParty(stemme.Aktør?.gruppenavnkort).key;
    if (partyKey === "UNKNOWN") continue;
    const bloc = partyBlocs.get(partyKey);
    if (!bloc || bloc === "split" || bloc === "absent") continue;
    const memberVote: BlocVote | null =
      stemme.typeid === 1
        ? "for"
        : stemme.typeid === 2
          ? "against"
          : stemme.typeid === 4
            ? null // afstår regnes ikke som rebel
            : null;
    if (memberVote && memberVote !== bloc) {
      rebels.push({
        actorId: stemme.aktørid,
        actorName: stemme.Aktør?.navn ?? `#${stemme.aktørid}`,
        party: partyKey,
        voteType: stemme.typeid as VoteType,
        partyMajority: bloc,
      });
    }
  }
  return rebels;
}

// Tæl afstemninger pr. måned for tidslinjer.
export function votingsByMonth(
  votings: OdaVoting[],
): { month: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const v of votings) {
    const d = v.opdateringsdato;
    if (!d) continue;
    const month = d.slice(0, 7); // YYYY-MM
    counts.set(month, (counts.get(month) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));
}

// Find det mest aktive parti (flest stemmer afgivet).
export function mostActiveParty(votings: OdaVoting[]): string | null {
  const counts = new Map<string, number>();
  for (const v of votings) {
    for (const stemme of v.Stemme ?? []) {
      if (stemme.typeid === 3) continue; // spring fraværende over
      const key = resolveParty(stemme.Aktør?.gruppenavnkort).key;
      if (key === "UNKNOWN") continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [key, count] of counts) {
    if (count > bestCount) {
      best = key;
      bestCount = count;
    }
  }
  return best;
}
