# MONTA – Sicherheitsrichtlinien

Version: 1.0

Diese Regeln gelten für jede Weiterentwicklung von MONTA.

Sie haben Vorrang vor neuen Funktionen.

---

# 1. Echtdaten haben oberste Priorität

MONTA wird mit echten Projekten im laufenden Betrieb verwendet.

Jede Änderung muss so entwickelt werden, dass bestehende Projekte vollständig erhalten bleiben.

Es dürfen niemals unbeabsichtigt geändert werden:

- Projekte

- Baugruppen

- Bauteile

- Materialpositionen

- Mengen

- Größen

- Längen

- Ausführungen

- Hinweise

- Positionsnummern

- Bestellstatus

- Lagerstatus

- Prüfstatus

---

# 2. Keine automatische Datenmigration

Bestehende Datensätze dürfen niemals automatisch verändert werden.

Neue Regeln gelten grundsätzlich nur für

- neue Projekte

- neu angelegte Positionen

- bewusst bearbeitete Positionen

Ausnahmen nur nach ausdrücklicher Freigabe.

---

# 3. Keine automatische Datenbereinigung

Es dürfen niemals automatisch

- Positionen gelöscht

- Positionen zusammengeführt

- Positionen umbenannt

- Mengen verändert

- Hinweise überschrieben

werden.

---

# 4. SQL

SQL-Dateien dürfen niemals automatisch ausgeführt werden.

Immer:

- SQL-Datei erzeugen

- Benutzer informiert

- manuelle Ausführung im SQL-Editor

---

# 5. Edge Functions

Edge Functions niemals automatisch deployen.

Immer:

- Build

- Abschlussbericht

- Benutzer entscheidet über Deploy

---

# 6. Commit

Kein Commit.

Kein Push.

Bis der Benutzer ausdrücklich freigibt.

---

# 7. Datenmodell

Bestehende Tabellen möglichst erweitern.

Nicht ersetzen.

Neue Spalten bevorzugen.

Vor Änderungen prüfen:

- Rückwärtskompatibilität

- bestehende Daten

- RLS

- Realtime

---

# 8. IDs

Bestehende IDs niemals verändern.

Neue Datensätze erhalten neue UUIDs.

---

# 9. Löschen

Bei Löschfunktionen immer Sicherheitsdialog.

Nie stillschweigend löschen.

---

# 10. Build

Vor Abschluss immer:

npm run build

git diff --check

git status

---

# 11. Abschlussbericht

Jeder Sprint endet mit:

- geänderte Dateien

- SQL-Dateien

- notwendige Deploys

- Build-Ergebnis

- manuelle Testschritte

---

# 12. Reale Projekte

Bei allen Änderungen gilt:

Bestehende Projekte besitzen Dokumentationscharakter.

Neue Funktionen dürfen alte Projekte nicht fachlich verändern.

Neue Regeln gelten nur für zukünftige Projekte oder bewusst bearbeitete Positionen.

---

# 13. Fachliche Priorität

Im Zweifel gilt:

1. Datenintegrität

2. Nachvollziehbarkeit

3. Bedienbarkeit

4. Komfortfunktion

Komfortfunktionen dürfen niemals Daten gefährden.

---

# 14. Grundsatz

Lieber eine neue Funktion später ausliefern,

als ein reales Projekt beschädigen.

MONTA ist ein Produktionssystem.

Nicht nur eine Testanwendung.

