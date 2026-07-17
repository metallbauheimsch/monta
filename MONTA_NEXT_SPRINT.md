# MONTA – Nächster Sprint

## Pilot Sprint: Mehrgeräte-Sync / Struktur / Mail – erledigt (Code)

- `project_structure` für Baugruppen/Bauteile
- Migration aus lokaler Registry + Materialpositionen
- Realtime + Fokus/Sichtbarkeit + Fallback
- Mobile: TB und Prüfung ausgeblendet
- Mail: HTML-Tabelle in Zwischenablage

Details siehe `MONTA_PROJECT.md`, `MONTA_DECISIONS.md`, `MONTA_CHANGELOG.md`.

## Vor dem nächsten Pilot-Test in Supabase ausführen

1. Falls noch nicht geschehen (Stabilität):

```sql
create policy "public delete projects" on projects for delete using (true);
alter publication supabase_realtime add table projects;
alter publication supabase_realtime add table material_items;
```

2. Neu in diesem Sprint – Datei `supabase_patch_project_structure.sql`
   vollständig im SQL Editor ausführen (Tabelle, RLS, Realtime).

Ohne diesen Patch schlägt das Laden mit Hinweis auf Projektstruktur fehl.

## Nächster sinnvoller Fokus

- PWA / Installierbarkeit für die mobile Pilotnutzung

## Weiterhin offen

- Spalte `archived` in der Live-DB ergänzen, sobald gewünscht
