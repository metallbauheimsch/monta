// Zentrale Definition der Arbeitsansicht-Reiter (Reihenfolge + Bezeichnung).
export const TAB_ORDER = ["tb", "pruefung", "material", "bestellliste", "druck"];

export const TAB_LABELS = {
  tb: "TB",
  pruefung: "Prüfung",
  material: "Lager",
  bestellliste: "Warenkorb",
  druck: "Druck",
};

/**
 * Ob ein Benutzer Vollzugriff hat (Admin oder full_module_access).
 * Steuert NUR noch, welcher Reiter beim Öffnen eines Bauteils ohne
 * gemerkten Reiter zuerst angezeigt wird (siehe defaultTabFor) - eine
 * reine Komfort-Voreinstellung, keine Sichtbarkeits-/Berechtigungsprüfung
 * (siehe visibleTabsFor/projectWideTabsFor: alle Reiter sind für alle
 * aktiven Nutzer auf jedem Gerät erreichbar).
 * Solange Session da ist und Profil noch lädt: nicht vorschnell auf
 * "kein Vollzugriff" fallen (sonst zeigt der Erststart kurz den falschen
 * Standard-Reiter für Admin/Vollzugriff-Nutzer).
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

/**
 * Reiter beim Öffnen eines Bauteils (Sprint: Reiterzustand beim
 * Bauteilwechsel). Ohne zuvor innerhalb des Projekts verwendeten Reiter
 * gilt weiterhin derselbe Standard wie bisher (siehe defaultTabFor - TB,
 * bzw. Lager auf schmalen Geräten ohne Vollzugriff). Mit einem zuvor
 * verwendeten Reiter wird genau dieser wiederverwendet, statt bei jedem
 * Bauteilwechsel automatisch auf TB zurückzuspringen.
 */
export function tabForBauteilOpen(rememberedTab, isNarrow, { fullAccess } = {}) {
  return rememberedTab || defaultTabFor(isNarrow, { fullAccess });
}

/**
 * Alle fachlich vorhandenen Reiter sind auf jedem Gerät erreichbar
 * (Sprint: Lager-Offline-Praxis - Praxisfeedback: Viewport-Breite/
 * Ausrichtung simulierte bisher unbeabsichtigt eine Berechtigung, z. B.
 * verschwand "Prüfung" im Tablet-Hochformat für Nutzer ohne Vollzugriff,
 * obwohl dieselben Nutzer sie am Desktop uneingeschränkt sahen). Responsive
 * Layout darf kompakter werden, umbrechen oder horizontal scrollbar sein -
 * es entfernt aber keine Reiter mehr aufgrund der Bildschirmbreite.
 * Eine echte fachliche Berechtigungsprüfung würde hier separat ansetzen;
 * aktuell existiert keine solche Einschränkung für TB/Prüfung.
 */
export function visibleTabsFor() {
  return [...TAB_ORDER];
}

// Projektweite Reiter (Sprint: Projektnavigation): Prüfung, Lager, Warenkorb
// und Druck sind projektbezogen und direkt aus der Projektübersicht sowie
// untereinander erreichbar. TB bleibt bewusst bauteilbezogen und ist NIE
// Bestandteil dieser Liste - nur über ein konkretes Bauteil erreichbar.
export const PROJECT_WIDE_TAB_ORDER = TAB_ORDER.filter((t) => t !== "tb");

export function projectWideTabsFor() {
  return [...PROJECT_WIDE_TAB_ORDER];
}
