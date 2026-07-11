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

// Automatische Mitlaufartikel je erfasster Position.
// Menge-Faktor bezieht sich auf 1 Stück der Hauptposition.
const MITLAUFARTIKEL_REGELN = {
  sechskantschraube: [
    { bezeichnung: "U-Scheibe", faktor: 2 },
    { bezeichnung: "Sechskantmutter", faktor: 1 },
  ],
  senkschraube: [
    { bezeichnung: "U-Scheibe", faktor: 1 },
    { bezeichnung: "Sechskantmutter", faktor: 1 },
  ],
  // Bolzenanker, Betonschraube: bewusst keine automatische Ergänzung
};

export function getMitlaufartikel(bezeichnung) {
  const key = String(bezeichnung || "").trim().toLowerCase();
  return MITLAUFARTIKEL_REGELN[key] || [];
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
