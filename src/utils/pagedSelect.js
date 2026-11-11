/** PostgREST/Supabase liefert je Anfrage höchstens so viele Zeilen. */
export const SUPABASE_PAGE_SIZE = 1000;

/**
 * Lädt alle Zeilen seitenweise. `fetchPage(from, to)` nutzt inklusive
 * Range-Grenzen und bei jedem Aufruf dieselbe Sortierung.
 * Eine kürzere letzte Seite beendet das Laden. Bei einem Fehler werden
 * keine Teilseiten zurückgegeben.
 */
export async function fetchAllPages(fetchPage, pageSize = SUPABASE_PAGE_SIZE) {
  const rows = [];
  let from = 0;
  for (;;) {
    const { data, error } = await fetchPage(from, from + pageSize - 1);
    if (error) return { data: null, error };
    const page = Array.isArray(data) ? data : [];
    rows.push(...page);
    if (page.length < pageSize) return { data: rows, error: null };
    from += pageSize;
  }
}
