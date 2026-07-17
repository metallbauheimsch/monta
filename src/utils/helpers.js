export function articleKey(item) {
  return [item.bezeichnung, item.groesse, item.laenge, item.oberflaeche].filter(Boolean).join(" ");
}

// Restmenge einer einzelnen Position (Gesamtmenge - bereits gelegt/vorhanden).
// Zentral definiert, damit Lager, Bestellliste und Statusampel exakt
// dieselbe Regel verwenden (Sprint 5 Erweiterung #7: keine Doppelimplementierung).
export function remainingQty(item) {
  return Math.max(0, Number(item.menge || 0) - Number(item.bereit || 0));
}

// Materialstatus einer Baugruppe (Sprint 5 Erweiterung, Logik neu gefasst in
// Sprint 7 - Korrekturen aus Praxistest):
// 🟢 Bereit   - alle benötigten Mengen sind vollständig vorhanden/geliefert
//               (keine Restmenge mehr offen)
// 🟡 Bestellt - es gibt noch Restmenge, aber alle Positionen mit Restmenge
//               sind bereits als "bestellt" markiert
// 🔴 Offen    - es gibt Restmenge, und mindestens eine dieser Positionen ist
//               noch nicht bestellt
// ⚪ ohne Positionen - Baugruppe hat (noch) keine Materialpositionen
//
// Es gibt bewusst nur diese eine Statusquelle: "bestellt" wird direkt am
// Feld material_items.bestellt der jeweiligen Position abgelesen, nicht an
// einem separaten, manuell gesetzten Baugruppen-Häkchen (das frühere
// lokale "Bestellung erfolgt"-Häkchen aus Sprint 5/6 wurde deshalb
// entfernt, siehe MONTA_DECISIONS.md, Abschnitt "Bestellung und
// Lieferung").
export function baugruppeStatus(items) {
  if (!items.length) return { key: "leer", emoji: "⚪", label: "Keine Positionen" };
  const missing = items.filter((i) => remainingQty(i) > 0);
  if (!missing.length) return { key: "bereit", emoji: "🟢", label: "Bereit" };
  const allBestellt = missing.every((i) => i.bestellt);
  if (allBestellt) return { key: "bestellt", emoji: "🟡", label: "Bestellt" };
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
