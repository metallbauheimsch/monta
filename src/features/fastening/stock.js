// Verteilt eine Gesamt-"vorhanden/geliefert"-Menge auf mehrere
// zusammengefasste Einzelpositionen: füllt sie in ihrer Reihenfolge
// nacheinander bis zur jeweiligen Menge auf. Einfache, nachvollziehbare
// Regel statt einer komplizierten Aufteilung nach Priorität.
//
// Von Lager UND Warenkorb genutzt (Sprint 7 Abschluss, Punkt 5): beide
// pflegen letztlich dasselbe Feld ("bereit") auf den Materialpositionen -
// es gibt bewusst keine zweite, unabhängige Datenhaltung für den
// Materialstatus.
export function distribute(items, total) {
  let remaining = Math.max(0, Number(total) || 0);
  return items.map((i) => {
    const menge = Number(i.menge || 0);
    const assign = Math.min(menge, remaining);
    remaining -= assign;
    return { id: i.id, bereit: assign };
  });
}

// Merkt sich den zuletzt manuell eingegebenen "vorhanden/geliefert"-Wert je
// zusammengefasster Position (Sprint 6, ab Sprint 7 - Korrekturen von Lager
// UND Warenkorb gemeinsam genutzt): wird die Checkbox "Vollständig" bzw.
// "Vollständig geliefert" wieder deaktiviert, soll keine Menge erfunden
// werden - der vorherige manuelle Wert wird nach Möglichkeit
// wiederhergestellt. Rein clientseitig in localStorage, analog zu
// utils/structure.js. Schlüssel ist projekt-, baugruppen- und artikelgenau
// (identisch aufgebaut in Lager und Warenkorb), damit beide Ansichten
// denselben gemerkten Wert verwenden - es gibt bewusst keinen zweiten,
// unabhängigen Speicher je Ansicht.
const MANUAL_VALUES_KEY = "monta_lager_manuell_v04";

export function readManualValues() {
  try {
    return JSON.parse(localStorage.getItem(MANUAL_VALUES_KEY) || "{}");
  } catch {
    return {};
  }
}

export function writeManualValues(data) {
  try {
    localStorage.setItem(MANUAL_VALUES_KEY, JSON.stringify(data));
  } catch {
    // localStorage evtl. nicht verfügbar - Wert bleibt nur für die Sitzung erhalten
  }
}

// Wird beim Umbenennen einer Baugruppe aufgerufen (Sprint 6 Ergänzung #11),
// damit gemerkte Werte nicht unter dem alten Namen verwaist zurückbleiben.
export function renameBaugruppeInManualValues(projectId, oldName, newName) {
  const all = readManualValues();
  const oldPrefix = `${projectId}|${oldName}|`;
  const newPrefix = `${projectId}|${newName}|`;
  const next = {};
  Object.entries(all).forEach(([k, v]) => {
    next[k.startsWith(oldPrefix) ? newPrefix + k.slice(oldPrefix.length) : k] = v;
  });
  writeManualValues(next);
}
