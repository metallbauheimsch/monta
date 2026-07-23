# MONTA Entscheidungen

Diese Datei enthält ausschließlich dauerhafte Grundsatzentscheidungen.

Keine Sprintplanung.

Keine offenen Aufgaben.

Keine Ideen.

Nur verbindliche Regeln.

---

## Ziel

MONTA ist ein Werkzeug zur Erfassung, Prüfung, Vorbereitung und Bereitstellung von Befestigungsmaterial.

MONTA ist keine Projektmanagement-Software.

---

## Projektstruktur

Projekt

↓

Baugruppe

↓

Bauteilgruppe (optional)

↓

Bauteil

↓

Materialposition

Bauteilgruppen fassen nur die Anzeige/Struktur zusammen. Bauteile und
Materialpositionen bleiben eigenständig; Mengen werden nicht verändert.

---

## Material

Es existiert genau eine Materialposition.

Alle Ansichten arbeiten auf derselben Datenbasis.

Es werden keine Daten kopiert.

Bestellt- und Liefermenge gehören direkt zur Materialposition, nicht zu einem separaten Speicher je Ansicht.

Jede Ansicht (Projektübersicht, TB, Prüfung, Lager, Warenkorb, Druck) zeigt denselben Materialstatus.

---

## TB

Der TB erfasst Verbindungsmittel manuell.

Ein späterer 3D-Import bleibt vorbereitet.

Bis zur Einführung eines geeigneten 3D-CAD-Programms erfolgt keine weitere Entwicklung in diesem Bereich.

---

## Prüfung

Ähnliche Verbindungsmittel werden angezeigt bei:

- gleicher Bezeichnung

- gleicher Größe

- gleicher Ausführung

- vorhandener Länge

- unterschiedlicher Länge

- maximal 20 mm direkter Längendifferenz

Galvanisch, feuerverzinkt, HV und Edelstahl werden dabei nie miteinander vermischt.

Automatisch ergänzte Positionen werden ignoriert.

---

## Lager

Material wird immer je Baugruppe vorbereitet.

Gleiche Artikel werden innerhalb einer Baugruppe zusammengefasst.

Die Lageransicht zeigt das Regalfach an und sortiert im tatsächlichen Paternoster-Laufweg:

27 → 26 → 25 → 24 → 10 → 9 → 7 → 6 → 5 → 4 → 3 → 2 → 1

Die Regalfachzuordnung wird dynamisch aus Bezeichnung + Ausführung + Größe berechnet
(`regalOrder.js`). Es gibt keine gespeicherte Fach-Spalte in der Datenbank und keine
globale Migration bestehender Positionen.

Verbindliche Fachlogik (Priorität):

1. Sonderartikel: GiRo→10, Keilscheiben→26, Hilti HAS→2,
   Dübelfamilie (Edelstahl→4, verzinkt/feuerverzinkt→25), HV→26
2. Edelstahl-Kleinmaß M4–M6 → Fach 6
3. Galvanisch M3–M6 → Fach 1
4. Matrix ab M8 (Edelstahl→5, galvanisch 27/26, feuerverzinkt→9)

Keine Pflegeoberfläche.

Keine Einstellungen.

Keine Datenbanktabelle für Regalfächer.

Die Lageransicht ist eine durchgehende Tabelle je Baugruppe, keine Karten, keine ausklappbaren Bereiche.

Die Herkunft einer Lagerposition zeigt Baugruppe, Bauteil und die ursprünglichen TB-Positionsnummern, keine technischen IDs.

---

## Warenkorb

Die Bestellliste heißt Warenkorb.

Es werden Fehlmengen angezeigt.

Vollständig gelieferte Positionen bleiben im Warenkorb sichtbar (dezent grün, am Tabellenende), damit die Checkbox „Vollständig geliefert" wieder deaktiviert werden kann.

Keine automatische Ausblendung vollständig gelieferter Positionen.

Der Warenkorb entsteht direkt aus den Eingaben im Lager.

Der Warenkorb ist eine Tabelle in derselben Optik wie Lager und TB, mit sortierbaren Spalten.

Im Warenkorb wird kein Regalfach angezeigt (Regalfächer bleiben in Lager und Druck).

Angebotsanfragen an den Schraubenhändler erfolgen über „Anfrage per Mail"
(Standard-Mailprogramm, Empfänger Schrauben-Jäger AG).

Dabei wird eine HTML-Tabelle (Bezeichnung, Größe, Länge, Ausführung, Menge)
in die Zwischenablage gelegt, damit sie in Outlook sauber eingefügt werden
kann. Klartext bleibt Fallback. Kein separater CSV-Export.

