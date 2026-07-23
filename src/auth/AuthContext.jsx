import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseFunctionsUrl, supabase } from "../services/supabaseClient";

const AuthContext = createContext(null);

async function fetchOwnProfile(userId) {
  if (!supabase || !userId) return null;
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("MONTA: Profil laden fehlgeschlagen.", error.message);
    throw error;
  }
  return data;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const profileUserRef = useRef(null);

  const clearAuthData = useCallback(() => {
    setSession(null);
    setProfile(null);
    profileUserRef.current = null;
    setRecoveryMode(false);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!supabase) return null;
    const { data: { session: s } } = await supabase.auth.getSession();
    if (!s?.user) {
      setProfile(null);
      profileUserRef.current = null;
      return null;
    }
    try {
      const p = await fetchOwnProfile(s.user.id);
      setProfile(p);
      profileUserRef.current = s.user.id;
      setAuthError(null);
      return p;
    } catch (err) {
      setAuthError(err?.message || "Profil konnte nicht geladen werden.");
      return null;
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return undefined;
    }

    let cancelled = false;

    async function init() {
      setAuthLoading(true);
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        if (cancelled) return;
        setSession(s);
        if (s?.user) {
          const p = await fetchOwnProfile(s.user.id);
          if (cancelled) return;
          setProfile(p);
          profileUserRef.current = s.user.id;
        } else {
          setProfile(null);
        }
      } catch (err) {
        if (!cancelled) setAuthError(err?.message || "Anmeldung konnte nicht geprüft werden.");
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (event === "PASSWORD_RECOVERY") setRecoveryMode(true);
      if (event === "SIGNED_OUT") {
        clearAuthData();
        setAuthLoading(false);
        return;
      }
      setSession(s);
      if (s?.user) {
        // TOKEN_REFRESHED: Profil nicht unnötig neu laden (Endlosschleifen vermeiden)
        if (event === "TOKEN_REFRESHED" && profileUserRef.current === s.user.id) {
          return;
        }
        try {
          const p = await fetchOwnProfile(s.user.id);
          setProfile(p);
          profileUserRef.current = s.user.id;
        } catch (err) {
          setAuthError(err?.message || "Profil konnte nicht geladen werden.");
        }
      } else {
        setProfile(null);
        profileUserRef.current = null;
      }
      setAuthLoading(false);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [clearAuthData]);

  // Pending/Blocked: Profil bei Fokus neu laden (Freigabe/Sperre erkennen)
  useEffect(() => {
    if (!supabase || !session?.user) return undefined;
    function onVisible() {
      if (document.visibilityState === "visible") refreshProfile();
    }
    function onFocus() {
      refreshProfile();
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, [session?.user?.id, refreshProfile]);

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: String(email || "").trim(),
      password,
    });
    if (error) throw error;
    return data;
  }, []);

  const signUp = useCallback(async ({ email, password, displayName }) => {
    const origin = window.location.origin;
    const { data, error } = await supabase.auth.signUp({
      email: String(email || "").trim(),
      password,
      options: {
        data: { display_name: String(displayName || "").trim() },
        emailRedirectTo: `${origin}/`,
      },
    });
    if (error) throw error;
    return data;
  }, []);

  const signOut = useCallback(async () => {
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) console.error("MONTA: Abmelden fehlgeschlagen.", error.message);
    }
    clearAuthData();
  }, [clearAuthData]);

  const requestPasswordReset = useCallback(async (email) => {
    const origin = window.location.origin;
    const { error } = await supabase.auth.resetPasswordForEmail(String(email || "").trim(), {
      redirectTo: `${origin}/`,
    });
    if (error) throw error;
  }, []);

  const updatePassword = useCallback(async (password) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    setRecoveryMode(false);
  }, []);

  const invokeAdminUsers = useCallback(async (action, payload = {}) => {
    if (!supabase) throw new Error("Supabase nicht konfiguriert.");
    const { data: { session: s } } = await supabase.auth.getSession();
    if (!s?.access_token) throw new Error("Nicht angemeldet.");
    const base = getSupabaseFunctionsUrl();
    if (!base) throw new Error("Functions-URL fehlt.");
    const res = await fetch(`${base}/admin-users`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${s.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action, ...payload }),
    });
    let body = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    if (!res.ok) {
      throw new Error(body?.error || "Aktion fehlgeschlagen.");
    }
    return body;
  }, []);

  const value = useMemo(
    () => ({
      supabaseConfigured: Boolean(supabase),
      session,
      user: session?.user || null,
      profile,
      authLoading,
      authError,
      recoveryMode,
      setRecoveryMode,
      isActive: profile?.status === "active",
      isAdmin: profile?.status === "active" && profile?.role === "admin",
      hasFullModuleAccess:
        profile?.status === "active" &&
        (profile?.role === "admin" || Boolean(profile?.full_module_access)),
      isPending: profile?.status === "pending",
      isBlocked: profile?.status === "blocked",
      refreshProfile,
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      updatePassword,
      invokeAdminUsers,
    }),
    [
      session,
      profile,
      authLoading,
      authError,
      recoveryMode,
      refreshProfile,
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      updatePassword,
      invokeAdminUsers,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth außerhalb von AuthProvider");
  return ctx;
}
