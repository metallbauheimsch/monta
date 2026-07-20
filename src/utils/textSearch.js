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

export function filterBySearch(rows, query, getParts) {
  const q = String(query || "").trim();
  if (!q) return rows;
  return rows.filter((row) => matchesSearch(buildSearchHaystack(getParts(row)), q));
}
