import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let cached: SupabaseClient<Database> | null = null;

// Returnerer en Supabase-klient hvis env er sat, ellers null.
// Appen fungerer også uden Supabase - den henter bare direkte fra ODA hver gang.
export function getSupabase(): SupabaseClient<Database> | null {
  if (cached) return cached;
  if (!url || !anonKey) return null;
  cached = createClient<Database>(url, anonKey, {
    auth: { persistSession: false },
  });
  return cached;
}

export function isSupabaseEnabled(): boolean {
  return Boolean(url && anonKey);
}