Der Warenkorb ist keine allgemeine Bestellverwaltung.

OneNote bleibt für allgemeine Bestellungen und Dokumente zuständig.

---

## Bestellung und Lieferung

Bestellte Positionen müssen erkennbar sein.

Teillieferungen müssen möglich sein.

Eine Position gilt als vollständig geliefert, wenn die gelieferte Menge mindestens der Bestellmenge entspricht.

Bestellt und geliefert werden direkt an der Materialposition gepflegt (Felder "bestellt" und "bereit"), nicht in einem separaten Speicher.

Es gibt kein manuelles Baugruppen-Häkchen „Bestellung erfolgt".

Der Bestellt-Status der Baugruppe ergibt sich aus den Positionen:

- Rot (Offen): Restmenge vorhanden und nicht alle fehlenden Positionen bestellt

- Gelb (Bestellt): alle fehlenden Positionen bestellt, mindestens eine noch nicht vollständig geliefert

- Grün (Bereit): keine Restmenge mehr (vollständig vorhanden oder geliefert)

---

## Montage

Es gibt keinen eigenen Montage-Reiter.

Die Druckansicht dient als Montageunterlage.

Die Druckansicht zeigt ausschließlich die aktuell geöffnete Baugruppe.

Die Materialzuordnung erfolgt nach:

- Baugruppe

- Bauteilgruppe (optional)

- Bauteil

Die Druckansicht zeigt die Hierarchie Baugruppe → Bauteilgruppe → Bauteil
mit kompakten Überschriften; die Bauteilgruppe wird nicht auf jeder
Materialzeile wiederholt.

Die Druckansicht wird über anklickbare Spaltenüberschriften sortiert (wie TB, Lager und Warenkorb), nicht über separate Sortierbuttons.

---

## Baugruppen

Ein neues Projekt startet ohne automatisch angelegte Baugruppe.

Baugruppen und Bauteile werden in Supabase (`project_structure`) gespeichert
und geräteübergreifend synchronisiert.

Baugruppen und Bauteile können umbenannt und nach Sicherheitsabfrage
gelöscht werden.

Innerhalb einer Baugruppe können Bauteile optional zu Bauteilgruppen
zusammengefasst werden. Die Gruppierung synchronisiert über Supabase und
ändert keine Materialzuordnung und keine Mengen.

---

## Mobile Geräte

MONTA muss vollständig nutzbar sein auf:

- Windows

- iOS

- Android

Die Darstellung erfolgt automatisch responsiv über die Bildschirmbreite.

Es gibt keinen manuellen PC/Mobil-Umschalter.

Bis einschließlich 1024 px Bildschirmbreite (Smartphone und Tablet, auch
Querformat) sind TB und Prüfung ausgeblendet; sichtbar bleiben Lager,
Warenkorb und Druck. Die Erfassung erfolgt am PC.

Pull-to-Refresh am Smartphone/Tablet ist der normale Browser-Reload.

---

## Daten und Synchronisation

Supabase ist die zentrale Datenquelle für Projekte, Projektstruktur
(Baugruppen/Bauteile/Bauteilgruppen) und Materialpositionen.

Zugriff auf MONTA-Daten nur für authentifizierte Nutzer mit
`user_profiles.status = active` (Row Level Security). Anonyme und
nicht freigegebene Konten haben keinen Tabellenzugriff.

Lokale Oberflächen-Updates erfolgen sofort nach erfolgreichem Schreiben.

Mehrgeräte-Nutzung wird über Realtime sowie Reload bei Fokus und
Sichtbarkeit abgesichert (mit sparsamen Fallback, solange die Seite sichtbar
ist). Realtime und Datenladen starten erst nach Freigabe.

Die frühere rein lokale Baugruppen-/Bauteil-Registry ist nicht mehr die
zentrale Datenquelle.

Demo-Daten werden nicht erneut eingesetzt, wenn bereits echte Projektdaten
vorhanden waren oder die Projektliste bewusst leer ist.

Auch das letzte verbleibende Projekt darf nach Sicherheitsabfrage gelöscht
werden.

---

## Zugang und Benutzer

MONTA ist nicht öffentlich zugänglich.

Registrierung mit beliebiger gültiger E-Mail-Adresse und Passwort ist möglich.
Zugriff auf Projektdaten erst nach E-Mail-Bestätigung und Admin-Freigabe.

Status: pending → active (oder blocked).

Rollen: user, admin.

Administratoren verwalten Freigabe, Sperre, Entsperrung, Rollen und
dauerhaftes Löschen (Löschen von Auth-Nutzern serverseitig über Edge Function).

