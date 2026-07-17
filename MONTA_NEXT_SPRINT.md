# MONTA – Nächster Sprint

## Abschlusskorrekturen vor Pilot – erledigt

- Lager: Spalte „Vorhanden" numerisch sortierbar.
- Tabellen: einheitliches hellgraues Raster in TB, Lager, Warenkorb, Druck.
- Warenkorb: vollständig gelieferte Positionen bleiben sichtbar (grün, unten),
  Checkbox wieder deaktivierbar.
- U-Scheiben/Sechskantmuttern: Regalfach wie passende Schraube (Größe +
  Ausführung).

Details siehe `MONTA_PROJECT.md`, `MONTA_DECISIONS.md` und
`MONTA_CHANGELOG.md`.

## Sprint 7 – Korrekturen aus Praxistest – erledigt

- Paternoster: vollständige Fachzuordnung und Laufweg 27 → … → 1.
- Warenkorb: kein Regalfach, „Alle Positionen bestellt", „Anfrage per Mail".
- Statusampel aus Materialpositionen; Druck über Spaltenüberschriften.

## Offene Punkte aus der Bestandsaufnahme (weiterhin nicht umgesetzt)

- Prüfen, ob geräteübergreifend geteilte lokale Daten für PC+iPhone
  ausreichen, oder ob diese künftig über Supabase gespeichert werden sollen.
- `supabase_schema.sql` um die Spalte `archived` ergänzen, sobald eine
  echte Migration gewünscht ist.
