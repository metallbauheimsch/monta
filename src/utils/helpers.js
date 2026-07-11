export function articleKey(item) {
  return [item.bezeichnung, item.groesse, item.laenge, item.oberflaeche].filter(Boolean).join(" ");
}

// Restmenge einer einzelnen Position (Gesamtmenge - bereits gelegt/vorhanden).
// Zentral definiert, damit Lager, Bestellliste und Statusampel exakt
// dieselbe Regel verwenden (Sprint 5 Erweiterung #7: keine Doppelimplementierung).
export function remainingQty(item) {
  return Math.max(0, Number(item.menge || 0) - Number(item.bereit || 0));
}

// Materialstatus einer Baugruppe (Sprint 5 Erweiterung):
// 🟢 Bereit  - alle Positionen vollständig vorhanden (Restmenge = 0)
// 🟡 Bestellt - noch Restmenge offen, aber als "bestellt" markiert
// 🔴 Offen   - noch Restmenge offen, noch nicht bestellt
// ⚪ ohne Positionen - Baugruppe hat (noch) keine Materialpositionen
export function baugruppeStatus(items, bestellt) {
  if (!items.length) return { key: "leer", emoji: "⚪", label: "Keine Positionen" };
  const hasRest = items.some((i) => remainingQty(i) > 0);
  if (!hasRest) return { key: "bereit", emoji: "🟢", label: "Bereit" };
  if (bestellt) return { key: "bestellt", emoji: "🟡", label: "Bestellt" };
  return { key: "offen", emoji: "🔴", label: "Offen" };
}

export function projectStatus(project, items) {
  const own = items.filter((i) => i.project_id === project.id);
  if (!own.length) return { pct: 0, label: "Keine Teile bereit", cls: "red" };
  const ready = own.filter((i) => Number(i.bereit || 0) >= Number(i.menge || 0)).length;
  const pct = Math.round((ready / own.length) * 100);
  if (pct === 100) return { pct, label: "Montagebereit", cls: "green" };
  if (pct > 0) return { pct, label: "Teilweise bereit", cls: "yellow" };
  return { pct, label: "Keine Teile bereit", cls: "red" };
}

export function groupBy(arr, fn) {
  return arr.reduce((acc, item) => {
    const key = fn(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}

export function isMobileLike() {
  return window.matchMedia("(max-width: 760px)").matches;
}
