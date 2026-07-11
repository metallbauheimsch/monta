# MONTA

> Digitaler Montageassistent für Metallbau Heimsch

---

# 1. Vision

MONTA ist keine Standardsoftware.

MONTA wird ausschließlich für Metallbau Heimsch entwickelt.

Das Ziel ist nicht eine möglichst umfangreiche Software, sondern das einfachste Werkzeug für den täglichen Arbeitsablauf.

Jede Funktion muss Zeit sparen.

Jeder Bildschirm muss verständlich sein.

Neue Funktionen entstehen ausschließlich aus dem Praxisfeedback.

---

# 2. Projektphilosophie

MONTA bildet den tatsächlichen Arbeitsablauf im Betrieb ab.

Nicht umgekehrt.

Jeder Mitarbeiter sieht ausschließlich die Informationen, die er für seine Aufgabe benötigt.

Komplexität wird grundsätzlich vermieden.

Es gilt immer:

> Ist das wirklich die einfachste Lösung für einen Metallbaubetrieb?

Wenn nein, wird sie nicht umgesetzt.

---

# 3. Ziel

Entwicklung einer stabilen 95%-Pilotversion.

Erst danach beginnt die eigentliche Weiterentwicklung anhand des täglichen Einsatzes.

---

# 4. Architektur

Die Struktur ist verbindlich.

Projekt

↓

Baugruppe

↓

Bauteil

↓

Material

Keine Funktion darf diese Struktur umgehen.

---

# 5. Arbeitsablauf

## TB

Arbeitet auf Bauteilebene.

Aufgaben:

- Material erfassen
- Material prüfen

TB sieht keine Lagerinformationen.

---

## Prüfung

Prüft:

- doppelte Materialien
- ähnliche Schrauben
- Plausibilität

Ähnliche Schrauben:

Treffer wenn

- gleiche Bezeichnung
- gleiche Größe
- Länge maximal 20 % unterschiedlich

Berechnung erfolgt immer anhand der größeren Länge.

Automatisch ergänzte Positionen werden ignoriert.

---

## Lager

Lager arbeitet auf Baugruppenebene.

Es ist KEINE Materialverwaltung.

Es dient ausschließlich zum Kommissionieren.

Pro Position werden angezeigt:

- Artikel
- Größe
- Länge
- Ausführung
- Gesamtmenge
- bereits gelegt
- Restmenge
- vollständig vorhanden

Innerhalb einer Baugruppe werden gleiche Positionen automatisch zusammengefasst.

Darunter erscheint:

Bauteil – Menge

Keine ausklappbaren Bereiche.

---

## Bestellliste

Arbeitet projektweit.

Zeigt ausschließlich Restmengen.

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
- Bestellmenge

Darunter:

Bauteil – Menge

Keine ausklappbaren Bereiche.

---

## Druck

Druck dient gleichzeitig als Montageunterlage.

Sortierungen:

- Position
- Baugruppe
- Regal

Jede Baugruppe besitzt eine Statusampel.

---

# 6. Statusmodell

🔴 Offen

Material fehlt.

---

🟡 Bestellt

Material bestellt.

Noch nicht vollständig vorhanden.

---

🟢 Bereit

Material vollständig vorhanden.

Montage kann beginnen.

Status erscheint:

- Projektübersicht
- Druckansicht

---

# 7. Materialmodell

Material besteht ausschließlich aus:

- Bezeichnung
- Größe
- Länge
- Ausführung
- Menge
- Hinweis

Festigkeit wird bewusst NICHT verwendet.

Ausführungen:

- galvanisch
- feuerverzinkt
- HV
- Edelstahl

---

# 8. Materialarten

## Schrauben

- Sechskantschraube
- Senkschraube
- Linsenkopfschraube
- Zylinderkopfschraube
- Bohrschraube
- Holzschraube
- Blechschraube

## Muttern

- Sechskantmutter
- Stoppmutter
- Hutmutter

## Scheiben

- U-Scheibe
- Karosseriescheibe

## Dübel

- Bolzenanker
- Betonschraube
- Rahmendübel
- Kunststoffdübel
- Hilti HIT
- Verbundmörtel
- Ankerstange

## Nieten

- Blindniete

Neue Bezeichnungen werden automatisch gelernt.

Es gibt keine Materialverwaltung.

---

# 9. Automatische Ergänzungen

Sechskantschraube

→ 2 × U-Scheibe

→ 1 × Sechskantmutter

Senkschraube

→ 1 × U-Scheibe

→ 1 × Sechskantmutter

Die Hauptposition bleibt immer unverändert.

Ergänzungen können pro Position deaktiviert werden.

---

# 10. Paternoster

Das Paternoster ist fest hinterlegt.

Keine Bearbeitung.

Keine Einstellungen.

MONTA kennt intern die Regalplätze.

Sortierung nach Regal erfolgt automatisch.

---

# 11. Projektverwaltung

Ein Projekt kann:

- erstellt werden
- archiviert werden
- gelöscht werden

Archivierte Projekte bleiben vollständig erhalten.

Löschen erfolgt ausschließlich nach Sicherheitsabfrage.

---

# 12. Bedienprinzipien

Priorität:

1. möglichst wenige Klicks

2. möglichst wenig Tipparbeit

3. maximale Übersicht

4. robuste Bedienung

5. mobile Nutzbarkeit

Erst danach Komfortfunktionen.

---

# 13. Entwicklungsregeln

Vor jeder Änderung:

1. bestehenden Code analysieren

2. vorhandene Funktionen testen

3. einfachste Lösung auswählen

4. implementieren

5. testen

6. Änderungen dokumentieren

Keine Annahmen treffen.

Keine halbfertigen Funktionen.

Keine unnötigen Abstraktionen.

Keine Funktionen "für später".

---

# 14. Technische Basis

Frontend

- React

Backend

- Supabase

Versionsverwaltung

- GitHub

Deployment

- Vercel

Entwicklung

- Cursor

---

# 15. Entscheidungsprotokoll

Hier werden dauerhaft alle wichtigen Projektentscheidungen dokumentiert.

Beispiel:

## Sprint 5

- Material wurde wieder in Lager umbenannt.
- Montage-Reiter entfällt.
- Bestellliste verwendet ausschließlich Restmengen.
- Lager arbeitet auf Baugruppenebene.
- Statusampel eingeführt.

Jede zukünftige Entscheidung wird hier ergänzt.

---

# 16. Regeln für Cursor

Vor jeder Aufgabe:

1. Diese Datei vollständig lesen.
2. Den aktuellen Code analysieren.
3. Prüfen, ob die gewünschte Änderung zum Arbeitsablauf von Metallbau Heimsch passt.
4. Die einfachste technisch saubere Lösung wählen.
5. Bestehende Funktionen dürfen nicht verschlechtert werden.
6. Nach Abschluss immer berichten:
   - geänderte Dateien
   - umgesetzte Änderungen
   - offene Punkte
   - Ergebnis von `npm run dev`

Wenn Dokumentation und Code voneinander abweichen, hat zunächst der aktuelle Code Vorrang. Der Widerspruch ist zu dokumentieren und gemeinsam zu entscheiden.
