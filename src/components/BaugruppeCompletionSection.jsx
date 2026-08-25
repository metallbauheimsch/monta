import CompletionCheckbox from "./CompletionCheckbox";
import { isBaugruppeRow } from "../utils/structure";

/**
 * Abschluss-Checkbox(en) für TB/Prüfung bzw. Lagerprüfung - projektweit
 * wiederverwendet (Sprint: Lager-Offline-Praxis), damit die neuen
 * projektweiten Zugänge (ProjectWideView, siehe App.jsx openProjectWide)
 * dieselben bestehenden Abschluss- und Mail-Workflow-Funktionen bieten wie
 * der bisherige, bauteilbezogene Zugang. Keine zweite Workflow-
 * Implementierung: ruft ausschließlich das bestehende
 * setBaugruppeCompletion() auf (Berechtigungsprüfung, Mail-Workflow,
 * Realtime-/Statuslogik bleiben dort unverändert).
 *
 * Mit konkreter Baugruppe (bauteilbezogener Zugang): genau eine Checkbox,
 * Verhalten unverändert. Ohne Baugruppe (projektweiter Zugang): eine
 * Checkbox je Baugruppe des Projekts, jede unabhängig bedienbar.
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
  if (!setBaugruppeCompletion || !project) return null;

  const baugruppenRows = (structureRows || []).filter(
    (r) => String(r.project_id) === String(project.id) && isBaugruppeRow(r)
  );

  if (baugruppe) {
    const bgRow = baugruppenRows.find((r) => r.baugruppe === baugruppe);
    return (
      <CompletionCheckbox
        label={`${labelPrefix} · ${baugruppe}`}
        checked={Boolean(bgRow?.[field])}
        onToggle={(next) => setBaugruppeCompletion(project.id, baugruppe, field, next)}
        confirmMessage={confirmText(baugruppe)}
      />
    );
  }

  if (baugruppenRows.length === 0) return null;

  return (
    <div className="completionListWrap">
      {baugruppenRows.map((row) => (
        <CompletionCheckbox
          key={row.id}
          label={`${labelPrefix} · ${row.baugruppe}`}
          checked={Boolean(row[field])}
          onToggle={(next) => setBaugruppeCompletion(project.id, row.baugruppe, field, next)}
          confirmMessage={confirmText(row.baugruppe)}
        />
      ))}
    </div>
  );
}
