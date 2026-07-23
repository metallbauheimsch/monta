// Mehrwort-Freitextsuche: alle Wörter müssen irgendwo im Suchtext vorkommen
// (AND), Groß-/Kleinschreibung egal, Teilbegriffe und Zahlen ok.

export function matchesSearch(haystack, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return true;
  const text = String(haystack ?? "").toLowerCase();
  return q.split(/\s+/).every((word) => text.includes(word));
}

export function buildSearchHaystack(parts) {
  return (parts || [])
    .filter((p) => p != null && String(p).trim() !== "")
    .map((p) => String(p))
    .join(" ");
}

/**
 * Zusätzliche Suchvarianten aus klarer Größe + Länge
 * (z. B. M10 / 30 → m10x30, 10x30, 1030).
 */
export function sizeLengthSearchParts(groesse, laenge) {
  const gRaw = String(groesse || "").trim().toLowerCase().replace(",", ".");
  const lRaw = String(laenge || "").trim().toLowerCase().replace(",", ".");
  if (!gRaw || !lRaw) return [];

  const gMatch = gRaw.match(/^m\s*(\d+(?:\.\d+)?)$/i) || gRaw.match(/^(\d+(?:\.\d+)?)$/);
  const lMatch = lRaw.match(/^(\d+(?:\.\d+)?)$/);
  if (!gMatch || !lMatch) return [];

  const gNum = gMatch[1].replace(/\./g, "");
  const lNum = lMatch[1].replace(/\./g, "");
  if (!gNum || !lNum) return [];

  const withM = `m${gNum}`;
  return [
    `${withM}x${lNum}`,
    `${withM}×${lNum}`,
    `${withM} ${lNum}`,
    `${gNum}x${lNum}`,
    `${gNum}×${lNum}`,
    `${gNum} ${lNum}`,
    `${gNum}${lNum}`,
  ];
}

export function filterBySearch(rows, query, getParts) {
  const q = String(query || "").trim();
  if (!q) return rows;
  return rows.filter((row) => matchesSearch(buildSearchHaystack(getParts(row)), q));
}
