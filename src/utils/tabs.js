// Zentrale Definition der Arbeitsansicht-Reiter (Reihenfolge + Bezeichnung).
export const TAB_ORDER = ["tb", "pruefung", "material", "bestellliste", "druck"];

export const TAB_LABELS = {
  tb: "TB",
  pruefung: "Prüfung",
  material: "Lager",
  bestellliste: "Warenkorb",
  druck: "Druck",
  tbProjekt: "TB",
};

// Projektweite, rein lesende TB-Übersicht (Sprint 2A). Bewusst ein eigener
// Schlüssel statt "tb": der Bauteil-TB (TechnikerEditor) bleibt unverändert
// an ein konkretes Bauteil gebunden und erscheint weiterhin nur in der
// Bauteilansicht (TAB_ORDER/visibleTabsFor).
export const PROJECT_TB_TAB = "tbProjekt";

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
  // Projektweite TB-Übersicht (Sprint 2A) gibt es in der Bauteilansicht
  // nicht - ihr fachliches Gegenstück dort ist der Bauteil-TB.
  if (rememberedTab === PROJECT_TB_TAB) return "tb";
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
// untereinander erreichbar. Der bearbeitbare Bauteil-TB ("tb") ist NIE
// Bestandteil dieser Liste - nur über ein konkretes Bauteil erreichbar.
// Diese Liste ist zugleich die Menge der gültigen Mail-Deep-Link-Ziele
// (utils/deepLink.js) und bleibt deshalb unverändert.
export const PROJECT_WIDE_TAB_ORDER = TAB_ORDER.filter((t) => t !== "tb");

export function projectWideTabsFor() {
  return [...PROJECT_WIDE_TAB_ORDER];
}

// Obere Projekt-Navigation (Sprint 2A): zusätzlich zu den projektweiten
// Reitern die rein lesende TB-Übersicht des gesamten Projekts, vorne wie
// "TB" in der Bauteilansicht. Kein Deep-Link-Ziel.
export const PROJECT_NAV_TAB_ORDER = [PROJECT_TB_TAB, ...PROJECT_WIDE_TAB_ORDER];

export function projectNavTabsFor() {
  return [...PROJECT_NAV_TAB_ORDER];
}
