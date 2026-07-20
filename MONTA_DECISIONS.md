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

27 → 26 → 25 → 24 → 9 → 7 → 6 → 5 → 4 → 3 → 2 → 1

Die Regalfachzuordnung ist fest in einer zentralen Konfigurationsdatei hinterlegt.

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

Lokale Oberflächen-Updates erfolgen sofort nach erfolgreichem Schreiben.

Mehrgeräte-Nutzung wird über Realtime sowie Reload bei Fokus und
Sichtbarkeit abgesichert (mit sparsamen Fallback, solange die Seite sichtbar
ist).

Die frühere rein lokale Baugruppen-/Bauteil-Registry ist nicht mehr die
zentrale Datenquelle.

Demo-Daten werden nicht erneut eingesetzt, wenn bereits echte Projektdaten
vorhanden waren oder die Projektliste bewusst leer ist.

Auch das letzte verbleibende Projekt darf nach Sicherheitsabfrage gelöscht
werden.

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
