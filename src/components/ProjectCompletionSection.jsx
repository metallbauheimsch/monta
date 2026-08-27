import CompletionCheckbox from "./CompletionCheckbox";

/**
 * Abschluss-Checkbox für TB/Prüfung bzw. Lagerprüfung - wiederverwendet von
 * Checks.jsx/LagerView.jsx, egal ob über ein konkretes Bauteil (ProjectView)
 * oder über die projektweite Navigation (ProjectWideView) geöffnet. Keine
 * zweite Workflow-Implementierung: ruft ausschließlich das bestehende
 * setProjectCompletion() auf (Berechtigungsprüfung, Mail-Workflow,
 * Realtime-/Statuslogik bleiben dort unverändert).
 *
 * Fachkorrektur: Prüfung und Lager zeigen bereits seit der Projektnavigation
 * immer das gesamte Projekt an (siehe Checks.jsx/LagerView.jsx,
 * items={projectItems}) - der Abschlussstatus gehört deshalb zum Projekt,
 * nicht zu einer einzelnen Baugruppe. Ersetzt die frühere
 * BaugruppeCompletionSection (Status an project_structure, abhängig davon,
 * über welche Baugruppe der Reiter geöffnet wurde). Über beide Einstiege
 * (Bauteil wie projektweit) erscheint dieselbe eine Checkbox mit demselben
 * Status - GLEICHER REITER + GLEICHER WORKFLOW + ANDERER EINSTIEG.
 */
export default function ProjectCompletionSection({
  project,
  field,
  label,
  confirmMessage,
  setProjectCompletion,
}) {
  if (!setProjectCompletion || !project) return null;

  return (
    <CompletionCheckbox
      label={label}
      checked={Boolean(project[field])}
      onToggle={(next) => setProjectCompletion(project.id, field, next)}
      confirmMessage={confirmMessage}
    />
  );
}
