# MONTA – Nächster Sprint

## Bedien-Sprint: Suche / Tastatur / Bauteilgruppen – erledigt (Code)

- Freitextsuche in TB, Prüfung, Lager, Warenkorb
- TB/Prüfung ausgeblendet bis einschließlich 1024 px
- Leertaste übernimmt markierte Autocomplete-Vorschläge
- Bauteilgruppen (`bauteilgruppe` auf `project_structure`)
- Darstellung und Sortierung in allen relevanten Reitern inkl. Druck
- Sync wie bei Baugruppen/Bauteilen

Details siehe `MONTA_PROJECT.md`, `MONTA_DECISIONS.md`, `MONTA_CHANGELOG.md`.

## Vor dem nächsten Pilot-Test in Supabase ausführen

1. Falls noch nicht geschehen (Stabilität):

```sql
create policy "public delete projects" on projects for delete using (true);
alter publication supabase_realtime add table projects;
alter publication supabase_realtime add table material_items;
```

2. Falls noch nicht geschehen – `supabase_patch_project_structure.sql`
   vollständig im SQL Editor ausführen.

3. Neu in diesem Sprint – `supabase_patch_component_groups.sql`
   (Spalte `bauteilgruppe`) im SQL Editor ausführen.

Ohne die Struktur-Patches schlagen Laden bzw. Gruppierung fehl.

## Nächster sinnvoller Fokus

- PWA / Installierbarkeit für die mobile Pilotnutzung

## Weiterhin offen

- Spalte `archived` in der Live-DB ergänzen, sobald gewünscht
