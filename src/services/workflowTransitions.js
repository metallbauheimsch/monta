// Reine Übergangslogik der Workflow-Watcher (useWorkflowWatchers.js) - in
// einer eigenen .js-Datei ohne React/Supabase, damit sie mit node:test
// prüfbar ist. Die Bedingungen für "Alle Pos. bestellt"-Mail und
// Druckjob sind 1:1 die bisherigen (unverändert).

/**
 * @param {Record<string,string>} prevProject  projectId -> Statusschlüssel (vorher)
 * @param {Record<string,string>} nextProject  projectId -> Statusschlüssel (jetzt)
 * @param {Record<string,string>} prevBg       "projectId|baugruppe" -> Status (vorher)
 * @param {Record<string,string>} nextBg       "projectId|baugruppe" -> Status (jetzt)
 */
export function planWorkflowTransitions(prevProject, nextProject, prevBg, nextBg) {
  const allItemsOrdered = [];
  const readyProjects = [];
  for (const [projectId, status] of Object.entries(nextProject || {})) {
    const before = (prevProject || {})[projectId];
    if (before === status) continue;
    // Bisherige Regel "Alle Pos. bestellt" (unverändert).
    if (status === "bestellt" && before && before !== "bestellt" && before !== "bereit") {
      allItemsOrdered.push(projectId);
    }
    // Sprint 2C: Kandidat für die einmalige Druckmail. Bewusst auch ohne
    // bekannten Vorzustand (erstes Erscheinen nach dem Laden) - ob
    // tatsächlich gesendet wird, entscheidet ausschließlich der Server
    // (Aktivierung, frische Materialprüfung, einmaliger event_key,
    // Bestandsprojekt-Markierung).
    if (status === "bereit") readyProjects.push(projectId);
  }

  const printJobs = [];
  for (const [key, status] of Object.entries(nextBg || {})) {
    const before = (prevBg || {})[key];
    if (before === status) continue;
    const [projectId, baugruppe] = key.split("|");
    if (!baugruppe) continue;
    // Bisherige Regel automatischer Druckjob je Baugruppe (unverändert).
    if (status === "bereit" && before && before !== "bereit") {
      printJobs.push({ projectId, baugruppe });
    }
  }

  return { allItemsOrdered, readyProjects, printJobs };
}

/** Projekte, die beim ersten Abgleich (Seed) bereits bereit sind. */
export function readyProjectIds(byProject) {
  return Object.entries(byProject || {})
    .filter(([, status]) => status === "bereit")
    .map(([projectId]) => projectId);
}

// Gerätemerker (Sprint 2C, Sicherheitsprüfung): Solange die Druckmail auf
// diesem Gerät nie als aktiv gemeldet wurde, entfällt der Serveraufruf beim
// App-Start (vor dem SQL-Patch bzw. bei inaktivem Schalter wäre er bei
// jedem Start unnötig). Grünwechsel fragen weiterhin immer nach - darüber
// wird eine spätere Aktivierung erkannt und der Merker gesetzt. Meldet der
// Server "inaktiv", wird der Merker wieder gelöscht.
const READY_MAIL_ACTIVE_KEY = "monta_ready_print_mail_active_v1";

function defaultStorage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

export function readyMailSeenActive(storage = defaultStorage()) {
  try {
    return storage?.getItem(READY_MAIL_ACTIVE_KEY) === "1";
  } catch {
    return false;
  }
}

export function rememberReadyMailActive(active, storage = defaultStorage()) {
  try {
    if (!storage) return;
    if (active === true) storage.setItem(READY_MAIL_ACTIVE_KEY, "1");
    else storage.removeItem(READY_MAIL_ACTIVE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Sobald die einmalige Druckmail serverseitig aktiviert ist, werden keine
 * automatischen Druckjobs mehr erzeugt (zusätzlich serverseitig per
 * Trigger abgesichert). Inaktiv/unbekannt: bisheriges Verhalten.
 */
export function printJobsAfterReadyMail(printJobs, readyMailActive) {
  return readyMailActive === true ? [] : printJobs || [];
}

/**
 * Antwort der RPC request_project_ready_print_mails auswerten. Alles, was
 * nicht eindeutig "aktiv" ist (fehlende Funktion vor dem SQL-Patch,
 * Fehler, unerwartetes Format), gilt als inaktiv: keine Mail, bisherige
 * Druckjobs bleiben.
 * Liefert die zu versendenden Event-IDs: neu angelegte (nur der eine
 * Client, dessen Insert gewonnen hat, bekommt sie) und hängengebliebene
 * pending-Events (Edge Function beansprucht atomar - kein Doppelversand).
 */
export function parseProjectReadyPrintResponse(data) {
  if (!data || typeof data !== "object" || data.enabled !== true) {
    return { active: false, eventIds: [] };
  }
  const ids = [
    ...(Array.isArray(data.created) ? data.created : []),
    ...(Array.isArray(data.retry) ? data.retry : []),
  ].filter((id) => typeof id === "string" && id);
  return { active: true, eventIds: [...new Set(ids)] };
}
