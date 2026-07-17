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
//
// Sprint 6: Anzeige-Bezeichnung "Bestellliste" zu "Warenkorb" geändert (nur
// Beschriftung - der interne Schlüssel "bestellliste" bleibt unverändert,
// Komponente/Datei heißt weiterhin EinkaufView).
export const TAB_ORDER = ["tb", "pruefung", "material", "bestellliste", "druck"];

export const TAB_LABELS = {
  tb: "TB",
  pruefung: "Prüfung",
  material: "Lager",
  bestellliste: "Warenkorb",
  druck: "Druck",
};

// TB ist auf schnelle PC-Erfassung ausgelegt und wird auf schmalen
// Bildschirmen (≤760px) ausgeblendet – früher über den manuellen
// PC/Mobil-Umschalter, jetzt automatisch über die Viewport-Breite.
export const NARROW_HIDDEN_TABS = ["tb"];

export function defaultTabFor(isNarrow) {
  return isNarrow ? "material" : "tb";
}

export function visibleTabsFor(isNarrow) {
  return TAB_ORDER.filter((t) => !isNarrow || !NARROW_HIDDEN_TABS.includes(t));
}
