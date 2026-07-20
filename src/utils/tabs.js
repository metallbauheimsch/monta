// Zentrale Definition der Arbeitsansicht-Reiter (Reihenfolge + Bezeichnung).
export const TAB_ORDER = ["tb", "pruefung", "material", "bestellliste", "druck"];

export const TAB_LABELS = {
  tb: "TB",
  pruefung: "Prüfung",
  material: "Lager",
  bestellliste: "Warenkorb",
  druck: "Druck",
};

// Smartphone/Tablet inkl. Querformat (≤1024 px): TB und Prüfung ausblenden.
// Sichtbar bleiben Lager, Warenkorb, Druck. Desktop (>1024 px) unverändert.
export const NARROW_HIDDEN_TABS = ["tb", "pruefung"];

export function defaultTabFor(isNarrow) {
  return isNarrow ? "material" : "tb";
}

export function visibleTabsFor(isNarrow) {
  return TAB_ORDER.filter((t) => !isNarrow || !NARROW_HIDDEN_TABS.includes(t));
}
