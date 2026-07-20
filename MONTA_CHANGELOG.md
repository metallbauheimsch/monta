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

# Sprint 7

## Baugruppenansicht vereinfacht

- Großer Button „Baugruppe anlegen" oberhalb des Anlegen-Formulars entfernt
  (war überflüssig neben Eingabefeld + „+ Baugruppe").
- „Baugruppe löschen" ist jetzt ein kleiner, zurückhaltender Button direkt
  neben „Umbenennen" in der Überschrift statt eines großen roten Buttons am
  Kartenende. Sicherheitsabfrage bleibt unverändert.

## TB-Erfassung

- Kopfbereich zurückgenommen: statt der großen Projektkarte steht über der
  Erfassung nur noch eine kleine Kontextzeile („Baugruppe: … · Bauteil: …",
  Projektname/-nummer klein daneben).
- Spaltenüberschriften der erfassten Positionen (Pos., Menge, Bezeichnung,
  Größe, Länge, Ausführung) sind anklickbar und sortieren die Tabelle;
  erneuter Klick kehrt die Richtung um (Pfeil ↑/↓). Sortierung ist numerisch
  korrekt (z. B. M4 vor M12, Länge 20 vor 100).

## Prüfung

- Ähnliche Verbindungsmittel werden nur noch verglichen, wenn zusätzlich die
  Ausführung identisch ist. Galvanisch, feuerverzinkt, HV und Edelstahl
  werden nie miteinander vermischt.

## Lager

- Wieder eine durchgehende Tabelle je Baugruppe statt Karten je Artikel
  (keine ausklappbaren Bereiche). Spalten: Regalfach, Bezeichnung, Größe,
  Länge, Ausführung, Gesamtmenge, Vorhanden (Zahlenfeld + Checkbox
  „Vollständig" kombiniert), Restmenge, Herkunft/Bauteil.
- Spaltenüberschriften sind anklickbar sortierbar. Ohne aktive Sortierung
  gilt weiterhin die tatsächliche Paternoster-Reihenfolge als Standard.
- Für galvanisch verzinkte Schrauben ist die Sortier-Reihenfolge Fach 27 →
  Fach 26 → Fach 1 jetzt verbindlich hinterlegt (vorher eine willkürliche
  Kategorie-Reihenfolge). Die übrigen Fächer werden entsprechend absteigend
  eingeordnet (27 → 26 → 25 → 9 → 7 → 3).

## Druckansicht

- Zeigt jetzt ausschließlich die aktuell geöffnete Baugruppe statt des
  ganzen Projekts (vorher wurden implizit alle Baugruppen gleichzeitig
  angezeigt). Die Gliederung nach Bauteil ist dadurch immer aktiv, unabhängig
  von der gewählten Sortierung; die Bauteil-Abschnitte stehen dabei immer in
  alphabetischer Reihenfolge.
- Sortierung „Baugruppe (Montage)" entfernt (war nur nötig, solange mehrere
  Baugruppen gleichzeitig sichtbar waren). Neu: Sortierung nach Bezeichnung,
  Größe und Länge (zusätzlich zu Position und Regal).
- Gruppierung gleicher Verbindungsmittel innerhalb desselben Bauteils
  (gleiche Bezeichnung/Größe/Länge/Ausführung, Mengen addiert) bleibt
  unverändert erhalten.

Keine Daten gelöscht, keine Supabase-Migration.

---

# Sprint 7 Abschluss

## Baugruppe anlegen

- Button-Beschriftung von „+ Baugruppe" auf „Anlegen" geändert - identische
  Bedienung wie beim Anlegen eines Bauteils.

## Lager – Herkunft

- Spalte „Herkunft / Bauteil" in „Herkunft" umbenannt. Zeigt je Bauteil
  zusätzlich die ursprünglichen TB-Positionsnummern (numerisch sortiert,
  ohne Duplikate, keine technischen IDs) statt der Menge, z. B.
  „Pergola · Stütze 1" / „Pos. 2, 11".
- Zusätzlich Status-Ampel je Baugruppe (wie in Warenkorb/Druck).

## Warenkorb vereinheitlicht

- Gleiche Tabellenoptik wie Lager/TB: Spalten Regalfach, Bezeichnung,
  Größe, Länge, Ausführung, Fehlmenge, Herkunft, Bestellt, Geliefert - alle
  anklickbar sortierbar.
- „Bestellt" ist jetzt eine Checkbox direkt am Feld `material_items.bestellt`
  der Position (vorher lokal je Artikel gespeichert).
- „Geliefert" ist ein Zahlenfeld und schreibt direkt in `bereit` - dasselbe
  Feld, das auch das Lager pflegt. Teillieferungen bleiben möglich; sinkt
  die Fehlmenge auf 0, verschwindet die Zeile automatisch.
- Damit entfällt die frühere, separate lokale Bestell-/Lieferliste je
  Warenkorb-Position (Sprint 6) vollständig - es gibt jetzt nur noch eine
  Datenhaltung für den Materialstatus.
- Neue Buttons „Tabelle kopieren" (tabulatorgetrennter Text mit
  Projektname, direkt in Outlook/Excel einfügbar) und „CSV exportieren"
  (Datei `MONTA_<Projektnummer>_Warenkorb.csv`) ersetzen den früheren
  Button „Warenkorb kopieren" (einfache Textliste).