Der letzte aktive Administrator darf nicht gesperrt, gelöscht oder zur
normalen Nutzerrolle degradiert werden. Selbstsperre und Selbstlöschung
sind untersagt.

Service-Role-Schlüssel gehören nicht in Browser oder Repository.

Workflow-Benachrichtigungen erfolgen serverseitig per Edge Function.
Auslöser sind bewusste Abschlussaktionen bzw. der fachliche Übergang
„vollständig bestellt“:

- TB/Prüfung abgeschlossen → sautter@metallbau-heimsch.de
- Lagerprüfung abgeschlossen → stoehr@metallbau-heimsch.de
- Alle offenen Positionen des **gesamten Projekts** bestellt → sautter@metallbau-heimsch.de

Keine Mail beim bloßen Anlegen einer Baugruppe.
Keine Mail allein durch neue offene Warenkorbzeilen.

Doppelversand wird über eindeutige `event_key` (inkl. Abschlusszyklus) in
`notification_events` verhindert. Empfänger bestimmt nur der Server.

Abschlussstatus gehört zur Baugruppe (`project_structure`, bauteil IS NULL):
`tb_pruefung_abgeschlossen`, `lager_abgeschlossen`.

„Anfrage per Mail“ enthält nur Positionen mit offener Fehlmenge, die noch
nicht bestellt und noch nicht vollständig geliefert sind.

Mobile Reiter (≤1024 px): TB und Prüfung nur für Administratoren und Nutzer
mit `full_module_access`. Andere Nutzer sehen mobil Lager, Warenkorb, Druck.
Solange das Profil noch lädt, werden TB/Prüfung nicht vorschnell ausgeblendet.

Anmeldung: Checkbox „Angemeldet bleiben“ (Standard an). Aktiv → Session in
localStorage; deaktiviert → sessionStorage (nur aktuelle Browser-Sitzung).
Passwörter werden nie gespeichert.

`sort_order` in `project_structure` ist eine kleine integer-Reihenfolge,
niemals ein Millisekunden-Zeitstempel.

Die optionale UI „Bauteile gruppieren“ ist entfernt. Die DB-Spalte
`bauteilgruppe` bleibt unangetastet und wird ignoriert.

Prüfung, Lager und Warenkorb aggregieren identische Artikel nur zur Anzeige
projektweit; Originalpositionen bleiben unverändert.

Druck bleibt nach Baugruppe → Bauteil gegliedert und besitzt eine Freitextsuche.

- HV-Garnitur, Hilti-HIT-/Verbundmörtel-Drehmomente und Ankerstangen-Mitlauf
gelten nur für neue bzw. bewusst bearbeitete Positionen.
Automatische Drehmomente werden kurz als „450 Nm“ gespeichert (nicht
„Anziehdrehmoment: …“).

Bauteil-Duplizieren kopiert Material mit neuen UUIDs und setzt Lager-/Bestellstatus
zurück. Baugruppe-Duplizieren gibt es nicht.

Die Druckstation ist benutzer- und gerätebezogen: Admin weist einen Benutzer
zu; dieser aktiviert genau ein PC-Gerät. Zielgerät Ricoh IM C2010 (A4, Farbe).
Stilles Drucken erfordert lokale Windows-/Browser-Konfiguration.

Es gibt keine allgemeine Bestellverwaltung und keine umfassende Änderungshistorie.

---

## Bedienung

- möglichst wenige Klicks

- möglichst wenig Tipparbeit

- möglichst identische Tabellen

- möglichst identische Oberflächen

- keine unnötigen Dialoge

- keine ausklappbaren Detailansichten, wenn eine direkte Anzeige möglich ist

- Tabellenüberschriften sind anklickbar und sortieren die jeweilige Spalte (kein Dialog, kein Einstellungsmenü)

- Freitextsuche in TB, Prüfung, Lager und Warenkorb (nicht persistiert)

- TB-Vorschlagslisten: Übernahme per Enter/Leertaste bei markiertem Eintrag;
  freies Leerzeichen bleibt möglich

- „Wichtiger Hinweis“: rot und fett in allen relevanten Ansichten und im Druck

- Lager: Spalte Herkunft sortierbar (Baugruppe → Bauteilgruppe → Bauteil → Pos.)

---

## Statistiken

Statistiken sind grundsätzlich kein Bestandteil von MONTA.

---

## Erweiterungen

Neue Funktionen werden nur umgesetzt, wenn sie:

- Arbeitszeit sparen

- den tatsächlichen Arbeitsablauf vereinfachen

- regelmäßig genutzt werden

- zur Philosophie von MONTA passen

- die einfachste sinnvolle Lösung darstellen
