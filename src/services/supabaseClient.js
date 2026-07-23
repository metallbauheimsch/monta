import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** localStorage-Schlüssel nur für die Präferenz (nicht für Tokens). */
export const REMEMBER_ME_PREF_KEY = "monta_auth_remember_me";

/**
 * „Angemeldet bleiben“-Präferenz.
 * Standard: true (bestehende Sitzungen in localStorage bleiben erhalten).
 */
export function getRememberMePreference() {
  try {
    const v = localStorage.getItem(REMEMBER_ME_PREF_KEY);
    if (v === null) return true;
    return v === "1";
  } catch {
    return true;
  }
}

export function setRememberMePreference(remember) {
  try {
    localStorage.setItem(REMEMBER_ME_PREF_KEY, remember ? "1" : "0");
  } catch {
    // Speicher ggf. nicht verfügbar
  }
}

/**
 * Supabase-Auth-Storage:
 * - Angemeldet bleiben → localStorage (überlebt Browser-Neustart)
 * - sonst → sessionStorage (endet mit Browser-Sitzung)
 * Beim Schreiben wird der jeweils andere Speicher geleert,
 * damit keine alte Dauer-Sitzung „hängen bleibt“.
 * Beim Lesen: bevorzugter Speicher zuerst, sonst Fallback (Migration / kein Logout).
 */
function createAuthStorage() {
  return {
    getItem(key) {
      try {
        if (getRememberMePreference()) {
          return localStorage.getItem(key) ?? sessionStorage.getItem(key);
        }
        return sessionStorage.getItem(key) ?? localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    setItem(key, value) {
      try {
        if (getRememberMePreference()) {
          localStorage.setItem(key, value);
          sessionStorage.removeItem(key);
        } else {
          sessionStorage.setItem(key, value);
          localStorage.removeItem(key);
        }
      } catch {
        // ignore
      }
    },
    removeItem(key) {
      try {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      } catch {
        // ignore
      }
    },
  };
}

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          storage: createAuthStorage(),
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          // Keine Passwörter speichern – nur Session-Token von Supabase.
        },
      })
    : null;

export function getSupabaseFunctionsUrl() {
  if (!supabaseUrl) return null;
  return `${String(supabaseUrl).replace(/\/$/, "")}/functions/v1`;
}