## Materialstatus vereinheitlicht

- Bestellt/Geliefert hängen jetzt ausschließlich an der Materialposition
  selbst. Eine Änderung im Warenkorb wirkt sich dadurch automatisch auf TB,
  Prüfung, Lager, Warenkorb und Druck aus - alle zeigen immer denselben
  Stand.
- Status-Ampel (🔴/🟡/🟢) ist jetzt in allen fünf Baugruppen-Reitern
  sichtbar (vorher nur in Warenkorb und Druck).

## Druckansicht

- Spalte/Sortierung „Regal" in „Regalfach" umbenannt (wie in Lager/
  Warenkorb).
- Positionsnummern beim Zusammenfassen gleicher Verbindungsmittel jetzt
  numerisch sortiert und ohne Duplikate (vorher unsortierte Aneinanderreihung).
- Engere Abstände je Bauteil-Abschnitt und beim Drucken (kleinere
  Schrift/Zellenabstände), damit weniger Papier/Platz benötigt wird.

## Abgrenzung

- MONTA bleibt ausschließlich für Befestigungsmaterial. Keine
  projektübergreifende Bestellverwaltung, keine Angebote/Lieferscheine/
  Rechnungen - das bleibt bewusst außerhalb von MONTA (bestehende
  OneNote-Arbeitsabläufe unverändert).

Keine Daten gelöscht, keine neue Datenbankstruktur (bestehende, bisher
ungenutzte Felder `material_items.bestellt`/`bereit` werden jetzt
verwendet statt eines zusätzlichen Lokalspeichers).

---

# Sprint 7 – Korrekturen aus Praxistest

## Paternoster

- Fachzuordnung vollständig neu aufgebaut anhand der vom Betrieb
  bestätigten Liste (Fach 1–7, 9, 24–27). Fach 8 und 10–23 bleiben ohne
  MONTA-Zuordnung.
- Größenabhängige Zuordnung für galvanische und Edelstahl-Schrauben
  (z. B. M5 → Fach 1, M8 → Fach 27, M12 → Fach 26; Edelstahl M5 → Fach 6,
  M10 → Fach 5).
- Verbindlicher Laufweg: 27 → 26 → 25 → 24 → 9 → 7 → 6 → 5 → 4 → 3 → 2 → 1.
- Weiterhin nur eine zentrale Konfigurationsdatei, keine Pflegeoberfläche.

## Warenkorb

- Spalte „Regalfach" entfernt (irrelevant im Warenkorb; bleibt in Lager und
  Druck).
- Checkbox „Bestellung erfolgt" (Baugruppen-Häkchen) entfernt.
- Neu: „Alle Positionen bestellt" oberhalb der Tabellen - setzt/entfernt
  bestellt bei allen sichtbaren Zeilen; Haken folgt automatisch den
  Einzelhaken.
- Neu: Checkbox „Vollständig geliefert" je Position (zusätzlich zur
  Mengeneingabe); Teillieferungen bleiben möglich.
