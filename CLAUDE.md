# MONTA – Projektanweisung für Claude Code

MONTA ist eine produktiv eingesetzte interne Anwendung der metallbau HEIMSCH GmbH.

WICHTIG:
Das System enthält echte laufende Projekte und Echtdaten.
Datenintegrität hat immer Vorrang vor Komfort oder neuen Funktionen.

## Verbindliche Projektdokumentation

Vor größeren Änderungen müssen die jeweils relevanten vorhandenen Dokumente gelesen und berücksichtigt werden:

@MONTA_MASTER_SPRINT.md
@MONTA_SAFETY.md
@MONTA_PRINCIPLES.md
@MONTA_PROJECT.md
@MONTA_DECISIONS.md
@MONTA_CHANGELOG.md
@MONTA_BACKLOG.md
@MONTA_NEXT_SPRINT.md
@AUTH_SETUP.md
@PRINT_STATION_SETUP.md
@HEIMSCH_PLATFORM.md
@supabase_schema.sql

Falls eine Datei nicht vorhanden ist, nicht erfinden. Den tatsächlichen Projektstand verwenden.

## Oberste Sicherheitsregel

Bestehende Echtdaten niemals unbeabsichtigt verändern.

Besonders schützen:

- Projekte
- Baugruppen
- Bauteile
- Materialpositionen
- Positionsnummern
- Mengen
- Bezeichnungen
- Größen
- Längen
- Ausführungen
- Hinweise
- important_note
- Herkunft
- Lager- und Vorbereitungsmengen
- Bestellstatus
- Lieferstatus
- Abschlusszustände

Keine Massenänderungen oder automatische Bereinigung bestehender Echtdaten.

Keine rückwirkende Normalisierung nur deshalb, weil sich eine neue Regel geändert hat.

Bereits real ausgeführte Zustände müssen erhalten bleiben.

## Arbeitsweise

Vor einem größeren Sprint:

1. relevante Dokumentation lesen
2. aktuellen Code untersuchen
3. bestehende Logik verstehen
4. Auswirkungen auf Echtdaten prüfen
5. erst danach Änderungen durchführen

Nicht raten, wenn der tatsächliche Code geprüft werden kann.

Bestehende getestete Funktionen nicht unnötig umbauen.

## Ohne ausdrückliche Freigabe niemals

- git commit
- git push
- SQL ausführen
- Datenbankmigration ausführen
- Supabase Edge Functions deployen
- Echtdaten verändern
- Secrets verändern oder ausgeben

Wenn eine gewünschte Änderung eine Schemaänderung oder ein Risiko für bestehende Echtdaten verursacht:
STOPPEN und zuerst nachfragen.

## Secrets und lokale Dateien

.env.local niemals committen.

API-Keys, Tokens, Service-Role-Keys und andere Secrets niemals ausgeben oder in Git speichern.

supabase/.temp/ soll nicht versioniert werden.

## Bestehende Fachlogik

Vor Änderungen bestehende Tests und Regeln beachten, insbesondere:

- TB
- Prüfung
- Lager
- Warenkorb
- Druck
- projektweite Materialaggregation
- Herkunft
- Suche
- kompakte Größensuche wie 1030 = M10x30
- wichtige Hinweise
- Hinweis-Deduplizierung
- Befestigungsregeln
- Mitlaufartikel
- HV-Garnituren
- Drehmomente
- Paternoster-Fachzuordnung
- Benutzerrechte / full_module_access
- mobile Bedienung
- Workflow-Abschlüsse
- Workflow-Mails
- Realtime
- Auth und Angemeldet-bleiben

Die tatsächlich vorhandene Implementierung und Dokumentation ist maßgeblich.

## Abschluss eines Coding-Sprints

Vor einem Abschlussbericht ausführen:

npm test
npm run build
git diff --check
git status

Im Abschlussbericht klar nennen:

- was geändert wurde
- warum
- Auswirkungen auf bestehende Daten
- Testergebnis
- Build-Ergebnis
- ob SQL nötig wäre
- ob eine Edge Function neu deployed werden müsste
- welche manuellen Tests vor Veröffentlichung nötig sind

Kein Commit und kein Push ohne ausdrückliche Freigabe.
