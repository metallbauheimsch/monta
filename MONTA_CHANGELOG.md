# MONTA – Changelog

Dieses Dokument enthält alle wichtigen Änderungen und Entscheidungen des Projekts.

Es dokumentiert **nicht** jeden Code-Commit, sondern ausschließlich fachlich relevante Änderungen.

---

# Sprint 1

## Ausgangslage

Bestehende React-Anwendung übernommen.

Vorhandene Funktionen:

- Projektverwaltung
- Materialpositionen
- Prüfung
- Druckansicht
- Autocomplete
- Positionsnummer intern
- Druck nach Position sortiert

---

# Sprint 2

## Codebasis

- Beginn der Modularisierung.
- Materialfunktionen in eigene Bereiche aufgeteilt.
- Vorbereitungen für spätere Erweiterungen geschaffen.

Keine Daten gelöscht.

Keine Supabase-Migration.

---

# Sprint 3

## Bedienung vereinfacht

- Autocomplete verbessert.
- Detailsansichten reduziert.
- Bestellliste vereinfacht.
- Montage-Reiter entfernt.
- Druckansicht als zukünftige Montageunterlage vorgesehen.

---

# Sprint 4

## Projektverwaltung

- Projekt löschen ergänzt.
- Archivieren überarbeitet.
- Neues Projekt startet ohne vorhandene Eingaben.
- Baugruppen werden erst nach Projektanlage erstellt.

## Prüfung

- Prüfung ähnlicher Befestigungsmittel verbessert.

---

# Sprint 5

## Lager

- Material wieder in Lager umbenannt.
- Lager arbeitet auf Baugruppenebene.
- Gleiche Positionen werden innerhalb einer Baugruppe zusammengefasst.
- Keine ausklappbaren Bereiche mehr.

## Kommissionierung

Neue Felder:

- Bereits gelegt
- Restmenge
- Vollständig vorhanden

Restmengen werden automatisch berechnet.

---

## Bestellliste

Bestellliste verwendet ausschließlich Restmengen.

Sortierung:

Projekt

↓

Baugruppe

↓

Artikel

Anzeige:

- Artikel
- Größe
- Länge
- Ausführung
- Herkunft (Bauteil – Menge)

---

## Druck

Neue Sortierungen vorgesehen:

- Position
- Baugruppe
- Regal

---

## Statusmodell

Materialstatus eingeführt.

🔴 Offen

🟡 Bestellt

🟢 Bereit

Status erscheint künftig:

- Projektübersicht
- Druckansicht

---

# Offene Themen

- Baugruppen vollständig integrieren
- Drucksortierung nach Regal fertigstellen
- Statuslogik automatisch berechnen
- Lager vollständig auf Pilotversion bringen

---

# Sprint 6

## Prüfung

- Prüfregel auf feste 20-mm-Regel umgestellt: Ähnliche Verbindungsmittel
  werden bei einer absoluten Längendifferenz von maximal 20 mm angezeigt.
  Die bisherige Prozentregel wurde vollständig entfernt.
- Prüfung vergleicht ausschließlich direkte Paare, keine über Zwischenwerte
  verketteten Gruppen mehr.
- Jede Position zeigt zusätzlich ihre Positionsnummer, damit Positionen mit
  identischen Materialangaben unterscheidbar bleiben.
- Positionsnummer ist dafür auch in der TB-Erfassung sichtbar.

## Baugruppen

- Baugruppe löschen ergänzt (inkl. aller Bauteile, Materialpositionen und
  zugehöriger lokaler Statusinformationen), mit Sicherheitsabfrage, auch
  wenn die Baugruppe Material enthält.

## Lager

- Zeigt direkt an, wie viele Stück in den Warenkorb gelegt werden.
- Checkbox „Vollständig vorhanden" erfindet beim Deaktivieren keine Menge
  mehr - der vorherige manuelle Wert wird nach Möglichkeit wiederhergestellt.

## Warenkorb (bisher Bestellliste)

- Bestellliste in „Warenkorb" umbenannt (nur Anzeige, technischer Aufbau
  unverändert).
- Button „Warenkorb kopieren" ergänzt: kopiert eine einfache Textliste
  (kein HTML, keine Tabelle, keine technischen IDs) in die Zwischenablage.
- Je Position zusätzlich Bestell-/Lieferstatus: Checkbox „Bestellt", Feld
  „Gelieferte Menge", Status wird automatisch berechnet (inkl. Teillieferung).

## Montage

- Kein eigener Montage-Reiter. Druckansicht übernimmt die Montageunterlage
  und gliedert bei Sortierung „Baugruppe" zusätzlich nach Bauteil (Projekt
  → Baugruppe → Bauteil → Material).

## Regal/Paternoster

- Platzhalter-Sortierung durch die tatsächlich vom Betrieb dokumentierte
  Fachzuordnung ersetzt. Nicht eindeutig zuordenbare Artikel erscheinen
  ehrlich als „Ohne Fachzuordnung" statt mit erfundenem Fach.

## Baugruppen/Bauteile umbenennen

- Baugruppe und Bauteil können jetzt direkt umbenannt werden (einfaches
  Inline-Feld, kein Dialog). Vorhandene Materialpositionen bleiben dabei
  erhalten und werden nicht dupliziert, die alte Bezeichnung bleibt danach
  nicht zusätzlich bestehen. Leere Namen sind gesperrt, Leerzeichen am
  Anfang/Ende werden automatisch entfernt.

## Neues Projekt

- Ein neu angelegtes Projekt legt keine Baugruppe mehr automatisch an
  (weder „Allgemein" noch „Erste Baugruppe"). Das Projekt ist zunächst
  leer, ein deutlicher Button „Baugruppe anlegen" führt zur bewussten
  ersten Anlage. Bestehende Projekte und deren Baugruppen sind davon nicht
  betroffen.

## Befestigungsmaterial (Druckansicht)

- Gleiche Verbindungsmittel (gleiche Bezeichnung/Größe/Länge/Ausführung)
  werden innerhalb desselben Bauteils zu einer Zeile zusammengefasst, Mengen
  addiert. Positionen aus unterschiedlichen Bauteilen werden dabei nie
  vermischt. Gilt für automatisch ergänzte Positionen genauso wie für
  normal erfasste.

## Lager

- Sortierung innerhalb jeder Baugruppe erfolgt jetzt nach dem echten
  Regalfach (niedrigste Fachnummer zuerst), danach nach Bezeichnung/Größe/
  Länge. Artikel ohne bestätigte Fachzuordnung erscheinen zuletzt unter
  „Ohne Fachzuordnung". Je Position wird das Regalfach zusätzlich
  angezeigt. Die frühere Platzhalter-Reihenfolge nach Materialart wird im
  Lager nicht mehr verwendet.

Keine Daten gelöscht außer über die bestehende, ausdrücklich geforderte
Baugruppen-Löschfunktion. Keine Supabase-Migration.

---

# Regeln

Nach jedem abgeschlossenen Sprint werden hier ergänzt:

- Was wurde geändert?
- Warum wurde es geändert?
- Welche Auswirkungen hat die Änderung auf den Arbeitsablauf?

Nur fachliche Änderungen dokumentieren.

Keine technischen Details.
