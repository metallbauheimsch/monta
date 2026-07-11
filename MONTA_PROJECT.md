# MONTA – Projektdokumentation

Interne Web-App für Metallbau Heimsch zur Verwaltung von Befestigungsmaterial
je Projekt. Optimiert ausschließlich für diesen Betrieb, kein Standardprodukt.

Statistiken sind grundsätzlich kein Bestandteil von MONTA.

## Datenmodell

Projekt → Baugruppe → Bauteil → Materialposition

- `projects` und `material_items` sind eigene Datenbanktabellen (Supabase).
- Baugruppe/Bauteil sind **keine** eigenen Tabellen, sondern werden im Feld
  `einbauort` als Text `"Baugruppe / Bauteil"` abgebildet
  (`src/utils/structure.js`). So war bisher keine Datenbank-Migration nötig.
- Leer angelegte Baugruppen/Bauteile (noch ohne Materialposition) werden nur
  lokal im Browser gemerkt (siehe „Speicherorte" unten).

## Funktionen (Ist-Stand nach Sprint 6)

- **Projektverwaltung**: Anlegen, Archivieren/Zurückholen, endgültiges Löschen.
  Ein neu angelegtes Projekt ist zunächst leer - es wird **keine** Baugruppe
  automatisch angelegt oder angezeigt. Statt einer Baugruppenliste erscheint
  ein deutlicher Button „Baugruppe anlegen", solange keine Baugruppe
  existiert.
- **TB-Erfassung** (PC): Schnelle Tabellenerfassung, Positionsnummer sichtbar,
  Vorschlagsliste für Bezeichnungen, automatische Ergänzung von
  U-Scheibe(n)/Mutter bei Sechskantschraube/Senkschraube.
- **Prüfung ähnlicher Verbindungsmittel**: siehe eigener Abschnitt unten.
- **Baugruppe/Bauteil umbenennen**: Einfache Inline-Funktion direkt bei der
  Baugruppe bzw. beim Bauteil (Button „Umbenennen" bzw. „✎"), kein Dialog.
  Vorhandene Materialpositionen bleiben der umbenannten Baugruppe/dem
  umbenannten Bauteil zugeordnet (nur das Feld `einbauort` wird angepasst,
  es entsteht keine Kopie und die alte Bezeichnung bleibt nicht zusätzlich
  bestehen). Leere Namen sind nicht möglich, führende/nachfolgende
  Leerzeichen werden automatisch entfernt. Beim Umbenennen einer Baugruppe
  ziehen zusätzlich „Bestellung erfolgt"-Häkchen, Bestell-/Lieferstatus und
  gemerkte Lager-Werte auf den neuen Namen um.
- **Baugruppe löschen**: Am Ende jeder Baugruppenansicht, mit
  Sicherheitsabfrage. Löscht die Baugruppe inkl. aller Bauteile, aller
  zugeordneten Materialpositionen und zugehöriger lokaler
  Statusinformationen (leere Bauteile, „Bestellung erfolgt", Bestell-/
  Lieferstatus). Andere Baugruppen/Projekte bleiben unberührt.
- **Lager**: Arbeitet je Baugruppe. Fasst gleiche Artikel (Bezeichnung,
  Größe, Länge, Ausführung) zusammen. Sortiert innerhalb jeder Baugruppe
  zuerst nach echtem Regalfach (siehe „Regal/Paternoster-Zuordnung" unten,
  niedrigste Fachnummer zuerst, Artikel ohne Zuordnung zuletzt), danach nach
  Bezeichnung/Größe/Länge. Zeigt je Position das Regalfach an. Erfassung
  „bereits gelegt" oder Checkbox „vollständig vorhanden". Zeigt direkt an,
  wie viel Stück in den Warenkorb gelegt wird (= Restmenge). Wird die
  Checkbox wieder deaktiviert, wird keine Menge erfunden - der vorherige
  manuelle Wert wird nach Möglichkeit wiederhergestellt.
- **Warenkorb** (bis Sprint 5 „Bestellliste" genannt, Datei/Komponente
  weiterhin `EinkaufView`): Enthält ausschließlich die Fehlmengen aus dem
  Lager (Bestellmenge = Gesamtmenge − bereits gelegt), komplettes Projekt,
  gruppiert nach Baugruppe und Artikel. Häkchen „Bestellung erfolgt" je
  Baugruppe (steuert die Statusampel). Zusätzlich je Position ein einfacher
  Bestell-/Lieferstatus (Checkbox „Bestellt" + Feld „Gelieferte Menge",
  Status „Noch nicht bestellt" / „Bestellt" / „Teilweise geliefert" /
  „Vollständig geliefert" wird automatisch berechnet). Button „Warenkorb
  kopieren" kopiert eine einfache Textliste (kein HTML, keine Tabelle, keine
  technischen IDs) in die Zwischenablage, geeignet zum direkten Einfügen in
  eine E-Mail an den Schraubenhändler.
- **Druckansicht / Montage**: Kein eigener Montage-Reiter. Die Liste
  „Befestigungsmaterial" fasst gleiche Verbindungsmittel (gleiche
  Bezeichnung/Größe/Länge/Ausführung) innerhalb desselben Bauteils zu einer
  Zeile zusammen, Mengen werden addiert; Positionen aus unterschiedlichen
  Bauteilen werden dabei nie vermischt. Bei Sortierung „Baugruppe (Montage)"
  gliedert die Druckansicht zusätzlich Projekt → Baugruppe → Bauteil →
  Material, die Zuordnung zum Bauteil bleibt so beim Ausdruck klar
  erkennbar. Weitere Sortierungen: Position, Regal.
