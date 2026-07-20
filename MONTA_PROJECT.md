# MONTA – Projektdokumentation

Interne Web-App für Metallbau Heimsch zur Verwaltung von Befestigungsmaterial
je Projekt. Optimiert ausschließlich für diesen Betrieb, kein Standardprodukt.

Statistiken sind grundsätzlich kein Bestandteil von MONTA.

## Datenmodell

Projekt → Baugruppe → Bauteilgruppe (optional) → Bauteil → Materialposition

- `projects` und `material_items` sind eigene Datenbanktabellen (Supabase).
- Baugruppen und Bauteile liegen in `project_structure` (Supabase):
  - Zeile mit leerem `bauteil` → Baugruppe
  - Zeile mit Baugruppe + Bauteil → Bauteil
  - optionale Spalte `bauteilgruppe` auf Bauteil-Zeilen (Gruppierung)
- Materialpositionen tragen weiterhin `einbauort` im Format
  `"Baugruppe / Bauteil"`. Die Bauteilgruppe ändert keine Materialzuordnung
  und keine Mengen.

## Funktionen (Ist-Stand nach Bedien-Sprint)

- **Freitextsuche** in TB, Prüfung, Lager und Warenkorb (Platzhalter
  „Suchen …", Mehrwort-AND, sofortiger Filter, × zum Löschen, nicht
  persistiert).
- **Mobile/Tablet (≤1024 px)**: TB und Prüfung ausgeblendet; sichtbar:
  Lager, Warenkorb, Druck. Aktiver ausgeblendeter Reiter wechselt auf Lager.
- **TB-Autocomplete**: Pfeile, Enter, Leertaste (bei markiertem Vorschlag),
  Escape, Tab – freies Leerzeichen bleibt möglich.
- **Bauteilgruppen**: Mehrere Bauteile derselben Baugruppe können zu einer
  Gruppe zusammengefasst werden (Name, Umbenennen, Mitglieder ändern,
  Auflösen). Material bleibt je Bauteil getrennt.
- **Darstellung**: Hierarchie Baugruppe → Bauteilgruppe → Bauteil in
  Projektseite, TB-Kontext, Prüfung, Lager, Warenkorb und Druck.
  „Nicht gruppiert" nur, wenn in der Baugruppe mindestens eine Gruppe existiert.
- **Sortierung**: Spalte Bauteilgruppe (auf/ab); Standard: Anlage-Reihenfolge
  der Gruppen und Bauteile.
- **Mehrgeräte-Sync**: Supabase inkl. `bauteilgruppe`; Realtime; Fokus;
  20-Sekunden-Fallback; Pull-to-Refresh.
- **Warenkorb-Mail**: HTML-Tabelle in Zwischenablage + Klartext-Fallback.

## Speicherorte

**Supabase:** Projekte, `project_structure` (inkl. Bauteilgruppe), Material.

**Lokal:** manuelle Lager-/Lieferwerte, gelernte Bezeichnungen; ohne Supabase
auch Struktur-Kopie.

## Bekannte Einschränkungen

- Live-DB braucht u. a. `supabase_patch_project_structure.sql` und
  `supabase_patch_component_groups.sql` (Spalte `bauteilgruppe`).
- Kein Login; Spalte `archived` ggf. noch nicht in der Live-DB.
