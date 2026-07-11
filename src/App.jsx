import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles/style.css";
import Shell from "./components/Shell";
import ProjectsList from "./features/projects/ProjectsList";
import NewProjectForm from "./features/projects/NewProjectForm";
import ProjectDetail from "./features/projects/ProjectDetail";
import ProjectView from "./features/projects/ProjectView";
import { supabase } from "./services/supabaseClient";
import { isMobileLike } from "./utils/helpers";
import { parseEinbauort } from "./utils/structure";
import { defaultTabFor } from "./utils/tabs";
import { demoProjects, demoItems } from "./utils/demoData";

function App() {
  const [projects, setProjects] = useState([]);
  const [items, setItems] = useState([]);
  const [view, setView] = useState("projects");
  const [projectId, setProjectId] = useState(null);

  // Aktuell geöffnete Baugruppe/Bauteil (Arbeitsansicht bezieht sich darauf)
  const [selectedBaugruppe, setSelectedBaugruppe] = useState(null);
  const [selectedBauteil, setSelectedBauteil] = useState(null);

  const [tab, setTab] = useState(defaultTabFor(isMobileLike() ? "mobil" : "pc"));
  const [loading, setLoading] = useState(true);
  const [deviceMode, setDeviceMode] = useState(isMobileLike() ? "mobil" : "pc");

  const [showArchived, setShowArchived] = useState(false);

  // "Bestellung erfolgt"-Markierung je Baugruppe (Sprint 5 Erweiterung #4-6).
  // Bewusst immer nur lokal in localStorage gehalten - auch wenn Supabase
  // aktiv ist -, da hierfür ausdrücklich keine Datenbankänderung/Migration
  // gewünscht ist. Key-Format: "<projectId>|<baugruppe>" -> boolean.
  const [orderedBaugruppen, setOrderedBaugruppen] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("monta_baugruppe_bestellt_v04") || "{}");
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("monta_baugruppe_bestellt_v04", JSON.stringify(orderedBaugruppen));
    } catch {
      // localStorage evtl. nicht verfügbar - Markierung bleibt nur für die Sitzung erhalten
    }
  }, [orderedBaugruppen]);

  function baugruppeFlagKey(pid, baugruppe) {
    return `${pid}|${baugruppe}`;
  }

  function isBaugruppeBestellt(pid, baugruppe) {
    return Boolean(orderedBaugruppen[baugruppeFlagKey(pid, baugruppe)]);
  }

  function setBaugruppeBestellt(pid, baugruppe, bestellt) {
    setOrderedBaugruppen((prev) => ({ ...prev, [baugruppeFlagKey(pid, baugruppe)]: bestellt }));
  }

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

  async function load() {
    setLoading(true);
    if (!supabase) {
      const p = JSON.parse(localStorage.getItem("monta_projects_v04") || "null") || demoProjects;
      const i = JSON.parse(localStorage.getItem("monta_items_v04") || "null") || demoItems;
      setProjects(p);
      setItems(i);
      setLoading(false);
      return;
    }
    const [{ data: p }, { data: i }] = await Promise.all([
      supabase.from("projects").select("*").order("created_at", { ascending: false }),
      supabase.from("material_items").select("*").order("created_at", { ascending: true }),
    ]);
    setProjects(p || []);
    setItems(i || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    if (!supabase) return;
    const channel = supabase
      .channel("monta-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "material_items" }, load)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  function persistLocal(nextProjects, nextItems) {
    if (!supabase) {
      localStorage.setItem("monta_projects_v04", JSON.stringify(nextProjects));
      localStorage.setItem("monta_items_v04", JSON.stringify(nextItems));
    }
  }

  // Persistiert lokal automatisch bei jeder Zustandsänderung (funktionale
  // setState-Updates unten sind dadurch immer die Quelle der Wahrheit).
  // Vorher wurde persistLocal(next, ...) direkt aus jeder Aktion heraus mit
  // dem jeweils berechneten Array aufgerufen - bei mehreren addItem-Aufrufen
  // in Folge (z. B. Hauptposition + Mitlaufartikel) basierten diese Aufrufe
  // alle auf demselben veralteten "items"-Stand, sodass am Ende nur die
  // zuletzt hinzugefügte Position übrig blieb (Fehlerursache Sprint 4 #3).
  useEffect(() => {
    if (!loading) persistLocal(projects, items);
  }, [projects, items, loading]);

  async function createProject(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const newProject = {
      id: crypto.randomUUID(),
      nr: f.get("nr"),
      name: f.get("name"),
      baugruppe: f.get("baugruppe") || "",
      zeichnung: f.get("zeichnung"),
      // Feld "archived" standardmäßig auf false (keine DB-Migration nötig,
      // fehlt die Spalte serverseitig, wird sie beim Lesen ohnehin als
      // falsy/undefined behandelt und damit wie false interpretiert).
      archived: false,
    };
    if (supabase) await supabase.from("projects").insert(newProject);
    else setProjects((prev) => [newProject, ...prev]);
    setProjectId(newProject.id);
    setSelectedBaugruppe(null);
    setSelectedBauteil(null);
    setView("projectDetail");
  }

  async function setProjectArchived(id, archived) {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, archived } : p)));
    if (supabase) {
      try {
        await supabase.from("projects").update({ archived }).eq("id", id);
      } catch {
        // Spalte "archived" existiert serverseitig ggf. noch nicht (keine
        // Migration durchgeführt) - Status bleibt dann clientseitig erhalten.
      }
    }
  }

  // Löscht ein Projekt inkl. seiner Materialpositionen unwiderruflich.
  // Wird erst nach expliziter Sicherheitsabfrage in der UI aufgerufen.
  async function deleteProject(id) {
    if (supabase) {
      // "on delete cascade" in supabase_schema.sql entfernt zugehörige
      // material_items serverseitig automatisch.
      await supabase.from("projects").delete().eq("id", id);
    } else {
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setItems((prev) => prev.filter((i) => i.project_id !== id));
    }
    if (projectId === id) setProjectId(null);
  }

  function openBauteil(baugruppeName, bauteilName) {
    setSelectedBaugruppe(baugruppeName);
    setSelectedBauteil(bauteilName);
    setTab(defaultTabFor(deviceMode));
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
    if (supabase) await supabase.from("material_items").insert(newItem);
    else setItems((prev) => [...prev, newItem]);
  }

  async function updateItem(id, patch) {
    if (supabase) await supabase.from("material_items").update(patch).eq("id", id);
    else setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  async function deleteItem(id) {
    if (!confirm("Position wirklich löschen?")) return;
    if (supabase) await supabase.from("material_items").delete().eq("id", id);
    else setItems((prev) => prev.filter((i) => i.id !== id));
  }

  if (loading) return <Shell deviceMode={deviceMode} setDeviceMode={setDeviceMode}><p>Lade MONTA…</p></Shell>;

  return (
    <Shell deviceMode={deviceMode} setDeviceMode={setDeviceMode}>
      {view === "projects" && (
        <div>
          <ProjectsList
            projects={visibleProjects}
            items={items}
            setView={setView}
            setProjectId={setProjectId}
            isBaugruppeBestellt={isBaugruppeBestellt}
          />
          <button style={{ marginTop: 12 }} onClick={() => setShowArchived((s) => !s)}>
            {showArchived ? "Archiv ausblenden" : "Archiv anzeigen"}
          </button>
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
          isBaugruppeBestellt={isBaugruppeBestellt}
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
          deviceMode={deviceMode}
          tab={tab}
          setTab={setTab}
          addItem={addItem}
          updateItem={updateItem}
          deleteItem={deleteItem}
          isBaugruppeBestellt={isBaugruppeBestellt}
          setBaugruppeBestellt={setBaugruppeBestellt}
        />
      )}
    </Shell>
  );
}

createRoot(document.getElementById("root")).render(<App />);
