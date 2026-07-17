# MONTA – Projektdokumentation

Interne Web-App für Metallbau Heimsch zur Verwaltung von Befestigungsmaterial
je Projekt. Optimiert ausschließlich für diesen Betrieb, kein Standardprodukt.

Statistiken sind grundsätzlich kein Bestandteil von MONTA.

## Datenmodell

Projekt → Baugruppe → Bauteil → Materialposition

- `projects` und `material_items` sind eigene Datenbanktabellen (Supabase).
- Baugruppen und Bauteile liegen in `project_structure` (Supabase):
  - Zeile mit leerem `bauteil` → Baugruppe
  - Zeile mit Baugruppe + Bauteil → Bauteil
- Materialpositionen tragen weiterhin `einbauort` im Format
  `"Baugruppe / Bauteil"` (`src/utils/structure.js`).
- Beim ersten Laden werden lokale Registry-Einträge und vorhandene
  Materialpositionen einmalig nach `project_structure` migriert.

## Funktionen (Ist-Stand nach Pilot Sprint: Mehrgeräte-Sync)

- **Projektverwaltung**: Anlegen, Archivieren/Zurückholen, endgültiges Löschen
  (auch das letzte verbleibende Projekt). Nach dem Löschen erscheint die
  leere Projektübersicht („Noch kein Projekt vorhanden." / „Neues Projekt").
  Ein neu angelegtes Projekt startet ohne automatisch angelegte Baugruppe.
- **Baugruppen/Bauteile**: Anlegen, Umbenennen, Löschen – gespeichert in
  Supabase (`project_structure`), sofort lokal sichtbar und auf anderen
  Geräten über Realtime/Fokus/Fallback synchron.
- **Mehrgeräte-Sync**: Supabase ist die zentrale Datenquelle für Projekte,
  Projektstruktur und Materialpositionen. Sofortige lokale Updates nach
  Schreiben; Realtime; Reload bei Sichtbarkeit/Fokus; sparsamer Fallback
  alle 20 Sekunden bei sichtbarer Seite. Pull-to-Refresh am Smartphone/
  Tablet = normaler Browser-Reload (lädt alle Daten neu).
- **Darstellung**: Kein manueller PC/Mobil-Umschalter. Auf schmalen
  Bildschirmen sichtbar: Lager, Warenkorb, Druck. Ausgeblendet: TB und
  Prüfung (Erfassung/Prüfung am PC).
- **TB-Erfassung** (PC): Schnelle Tabellenerfassung, Positionsnummer sichtbar,
  Vorschlagsliste, automatische Ergänzung U-Scheibe(n)/Mutter. Sortierbare
  Spalten. Kompakte Kontextzeile statt großer Projektkarte.
- **Prüfung ähnlicher Verbindungsmittel**: siehe eigener Abschnitt (nur PC).
- **Lager**: Tabelle je Baugruppe mit Regalfach, Vorhanden, Restmenge,
  Herkunft (Baugruppe · Bauteil + TB-Pos.). Paternoster-Laufweg.
- **Warenkorb**: Fehlmengen, Bestellt/Geliefert, vollständig gelieferte
  bleiben sichtbar (grün). „Anfrage per Mail": HTML-Tabelle in die
  Zwischenablage (für Outlook), Klartext-Fallback, mailto an
  vertrieb@schrauben-jaeger.de, Betreff „Anfrage BV <Projektname>".
- **Druckansicht**: Aktuelle Baugruppe, nach Bauteil gegliedert, sortierbar.
- **Regal/Paternoster**: Feste Zuordnung in `regalOrder.js`.
- **Statusampel** (🔴/🟡/🟢/⚪): aus Materialpositionen (`bestellt` / `bereit`).

## Prüfregel „Ähnliche Verbindungsmittel" (Stand Sprint 7)

Ähnliche Verbindungsmittel bei absoluter Längendifferenz maximal 20 mm,
gleicher Bezeichnung/Größe/Ausführung, unterschiedliche Längen.
Automatisch ergänzte Positionen werden ignoriert.
Umsetzung: `src/features/fastening/Checks.jsx`.

## Regal/Paternoster-Zuordnung

Zentrale Datei: `src/features/fastening/regalOrder.js`.
Laufweg: 27 → 26 → 25 → 24 → 9 → 7 → 6 → 5 → 4 → 3 → 2 → 1.
U-Scheiben/Sechskantmuttern: gleiches Fach wie passende Schraube.

## Speicherorte

**In Supabase** (wenn konfiguriert):

- Projekte
- Projektstruktur (Baugruppen/Bauteile)
- Materialpositionen inkl. `bestellt` / `bereit`

**Nur lokal im Browser** (gerätegebunden):

- Zuletzt manuell erfasster „bereits gelegt"/„geliefert"-Wert
- Gelernte Bezeichnungsvorschläge
- Ohne Supabase: sämtliche Daten inkl. lokaler Struktur-Kopie

## Bekannte Einschränkungen

- Kein Login/Benutzerverwaltung (interner Prototyp).
- Spalte `archived` ggf. noch nicht in der Live-DB.
- Live-Supabase braucht den SQL-Patch `supabase_patch_project_structure.sql`
  (Tabelle + RLS + Realtime) und die Delete-Policy für Projekte.
- Sehr große Warenkörbe können die mailto-Längengrenze überschreiten –
  dann verständliche Fehlermeldung; HTML-Tabelle bleibt in der Zwischenablage.
