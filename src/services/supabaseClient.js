import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          // Keine Passwörter im localStorage – nur Session-Token von Supabase.
        },
      })
    : null;

export function getSupabaseFunctionsUrl() {
  if (!supabaseUrl) return null;
  return `${String(supabaseUrl).replace(/\/$/, "")}/functions/v1`;
}
