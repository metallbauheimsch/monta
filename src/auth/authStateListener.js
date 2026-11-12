// Auth-Zustandsverarbeitung für onAuthStateChange (Erststart-Bugfix).
//
// Ursache des Erststart-Hängers ("Lade MONTA…" bleibt stehen): Ist die
// gespeicherte Sitzung beim Kaltstart abgelaufen, erneuert supabase-js das
// Token noch INNERHALB von initialize() und wartet dort per await auf alle
// onAuthStateChange-Callbacks (TOKEN_REFRESHED). Wartet der Callback selbst
// auf eine Supabase-Abfrage (Profil laden), ruft diese intern getSession()
// auf - und getSession() wartet auf das Ende von initialize(). Zirkuläres
// Warten, authLoading wird nie beendet.
//
// Deshalb: Der Callback (handle) arbeitet ausschließlich synchron und gibt
// kein Promise zurück. Der Profilabruf läuft per setTimeout außerhalb des
// Callbacks. Ein Generation-Zähler stellt sicher, dass nur der zuletzt
// gestartete Profilabruf (Erfolg oder Fehler) den Zustand setzen darf.
//
// Fachlich unverändert gegenüber dem bisherigen Listener: dieselben
// Ereignisse, dieselben Zustände, authLoading endet erst nach dem
// Profilabruf (kein kurzes Aufblitzen von "wartet auf Freigabe").

/**
 * @param {object} deps
 * @param {(userId: string) => Promise<object|null>} deps.fetchProfile
 * @param {object} deps.actions  Zustands-Setter aus AuthContext
 * @returns {{ handle: (event: string, session: object|null) => void, dispose: () => void }}
 */
export function createAuthStateHandler({ fetchProfile, actions }) {
  let fetchGen = 0;
  let disposed = false;
  const pendingTimers = new Set();

  function loadProfileLater(userId) {
    const myGen = ++fetchGen;
    const timer = setTimeout(async () => {
      pendingTimers.delete(timer);
      try {
        const p = await fetchProfile(userId);
        if (myGen !== fetchGen) return; // durch neueres Auth-Ereignis überholt
        actions.setProfile(p);
        actions.setProfileUserId(userId);
      } catch (err) {
        if (myGen !== fetchGen) return; // überholter Fehler ignoriert
        actions.setAuthError(err?.message || "Profil konnte nicht geladen werden.");
      }
      actions.setAuthLoading(false);
    }, 0);
    pendingTimers.add(timer);
  }

  function handle(event, s) {
    if (disposed) return;
    if (event === "PASSWORD_RECOVERY") actions.setRecoveryMode(true);
    if (event === "SIGNED_OUT") {
      fetchGen += 1;
      actions.clearAuthData();
      actions.setAuthLoading(false);
      return;
    }
    actions.setSession(s);
    if (s?.user) {
      // TOKEN_REFRESHED: Profil nicht unnötig neu laden (Endlosschleifen vermeiden)
      if (event === "TOKEN_REFRESHED" && actions.getProfileUserId() === s.user.id) {
        return;
      }
      loadProfileLater(s.user.id);
      return;
    }
    fetchGen += 1;
    actions.setProfile(null);
    actions.setProfileUserId(null);
    actions.setAuthLoading(false);
  }

  function dispose() {
    disposed = true;
    fetchGen += 1;
    for (const timer of pendingTimers) clearTimeout(timer);
    pendingTimers.clear();
  }

  return { handle, dispose };
}
