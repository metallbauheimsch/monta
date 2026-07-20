# MONTA – Backlog

Dieses Dokument enthält ausschließlich noch offene Aufgaben.

Regeln:

- Nur fachliche Aufgaben.
- Nach Priorität sortieren.
- Erledigte Aufgaben werden entfernt und im Changelog dokumentiert.
- Neue Ideen werden zuerst bewertet und anschließend hier einsortiert.

---

# Priorität A – Pilotversion

## SQL-Patches in Live-Supabase

Einmalig ausführen (falls noch nicht geschehen):

- `supabase_patch_project_structure.sql`
- `supabase_patch_component_groups.sql` (Spalte `bauteilgruppe`)
- Delete-Policy und Realtime für projects / material_items
  (siehe `MONTA_NEXT_SPRINT.md`)

## PWA / mobile Installation

- App als installierbare PWA für den mobilen Pilotbetrieb vorbereiten
  (Icons liegen bereits vor; Service Worker / Installationsfluss noch offen).

---

# Priorität B – Nach Pilotbetrieb

## Lager

- Schnellfilter (Freitextsuche ist vorhanden; weitere Schnellfilter optional)

---

## Druck

- Weitere Drucklayouts

---

## Projekte

- Archiv komfortabler durchsuchen

---

# Priorität C – Komfortfunktionen

Diese Punkte werden erst nach erfolgreichem Pilotbetrieb bewertet.

- Suchfunktionen erweitern
- Weitere Druckoptionen

(„Statistiken" wurde entfernt: `MONTA_DECISIONS.md` legt eindeutig fest,
dass Statistiken grundsätzlich kein Bestandteil von MONTA sind.)

---

# Ideenparkplatz

Hier kommen neue Ideen hinein.

Neue Ideen werden nicht sofort umgesetzt.

Vor jeder Umsetzung wird geprüft:

> Ist das wirklich die einfachste Lösung für Metallbau Heimsch?

Wenn nein, wird die Idee verworfen.

---

# Aktueller Fokus

1. SQL-Patches in Live-Supabase anwenden (`project_structure` + `bauteilgruppe`)
2. Pilot-Test Bedienung (Suche, Mobile ≤1024, Gruppen, Sync PC↔Smartphone)
3. Danach PWA
