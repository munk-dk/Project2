// Typer for Supabase-skemaet - matcher supabase/schema.sql.
// Kan regenereres med: npx supabase gen types typescript --project-id <id>

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      members: {
        Row: {
          id: number;
          navn: string;
          fornavn: string | null;
          efternavn: string | null;
          party: string | null;
          biografi: string | null;
          startdato: string | null;
          slutdato: string | null;
          opdateringsdato: string | null;
          synced_at: string;
        };
        Insert: {
          id: number;
          navn: string;
          fornavn?: string | null;
          efternavn?: string | null;
          party?: string | null;
          biografi?: string | null;
          startdato?: string | null;
          slutdato?: string | null;
          opdateringsdato?: string | null;
          synced_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["members"]["Insert"]>;
        Relationships: [];
      };
      votes: {
        Row: {
          id: number;
          actor_id: number;
          voting_id: number;
          type_id: number;
          opdateringsdato: string | null;
          synced_at: string;
        };
        Insert: {
          id: number;
          actor_id: number;
          voting_id: number;
          type_id: number;
          opdateringsdato?: string | null;
          synced_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["votes"]["Insert"]>;
        Relationships: [];
      };
      cases: {
        Row: {
          id: number;
          titel: string;
          titelkort: string | null;
          resume: string | null;
          nummer: string | null;
          tags: string[] | null;
          opdateringsdato: string | null;
          synced_at: string;
        };
        Insert: {
          id: number;
          titel: string;
          titelkort?: string | null;
          resume?: string | null;
          nummer?: string | null;
          tags?: string[] | null;
          opdateringsdato?: string | null;
          synced_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["cases"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
