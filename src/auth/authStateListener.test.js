/**
 * Tests: Auth-Zustandsverarbeitung (Erststart-Bugfix "Lade MONTA…" hängt).
 *
 * Regressionstest mit dem echten supabase-js-Client (gefälschtes fetch und
 * gefälschter Speicher - kein Netzwerk, kein Supabase-Projekt): Ist die
 * gespeicherte Sitzung beim Start abgelaufen, löst supabase-js
 * TOKEN_REFRESHED noch während initialize() aus. Der Handler darf dabei
 * nicht blockieren, authLoading muss enden und das Profil geladen sein.
 *
 * Zusätzlich: Verhalten wie bisheriger Listener (SIGNED_OUT,
 * TOKEN_REFRESHED ohne erneuten Profilabruf, Fehlerfall, PASSWORD_RECOVERY)
 * und Verwerfen überholter Profilabrufe. Ausführen: npm test
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { createAuthStateHandler } from "./authStateListener.js";

const USER = { id: "u1", aud: "authenticated", email: "test@example.invalid" };
const ACTIVE_PROFILE = { user_id: "u1", status: "active", role: "user", full_module_access: false };

const nowSec = () => Math.floor(Date.now() / 1000);
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const fakeJwt = (exp) => `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: USER.id, exp })}.sig`;
const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

async function waitFor(cond, ms = 2000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (cond()) return true;
    await tick(5);
  }
  return cond();
}

/** Zustand wie in AuthContext (React-Setter als einfache Zuweisungen). */
function makeState() {
  const st = {
    session: null,
    profile: null,
    authError: null,
    authLoading: true,
    recoveryMode: false,
    profileUserId: null,
    cleared: 0,
  };
  st.actions = {
    setSession: (v) => { st.session = v; },
    setProfile: (v) => { st.profile = v; },
    setAuthError: (v) => { st.authError = v; },
    setAuthLoading: (v) => { st.authLoading = v; },
    setRecoveryMode: (v) => { st.recoveryMode = v; },
    clearAuthData: () => {
      st.cleared += 1;
      st.session = null;
      st.profile = null;
      st.profileUserId = null;
      st.recoveryMode = false;
    },
    getProfileUserId: () => st.profileUserId,
    setProfileUserId: (v) => { st.profileUserId = v; },
  };
  return st;
}

