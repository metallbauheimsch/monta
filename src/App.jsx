import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles/style.css";
import Shell from "./components/Shell";
import ProjectsList from "./features/projects/ProjectsList";
import NewProjectForm from "./features/projects/NewProjectForm";
import ProjectDetail from "./features/projects/ProjectDetail";
import ProjectView from "./features/projects/ProjectView";
import ProjectWideView from "./features/projects/ProjectWideView";
import AuthPage from "./features/auth/AuthPage";
import AccessPending from "./features/auth/AccessPending";
import AccessBlocked from "./features/auth/AccessBlocked";
import UserAdminView from "./features/admin/UserAdminView";
import PrintStationWorker from "./features/print/PrintStationWorker";
import PrintStationPanel from "./features/print/PrintStationPanel";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { supabase } from "./services/supabaseClient";
import { useWorkflowWatchers } from "./services/useWorkflowWatchers";
import {
  notifyTbPruefungCompleted,
  notifyLagerCompleted,
  nextEventCycle,
} from "./services/workflowNotifications";
import { loadPrintStationSettings } from "./services/printStation";
import { isMobileLike, useIsNarrow } from "./utils/helpers";
import {
  parseEinbauort,
  formatEinbauort,
  collectStructureCandidates,
  hasStructureRow,
  structureRowKey,
  markStructureMigrated,
  addBaugruppeToRegistry,
  addBauteilToRegistry,
  removeBaugruppeFromRegistry,
  removeBauteilFromRegistry,
  renameBaugruppeInRegistry,
  renameBauteilInRegistry,
} from "./utils/structure";
import { defaultTabFor, resolveTabFullAccess, tabForBauteilOpen } from "./utils/tabs";
import { parseDeepLinkParams, stripDeepLinkParams } from "./utils/deepLink";
import { renameBaugruppeInManualValues } from "./features/fastening/stock";
import { nextPosNumber } from "./features/fastening/technikerUtils";
import {
  buildReplacementFields,
  isReplacedItem,
  isReferencedAsReplacement,
  REPLACEMENT_TARGET_LOCKED_DELETE_MESSAGE,
} from "./features/fastening/replacement";
import OfflineApp from "./features/offline/OfflineApp";
import { registerAppShellServiceWorker } from "./services/offlineShell";
import { loadSnapshot } from "./services/offlineSnapshot";
import { decideOfflineState } from "./services/offlineState";

const SYNC_POLL_MS = 20000;

