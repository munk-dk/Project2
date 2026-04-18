// Supabase-caching lag. Hvis Supabase ikke er konfigureret falder vi gracefully
// tilbage til direkte ODA-opslag. Ingen hårde fejl.

import { getSupabase } from "./supabase";
import type { OdaActor, OdaCase } from "./types";

const MEMBER_TTL_MS = 24 * 60 * 60 * 1000; // 24 timer

export async function getCachedMember(id: number): Promise<OdaActor | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("members")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  const age = Date.now() - new Date(data.synced_at).getTime();
  if (age > MEMBER_TTL_MS) return null;
  return {
    id: data.id,
    navn: data.navn,
    fornavn: data.fornavn,
    efternavn: data.efternavn,
    typeid: 5,
    gruppenavnkort: data.party,
    biografi: data.biografi,
    startdato: data.startdato,
    slutdato: data.slutdato,
    opdateringsdato: data.opdateringsdato,
  };
}

export async function cacheMember(actor: OdaActor): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from("members").upsert({
    id: actor.id,
    navn: actor.navn,
    fornavn: actor.fornavn ?? null,
    efternavn: actor.efternavn ?? null,
    party: actor.gruppenavnkort ?? null,
    biografi: actor.biografi ?? null,
    startdato: actor.startdato ?? null,
    slutdato: actor.slutdato ?? null,
    opdateringsdato: actor.opdateringsdato ?? null,
    synced_at: new Date().toISOString(),
  });
}

export async function cacheCase(kase: OdaCase, tags: string[]): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from("cases").upsert({
    id: kase.id,
    titel: kase.titel,
    titelkort: kase.titelkort ?? null,
    resume: kase.resume ?? null,
    nummer: kase.nummer ?? null,
    tags,
    opdateringsdato: kase.opdateringsdato ?? null,
    synced_at: new Date().toISOString(),
  });
}

export async function searchCachedCasesByTag(
  tag: string,
  limit = 50,
): Promise<OdaCase[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("cases")
    .select("*")
    .contains("tags", [tag.toLowerCase()])
    .limit(limit);
  if (error || !data) return [];
  return data.map((d) => ({
    id: d.id,
    titel: d.titel,
    titelkort: d.titelkort,
    resume: d.resume,
    nummer: d.nummer,
    opdateringsdato: d.opdateringsdato,
  }));
}
