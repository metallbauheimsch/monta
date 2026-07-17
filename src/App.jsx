import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles/style.css";
import Shell from "./components/Shell";
import ProjectsList from "./features/projects/ProjectsList";
import NewProjectForm from "./features/projects/NewProjectForm";
import ProjectDetail from "./features/projects/ProjectDetail";
import ProjectView from "./features/projects/ProjectView";
import { supabase } from "./services/supabaseClient";
import { isMobileLike, useIsNarrow } from "./utils/helpers";
import {
  parseEinbauort,
  formatEinbauort,
  removeBaugruppeFromRegistry,
  renameBaugruppeInRegistry,
  renameBauteilInRegistry,
} from "./utils/structure";
import { defaultTabFor } from "./utils/tabs";
import { demoProjects, demoItems } from "./utils/demoData";
import { renameBaugruppeInManualValues } from "./features/fastening/stock";

// Sparsamer Fallback, wenn Realtime aussetzt (Mobil-Standby, Tab im
// Hintergrund). Nur bei sichtbarer Seite; kein Sekundentakt.
const SYNC_POLL_MS = 20000;

function App() {
  const [projects, setProjects] = useState([]);
  const [items, setItems] = useState([]);
  const [view, setView] = useState("projects");
  const [projectId, setProjectId] = useState(null);

  // Aktuell geöffnete Baugruppe/Bauteil (Arbeitsansicht bezieht sich darauf)
  const [selectedBaugruppe, setSelectedBaugruppe] = useState(null);
  const [selectedBauteil, setSelectedBauteil] = useState(null);

  const isNarrow = useIsNarrow();
  const [tab, setTab] = useState(() => defaultTabFor(isMobileLike()));
  const [loading, setLoading] = useState(true);
  // Fehlermeldung, falls das Laden der Daten fehlschlägt (siehe load() unten).
  // Verhindert, dass die App bei einem Supabase-Fehler dauerhaft im
  // Ladezustand hängen bleibt (Produktionsfehler, siehe MONTA_CHANGELOG.md).
  const [loadError, setLoadError] = useState(null);
  const [showArchived, setShowArchived] = useState(false);

  const loadInFlight = useRef(null);

  const project = projects.find((p) => p.id === projectId);
  const projectItems = items.filter((i) => i.project_id === projectId);

  const baugruppeItems = projectItems.filter(
    (i) => parseEinbauort(i.einbauort, project?.baugruppe).baugruppe === selectedBaugruppe
  );
  const bauteilItems = baugruppeItems.filter(
    (i) => parseEinbauort(i.einbauort, project?.baugruppe).bauteil === selectedBauteil
  );

  // Standardmäßig nur aktive Projekte anzeigen; "archived" fehlt in alten
  // Daten -> wird als false behandelt (Filter greift nur bei archived === true).
  const visibleProjects = showArchived ? projects : projects.filter((p) => !p.archived);

  // Lädt Projekte + Materialpositionen.
  // silent=true: Hintergrund-Sync (Realtime/Fokus/Polling) ohne Vollbild-Lader.
  const load = useCallback(async ({ silent = false } = {}) => {
    if (loadInFlight.current) return loadInFlight.current;

    const run = (async () => {
      if (!silent) {
        setLoading(true);
        setLoadError(null);
      }
      try {
        if (!supabase) {
          const rawP = localStorage.getItem("monta_projects_v04");
          const rawI = localStorage.getItem("monta_items_v04");
          const parsedP = rawP ? JSON.parse(rawP) : null;
          const parsedI = rawI ? JSON.parse(rawI) : null;
          // Demo nur, wenn noch nie lokale Daten existierten. Leeres Array
          // nach Löschen des letzten Projekts bleibt leer (kein Auto-Demo).
          const p = parsedP !== null ? parsedP : demoProjects;
          const i = parsedI !== null ? parsedI : demoItems;
          setProjects(p);
          setItems(i);
          return;
        }
        const [projectsRes, itemsRes] = await Promise.all([
          supabase.from("projects").select("*").order("created_at", { ascending: false }),
          supabase.from("material_items").select("*").order("created_at", { ascending: true }),
        ]);
        if (projectsRes.error) {
          throw new Error(`Projekte: ${projectsRes.error.message || "unbekannter Fehler"}`);
        }
        if (itemsRes.error) {
          throw new Error(`Materialpositionen: ${itemsRes.error.message || "unbekannter Fehler"}`);
        }
        setProjects(projectsRes.data || []);
        setItems(itemsRes.data || []);
      } catch (err) {
        console.error("MONTA: Laden der Daten fehlgeschlagen.", err);
        if (!silent) {
          setLoadError(err?.message || "Unbekannter Fehler beim Laden der Daten.");
        }
      } finally {
        if (!silent) setLoading(false);
        loadInFlight.current = null;
      }
    })();

    loadInFlight.current = run;
    return run;
  }, []);

  useEffect(() => {
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
      .subscribe((status, err) => {
        // Channel-Zustand nur in der Konsole – kein dauerhafter UI-Hinweis.
        if (err) console.warn("MONTA Realtime:", status, err);
        else console.info("MONTA Realtime:", status);
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          console.warn(
            "MONTA: Realtime unterbrochen – Sync läuft weiter über Fokus/Sichtbarkeit und Fallback-Reload."
          );
        }
      });

    function refreshWhenVisible() {
      if (document.visibilityState === "visible") load({ silent: true });
    }
    function refreshOnFocus() {
      load({ silent: true });
    }
    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("focus", refreshOnFocus);

    const pollId = setInterval(() => {
      if (document.visibilityState === "visible") load({ silent: true });
    }, SYNC_POLL_MS);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("focus", refreshOnFocus);
      clearInterval(pollId);
    };
  }, [load]);

  function persistLocal(nextProjects, nextItems) {
    if (!supabase) {
      localStorage.setItem("monta_projects_v04", JSON.stringify(nextProjects));
      localStorage.setItem("monta_items_v04", JSON.stringify(nextItems));
    }
  }

  // Persistiert lokal automatisch bei jeder Zustandsänderung (funktionale
  // setState-Updates unten sind dadurch immer die Quelle der Wahrheit).
  useEffect(() => {
    if (!loading) persistLocal(projects, items);
  }, [projects, items, loading]);

  function resetSelectionToOverview() {
    setProjectId(null);
    setSelectedBaugruppe(null);
    setSelectedBauteil(null);
    setView("projects");
  }

  // Wenn das geöffnete Projekt auf einem anderen Gerät gelöscht wurde
  // (Realtime/Polling), nicht auf einer leeren Detailansicht bleiben.
  useEffect(() => {
    if (loading || loadError) return;
    if (projectId && !projects.some((p) => p.id === projectId)) {
      resetSelectionToOverview();
    }
  }, [projects, projectId, loading, loadError]);

  async function createProject(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const newProject = {
      id: crypto.randomUUID(),
      nr: f.get("nr"),
      name: f.get("name"),
      baugruppe: f.get("baugruppe") || "",
      // Zeichnungsnummer wird beim Anlegen nicht mehr abgefragt (Hotfix vor
      // Pilot) - Feld bleibt in Daten/DB erhalten und wird leer gespeichert.
      zeichnung: "",
      // Feld "archived" standardmäßig auf false (keine DB-Migration nötig,
      // fehlt die Spalte serverseitig, wird sie beim Lesen ohnehin als
      // falsy/undefined behandelt und damit wie false interpretiert).
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
        // Spalte "archived" fehlt ggf. serverseitig noch – verständlich melden.
        console.error("MONTA: Projekt archivieren fehlgeschlagen.", error);
        alert(`Projektstatus konnte nicht gespeichert werden: ${error.message || "unbekannter Fehler"}`);
        return;
      }
    }
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, archived } : p)));
  }

  // Löscht ein Projekt inkl. seiner Materialpositionen unwiderruflich.
  // Wird erst nach expliziter Sicherheitsabfrage in der UI aufgerufen.
  // Auch das letzte Projekt darf gelöscht werden → leere Projektübersicht.
  async function deleteProject(id) {
    if (supabase) {
      // "on delete cascade" entfernt zugehörige material_items serverseitig.
      // Erfordert RLS-Policy "public delete projects" (siehe supabase_schema.sql).
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) {
        console.error("MONTA: Projekt löschen fehlgeschlagen.", error);
        alert(`Projekt konnte nicht gelöscht werden: ${error.message || "unbekannter Fehler"}`);
        throw error;
      }
    }
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setItems((prev) => prev.filter((i) => i.project_id !== id));
    if (projectId === id) resetSelectionToOverview();
  }

  // Löscht eine komplette Baugruppe inkl. aller enthaltenen Bauteile und
  // Materialpositionen. Bestellt/Geliefert hängt an material_items und wird
  // mitgelöscht. Wird erst nach expliziter Sicherheitsabfrage aufgerufen.
  async function deleteBaugruppe(pid, baugruppeName) {
    const ids = projectItems
      .filter((i) => parseEinbauort(i.einbauort, project?.baugruppe).baugruppe === baugruppeName)
      .map((i) => i.id);
    if (supabase && ids.length) {
      const { error } = await supabase.from("material_items").delete().in("id", ids);
      if (error) {
        console.error("MONTA: Baugruppe löschen fehlgeschlagen.", error);
        alert(`Baugruppe konnte nicht gelöscht werden: ${error.message || "unbekannter Fehler"}`);
        throw error;
      }
    }
    if (ids.length) setItems((prev) => prev.filter((i) => !ids.includes(i.id)));
    removeBaugruppeFromRegistry(pid, baugruppeName);
    if (selectedBaugruppe === baugruppeName) {
      setSelectedBaugruppe(null);
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
    renameBaugruppeInRegistry(pid, oldName, clean);
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
    renameBauteilInRegistry(pid, baugruppeName, oldName, clean);
    if (selectedBaugruppe === baugruppeName && selectedBauteil === oldName) {
      setSelectedBauteil(clean);
    }
  }

  function openBauteil(baugruppeName, bauteilName) {
    setSelectedBaugruppe(baugruppeName);
    setSelectedBauteil(bauteilName);
    setTab(defaultTabFor(isNarrow));
    setView("project");
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
  }

  async function updateItem(id, patch) {
    if (supabase) {
      const { error } = await supabase.from("material_items").update(patch).eq("id", id);
      if (error) {
        console.error("MONTA: Materialposition aktualisieren fehlgeschlagen.", error);
        alert(`Position konnte nicht aktualisiert werden: ${error.message || "unbekannter Fehler"}`);
        return;
      }
    }
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  async function deleteItem(id) {
    if (!confirm("Position wirklich löschen?")) return;
    if (supabase) {
      const { error } = await supabase.from("material_items").delete().eq("id", id);
      if (error) {
        console.error("MONTA: Materialposition löschen fehlgeschlagen.", error);
        alert(`Position konnte nicht gelöscht werden: ${error.message || "unbekannter Fehler"}`);
        return;
      }
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  if (loading) return <Shell><p>Lade MONTA…</p></Shell>;

  if (loadError) {
    return (
      <Shell>
        <div className="card loadErrorCard">
          <h2>MONTA konnte die Daten nicht laden.</h2>
          <p className="hint">{loadError}</p>
          <button onClick={() => load()}>Erneut versuchen</button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      {view === "projects" && (
        <div>
          <ProjectsList
            projects={visibleProjects}
            items={items}
            setView={setView}
            setProjectId={setProjectId}
          />
          {visibleProjects.length > 0 && (
            <button style={{ marginTop: 12 }} onClick={() => setShowArchived((s) => !s)}>
              {showArchived ? "Archiv ausblenden" : "Archiv anzeigen"}
            </button>
          )}
        </div>
      )}

      {view === "newProject" && (
        <NewProjectForm setView={setView} createProject={createProject} />
      )}

      {view === "projectDetail" && project && (
        <ProjectDetail
          project={project}
          items={projectItems}
          setView={setView}
          openBauteil={openBauteil}
          setProjectArchived={setProjectArchived}
          deleteProject={deleteProject}
          deleteBaugruppe={deleteBaugruppe}
          renameBaugruppe={renameBaugruppe}
          renameBauteil={renameBauteil}
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
          backToDetail={() => setView("projectDetail")}
          isNarrow={isNarrow}
          tab={tab}
          setTab={setTab}
          addItem={addItem}
          updateItem={updateItem}
          deleteItem={deleteItem}
        />
      )}
    </Shell>
  );
}

createRoot(document.getElementById("root")).render(<App />);