/** Echter supabase-js-Client mit gefälschtem fetch/Speicher. */
function makeClient(sessionKind) {
  const requests = [];
  const store = new Map();
  if (sessionKind !== "none") {
    const exp = sessionKind === "expired" ? nowSec() - 600 : nowSec() + 3000;
    store.set("sb-example-auth-token", JSON.stringify({
      access_token: fakeJwt(exp),
      refresh_token: "refresh-1",
      expires_at: exp,
      expires_in: 3600,
      token_type: "bearer",
      user: USER,
    }));
  }
  const fakeFetch = async (input, init = {}) => {
    const { pathname } = new URL(String(input?.url ?? input));
    requests.push(`${init.method || "GET"} ${pathname}`);
    if (pathname.endsWith("/auth/v1/token")) {
      await tick(50); // Netzlatenz: Listener ist inzwischen registriert
      const exp = nowSec() + 3600;
      return new Response(JSON.stringify({
        access_token: fakeJwt(exp),
        refresh_token: "refresh-2",
        expires_in: 3600,
        expires_at: exp,
        token_type: "bearer",
        user: USER,
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (pathname.endsWith("/rest/v1/user_profiles")) {
      return new Response(JSON.stringify([ACTIVE_PROFILE]), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response("{}", { status: 404, headers: { "content-type": "application/json" } });
  };
  const supabase = createClient("https://example.supabase.co", "anon-key", {
    auth: {
      storage: {
        getItem: (k) => store.get(k) ?? null,
        setItem: (k, v) => { store.set(k, v); },
        removeItem: (k) => { store.delete(k); },
      },
      // wie src/services/supabaseClient.js
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: { fetch: fakeFetch },
  });
  // gleiche Abfrage wie fetchOwnProfile in AuthContext.jsx
  const fetchProfile = async (userId) => {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  };
  return { supabase, fetchProfile, requests };
}

async function mountWithClient(sessionKind) {
  const client = makeClient(sessionKind);
  const st = makeState();
  // AuthProvider-Effekt läuft erst nach dem ersten React-Render.
  await tick(0);
  const handler = createAuthStateHandler({ fetchProfile: client.fetchProfile, actions: st.actions });
  const events = [];
  const { data: { subscription } } = client.supabase.auth.onAuthStateChange((event, s) => {
    events.push(event);
    return handler.handle(event, s);
  });
  const cleanup = async () => {
    handler.dispose();
    subscription.unsubscribe();
    await client.supabase.auth.stopAutoRefresh();
  };
  return { client, st, events, cleanup };
}

describe("Erststart: TOKEN_REFRESHED während der Auth-Initialisierung", () => {
  it("abgelaufene Sitzung: authLoading endet, Profil geladen (kein Deadlock)", async () => {
    const { client, st, events, cleanup } = await mountWithClient("expired");
    try {
      const done = await waitFor(() => st.authLoading === false);
      assert.equal(done, true, `authLoading hängt (Events: ${events.join(", ")}; Requests: ${client.requests.join(", ")})`);
      assert.ok(events.includes("TOKEN_REFRESHED"), "Testvoraussetzung: Refresh beim Start");
      assert.ok(client.requests.includes("GET /rest/v1/user_profiles"));
      assert.equal(st.profile?.status, "active");
      assert.equal(st.session?.user?.id, USER.id);
      assert.equal(st.authError, null);
    } finally {
      await cleanup();
    }
  });

  it("gültige Sitzung: authLoading endet, Profil geladen", async () => {
    const { st, cleanup } = await mountWithClient("valid");
    try {
      assert.equal(await waitFor(() => st.authLoading === false), true);
      assert.equal(st.profile?.status, "active");
    } finally {
      await cleanup();
    }
  });

  it("keine Sitzung: authLoading endet ohne Profilabruf", async () => {
    const { client, st, cleanup } = await mountWithClient("none");
    try {
      assert.equal(await waitFor(() => st.authLoading === false), true);
      assert.equal(st.session, null);
      assert.equal(st.profile, null);
      assert.equal(client.requests.length, 0);
    } finally {
      await cleanup();
    }
  });
});

describe("createAuthStateHandler: Verhalten wie bisheriger Listener", () => {
  const session = { user: USER, access_token: "a" };

  it("Callback ist synchron (gibt kein Promise zurück)", () => {
    const st = makeState();
    const h = createAuthStateHandler({ fetchProfile: async () => ACTIVE_PROFILE, actions: st.actions });
    assert.equal(h.handle("INITIAL_SESSION", session), undefined);
    h.dispose();
  });

  it("authLoading bleibt bis zum Profilabruf true (kein Aufblitzen von 'wartet auf Freigabe')", async () => {
    const st = makeState();
    let resolve;
    const h = createAuthStateHandler({
      fetchProfile: () => new Promise((r) => { resolve = r; }),
      actions: st.actions,
    });
    h.handle("INITIAL_SESSION", session);
    assert.equal(st.session, session);
    await tick(5);
    assert.equal(st.authLoading, true);
    resolve(ACTIVE_PROFILE);
    await tick(5);
    assert.equal(st.authLoading, false);
    assert.equal(st.profile, ACTIVE_PROFILE);
    assert.equal(st.profileUserId, USER.id);
  });

  it("Profilstatus wird unverändert übernommen (pending/blocked)", async () => {
    for (const status of ["pending", "blocked"]) {
      const st = makeState();
      const p = { ...ACTIVE_PROFILE, status };
      const h = createAuthStateHandler({ fetchProfile: async () => p, actions: st.actions });
      h.handle("SIGNED_IN", session);
      await waitFor(() => st.authLoading === false);
      assert.equal(st.profile, p);
    }
  });

  it("SIGNED_OUT: Daten leeren, authLoading beenden", () => {
    const st = makeState();
    const h = createAuthStateHandler({ fetchProfile: async () => ACTIVE_PROFILE, actions: st.actions });
    h.handle("SIGNED_OUT", null);
    assert.equal(st.cleared, 1);
    assert.equal(st.authLoading, false);
  });

  it("TOKEN_REFRESHED bei bereits geladenem Profil: kein erneuter Abruf", async () => {
    const st = makeState();
    let calls = 0;
    const h = createAuthStateHandler({
      fetchProfile: async () => { calls += 1; return ACTIVE_PROFILE; },
      actions: st.actions,
    });
    h.handle("INITIAL_SESSION", session);
    await waitFor(() => st.authLoading === false);
    h.handle("TOKEN_REFRESHED", { ...session, access_token: "b" });
    await tick(10);
    assert.equal(calls, 1);
    assert.equal(st.session.access_token, "b");
  });

  it("Fehler beim Profilabruf: authError gesetzt, authLoading endet, Profil bleibt leer", async () => {
    const st = makeState();
    const h = createAuthStateHandler({
      fetchProfile: async () => { throw new Error("Netzwerkfehler"); },
      actions: st.actions,
    });
    h.handle("INITIAL_SESSION", session);
    assert.equal(await waitFor(() => st.authLoading === false), true);
    assert.equal(st.authError, "Netzwerkfehler");
    assert.equal(st.profile, null);
  });

  it("Sitzung ohne Benutzer: Profil leeren, authLoading beenden", () => {
    const st = makeState();
    const h = createAuthStateHandler({ fetchProfile: async () => ACTIVE_PROFILE, actions: st.actions });
    h.handle("INITIAL_SESSION", null);
    assert.equal(st.profile, null);
    assert.equal(st.profileUserId, null);
    assert.equal(st.authLoading, false);
  });

  it("PASSWORD_RECOVERY setzt recoveryMode und lädt das Profil wie bisher", async () => {
    const st = makeState();
    const h = createAuthStateHandler({ fetchProfile: async () => ACTIVE_PROFILE, actions: st.actions });
    h.handle("PASSWORD_RECOVERY", session);
    assert.equal(st.recoveryMode, true);
    await waitFor(() => st.authLoading === false);
    assert.equal(st.profile, ACTIVE_PROFILE);
  });

  it("überholter Profilabruf (Erfolg oder Fehler) wird verworfen", async () => {
    const st = makeState();
    const pending = [];
    const h = createAuthStateHandler({
      fetchProfile: () => new Promise((resolve, reject) => pending.push({ resolve, reject })),
      actions: st.actions,
    });
    h.handle("TOKEN_REFRESHED", session);
    h.handle("INITIAL_SESSION", session);
    await tick(5);
    assert.equal(pending.length, 2);
    const newer = { ...ACTIVE_PROFILE, display_name: "neu" };
    pending[1].resolve(newer);
    await tick(5);
    pending[0].reject(new Error("alt"));
    await tick(5);
    assert.equal(st.profile, newer);
    assert.equal(st.authError, null);
  });

  it("Profilabruf nach SIGNED_OUT setzt kein Profil mehr", async () => {
    const st = makeState();
    let resolve;
    const h = createAuthStateHandler({
      fetchProfile: () => new Promise((r) => { resolve = r; }),
      actions: st.actions,
    });
    h.handle("SIGNED_IN", session);
    await tick(5);
    h.handle("SIGNED_OUT", null);
    resolve(ACTIVE_PROFILE);
    await tick(5);
    assert.equal(st.profile, null);
    assert.equal(st.authLoading, false);
  });

  it("dispose() bricht noch nicht gestartete und laufende Abrufe ab", async () => {
    const st = makeState();
    let calls = 0;
    const h = createAuthStateHandler({
      fetchProfile: async () => { calls += 1; return ACTIVE_PROFILE; },
      actions: st.actions,
    });
    h.handle("INITIAL_SESSION", session);
    h.dispose();
    await tick(10);
    assert.equal(calls, 0);
    assert.equal(st.profile, null);
    h.handle("SIGNED_OUT", null);
    assert.equal(st.cleared, 0);
  });
});
