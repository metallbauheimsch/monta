// Zentrale Definition der Arbeitsansicht-Reiter (Reihenfolge + Bezeichnung).
// Einmal pflegen, überall importieren – vermeidet abweichende Kopien.
//
// Sprint 3: Reiter "Montage" entfernt (Montage wird künftig über die
// Druckansicht gelöst). Bestehende Montage-Daten/-Komponente bleiben im
// Code erhalten, sind nur nicht mehr über die Navigation erreichbar.
//
// Sprint 5: Anzeige-Bezeichnung "Material" wieder zu "Lager" geändert (nur
// Beschriftung - der interne Schlüssel "material" bleibt unverändert, um
// keine Datenstruktur anzufassen).
export const TAB_ORDER = ["tb", "pruefung", "material", "bestellliste", "druck"];

export const TAB_LABELS = {
  tb: "TB",
  pruefung: "Prüfung",
  material: "Lager",
  bestellliste: "Bestellliste",
  druck: "Druck",
};

// TB ist auf schnelle PC-Erfassung ausgelegt und wird mobil ausgeblendet.
export const PC_ONLY_TABS = ["tb"];

export function defaultTabFor(deviceMode) {
  return deviceMode === "pc" ? "tb" : "material";
}
