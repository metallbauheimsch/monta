# MONTA – Nächster Sprint

Status: Geplant

---

# Sprint

Sprint 6

---

# Ziel

Den Materialfluss vom TB bis zur Bestellung vollständig und einfach abbilden.

Es werden keine neuen Funktionen erfunden.

Es werden ausschließlich bestehende Abläufe vereinfacht und fertiggestellt.

---

# Aufgaben

## 1. Lager fertigstellen

Die Lageransicht wird zur zentralen Arbeitsansicht für den Materialverantwortlichen.

Pro Baugruppe:

- gleiche Artikel automatisch zusammenfassen
- Bauteile mit Mengen darunter anzeigen
- keine ausklappbaren Bereiche

Jede Position erhält:

- Gesamtmenge
- Bereits gelegt
- Restmenge
- Checkbox "Vollständig vorhanden"

Restmenge wird automatisch berechnet.

---

## 2. Bestellliste vereinfachen

Bestellliste erhält denselben Aufbau wie die Druckansicht.

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
- Herkunft (Bauteil – Menge)

Nur Restmengen werden angezeigt.

Keine ausklappbaren Bereiche.

---

## 3. Statusmodell

Materialstatus je Baugruppe einführen.

🔴 Offen

Material fehlt.

🟡 Bestellt

Material bestellt.

🟢 Bereit

Material vollständig vorhanden.

Status anzeigen in:

- Projektübersicht
- Druckansicht

---

## 4. Druck

Sortierungen ergänzen:

- Position
- Baugruppe
- Regal

Regalsortierung verwendet die hinterlegte Paternosterlogik.

---

## 5. Prüfung

Prüfung ähnlicher Schrauben fertigstellen.

Treffer wenn:

- gleiche Bezeichnung
- gleiche Größe
- Längenabweichung maximal 20 %

Berechnung anhand der größeren Länge.

Automatisch ergänzte Positionen ignorieren.

---

# Nicht Bestandteil dieses Sprints

- neue Materialarten
- neue Datenbankstruktur
- weitere Komfortfunktionen
- Statistiken
- Exportfunktionen

---

# Akzeptanzkriterien

Der Sprint gilt als abgeschlossen, wenn:

- App startet mit `npm run dev`
- keine bestehenden Funktionen beschädigt wurden
- Lager ohne ausklappbare Bereiche funktioniert
- Restmengen korrekt berechnet werden
- Bestellliste ausschließlich Restmengen zeigt
- Statusampel sichtbar ist
- Drucksortierung funktioniert
- Prüfung ähnliche Schrauben korrekt arbeitet

---

# Nach Abschluss

Cursor meldet:

- geänderte Dateien
- umgesetzte Funktionen
- offene Punkte
- Ergebnis von `npm run dev`

Danach erfolgt ein Praxistest mit echten Projektdaten.
