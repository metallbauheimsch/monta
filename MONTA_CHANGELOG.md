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

# Regeln

Nach jedem abgeschlossenen Sprint werden hier ergänzt:

- Was wurde geändert?
- Warum wurde es geändert?
- Welche Auswirkungen hat die Änderung auf den Arbeitsablauf?

Nur fachliche Änderungen dokumentieren.

Keine technischen Details.