- **Regal/Paternoster**: Feste, vom Betrieb vorgegebene Fachzuordnung (siehe
  eigener Abschnitt unten). Keine Einstellungs- oder Pflegeoberfläche. Wird
  sowohl in der Druckansicht als auch im Lager verwendet.
- **Statusampel** (🔴 Offen / 🟡 Bestellt / 🟢 Bereit / ⚪ ohne Positionen):
  zentral in `src/utils/helpers.js` definiert, überall gleich verwendet.

## Prüfregel „Ähnliche Verbindungsmittel" (Stand Sprint 6)

Ähnliche Verbindungsmittel werden bei einer absoluten Längendifferenz von
maximal 20 mm angezeigt.

Ein Prüfhinweis erscheint, wenn zwei Positionen **alle** folgenden Punkte
erfüllen:

- gleiche Bezeichnung
- gleiche Größe
- beide besitzen eine hinterlegte Länge
- absolute Längendifferenz maximal **20 mm**
- die Längen sind nicht identisch

Es gibt **keine** Prozentrechnung mehr – nur die feste 20-mm-Grenze.

Es werden ausschließlich **direkte Paare** verglichen, keine über
Zwischenwerte verketteten Gruppen: Bei den Längen 20/40/41 erscheinen
20↔40 und 40↔41 je als eigener Hinweis, 20↔41 dagegen nicht (Differenz
21 mm). Jede Position wird dabei mit Positionsnummer, Bezeichnung, Größe,
Länge, Menge und Bauteil angezeigt (z. B. „Pos. 12 · 12 × Sechskantschraube
M12×20 · Steg"), damit auch Positionen mit identischen Materialangaben
eindeutig unterscheidbar bleiben.

Automatisch ergänzte Positionen (U-Scheibe, Mutter usw.) werden dabei nie
berücksichtigt.

Umsetzung: `src/features/fastening/Checks.jsx`.

## Regal/Paternoster-Zuordnung (Stand Sprint 6)

Feste, vom Betrieb dokumentierte Zuordnung (`src/features/fastening/regalOrder.js`):

- Edelstahl (Ausführung, unabhängig vom Artikeltyp): Fach 4–7
- Chemische Dübel (Hilti HIT, Verbundmörtel): Fach 2–3
- Verzinkte Dübel (Bolzenanker, Rahmendübel, Kunststoffdübel, Betonschraube;
  Ausführung feuerverzinkt oder galvanisch): Fach 25
- Feuerverzinkte Schrauben: Fach 9
- HV (Ausführung, unabhängig vom Artikeltyp): Fach 26
- Galvanische Schrauben: Fach 1, 26, 27 (Bereich, keine eindeutige
  Zuordnung auf ein einzelnes Fach anhand der Daten möglich)

Artikel, die sich anhand von Bezeichnung + Ausführung keiner dieser Regeln
eindeutig zuordnen lassen (z. B. U-Scheibe, Sechskantmutter, Stoppmutter,
Hutmutter, Karosseriescheibe, Ankerstange, Blindniete), bekommen bewusst
**kein erfundenes Fach** und werden als „Ohne Fachzuordnung" angezeigt.

## Speicherorte

**In Supabase** (sofern Zugangsdaten konfiguriert sind): Projekte, alle
Materialpositionen.

**Nur lokal im Browser** (gerätegebunden, nicht zwischen PC und iPhone
geteilt):
- Leer angelegte Baugruppen/Bauteile ohne Material
- „Bestellung erfolgt"-Häkchen je Baugruppe
- Bestell-/Lieferstatus je Warenkorb-Position (Sprint 6)
- Zuletzt manuell erfasster „bereits gelegt"-Wert im Lager (Sprint 6)
- Gelernte, neue Bezeichnungsvorschläge
- Falls Supabase gar nicht konfiguriert ist: sämtliche Projekt-/Materialdaten

## Bekannte Einschränkungen

- Kein Login/Benutzerverwaltung (interner Prototyp).
- `supabase_schema.sql` kennt (noch) keine Spalte `archived` – Archivieren
  funktioniert dann nur lokal, bis die Spalte in der Datenbank ergänzt wird.
- Offene Fachzuordnungen (Regal): Bezeichnungen wie U-Scheibe,
  Sechskantmutter, Stoppmutter, Hutmutter, Karosseriescheibe, Ankerstange,
  Blindniete haben aktuell in keiner Ausführung eine dokumentierte
  Fachzuordnung und erscheinen als „Ohne Fachzuordnung".
