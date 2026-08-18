// Zentrale Entscheidungs- und Vorbereitungslogik für die sichere
// Materialersetzung (Sprint 2B). Wird von TB (TechnikerEditor) UND Lager
// (LagerView) gemeinsam genutzt - keine getrennte Fachlogik je Ansicht.
//
// Grundsatz (MONTA_SAFETY.md): reale, bereits ausgeführte Arbeit (bereit,
// bestellt) darf durch eine technische Änderung niemals nachträglich so
// aussehen, als wäre sie für eine neue/andere Position erfolgt. Deshalb wird
// eine operativ bereits bearbeitete Position bei einer fachlichen Änderung
// nie direkt überschrieben, sondern über eine neue Position ersetzt; die
// Altposition bleibt mit ihrem realen Zustand unverändert erhalten und wird
// nur über `ersetzt_durch` (Verweis auf die neue Position) gekennzeichnet.

/** Fachliche Identitätsfelder einer Position (Artikel). */
export const IDENTITY_FIELDS = ["bezeichnung", "groesse", "laenge", "oberflaeche"];

/**
 * Position wurde bereits real bearbeitet (vorbereitet und/oder bestellt).
 * Reine Mengenänderung ist bewusst NICHT enthalten: „menge" beschreibt nur
 * den benötigten Bedarf, nicht den operativen Fortschritt.
 */
export function isOperationallyTouched(item) {
  return Number(item?.bereit || 0) > 0 || Boolean(item?.bestellt);
}

/** Position ist unberührt und darf weiterhin direkt fachlich geändert werden. */
export function isUntouchedItem(item) {
  return !isOperationallyTouched(item);
}

/** Position wurde durch eine andere, neuere Position ersetzt (Altposition). */
export function isReplacedItem(item) {
  return Boolean(item?.ersetzt_durch);
}

/** Aktueller, gültiger Montage-/Prüf-/Bestellbedarf (keine ersetzte Altposition). */
export function isActiveItem(item) {
  return !isReplacedItem(item);
}

export function isIdentityField(key) {
  return IDENTITY_FIELDS.includes(key);
}

/**
 * Ob ein Patch die fachliche Identität der Position ändert (Bezeichnung,
 * Größe, Länge, Ausführung). Eine reine Mengenänderung zählt bewusst nicht:
 * die bereits vorbereitete/bestellte Menge desselben Artikels bleibt auch
 * bei einer neuen Bedarfsmenge gültig, nur die Zielmenge ändert sich.
 */
export function hasIdentityChange(current, patch) {
  return IDENTITY_FIELDS.some(
    (key) => patch[key] !== undefined && String(patch[key] ?? "") !== String(current?.[key] ?? "")
  );
}

/**
 * Fachliche Felder + immer zurückgesetzte operative Felder für eine neue
 * Ersatzposition. Projekt-/Baugruppen-/Bauteilzuordnung übernimmt der
 * Aufrufer (gleiche einbauort wie Ursprung) - hier nur der Inhalt.
 */
export function buildReplacementFields(source, newFields) {
  return {
    bezeichnung: newFields.bezeichnung ?? source?.bezeichnung ?? "",
    groesse: newFields.groesse ?? source?.groesse ?? "",
    laenge: newFields.laenge ?? source?.laenge ?? "",
    oberflaeche: newFields.oberflaeche ?? source?.oberflaeche ?? "",
    hinweis: newFields.hinweis ?? source?.hinweis ?? "",
    important_note: Boolean(newFields.important_note ?? source?.important_note),
    menge: Number(newFields.menge ?? source?.menge ?? 0),
    // Operative Felder starten immer neu - nie aus der Altposition übernehmen.
    bereit: 0,
    bestellt: false,
    geliefert: false,
  };
}
