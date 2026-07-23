// Zentrale Definition der Arbeitsansicht-Reiter (Reihenfolge + Bezeichnung).
export const TAB_ORDER = ["tb", "pruefung", "material", "bestellliste", "druck"];

export const TAB_LABELS = {
  tb: "TB",
  pruefung: "Prüfung",
  material: "Lager",
  bestellliste: "Warenkorb",
  druck: "Druck",
};

// Smartphone/Tablet inkl. Querformat (≤1024 px): TB und Prüfung ausblenden,
// sofern kein Vollzugriff (Admin oder full_module_access).
// Sichtbar bleiben Lager, Warenkorb, Druck. Desktop (>1024 px) unverändert.
export const NARROW_HIDDEN_TABS = ["tb", "pruefung"];

/**
 * Ob TB/Prüfung auch mobil sichtbar sind.
 * Solange Session da ist und Profil noch lädt: nicht vorschnell ausblenden
 * (sonst fehlen Admin/Vollzugriff-Nutzer kurz die Reiter / openBauteil landet auf Lager).
 */
export function resolveTabFullAccess({
  hasFullModuleAccess,
  session,
  profile,
  authLoading,
} = {}) {
  if (hasFullModuleAccess) return true;
  if (session && (authLoading || !profile)) return true;
  return false;
}

export function defaultTabFor(isNarrow, { fullAccess } = {}) {
  if (fullAccess || !isNarrow) return "tb";
  return "material";
}

export function visibleTabsFor(isNarrow, { fullAccess } = {}) {
  if (fullAccess) return [...TAB_ORDER];
  return TAB_ORDER.filter((t) => !isNarrow || !NARROW_HIDDEN_TABS.includes(t));
}