- „Tabelle kopieren" und „CSV exportieren" entfernt, ersetzt durch
  „Anfrage per Mail" (Standard-Mailprogramm, Empfänger Schrauben-Jäger AG,
  Betreff „Anfrage BV <Projektname>", Klartexttabelle mit Bezeichnung/
  Größe/Länge/Ausführung/Menge).

## Status

- Ampel wird ausschließlich aus den Materialpositionen berechnet
  (bestellt / bereit). Keine zweite, lokale Statuskopie mehr.
- Rot / Gelb / Grün folgen der Regel: Offen → Bestellt → Bereit, sichtbar
  in Projektübersicht, TB, Prüfung, Lager, Warenkorb und Druck.

## Druck

- Separate Sortierbuttons entfernt.
- Sortierung wie TB/Lager/Warenkorb über anklickbare Spaltenüberschriften
  (Position, Menge, Bezeichnung, Größe, Länge, Ausführung, Regalfach).

Keine Daten gelöscht, keine neue Datenbankstruktur.

---

# Abschlusskorrekturen vor Pilot

## Lager

- Spalte „Vorhanden" ist jetzt numerisch sortierbar (auf-/absteigend, Pfeil).

## Tabellen

- Einheitliches hellgraues Raster (horizontale und vertikale Linien) in TB,
  Lager, Warenkorb und Druck - auch in der Druckansicht.

## Warenkorb – vollständig geliefert

- Positionen bleiben nach „Vollständig geliefert" sichtbar (dezent grün,
  am Tabellenende).
- Checkbox kann wieder deaktiviert werden; vorheriger Lieferwert wird
  wiederhergestellt.
- Keine automatische Ausblendung mehr.
- Statusampel bleibt unabhängig von der Sichtbarkeit (Grün nur wenn keine
  Restmenge mehr).

## Regalfach Mitlaufartikel

- U-Scheiben und Sechskantmuttern erhalten dasselbe Regalfach wie Schrauben
  gleicher Größe und Ausführung (unabhängig von manuell/automatisch).

Keine Daten gelöscht, keine neue Datenbankstruktur.

---

# Stabilitäts-Sprint vor PWA

## Projekt löschen

- Auch das letzte Projekt kann gelöscht werden.
- Danach leere Projektübersicht mit „Noch kein Projekt vorhanden." und
  Button „Neues Projekt".
- Fehlgeschlagene Löschvorgänge werden sichtbar gemeldet; kein stilles
  Fehlschlagen mehr.
- RLS-Delete-Policy für Projekte in `supabase_schema.sql` ergänzt (in der
  Live-Datenbank einmalig anwenden, falls noch nicht vorhanden).

## Synchronisation PC ↔ Mobil

- Lokale Oberfläche aktualisiert sich nach Schreiben sofort.
- Realtime-Channel-Status wird in der Konsole protokolliert.
- Beim Zurückkehren in den Tab und beim Fenster-Fokus werden Daten neu
  geladen.
- Sparsamer Fallback alle 20 Sekunden, nur bei sichtbarer Seite.
- Hintergrund-Sync ohne Vollbild-Ladezustand (kein „Lade MONTA…" bei jedem
  Realtime-Ereignis).

## Bedienung

- Manueller PC/Mobil-Umschalter entfernt.
- Darstellung und TB-Sichtbarkeit folgen der Bildschirmbreite.

Keine Fachfunktionen neu hinzugefügt. Bestehende Daten bleiben erhalten.
Schema-Ergänzung nur für die fehlende Delete-Policy (für zuverlässiges
Löschen zwingend).

---

# Pilot Sprint: Mehrgeräte-Synchronisation, Projektstruktur und Mail

## Ursache

Baugruppen und Bauteile lagen nur in der lokalen Browser-Registry und waren
daher nicht geräteübergreifend sichtbar – auch nicht nach Pull-to-Refresh.

## Projektstruktur

- Neue Tabelle `project_structure` in Supabase (Baugruppe / Bauteil).
- Einmalige Migration aus lokaler Registry und vorhandenen Materialpositionen.
- Danach ist Supabase die gemeinsame Quelle für die Projektstruktur.

## Synchronisation

