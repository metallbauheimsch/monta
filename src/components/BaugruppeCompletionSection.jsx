import CompletionCheckbox from "./CompletionCheckbox";
import { isBaugruppeRow } from "../utils/structure";

/**
 * Abschluss-Checkbox für TB/Prüfung bzw. Lagerprüfung - wiederverwendet
 * von Checks.jsx/LagerView.jsx, egal ob bauteilbezogen (ProjectView) oder
 * über die projektweite Navigation (ProjectWideView, siehe App.jsx
 * openProjectWide) geöffnet. Keine zweite Workflow-Implementierung: ruft
 * ausschließlich das bestehende setBaugruppeCompletion() auf
 * (Berechtigungsprüfung, Mail-Workflow, Realtime-/Statuslogik bleiben dort
 * unverändert).
 *
 * Praxiskorrektur: der Abschluss ist fachlich an eine konkrete Baugruppe
 * gebunden. Ohne diesen Kontext (projektweiter Zugang) wird bewusst KEINE
 * Checkbox angezeigt - insbesondere keine Liste mit einer Checkbox je
 * Baugruppe des Projekts. Das entspricht exakt dem Verhalten vor der
 * projektweiten Navigation: dieselbe Abschlussbedienung wie bisher, keine
 * neue, abweichende UI.
 */
export default function BaugruppeCompletionSection({
  project,
  baugruppe,
  structureRows,
  field,
  labelPrefix,
  confirmText,
  setBaugruppeCompletion,
}) {
  if (!setBaugruppeCompletion || !project || !baugruppe) return null;

  const bgRow = (structureRows || []).find(
    (r) => String(r.project_id) === String(project.id) && r.baugruppe === baugruppe && isBaugruppeRow(r)
  );

  return (
    <CompletionCheckbox
      label={`${labelPrefix} · ${baugruppe}`}
      checked={Boolean(bgRow?.[field])}
      onToggle={(next) => setBaugruppeCompletion(project.id, baugruppe, field, next)}
      confirmMessage={confirmText(baugruppe)}
    />
  );
}
