# MONTA – Backlog

Dieses Dokument enthält ausschließlich noch offene Aufgaben.

Regeln:

- Nur fachliche Aufgaben.
- Nach Priorität sortieren.
- Erledigte Aufgaben werden entfernt und im Changelog dokumentiert.
- Neue Ideen werden zuerst bewertet und anschließend hier einsortiert.

---

# Priorität A – Pilotversion

## Auth in Live-Supabase einrichten

Siehe `AUTH_SETUP.md` und `MONTA_NEXT_SPRINT.md`:

1. Foundation-SQL
2. Admin-Registrierung + Bootstrap
3. Lockdown-SQL
4. Edge Function `admin-users` deployen
5. Dashboard: E-Mail-Bestätigung, Passwortregeln, Redirect-URLs

## PWA / mobile Installation

- App als installierbare PWA für den mobilen Pilotbetrieb vorbereiten
  (Icons liegen bereits vor; Service Worker / Installationsfluss noch offen).

---

# Priorität B – Nach erfolgreicher Auth

## E-Mail-Benachrichtigungen (beschlossen, noch nicht umgesetzt)

- neue Baugruppe → sautter@metallbau-heimsch.de
- neue offene Bestellpositionen → stoehr@metallbau-heimsch.de
- alle Positionen bestellt → sautter@metallbau-heimsch.de

## Druckstation (beschlossen, noch nicht umgesetzt)

- eine konkrete angemeldete Gerätesitzung als Druckstation (nicht nur Benutzer)
- Drucker: Ricoh IM C2010, A4 Farbe
- automatischer Einmaldruck bei 100 % montagebereit
- Schutz vor Mehrfachdruck

## Nachvollziehbarkeit (Vorbereitung)

Später erkennbar machen, wer was getan hat (ohne großen Aufwand jetzt):

- wer eine Baugruppe angelegt hat
- wer Positionen bestellt hat
- wer eine Lieferung bestätigt hat
- welche Gerätesitzung als Druckstation dient

Noch keine `created_by`/`updated_by`-Spalten in diesem Stand.

---

# Priorität C – Nach Pilotbetrieb

## Lager

- Schnellfilter (Freitextsuche ist vorhanden; weitere Schnellfilter optional)

## Druck

- Weitere Drucklayouts

## Projekte

- Archiv komfortabler durchsuchen

## Komfort

- Suchfunktionen erweitern
- Weitere Druckoptionen

(„Statistiken" sind laut `MONTA_DECISIONS.md` kein Bestandteil von MONTA.)

---

# Ideenparkplatz

Hier kommen neue Ideen hinein.

Vor jeder Umsetzung:

> Ist das wirklich die einfachste Lösung für Metallbau Heimsch?

---

# Aktueller Fokus

1. Auth-Rollout in Live-Supabase (Foundation → Bootstrap → Lockdown)
2. Edge Function deployen und Admin-Tests
3. Danach E-Mail-Benachrichtigungen / Druckstation oder PWA