function App() {
  const auth = useAuth();
  const {
    supabaseConfigured,
    authLoading,
    session,
    profile,
    isActive,
    isAdmin,
    isPending,
    isBlocked,
    recoveryMode,
    signOut,
    refreshProfile,
    hasFullModuleAccess,
  } = auth;

  const [projects, setProjects] = useState([]);
  const [items, setItems] = useState([]);
  const [structureRows, setStructureRows] = useState([]);
  const [view, setView] = useState("projects");
  const [projectId, setProjectId] = useState(null);
  const [selectedBaugruppe, setSelectedBaugruppe] = useState(null);
  const [selectedBauteil, setSelectedBauteil] = useState(null);

  const isNarrow = useIsNarrow();
  const [tab, setTab] = useState(() =>
    defaultTabFor(isMobileLike(), { fullAccess: false })
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [printStationUserId, setPrintStationUserId] = useState(null);

  // Verhindert, dass ein älterer (noch laufender) load() neuere lokale
  // Inserts oder frischere Serverdaten überschreibt.
  const loadGeneration = useRef(0);
  const migratingRef = useRef(false);
  const structureRowsRef = useRef(structureRows);
  structureRowsRef.current = structureRows;

  // Zuletzt verwendeter fachlicher Reiter innerhalb des aktuell geöffneten
  // Projekts (Sprint: Reiterzustand beim Bauteilwechsel) - rein im
  // Laufzeitzustand der App (kein localStorage, keine DB), damit beim
  // Öffnen eines anderen Bauteils nicht mehr automatisch auf TB
  // zurückgesprungen wird. Nach Reload/App-Neustart bleibt TB der Default,
  // da der Ref dann wieder leer ist.
  const lastFachTabRef = useRef(null);

  useEffect(() => {
    lastFachTabRef.current = null;
  }, [projectId]);

  useEffect(() => {
    if (view === "project" || view === "projectWide") {
      lastFachTabRef.current = tab;
    }
  }, [tab, view]);

  const project = projects.find((p) => p.id === projectId);
  const projectItems = items.filter((i) => i.project_id === projectId);

  const baugruppeItems = projectItems.filter(
    (i) => parseEinbauort(i.einbauort, project?.baugruppe).baugruppe === selectedBaugruppe
  );
  const bauteilItems = baugruppeItems.filter(
    (i) => parseEinbauort(i.einbauort, project?.baugruppe).bauteil === selectedBauteil
  );

  const visibleProjects = showArchived ? projects : projects.filter((p) => !p.archived);

  // Deep-Link aus internen Workflow-Mails (Praxis-Sprint): ?project=&tab=
  // öffnet nach Login direkt Projekt + Reiter. Läuft NACH den bestehenden
  // Auth-Gates (isActive erforderlich) - keine Auth-Umgehung, keine
  // Änderung an AuthContext.jsx. Genau einmal pro Laden; ungültige/
  // fehlende Parameter oder ein unbekanntes/nicht zugängliches Projekt
  // führen sicher zur normalen App (kein Absturz, kein Fehler).
  const deepLinkHandledRef = useRef(false);
  useEffect(() => {
    if (deepLinkHandledRef.current) return;
    if (!isActive || loading) return;
    const parsed = parseDeepLinkParams(window.location.search);
    if (parsed) {
      const targetProject = projects.find((p) => p.id === parsed.projectId);
      if (targetProject) {
        setProjectId(targetProject.id);
        setSelectedBaugruppe(null);
        setSelectedBauteil(null);
        setTab(parsed.tab);
        setView("projectWide");
      }
      stripDeepLinkParams();
    }
    deepLinkHandledRef.current = true;
  }, [isActive, loading, projects]);

  useWorkflowWatchers({
    enabled: Boolean(isActive && supabaseConfigured),
    projects,
    items,
    userId: session?.user?.id,
  });

  useEffect(() => {
    if (!isActive || !supabase) return undefined;
    let cancelled = false;
    loadPrintStationSettings().then((s) => {
      if (!cancelled) setPrintStationUserId(s?.user_id || null);
    });
    return () => {
      cancelled = true;
    };
  }, [isActive, view]);

  function clearMontaState() {
    loadGeneration.current += 1;
    setProjects([]);
    setItems([]);
    setStructureRows([]);
    setProjectId(null);
    setSelectedBaugruppe(null);
    setSelectedBauteil(null);
    setView("projects");
    setLoadError(null);
    setLoading(false);
  }

  async function handleLogout() {
    clearMontaState();
    await signOut();
  }

  // Fehlende Baugruppen/Bauteile aus lokaler Registry + Materialpositionen
  // nach Supabase nachziehen. Kein Abbruch über Migrations-Flag: sonst bleiben
  // Einträge aus älteren Clients dauerhaft nur lokal.
  async function migrateStructureToSupabase(nextProjects, nextItems, existingRows) {
    if (!supabase || migratingRef.current) return existingRows;
    migratingRef.current = true;
    try {
      const candidates = collectStructureCandidates(nextProjects, nextItems);
      const missing = candidates.filter(
        (c) => !hasStructureRow(existingRows, c.project_id, c.baugruppe, c.bauteil)
      );
      if (!missing.length) {
        markStructureMigrated();
        return existingRows;
      }
      const payload = missing.map((c) => ({
        id: crypto.randomUUID(),
        project_id: c.project_id,
        baugruppe: c.baugruppe,
        bauteil: c.bauteil,
        bauteilgruppe: null,
        sort_order: null,
      }));
      const { data, error } = await supabase.from("project_structure").insert(payload).select("*");
      if (error) {
        console.error("MONTA: Struktur-Migration fehlgeschlagen.", error);
        return existingRows;
      }
      markStructureMigrated();
      const inserted = data || payload;
      console.info("MONTA: Struktur-Migration –", inserted.length, "Einträge nach Supabase.");
      const byKey = new Map(
        [...existingRows, ...inserted].map((r) => [
          structureRowKey(r.project_id, r.baugruppe, r.bauteil),
          r,
        ])
      );
      return Array.from(byKey.values());
    } finally {
      migratingRef.current = false;
    }
  }

  const load = useCallback(async ({ silent = false } = {}) => {
    const myGen = ++loadGeneration.current;
    if (!silent) {
      setLoading(true);
      setLoadError(null);
    }
    try {
      if (!supabase) {
        // Keine stillen Demo-/localStorage-Daten: gleiche Quelle wie Vercel erfordert Supabase-Env.
        if (myGen !== loadGeneration.current) return;
        setProjects([]);
        setItems([]);
        setStructureRows([]);
        setLoadError(
          "Supabase ist lokal nicht konfiguriert. Bitte `.env.local` mit denselben " +
            "VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY wie in Vercel anlegen " +
            "(siehe .env.example und AUTH_SETUP.md) und den Dev-Server neu starten. " +
            "Ohne diese Verbindung werden keine Live-Projektdaten geladen."
        );
        return;
      }

      const [projectsRes, itemsRes, structureRes] = await Promise.all([
        supabase.from("projects").select("*").order("created_at", { ascending: false }),
        supabase.from("material_items").select("*").order("created_at", { ascending: true }),
        supabase.from("project_structure").select("*").order("created_at", { ascending: true }),
      ]);
      if (projectsRes.error) {
        throw new Error(`Projekte: ${projectsRes.error.message || "unbekannter Fehler"}`);
      }
      if (itemsRes.error) {
        throw new Error(`Materialpositionen: ${itemsRes.error.message || "unbekannter Fehler"}`);
      }
      if (structureRes.error) {
        throw new Error(
          `Projektstruktur: ${structureRes.error.message || "unbekannter Fehler"} (SQL-Patch project_structure ausführen?)`
        );
      }

      let nextProjects = projectsRes.data || [];
      let nextItems = itemsRes.data || [];
      let nextStructure = structureRes.data || [];
      nextStructure = await migrateStructureToSupabase(nextProjects, nextItems, nextStructure);

      // Veraltete Antwort verwerfen (neuerer load oder Insert inzwischen).
      if (myGen !== loadGeneration.current) return;

      setProjects(nextProjects);
      setItems(nextItems);
      setStructureRows(nextStructure);
    } catch (err) {
      console.error("MONTA: Laden der Daten fehlgeschlagen.", err);
      if (!silent && myGen === loadGeneration.current) {
        setLoadError(err?.message || "Unbekannter Fehler beim Laden der Daten.");
      }
    } finally {
      if (!silent && myGen === loadGeneration.current) setLoading(false);
    }
  }, []);

  // Daten und Realtime nur für freigegebene Nutzer (oder lokale Demo ohne Supabase).
  useEffect(() => {
    const allowData = !supabaseConfigured || isActive;
    if (!allowData) {
      clearMontaState();
      return undefined;
    }

    load();
    if (!supabase) return undefined;

    const channel = supabase
      .channel("monta-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, () => {
        load({ silent: true });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "material_items" }, () => {
        load({ silent: true });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "project_structure" }, () => {
        load({ silent: true });
      })
      .subscribe((status, err) => {
        if (err) console.warn("MONTA Realtime:", status, err);
        else console.info("MONTA Realtime:", status);
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          console.warn(
            "MONTA: Realtime unterbrochen – Sync läuft weiter über Fokus/Sichtbarkeit und Fallback-Reload."
          );
        }
      });

    function refreshWhenVisible() {
      if (document.visibilityState === "visible") {
        refreshProfile();
        load({ silent: true });
      }
    }
    function refreshOnFocus() {
      refreshProfile();
      load({ silent: true });
    }
    function refreshOnPageShow(e) {
      if (e.persisted) load({ silent: true });
    }
    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("focus", refreshOnFocus);
    window.addEventListener("pageshow", refreshOnPageShow);

    const pollId = setInterval(() => {
      if (document.visibilityState === "visible") {
        refreshProfile();
        load({ silent: true });
      }
    }, SYNC_POLL_MS);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("focus", refreshOnFocus);
      window.removeEventListener("pageshow", refreshOnPageShow);
      clearInterval(pollId);
    };
  }, [load, isActive, supabaseConfigured, refreshProfile]);

  function resetSelectionToOverview() {
    setProjectId(null);
    setSelectedBaugruppe(null);
    setSelectedBauteil(null);
    setView("projects");
  }

  // Zentraler Zurück-Übergang je View (Praxis-Sprint: Tablet-Navigation) -
  // spiegelt exakt dieselben Ziele wie die bestehenden, sichtbaren
  // Zurück-Buttons (ProjectDetail/ProjectView/ProjectWideView/
  // UserAdminView/NewProjectForm). Zusätzlicher Aufrufer für die
  // Randwisch-Geste (Shell/useSwipeBack) - keine zweite Navigations-
  // Architektur, kein history.back() (MONTA hat keinen Router).
  function goBack() {
    if (view === "projectDetail") {
      setView("projects");
    } else if (view === "project" || view === "projectWide") {
      setView("projectDetail");
    } else if (view === "adminUsers" || view === "newProject") {
      setView("projects");
    }
  }

  useEffect(() => {
    if (loading || loadError) return;
    if (projectId && !projects.some((p) => p.id === projectId)) {
      resetSelectionToOverview();
    }
  }, [projects, projectId, loading, loadError]);

  async function insertStructureRow({ project_id, baugruppe, bauteil }) {
    const bg = String(baugruppe || "").trim();
    const bt =
      bauteil == null || String(bauteil).trim() === "" ? null : String(bauteil).trim();
    if (!bg) return null;
    if (hasStructureRow(structureRowsRef.current, project_id, bg, bt)) return null;

    const row = {
      id: crypto.randomUUID(),
      project_id: String(project_id),
      baugruppe: bg,
      bauteil: bt,
      bauteilgruppe: null,
      sort_order: null,
    };

    if (supabase) {
      const { data, error } = await supabase
        .from("project_structure")
        .insert(row)
        .select("*")
        .single();
      if (error) {
        // Unique-Verletzung: parallel angelegt – vom Server nachladen.
        if (error.code === "23505") {
          console.warn("MONTA: Struktureintrag existiert bereits, lade neu.", bg, bt);
          await load({ silent: true });
          return null;
        }
        console.error("MONTA: Struktureintrag anlegen fehlgeschlagen.", error, row);
        alert(`Struktur konnte nicht gespeichert werden: ${error.message || "unbekannter Fehler"}`);
        throw error;
      }
      const saved = data || row;
      console.info("MONTA: project_structure Insert OK", saved);
      // Generation erhöhen, damit parallel laufende ältere loads diesen
      // Stand nicht mit einer Antwort ohne den neuen Eintrag überschreiben.
      loadGeneration.current += 1;
      setStructureRows((prev) =>
        hasStructureRow(prev, saved.project_id, saved.baugruppe, saved.bauteil)
          ? prev
          : [...prev, saved]
      );
      return saved;
    }

    if (bt) addBauteilToRegistry(project_id, bg, bt);
    else addBaugruppeToRegistry(project_id, bg);

    setStructureRows((prev) =>
      hasStructureRow(prev, project_id, bg, bt) ? prev : [...prev, row]
    );
    return row;
  }

  async function createProject(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const newProject = {
      id: crypto.randomUUID(),
      nr: f.get("nr"),
      name: f.get("name"),
      baugruppe: f.get("baugruppe") || "",
      zeichnung: "",
      archived: false,
    };
    if (supabase) {
      const { error } = await supabase.from("projects").insert(newProject);
      if (error) {
        console.error("MONTA: Projekt anlegen fehlgeschlagen.", error);
        alert(`Projekt konnte nicht angelegt werden: ${error.message || "unbekannter Fehler"}`);
        return;
      }
    }
    setProjects((prev) => (prev.some((p) => p.id === newProject.id) ? prev : [newProject, ...prev]));
    setProjectId(newProject.id);
    setSelectedBaugruppe(null);
    setSelectedBauteil(null);
    setView("projectDetail");
  }

  async function setProjectArchived(id, archived) {
    if (supabase) {
      const { error } = await supabase.from("projects").update({ archived }).eq("id", id);
      if (error) {
        console.error("MONTA: Projekt archivieren fehlgeschlagen.", error);
        alert(`Projektstatus konnte nicht gespeichert werden: ${error.message || "unbekannter Fehler"}`);
        return;
      }
    }
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, archived } : p)));
  }

  async function deleteProject(id) {
    if (supabase) {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) {
        console.error("MONTA: Projekt löschen fehlgeschlagen.", error);
        alert(`Projekt konnte nicht gelöscht werden: ${error.message || "unbekannter Fehler"}`);
        throw error;
      }
    }
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setItems((prev) => prev.filter((i) => i.project_id !== id));
    setStructureRows((prev) => prev.filter((r) => r.project_id !== id));
    if (projectId === id) resetSelectionToOverview();
  }

  async function addBaugruppe(pid, name) {
    const clean = String(name || "").trim();
    if (!clean) return;
    await insertStructureRow({ project_id: pid, baugruppe: clean, bauteil: null });
  }

  async function addBauteil(pid, baugruppeName, bauteilName) {
    const bg = String(baugruppeName || "").trim();
    const bt = String(bauteilName || "").trim();
    if (!bg || !bt) return;
    await insertStructureRow({ project_id: pid, baugruppe: bg, bauteil: null });
    await insertStructureRow({ project_id: pid, baugruppe: bg, bauteil: bt });
  }

  async function deleteBaugruppe(pid, baugruppeName) {
    const ids = projectItems
      .filter((i) => parseEinbauort(i.einbauort, project?.baugruppe).baugruppe === baugruppeName)
      .map((i) => i.id);

    if (supabase) {
      if (ids.length) {
        const { error } = await supabase.from("material_items").delete().in("id", ids);
        if (error) {
          console.error("MONTA: Baugruppe löschen (Material) fehlgeschlagen.", error);
          alert(`Baugruppe konnte nicht gelöscht werden: ${error.message || "unbekannter Fehler"}`);
          throw error;
        }
      }
      const { error } = await supabase
        .from("project_structure")
        .delete()
        .eq("project_id", pid)
        .eq("baugruppe", baugruppeName);
      if (error) {
        console.error("MONTA: Baugruppe löschen (Struktur) fehlgeschlagen.", error);
        alert(`Baugruppe konnte nicht gelöscht werden: ${error.message || "unbekannter Fehler"}`);
        throw error;
      }
    } else {
      removeBaugruppeFromRegistry(pid, baugruppeName);
    }

    if (ids.length) setItems((prev) => prev.filter((i) => !ids.includes(i.id)));
    setStructureRows((prev) =>
      prev.filter((r) => !(r.project_id === pid && r.baugruppe === baugruppeName))
    );
    if (selectedBaugruppe === baugruppeName) {
      setSelectedBaugruppe(null);
      setSelectedBauteil(null);
      setView("projectDetail");
    }
  }

  async function deleteBauteil(pid, baugruppeName, bauteilName) {
    const ids = projectItems
      .filter((i) => {
        const p = parseEinbauort(i.einbauort, project?.baugruppe);
        return p.baugruppe === baugruppeName && p.bauteil === bauteilName;
      })
      .map((i) => i.id);

    if (supabase) {
      if (ids.length) {
        const { error } = await supabase.from("material_items").delete().in("id", ids);
        if (error) {
          console.error("MONTA: Bauteil löschen (Material) fehlgeschlagen.", error);
          alert(`Bauteil konnte nicht gelöscht werden: ${error.message || "unbekannter Fehler"}`);
          throw error;
        }
      }
      const { error } = await supabase
        .from("project_structure")
        .delete()
        .eq("project_id", pid)
        .eq("baugruppe", baugruppeName)
        .eq("bauteil", bauteilName);
      if (error) {
        console.error("MONTA: Bauteil löschen (Struktur) fehlgeschlagen.", error);
        alert(`Bauteil konnte nicht gelöscht werden: ${error.message || "unbekannter Fehler"}`);
        throw error;
      }
    } else {
      removeBauteilFromRegistry(pid, baugruppeName, bauteilName);
    }

    if (ids.length) setItems((prev) => prev.filter((i) => !ids.includes(i.id)));
    setStructureRows((prev) =>
      prev.filter(
        (r) =>
          !(
            r.project_id === pid &&
            r.baugruppe === baugruppeName &&
            String(r.bauteil || "") === bauteilName
          )
      )
    );
    if (selectedBaugruppe === baugruppeName && selectedBauteil === bauteilName) {
      setSelectedBauteil(null);
      setView("projectDetail");
    }
  }

  async function renameBaugruppe(pid, oldName, newName) {
    const clean = String(newName || "").trim();
    if (!clean || clean === oldName) return;
    const affected = projectItems.filter(
      (i) => parseEinbauort(i.einbauort, project?.baugruppe).baugruppe === oldName
    );
    for (const item of affected) {
      const { bauteil } = parseEinbauort(item.einbauort, project?.baugruppe);
      await updateItem(item.id, { einbauort: formatEinbauort(clean, bauteil) });
    }

    if (supabase) {
      const { error } = await supabase
        .from("project_structure")
        .update({ baugruppe: clean })
        .eq("project_id", pid)
        .eq("baugruppe", oldName);
      if (error) {
        console.error("MONTA: Baugruppe umbenennen fehlgeschlagen.", error);
        alert(`Baugruppe konnte nicht umbenannt werden: ${error.message || "unbekannter Fehler"}`);
        throw error;
      }
    } else {
      renameBaugruppeInRegistry(pid, oldName, clean);
    }

    setStructureRows((prev) =>
      prev.map((r) =>
        r.project_id === pid && r.baugruppe === oldName ? { ...r, baugruppe: clean } : r
      )
    );
    renameBaugruppeInManualValues(pid, oldName, clean);
    if (selectedBaugruppe === oldName) setSelectedBaugruppe(clean);
  }

  async function renameBauteil(pid, baugruppeName, oldName, newName) {
    const clean = String(newName || "").trim();
    if (!clean || clean === oldName) return;
    const affected = projectItems.filter((i) => {
      const parsed = parseEinbauort(i.einbauort, project?.baugruppe);
      return parsed.baugruppe === baugruppeName && parsed.bauteil === oldName;
    });
    for (const item of affected) {
      await updateItem(item.id, { einbauort: formatEinbauort(baugruppeName, clean) });
    }

    if (supabase) {
      const { error } = await supabase
        .from("project_structure")
        .update({ bauteil: clean })
        .eq("project_id", pid)
        .eq("baugruppe", baugruppeName)
        .eq("bauteil", oldName);
      if (error) {
        console.error("MONTA: Bauteil umbenennen fehlgeschlagen.", error);
        alert(`Bauteil konnte nicht umbenannt werden: ${error.message || "unbekannter Fehler"}`);
        throw error;
      }
    } else {
      renameBauteilInRegistry(pid, baugruppeName, oldName, clean);
    }

    setStructureRows((prev) =>
      prev.map((r) =>
        r.project_id === pid &&
        r.baugruppe === baugruppeName &&
        String(r.bauteil || "") === oldName
          ? { ...r, bauteil: clean }
          : r
      )
    );
    if (selectedBaugruppe === baugruppeName && selectedBauteil === oldName) {
      setSelectedBauteil(clean);
    }
  }

  /**
   * Bauteil duplizieren: neue UUIDs, Lager/Bestell zurückgesetzt.
   * Bei Fehler: neu angelegte Zeilen entfernen, Original unverändert.
   */
  async function duplicateBauteil(pid, baugruppeName, sourceBauteil, newBauteilName) {
    const bg = String(baugruppeName || "").trim();
    const src = String(sourceBauteil || "").trim();
    const clean = String(newBauteilName || "").trim();
    if (!bg || !src || !clean) return;
    if (src === clean) {
      alert("Der neue Name muss sich vom Original unterscheiden.");
      throw new Error("duplicate same name");
    }
    const clash = structureRowsRef.current.some(
      (r) =>
        String(r.project_id) === String(pid) &&
        r.baugruppe === bg &&
        String(r.bauteil || "") === clean
    );
    if (clash) {
      alert("Dieser Bauteilname existiert in der Baugruppe bereits.");
      throw new Error("duplicate name clash");
    }

    const proj = projects.find((p) => String(p.id) === String(pid));
    const srcItems = items.filter((i) => {
      if (String(i.project_id) !== String(pid)) return false;
      const parsed = parseEinbauort(i.einbauort, proj?.baugruppe);
      return parsed.baugruppe === bg && parsed.bauteil === src;
    });

    const srcRow = structureRowsRef.current.find(
      (r) =>
        String(r.project_id) === String(pid) &&
        r.baugruppe === bg &&
        String(r.bauteil || "") === src
    );
    const sortN = Number(srcRow?.sort_order);
    const sortOrder =
      Number.isFinite(sortN) && sortN >= 0 && sortN <= 2147483647
        ? Math.floor(sortN)
        : null;

    const newStructureRow = {
      id: crypto.randomUUID(),
      project_id: String(pid),
      baugruppe: bg,
      bauteil: clean,
      bauteilgruppe: srcRow?.bauteilgruppe ?? null,
      sort_order: sortOrder,
    };

    const newItems = srcItems.map((i) => ({
      id: crypto.randomUUID(),
      project_id: String(pid),
      pos: i.pos,
      einbauort: formatEinbauort(bg, clean),
      menge: Number(i.menge || 0),
      bezeichnung: i.bezeichnung,
      groesse: i.groesse,
      laenge: i.laenge,
      oberflaeche: i.oberflaeche,
      hinweis: i.hinweis,
      important_note: Boolean(i.important_note),
      bereit: 0,
      bestellt: false,
      geliefert: false,
    }));

    const createdStructureIds = [newStructureRow.id];
    const createdItemIds = newItems.map((r) => r.id);

    async function rollback() {
      if (supabase) {
        if (createdItemIds.length) {
          await supabase.from("material_items").delete().in("id", createdItemIds);
        }
        await supabase.from("project_structure").delete().in("id", createdStructureIds);
      }
      setItems((prev) => prev.filter((i) => !createdItemIds.includes(i.id)));
      setStructureRows((prev) => prev.filter((r) => !createdStructureIds.includes(r.id)));
    }

    try {
      if (supabase) {
        // Baugruppenzeile sicherstellen (ohne Abschlussflags zu ändern)
        await insertStructureRow({ project_id: pid, baugruppe: bg, bauteil: null });
        const { error: sErr } = await supabase.from("project_structure").insert(newStructureRow);
        if (sErr) throw sErr;
        if (newItems.length) {
          const { error: iErr } = await supabase.from("material_items").insert(newItems);
          if (iErr) throw iErr;
        }
      } else {
        addBauteilToRegistry(pid, bg, clean);
      }

      loadGeneration.current += 1;
      setStructureRows((prev) =>
        hasStructureRow(prev, pid, bg, clean) ? prev : [...prev, newStructureRow]
      );
      if (newItems.length) setItems((prev) => [...prev, ...newItems]);
    } catch (err) {
      console.error("MONTA: Bauteil duplizieren fehlgeschlagen.", err);
      await rollback();
      alert(
        `Duplizieren fehlgeschlagen: ${err?.message || "unbekannter Fehler"}. Das Original wurde nicht verändert.`
      );
      throw err;
    }
  }

  /**
   * Bewusste Abschlussfreigabe für Prüfung/Lager - projektweit (nicht mehr
   * an eine einzelne Baugruppe gebunden, siehe supabase_patch_project_completion.sql).
   * Grund: Prüfung und Lager zeigen fachlich bereits das gesamte Projekt an
   * (siehe Checks.jsx/LagerView.jsx, items={projectItems}); der Abschluss
   * soll unabhängig davon sein, über welche Baugruppe/welches Bauteil der
   * Reiter geöffnet wurde. Mail nur bei false → true; Deaktivieren ohne
   * Mail; erneutes Abschließen = neuer Zyklus (unverändert gegenüber der
   * bisherigen baugruppengebundenen Variante). Die alten Felder an
   * project_structure (bauteil IS NULL) bleiben als Legacy-Daten bestehen
   * und werden von dieser Funktion nicht mehr gelesen/geschrieben.
   */
  async function setProjectCompletion(pid, field, value) {
    const allowed = ["tb_pruefung_abgeschlossen", "lager_abgeschlossen"];
    if (!allowed.includes(field)) return;
    const proj = projects.find((p) => String(p.id) === String(pid));
    if (!proj) {
      alert("Projekt konnte nicht gefunden werden.");
      throw new Error("project missing");
    }

    const nextVal = Boolean(value);
    const prevVal = Boolean(proj[field]);
    if (prevVal === nextVal) return;

    if (supabase) {
      const { error } = await supabase
        .from("projects")
        .update({ [field]: nextVal })
        .eq("id", pid);
      if (error) {
        console.error("MONTA: Abschlussstatus speichern fehlgeschlagen.", error);
        alert(`Abschlussstatus konnte nicht gespeichert werden: ${error.message || "unbekannter Fehler"}`);
        throw error;
      }
    }

    loadGeneration.current += 1;
    setProjects((prev) =>
      prev.map((p) => (String(p.id) === String(pid) ? { ...p, [field]: nextVal } : p))
    );

    if (nextVal && !prevVal && supabase) {
      // Projektweiter Abschluss statt einer einzelnen Baugruppe - "Gesamtprojekt"
      // als Geltungsbereich, analog zu notifyAllItemsOrdered() (dieselbe
      // bestehende Mail-/Dedup-Infrastruktur, keine zweite Implementierung).
      // Der Wert dient hier nur der event_key-/Zyklus-Bildung: die Mailtexte
      // selbst nennen nur den Projektnamen, keine Baugruppe (siehe
      // supabase/functions/workflow-notifications/index.ts, buildMail()).
      const scope = "Gesamtprojekt";
      try {
        if (field === "tb_pruefung_abgeschlossen") {
          const cycle = await nextEventCycle("tb_pruefung_completed", pid, scope);
          await notifyTbPruefungCompleted({ project: proj, baugruppe: scope, cycle });
        } else if (field === "lager_abgeschlossen") {
          const cycle = await nextEventCycle("lager_completed", pid, scope);
          await notifyLagerCompleted({ project: proj, baugruppe: scope, cycle });
        }
      } catch (err) {
        console.error("MONTA: Abschluss-Mail:", err?.message || err);
      }
    }
  }

  const tabFullAccess = resolveTabFullAccess({
    hasFullModuleAccess,
    session,
    profile,
    authLoading,
  });

  function openBauteil(baugruppeName, bauteilName) {
    setSelectedBaugruppe(baugruppeName);
    setSelectedBauteil(bauteilName);
    setTab(tabForBauteilOpen(lastFachTabRef.current, isNarrow, { fullAccess: tabFullAccess }));
    setView("project");
  }

  // Prüfung/Lager/Warenkorb/Druck sind projektbezogen, nicht bauteilbezogen
  // (Sprint: Projektnavigation) - deshalb keine Bauteilauswahl hier.
  function openProjectWide(tabKey) {
    setSelectedBaugruppe(null);
    setSelectedBauteil(null);
    setTab(tabKey);
    setView("projectWide");
  }

  async function addItem(item) {
    const newItem = {
      id: crypto.randomUUID(),
      project_id: projectId,
      pos: item.pos || String(projectItems.length + 1),
      einbauort: item.einbauort || "",
      menge: Number(item.menge || 0),
      bezeichnung: item.bezeichnung || "",
      groesse: item.groesse || "",
      laenge: item.laenge || "",
      oberflaeche: item.oberflaeche || "",
      hinweis: item.hinweis || "",
      important_note: Boolean(item.important_note),
      bereit: 0,
      bestellt: false,
      geliefert: false,
    };
    if (supabase) {
      const { error } = await supabase.from("material_items").insert(newItem);
      if (error) {
        console.error("MONTA: Materialposition anlegen fehlgeschlagen.", error);
        alert(`Position konnte nicht gespeichert werden: ${error.message || "unbekannter Fehler"}`);
        throw error;
      }
    }
    setItems((prev) => (prev.some((i) => i.id === newItem.id) ? prev : [...prev, newItem]));

    const parsed = parseEinbauort(newItem.einbauort, project?.baugruppe);
    try {
      await insertStructureRow({
        project_id: projectId,
        baugruppe: parsed.baugruppe,
        bauteil: null,
      });
      await insertStructureRow({
        project_id: projectId,
        baugruppe: parsed.baugruppe,
        bauteil: parsed.bauteil,
      });
    } catch {
      // Material ist gespeichert; Struktur-Fehler separat gemeldet
    }
  }

  // Rückgabewert true/false (Erfolg/Fehlschlag) zusätzlich zum bestehenden
  // Verhalten (Alert bei Fehler, kein Throw) - bestehende Aufrufer, die den
  // Rückgabewert ignorieren, sind davon unberührt. Neue Aufrufer (z. B.
  // Lager-Markierung "zuletzt geändert") können damit sicher erkennen, ob
  // eine Änderung wirklich gespeichert wurde, statt das nur zu vermuten.
  async function updateItem(id, patch) {
    if (supabase) {
      const { error } = await supabase.from("material_items").update(patch).eq("id", id);
      if (error) {
        console.error("MONTA: Materialposition aktualisieren fehlgeschlagen.", error);
        alert(`Position konnte nicht aktualisiert werden: ${error.message || "unbekannter Fehler"}`);
        return false;
      }
    }
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    return true;
  }

  /**
   * Zentrale Materialersetzung (Sprint 2B, atomar seit Sprint 2C nach
   * GPT-Code-Review): wird sowohl von TB (TechnikerEditor) als auch von
   * Lager (LagerView) aufgerufen - keine getrennte Fachlogik je Ansicht.
   *
   * Läuft über die Datenbankfunktion `replace_material_item`
   * (supabase_patch_material_replacement.sql): neue Position anlegen und
   * Ursprungsposition als ersetzt markieren geschehen dort als EINE
   * atomare Transaktion inkl. Sperre der Ursprungszeile. Damit kann weder
   * ein Zwischenzustand entstehen (kurzzeitig zwei aktive Bedarfe) noch
   * eine zweite, parallele Ersetzung derselben Ursprungsposition
   * durchgehen - kein Client-seitiges Rollback mehr nötig.
   */
  async function replaceItem(sourceId, newFields) {
    const source = items.find((i) => i.id === sourceId);
    if (!source) throw new Error("Ursprungsposition wurde nicht gefunden.");
    if (isReplacedItem(source)) throw new Error("Diese Position wurde bereits ersetzt.");

    const fields = buildReplacementFields(source, newFields);

    if (supabase) {
      const { data: newItem, error } = await supabase.rpc("replace_material_item", {
        p_source_id: source.id,
        p_bezeichnung: fields.bezeichnung,
        p_groesse: fields.groesse,
        p_laenge: fields.laenge,
        p_oberflaeche: fields.oberflaeche,
        p_hinweis: fields.hinweis,
        p_important_note: fields.important_note,
        p_menge: fields.menge,
      });
      if (error) {
        console.error("MONTA: Materialersetzung (RPC) fehlgeschlagen.", error);
        const missingFunction =
          error.code === "PGRST202" ||
          error.code === "42883" ||
          (/replace_material_item/i.test(error.message || "") &&
            /(does not exist|not find|schema cache)/i.test(error.message || ""));
        alert(
          missingFunction
            ? "Diese Funktion benötigt einen noch nicht angewendeten Datenbank-Patch " +
                "(supabase_patch_material_replacement.sql). Bitte den Administrator informieren."
            : `Ersetzen konnte nicht abgeschlossen werden: ${error.message || "unbekannter Fehler"}. ` +
                "Die alte Position ist unverändert."
        );
        throw error;
      }
      setItems((prev) => {
        const withoutDuplicate = prev.filter((i) => i.id !== newItem.id);
        return [
          ...withoutDuplicate.map((i) =>
            i.id === source.id ? { ...i, ersetzt_durch: newItem.id } : i
          ),
          newItem,
        ];
      });
      return newItem;
    }

    // Lokaler Fallback ohne Supabase: in der Praxis nicht erreichbar, da
    // load() ohne Supabase-Verbindung keine Projektdaten lädt (siehe
    // load() oben) - nur zur Symmetrie mit addItem/updateItem/deleteItem.
    const posBasis = items.filter((i) => i.project_id === source.project_id);
    const newItem = {
      id: crypto.randomUUID(),
      project_id: source.project_id,
      pos: nextPosNumber(posBasis),
      einbauort: source.einbauort,
      ...fields,
    };
    setItems((prev) => [
      ...prev.map((i) => (i.id === source.id ? { ...i, ersetzt_durch: newItem.id } : i)),
      newItem,
    ]);
    return newItem;
  }

  /**
   * Lager-Gesamtänderung (Praxis-Sprint): eine Änderung an einer
   * aggregierten Lagerzeile gilt für ALLE zusammengefassten
   * Ursprungspositionen. `replacements`/`directUpdates` kommen bereits
   * fertig aufgelöst aus resolveBulkPatch() (lagerBulkEdit.js) - diese
   * Funktion serialisiert sie nur für die atomare RPC
   * `replace_material_items_bulk`
   * (supabase_patch_lager_bulk_edit.sql): sperrt alle betroffenen Zeilen
   * und führt Ersetzung + Direktänderung in EINER Transaktion aus - kein
   * Teilerfolg bei einem Fehler.
   */
  async function replaceItemsBulk({ replacements, directUpdates }) {
    if (!supabase) {
      alert("Die Lager-Gesamtänderung ist ohne Supabase-Verbindung nicht möglich.");
      throw new Error("Supabase nicht konfiguriert.");
    }
    const p_replacements = (replacements || []).map((r) => ({
      source_id: r.source.id,
      bezeichnung: r.fields.bezeichnung,
      groesse: r.fields.groesse,
      laenge: r.fields.laenge,
      oberflaeche: r.fields.oberflaeche,
      hinweis: r.fields.hinweis,
      important_note: r.fields.important_note,
      menge: r.fields.menge,
    }));
    const p_direct_updates = (directUpdates || []).map((u) => ({
      id: u.id,
      bezeichnung: u.fields.bezeichnung,
      groesse: u.fields.groesse,
      laenge: u.fields.laenge,
      oberflaeche: u.fields.oberflaeche,
      hinweis: u.fields.hinweis,
      important_note: u.fields.important_note,
    }));

    const { data: rows, error } = await supabase.rpc("replace_material_items_bulk", {
      p_replacements,
      p_direct_updates,
    });
    if (error) {
      console.error("MONTA: Lager-Gesamtänderung (RPC) fehlgeschlagen.", error);
      const missingFunction =
        error.code === "PGRST202" ||
        error.code === "42883" ||
        (/replace_material_items_bulk/i.test(error.message || "") &&
          /(does not exist|not find|schema cache)/i.test(error.message || ""));
      alert(
        missingFunction
          ? "Diese Funktion benötigt einen noch nicht angewendeten Datenbank-Patch " +
              "(supabase_patch_lager_bulk_edit.sql). Bitte den Administrator informieren."
          : `Gesamtänderung konnte nicht abgeschlossen werden: ${error.message || "unbekannter Fehler"}. ` +
              "Es wurde nichts geändert."
      );
      throw error;
    }
    const returned = rows || [];
    setItems((prev) => {
      const byId = new Map(returned.map((r) => [r.id, r]));
      const merged = prev.map((i) => (byId.has(i.id) ? byId.get(i.id) : i));
      const existingIds = new Set(prev.map((i) => i.id));
      const newOnes = returned.filter((r) => !existingIds.has(r.id));
      return [...merged, ...newOnes];
    });
    return returned;
  }

  async function deleteItem(id) {
    // Löschschutz (Sprint 2C): eine Position, auf die eine ältere Position
    // über ersetzt_durch verweist, darf nicht gelöscht werden - sonst
    // würde die Altposition (bei einer künftigen Regeländerung oder einem
    // direkten DB-Zugriff) wieder wie ein aktueller Bedarf wirken. Auf
    // Datenbankebene zusätzlich über "on delete restrict" abgesichert.
    if (isReferencedAsReplacement(items.find((i) => i.id === id), items)) {
      alert(REPLACEMENT_TARGET_LOCKED_DELETE_MESSAGE);
      return;
    }
    if (!confirm("Position wirklich löschen?")) return;
    if (supabase) {
      const { error } = await supabase.from("material_items").delete().eq("id", id);
      if (error) {
        console.error("MONTA: Materialposition löschen fehlgeschlagen.", error);
        const isRestrictViolation = error.code === "23503";
        alert(
          isRestrictViolation
            ? REPLACEMENT_TARGET_LOCKED_DELETE_MESSAGE
            : `Position konnte nicht gelöscht werden: ${error.message || "unbekannter Fehler"}`
        );
        return;
      }
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  if (authLoading) {
    return (
      <Shell compact>
        <p>Lade MONTA…</p>
      </Shell>
    );
  }

  if (supabaseConfigured && (recoveryMode || !session)) {
    return (
      <Shell compact>
        <AuthPage />
      </Shell>
    );
  }

  if (supabaseConfigured && isBlocked) {
    return (
      <Shell compact>
        <AccessBlocked />
      </Shell>
    );
  }

  if (supabaseConfigured && (isPending || !isActive)) {
    return (
      <Shell compact>
        <AccessPending />
      </Shell>
    );
  }

  const shellUser = {
    userLabel: profile?.display_name || profile?.email || session?.user?.email || "",
    showAdmin: Boolean(isAdmin),
    onOpenAdmin: () => setView("adminUsers"),
    onLogout: handleLogout,
    onSwipeBack: goBack,
  };

  function handleOpenPrintJob({ projectId: pid, baugruppe: bg }) {
    setProjectId(pid);
    setSelectedBaugruppe(bg);
    setSelectedBauteil(null);
    setTab("druck");
    setView("project");
  }

  if (view === "adminUsers" && isAdmin) {
    return (
      <Shell {...shellUser}>
        <UserAdminView
          onBack={() => setView("projects")}
          onPrintStationUserChanged={(uid) => setPrintStationUserId(uid)}
        />
      </Shell>
    );
  }

  if (loading) {
    return (
      <Shell {...shellUser}>
        <p>Lade MONTA…</p>
      </Shell>
    );
  }

  if (loadError) {
    return (
      <Shell {...shellUser}>
        <div className="card loadErrorCard">
          <h2>MONTA konnte die Daten nicht laden.</h2>
          <p className="hint">{loadError}</p>
          <button onClick={() => load()}>Erneut versuchen</button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell {...shellUser}>
      <PrintStationWorker
        enabled={Boolean(isActive && printStationUserId && printStationUserId === session?.user?.id)}
        projects={projects}
        onOpenPrintJob={handleOpenPrintJob}
      />
      {view === "projects" && (
        <div>
          <ProjectsList
            projects={visibleProjects}
            items={items}
            structureRows={structureRows}
            setView={setView}
            setProjectId={setProjectId}
          />
          {visibleProjects.length > 0 && (
            <button style={{ marginTop: 12 }} onClick={() => setShowArchived((s) => !s)}>
              {showArchived ? "Archiv ausblenden" : "Archiv anzeigen"}
            </button>
          )}
          <PrintStationPanel
            userId={session?.user?.id}
            isAssignedUser={printStationUserId === session?.user?.id}
          />
        </div>
      )}

      {view === "newProject" && (
        <NewProjectForm setView={setView} createProject={createProject} />
      )}

      {view === "projectDetail" && project && (
        <ProjectDetail
          project={project}
          items={projectItems}
          structureRows={structureRows}
          setView={setView}
          openBauteil={openBauteil}
          openProjectWide={openProjectWide}
          fullModuleAccess={Boolean(tabFullAccess)}
          setProjectArchived={setProjectArchived}
          deleteProject={deleteProject}
          addBaugruppe={addBaugruppe}
          addBauteil={addBauteil}
          deleteBaugruppe={deleteBaugruppe}
          deleteBauteil={deleteBauteil}
          renameBaugruppe={renameBaugruppe}
          renameBauteil={renameBauteil}
          duplicateBauteil={duplicateBauteil}
        />
      )}

      {view === "project" && project && (
        <ProjectView
          project={project}
          baugruppe={selectedBaugruppe}
          bauteil={selectedBauteil}
          bauteilItems={bauteilItems}
          baugruppeItems={baugruppeItems}
          projectItems={projectItems}
          allItems={items}
          allProjects={projects}
          structureRows={structureRows}
          backToDetail={() => setView("projectDetail")}
          fullModuleAccess={Boolean(tabFullAccess)}
          tab={tab}
          setTab={setTab}
          addItem={addItem}
          updateItem={updateItem}
          deleteItem={deleteItem}
          replaceItem={replaceItem}
          replaceItemsBulk={replaceItemsBulk}
          setProjectCompletion={setProjectCompletion}
        />
      )}

      {view === "projectWide" && project && (
        <ProjectWideView
          project={project}
          projectItems={projectItems}
          allItems={items}
          allProjects={projects}
          structureRows={structureRows}
          backToDetail={() => setView("projectDetail")}
          fullModuleAccess={Boolean(tabFullAccess)}
          tab={tab}
          setTab={setTab}
          updateItem={updateItem}
          replaceItem={replaceItem}
          replaceItemsBulk={replaceItemsBulk}
          setProjectCompletion={setProjectCompletion}
        />
      )}
    </Shell>
  );
}

// Online/Offline-Start (Sprint: Lager-Offline-Praxis). Bewusst als
// eigener, vollständig getrennter Einstiegspfad VOR AuthProvider/App:
// ist das Gerät beim Start offline, wird ausschließlich die read-only
// OfflineApp gerendert - AuthProvider/AuthContext.jsx werden in diesem
// Zweig gar nicht erst instanziiert, es gibt also keine Berührung mit dem
// bestehenden Online-Auth-Lifecycle. Ist Internet vorhanden, startet
// MONTA exakt wie bisher (einzige Ergänzung: die - vom Ergebnis
// unabhängige - Registrierung des App-Shell-Service-Workers, damit ein
// späterer Offline-Start die Anwendungs-Shell laden kann).
//
// Die Entscheidung fällt bewusst nur einmal beim Start (nicht laufend
// live), passend zum beschriebenen Arbeitsablauf: Offline-Modus morgens
// im WLAN vorbereiten, danach App ggf. schließen und ohne Netz erneut
// öffnen (siehe MONTA_NEXT_SPRINT.md / Sprintbericht für Details und
// bekannte Grenzfälle von navigator.onLine).
registerAppShellServiceWorker();

async function bootstrap() {
  const root = createRoot(document.getElementById("root"));
  const isOnline = typeof navigator === "undefined" ? true : navigator.onLine;

  if (!isOnline) {
    const snapshot = await loadSnapshot();
    const state = decideOfflineState({ isOnline: false, snapshot });
    root.render(<OfflineApp state={state} snapshot={snapshot} />);
    return;
  }

  root.render(
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}

bootstrap();