- Anlegen/Umbenennen/Löschen von Baugruppen und Bauteilen synchron.
- Realtime für `project_structure` zusätzlich zu Projekten und Material.
- Fokus, Sichtbarkeit und 20-Sekunden-Fallback bleiben bestehen.
- Pull-to-Refresh = normaler Browser-Reload (lädt alle Daten neu).

## Mobile Navigation

- Auf schmalen Bildschirmen: TB und Prüfung ausgeblendet.
- Sichtbar: Lager, Warenkorb, Druck.

## Mail

- „Anfrage per Mail" kopiert eine formatierte HTML-Tabelle in die
  Zwischenablage (für Outlook) und öffnet die Mail mit Klartext-Fallback.

Bestehende Projektdaten bleiben erhalten. SQL-Patch manuell ausführen:
`supabase_patch_project_structure.sql`.

---

# Bedien-Sprint: Suche, Tastaturauswahl und Bauteilgruppen

## Freitextsuche

- Kompakte Suche oberhalb der Tabellen in TB, Prüfung, Lager und Warenkorb.
- Filtert sofort (Groß-/Kleinschreibung egal, Teilbegriffe, Mehrwort-AND).
- Durchsucht u. a. Positionsnummer, Baugruppe, Bauteilgruppe, Bauteil,
  Bezeichnung, Größe, Länge, Ausführung, Regalfach, Hinweis, Herkunft.
- × löscht die Suche; keine Persistenz, keine Datenänderung.

## Mobile / Tablet

- Bis einschließlich 1024 px: TB und Prüfung ausgeblendet.
- Sichtbar: Lager, Warenkorb, Druck.
- Wird der aktive Reiter ausgeblendet, Wechsel auf Lager.
- Kein manueller PC/Mobil-Umschalter.

## Tastatur in TB-Vorschlägen

- Pfeile markieren, Enter und Leertaste übernehmen den markierten Vorschlag.
- Freies Leerzeichen bleibt möglich, wenn kein Vorschlag markiert ist.
- Escape schließt, Tab übernimmt und geht weiter.

## Bauteilgruppen

- Innerhalb einer Baugruppe können Bauteile zu einer Bauteilgruppe
  zusammengefasst werden (Name, Umbenennen, Mitglieder, Auflösen).
- Bauteile und Material bleiben eigenständig; Mengen unverändert.
- Speicherung: nullable Spalte `bauteilgruppe` in `project_structure`.
- Darstellung Baugruppe → Bauteilgruppe → Bauteil in allen relevanten Reitern
  und in der Druckansicht; „Nicht gruppiert" nur wenn Gruppen existieren.
- Sortierung nach Bauteilgruppe möglich; Standard: Anlage-Reihenfolge.
- Synchronisation wie bei Baugruppen/Bauteilen (Realtime, Fokus, Fallback,
  Pull-to-Refresh).

SQL-Patch manuell: `supabase_patch_component_groups.sql`.

---

# Sicherheits-Sprint: Anmeldung, Freigabe und Benutzerverwaltung

## Zugang

- MONTA ist nicht mehr öffentlich.
- Registrierung mit E-Mail, Passwort und Anzeigename; E-Mail-Bestätigung nötig.
- Zugriff auf Projektdaten erst nach Admin-Freigabe (`active`).
- Pending- und Blocked-Konten sehen keine Projektdaten (auch nicht in der DB).

## Administration

- Benutzerverwaltung für Administratoren: freigeben, sperren, entsperren,
  Rollen, dauerhaft löschen.
- Erster Admin: `stoehr@metallbau-heimsch.de` per einmaligem Bootstrap-SQL
  nach Registrierung.
- Löschen von Auth-Nutzern über Edge Function `admin-users` (kein Service-Role
  im Browser).

## Technik (fachlich relevant)

- Tabelle `user_profiles` mit Status und Rolle.
- Öffentliche RLS-Policies werden durch active-user-Policies ersetzt
  (Foundation zuerst, Lockdown nach Bootstrap).

E-Mail-Fachbenachrichtigungen und Druckstation bewusst zurückgestellt.

---

# Regeln

Nach jedem abgeschlossenen Sprint werden hier ergänzt:

- Was wurde geändert?
- Warum wurde es geändert?
- Welche Auswirkungen hat die Änderung auf den Arbeitsablauf?

Nur fachliche Änderungen dokumentieren.

Keine technischen Details.
