export function nextPosNumber(items) {
  return allocatePositions(items, 1)[0];
}

// Vergibt mehrere freie, projektweit eindeutige Positionsnummern in einem
// Rutsch (z. B. Hauptartikel + automatische Mitlaufartikel in einem Save).
export function allocatePositions(items, count) {
  const used = new Set();
  for (const item of items) {
    const n = parseInt(String(item.pos || "").trim(), 10);
    if (!Number.isNaN(n) && n > 0) used.add(n);
  }
  const positions = [];
  let n = 1;
  while (positions.length < count) {
    if (!used.has(n)) {
      used.add(n);
      positions.push(String(n));
    }
    n += 1;
  }
  return positions;
}

export { getMitlaufForBezeichnung as getMitlaufartikel } from "./fasteningRules";

// Ursprüngliche TB-Positionsnummern mehrerer zusammengefasster Positionen
// als lesbare Liste: numerisch sortiert, ohne Duplikate, keine technischen
// IDs (Sprint 7 Abschluss, u. a. für Lager-Herkunft, Warenkorb-Herkunft und
// Druckansicht-Position genutzt).
export function uniqueSortedPositions(items) {
  const values = Array.from(
    new Set(items.map((i) => String(i.pos ?? "").trim()).filter(Boolean))
  );
  return values.sort((a, b) => {
    const na = parseInt(a, 10);
    const nb = parseInt(b, 10);
    const aNum = !Number.isNaN(na);
    const bNum = !Number.isNaN(nb);
    if (aNum && bNum) return na - nb;
    if (aNum) return -1;
    if (bNum) return 1;
    return a.localeCompare(b, undefined, { numeric: true });
  });
}

export function sortByPosNumber(items) {
  return [...items].sort((a, b) => {
    const na = parseInt(String(a.pos ?? "").trim(), 10);
    const nb = parseInt(String(b.pos ?? "").trim(), 10);
    const aNum = !Number.isNaN(na);
    const bNum = !Number.isNaN(nb);
    if (aNum && bNum) return na - nb;
    if (aNum) return -1;
    if (bNum) return 1;
    return String(a.pos ?? "").localeCompare(String(b.pos ?? ""), undefined, { numeric: true });
  });
}
