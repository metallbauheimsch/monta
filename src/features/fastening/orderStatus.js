// Bestellung/Lieferung je Warenkorb-Position (Sprint 6). Rein clientseitig
// in localStorage gehalten - analog zu utils/structure.js und
// descriptionsRegistry.js -, damit keine neue Datenbank-Migration nötig ist.
//
// Wichtig: Die Bestellmenge selbst ist keine gespeicherte Momentaufnahme,
// sondern wird weiterhin live aus dem Lager berechnet (Gesamtmenge - bereits
// gelegt, siehe utils/helpers.remainingQty). Hier wird nur zusätzlich je
// Position vermerkt, ob bestellt wurde und wie viel davon bereits geliefert
// wurde - unabhängig vom Lager-Feld "bereits gelegt".
const REGISTRY_KEY = "monta_orderstatus_v04";

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(REGISTRY_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeAll(data) {
  try {
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(data));
  } catch {
    // localStorage evtl. nicht verfügbar - Status bleibt nur für die Sitzung erhalten
  }
}

function entryKey(projectId, baugruppe, comboKey) {
  return `${projectId}|${baugruppe}|${comboKey}`;
}

export function getOrderStatus(projectId, baugruppe, comboKey) {
  const all = readAll();
  return all[entryKey(projectId, baugruppe, comboKey)] || { bestellt: false, geliefert: 0 };
}

export function setOrderBestellt(projectId, baugruppe, comboKey, bestellt) {
  const all = readAll();
  const key = entryKey(projectId, baugruppe, comboKey);
  const cur = all[key] || { bestellt: false, geliefert: 0 };
  all[key] = { ...cur, bestellt };
  writeAll(all);
}

export function setOrderGeliefert(projectId, baugruppe, comboKey, geliefert) {
  const all = readAll();
  const key = entryKey(projectId, baugruppe, comboKey);
  const cur = all[key] || { bestellt: false, geliefert: 0 };
  all[key] = { ...cur, geliefert: Math.max(0, Number(geliefert) || 0) };
  writeAll(all);
}

// Wird beim Löschen einer Baugruppe aufgerufen, damit keine verwaisten
// Status-Einträge zurückbleiben (siehe App.jsx deleteBaugruppe).
export function clearOrderStatusForBaugruppe(projectId, baugruppe) {
  const all = readAll();
  const prefix = entryKey(projectId, baugruppe, "");
  Object.keys(all).forEach((k) => {
    if (k.startsWith(prefix)) delete all[k];
  });
  writeAll(all);
}

// Wird beim Umbenennen einer Baugruppe aufgerufen (Sprint 6 Ergänzung #11),
// damit bereits erfasster Bestell-/Lieferstatus nicht verloren geht.
export function renameBaugruppeInOrderStatus(projectId, oldName, newName) {
  const all = readAll();
  const oldPrefix = entryKey(projectId, oldName, "");
  const newPrefix = entryKey(projectId, newName, "");
  const next = {};
  Object.entries(all).forEach(([k, v]) => {
    next[k.startsWith(oldPrefix) ? newPrefix + k.slice(oldPrefix.length) : k] = v;
  });
  writeAll(next);
}

// Ermittelt den anzuzeigenden Lieferstatus einer Warenkorb-Position.
// bestellmenge kommt live aus dem Lager (siehe oben), status aus getOrderStatus().
export function computeDeliveryStatus(bestellmenge, status) {
  if (!status.bestellt) return { key: "nicht_bestellt", label: "Noch nicht bestellt" };
  if (status.geliefert <= 0) return { key: "bestellt", label: "Bestellt" };
  if (status.geliefert < bestellmenge) return { key: "teilweise", label: "Teilweise geliefert" };
  return { key: "vollstaendig", label: "Vollständig geliefert" };
}
