# MONTA – Backlog

Dieses Dokument enthält ausschließlich noch offene Aufgaben.

Regeln:

- Nur fachliche Aufgaben.
- Nach Priorität sortieren.
- Erledigte Aufgaben werden entfernt und im Changelog dokumentiert.
- Neue Ideen werden zuerst bewertet und anschließend hier einsortiert.

---

# Priorität A – Pilotversion

## Mehrgeräte-Sync / Projektstruktur / Mail

(Erledigt im Code mit Pilot Sprint. Siehe Changelog.)

In der Live-Supabase einmalig ausführen:

- `supabase_patch_project_structure.sql`
- Delete-Policy und Realtime für projects / material_items
  (siehe `MONTA_NEXT_SPRINT.md`)

---

## Stabilität / Lager / Warenkorb / Druck / Status / Regal

(Erledigt mit Sprint 6/7 und Stabilitäts-Sprint. Siehe Changelog.)

---

## PWA / mobile Installation

- App als installierbare PWA für den mobilen Pilotbetrieb vorbereiten
  (Icons liegen bereits vor; Service Worker / Installationsfluss noch offen).

---

# Priorität B – Nach Pilotbetrieb

## Lager

- Schnellfilter

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

1. SQL-Patch in Live-Supabase anwenden
2. Pilot-Test Mehrgeräte (PC + Smartphone)
3. Danach PWA
