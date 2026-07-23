# MONTA MASTER SPRINT

Version: 1.0

Dieses Dokument ist die zentrale Entwicklungsgrundlage für MONTA.

Es beschreibt:

- Entwicklungsregeln

- Projektstruktur

- Fachlogik

- Sicherheitsregeln

- Workflow

- Dokumentationsregeln

Alle zukünftigen Sprints bauen auf diesem Dokument auf.

---

# 1. Verbindliche Dokumente

Vor jeder Entwicklung vollständig lesen:

1. MONTA_MASTER_[SPRINT.md](http://SPRINT.md)

2. MONTA_[SAFETY.md](http://SAFETY.md)

3. MONTA_[PRINCIPLES.md](http://PRINCIPLES.md)

4. MONTA_[PROJECT.md](http://PROJECT.md)

5. MONTA_[DECISIONS.md](http://DECISIONS.md)

6. MONTA_[CHANGELOG.md](http://CHANGELOG.md)

7. MONTA_[BACKLOG.md](http://BACKLOG.md)

8. MONTA_NEXT_[SPRINT.md](http://SPRINT.md)

9. AUTH_[SETUP.md](http://SETUP.md)

10. PRINT_STATION_[SETUP.md](http://SETUP.md)

11. HEIMSCH_[PLATFORM.md](http://PLATFORM.md)

Diese Dokumente bilden gemeinsam die verbindliche Wissensbasis.

---

# 2. Projektbeschreibung

MONTA ist die zentrale digitale Arbeitsplattform der Metallbau Heimsch GmbH.

Die Software unterstützt den kompletten Montageprozess:

- Projektverwaltung

- Materialerfassung

- Technische Bearbeitung

- Lager

- Prüfung

- Warenkorb

- Bestellung

- Druck

- Workflow

- Benutzerverwaltung

- Realtime-Synchronisation

MONTA bildet reale Projekte ab.

Die Software passt sich dem Arbeitsablauf an.

Nicht umgekehrt.

---

# 3. Fachmodell

Projekt

↓

Baugruppe (artgleiche Bauteile, z. B. Stützen S1–S5)

↓

Bauteil

↓

Materialposition

Eine Materialposition gehört immer genau zu einem Bauteil.

Mehrere identische Positionen dürfen ausschließlich für Anzeigezwecke
projektweit aggregiert werden.

Die Originalpositionen bleiben immer erhalten.

Umgesetzte Regeln (Code, manuell zu testen):

- Keine Bauteilgruppen-UI mehr
- Bauteil duplizieren (neue UUIDs, Status zurückgesetzt)
- Zentrale Bauteilaktionen nach Auswahl
- Prüfung / Lager / Warenkorb projektweit
- Druck nach Baugruppe mit Suche
- HV-Garnitur, kurze Drehmomente, Ankerstangen-Mitlauf nur neu/bearbeitet
- Herkunft: Bauteilnamen; Pos. nur bei Suche
- Vollzugriff über Admin / `full_module_access`
- Lokale App ohne `.env.local` lädt keine Live-Daten (keine stille Demo)
- „Angemeldet bleiben“ für Session-Persistenz
- Paternoster: Edelstahl M8–M20 → Fach 5; Keilscheiben 26; HAS 2; Gitterrost 10
  (automatisierte Tests grün; Fach nur berechnet, nicht in DB gespeichert)

---

# 4. Sicherheitsregeln

Es gelten uneingeschränkt die Regeln aus

MONTA_[SAFETY.md](http://SAFETY.md)

Diese besitzen Vorrang vor neuen Funktionen.

---

# 5. Entwicklungsprinzipien

Es gelten vollständig die Regeln aus

MONTA_[PRINCIPLES.md](http://PRINCIPLES.md)

Neue Funktionen müssen sich daran orientieren.

---

# 6. Standard-Arbeitsweise

Bei jedem Sprint:

1. Dokumente lesen

2. Architektur prüfen

3. Änderungen planen

4. Umsetzung

5. Build

6. Dokumentation

7. Abschlussbericht

Kein Commit.

Kein Push.

Keine SQL automatisch ausführen.

Keine Edge Function automatisch deployen.

---

# 7. Abschlussbericht

Am Ende jedes Sprints:

- Ursache

- Architektur

- geänderte Dateien

- SQL

- Edge Functions

- Build

- Testanleitung

- offene Punkte

---

# Ende des Master-Dokuments