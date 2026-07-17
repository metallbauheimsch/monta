# MONTA – Nächster Sprint

## Stabilitäts-Sprint vor PWA – erledigt

- Letztes Projekt löschbar; leere Übersicht danach.
- Mehrgeräte-Sync: sofortige lokale Updates, Realtime, Fokus-/Sichtbarkeits-
  Reload, sparsamer 20-Sekunden-Fallback bei sichtbarer Seite.
- PC/Mobil-Umschalter entfernt; TB auf schmalen Bildschirmen ausgeblendet.
- Einheitliche Fehlerbehandlung bei create/update/delete.

Details siehe `MONTA_PROJECT.md`, `MONTA_DECISIONS.md` und
`MONTA_CHANGELOG.md`.

## Vor dem nächsten Pilot-Test in Supabase prüfen / anwenden

Falls in der Live-Datenbank noch nicht vorhanden:

```sql
create policy "public delete projects" on projects for delete using (true);

alter publication supabase_realtime add table projects;
alter publication supabase_realtime add table material_items;
```

(Realtime-Publication-Befehle schlagen fehl, wenn die Tabelle bereits
enthalten ist – dann ist Realtime schon aktiv.)

## Nächster sinnvoller Fokus

- PWA / App-Icon / Installierbarkeit für die mobile Pilotnutzung
  (separater Auftrag, nicht Teil dieses Stabilitäts-Sprints).

## Weiterhin offen (nicht blockierend für Stabilität)

- `supabase_schema.sql` um die Spalte `archived` ergänzen, sobald eine
  echte Migration gewünscht ist.
- Geräteübergreifende Teilung rein lokaler Hilfsdaten (leere
  Baugruppen-Registry, gelernte Bezeichnungen) – nur bei Bedarf.
