import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let cached: SupabaseClient | null = null;

// Returnerer en Supabase-klient hvis env er sat, ellers null.
// Appen virker uden Supabase — den henter bare direkte fra kilderne hver gang.
export function getSupabase(): SupabaseClient | null {
  if (cached) return cached;
  if (!url || !anonKey) return null;
  cached = createClient(url, anonKey, {
    auth: { persistSession: false },
  });
  return cached;
}

export function isSupabaseEnabled(): boolean {
  return Boolean(url && anonKey);
}
