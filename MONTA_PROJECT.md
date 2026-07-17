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

## Funktionen (Ist-Stand nach Sprint 7 – Korrekturen aus Praxistest)

- **Projektverwaltung**: Anlegen, Archivieren/Zurückholen, endgültiges Löschen.
  Ein neu angelegtes Projekt ist zunächst leer - es wird **keine** Baugruppe
  automatisch angelegt oder angezeigt. Solange keine Baugruppe existiert,
  steht nur das Eingabefeld „Neue Baugruppe" mit Button „Anlegen" da (kein
  zusätzlicher großer Button, identische Bedienung wie beim Anlegen eines
  Bauteils).
- **TB-Erfassung** (PC): Schnelle Tabellenerfassung, Positionsnummer sichtbar,
  Vorschlagsliste für Bezeichnungen, automatische Ergänzung von
  U-Scheibe(n)/Mutter bei Sechskantschraube/Senkschraube. Statt einer großen
  Projektkarte steht darüber nur eine kleine Kontextzeile (Status-Ampel ·
  „Baugruppe: … · Bauteil: …", Projektname klein daneben). Die Spalten Pos.,
  Menge, Bezeichnung, Größe, Länge, Ausführung sind anklickbar sortierbar
  (Pfeil ↑/↓, numerisch korrekt, z. B. M4 vor M12).
- **Prüfung ähnlicher Verbindungsmittel**: siehe eigener Abschnitt unten.
  Zeigt dieselbe Status-Ampel wie TB/Lager/Warenkorb/Druck.
- **Baugruppe/Bauteil umbenennen**: Einfache Inline-Funktion (Button
  „Umbenennen" bzw. „✎"), kein Dialog. Vorhandene Materialpositionen bleiben
  zugeordnet. Beim Umbenennen einer Baugruppe ziehen gemerkte Lager-Werte
  auf den neuen Namen um.
- **Baugruppe löschen**: Kleiner Button neben „Umbenennen", mit
  Sicherheitsabfrage. Löscht Baugruppe inkl. Bauteile, Materialpositionen und
  zugehöriger lokaler Registry-Einträge.
- **Lager**: Durchgehende Tabelle je Baugruppe mit Spalten Regalfach,
  Bezeichnung, Größe, Länge, Ausführung, Gesamtmenge, Vorhanden (Zahlenfeld +
  Checkbox „Vollständig", Spalte ebenfalls sortierbar), Restmenge, Herkunft.
  Fasst gleiche Artikel je Baugruppe zusammen. Standard-Sortierung:
  tatsächlicher Paternoster-Laufweg (siehe unten). Herkunft zeigt
  Baugruppe · Bauteil + TB-Positionsnummern.
- **Warenkorb**: Fehlmengen aus dem Lager, komplettes Projekt, gruppiert nach
  Baugruppe. **Kein Regalfach** (bleibt in Lager und Druck). Spalten:
  Bezeichnung, Größe, Länge, Ausführung, Fehlmenge, Herkunft, Bestellt,
  Geliefert - alle sortierbar.
  - Oberhalb der Tabellen: Checkbox „Alle Positionen bestellt".
  - Je Position: Checkbox „Bestellt" + Zahlenfeld „Geliefert" + Checkbox
    „Vollständig geliefert". Vollständig gelieferte Positionen bleiben
    sichtbar (dezent grün hinterlegt, am Tabellenende), damit ein
    versehentlicher Klick rückgängig gemacht werden kann - keine
    automatische Ausblendung.
  - Button „Anfrage per Mail" (nur offene Fehlmengen in der Mail).
- **Druckansicht / Montage**: Nur die aktuell geöffnete Baugruppe, immer
  nach Bauteil gegliedert. Gleiche Artikel nur innerhalb desselben Bauteils
  zusammengefasst. Sortierung über anklickbare Spaltenüberschriften
  (Position, Menge, Bezeichnung, Größe, Länge, Ausführung, Regalfach) -
  keine separaten Sortierbuttons. Sortiersteuerung wird beim Drucken nicht
  mitgedruckt.
- **Regal/Paternoster**: Feste, vom Betrieb vorgegebene Fachzuordnung in
  genau einer zentralen Datei (`regalOrder.js`). Keine Pflegeoberfläche,
  keine Einstellungen, keine Datenbanktabelle.
- **Statusampel** (🔴 Offen / 🟡 Bestellt / 🟢 Bereit / ⚪ ohne Positionen):
  zentral in `helpers.js`, überall gleich. Berechnet ausschließlich aus den
  Materialpositionen (`bestellt` / `bereit`):
  - 🟢 Bereit: keine Restmenge mehr
  - 🟡 Bestellt: Restmenge vorhanden, alle fehlenden Positionen bestellt
  - 🔴 Offen: Restmenge vorhanden, mindestens eine fehlende Position nicht
    bestellt
  - Es gibt kein manuelles Baugruppen-Häkchen „Bestellung erfolgt" mehr.

## Prüfregel „Ähnliche Verbindungsmittel" (Stand Sprint 7)

Ähnliche Verbindungsmittel werden bei einer absoluten Längendifferenz von
maximal 20 mm angezeigt.

Ein Prüfhinweis erscheint, wenn zwei Positionen **alle** folgenden Punkte
erfüllen:

- gleiche Bezeichnung
- gleiche Größe
- gleiche Ausführung (galvanisch, feuerverzinkt, HV und Edelstahl werden nie
  miteinander vermischt)
- beide besitzen eine hinterlegte Länge
- absolute Längendifferenz maximal **20 mm**
- die Längen sind nicht identisch

Es werden ausschließlich **direkte Paare** verglichen. Automatisch
ergänzte Positionen werden ignoriert.

Umsetzung: `src/features/fastening/Checks.jsx`.

## Regal/Paternoster-Zuordnung (Stand Sprint 7 – Korrekturen)

Zentrale Datei: `src/features/fastening/regalOrder.js`.

| Fach | Inhalt |
|------|--------|
| 1 | galvanisch verzinkte Schrauben M3–M6, Wurmschrauben, Blechmuttern |
| 2 | Ankerstangen, chemische Dübel, RECA Verbundmörtel |
| 3 | Hilti HIT, Siebhülsen |
| 4 | Edelstahl/VA Bolzenanker, Rahmendübel, Betonschrauben |
| 5 | Edelstahl/VA Schrauben M8–M16 |
| 6 | Edelstahl/VA Schrauben M4–M6, Schlossschrauben, Ringmuttern, Gewindehülsen, Senkscheiben |
| 7 | Edelstahl/VA Nieten, Einnietmuttern, Holzschrauben, Bohrschrauben, Trespa-Befestigungen |
| 9 | alle feuerverzinkten Schrauben (alle Größen) |
| 24 | galvanisch verzinkte Bohrschrauben, Nägel, SPAX verzinkt, Seilklemmen, Ringösen, Rohrschellen |
| 25 | verzinkte Bolzenanker/Betonschrauben/Dübel/Rahmendübel (galvanisch **und** feuerverzinkt, alle Größen) |
| 26 | galvanisch verzinkte Schrauben M12–M20, alle HV-Schrauben |
| 27 | galvanisch verzinkte Schrauben M8–M10 |

Fach 8 und Fach 10–23 sind für MONTA nicht relevant (keine Zuordnung).

Grundregeln:

- „verzinkt" bedeutet galvanisch verzinkt, außer bei Fach 25.
- „VA" bedeutet Edelstahl.
- Fehlt eine Größenangabe, gelten alle Größen dieser Artikelgruppe.
- Keine Größen oder Werkstoffe erraten → sonst „Ohne Fachzuordnung".

U-Scheiben und Sechskantmuttern (auch automatisch ergänzte Mitlaufartikel)
liegen bei den Schrauben gleicher Größe und Ausführung und erhalten dasselbe
Regalfach. Ob die Position manuell oder automatisch angelegt wurde, spielt
keine Rolle.

**Paternoster-Standard-Laufweg:** 27 → 26 → 25 → 24 → 9 → 7 → 6 → 5 → 4 → 3 → 2 → 1 → wieder 27.

## Speicherorte

**In Supabase** (sofern Zugangsdaten konfiguriert sind): Projekte, alle
Materialpositionen (inkl. `bestellt` und `bereit`).

**Nur lokal im Browser** (gerätegebunden, nicht zwischen PC und iPhone
geteilt):

- Leer angelegte Baugruppen/Bauteile ohne Material
- Zuletzt manuell erfasster „bereits gelegt"/„geliefert"-Wert (gemeinsam für
  Lager und Warenkorb)
- Gelernte, neue Bezeichnungsvorschläge
- Falls Supabase gar nicht konfiguriert ist: sämtliche Projekt-/Materialdaten

## Bekannte Einschränkungen

- Kein Login/Benutzerverwaltung (interner Prototyp).
- `supabase_schema.sql` kennt (noch) keine Spalte `archived` – Archivieren
  funktioniert dann nur lokal, bis die Spalte in der Datenbank ergänzt wird.
- Artikel ohne eindeutige Zuordnung (z. B. U-Scheibe, Sechskantmutter ohne
  passende Fachregel, oder Ausführungstexte wie „A2-70" statt „Edelstahl"/
  „VA") erscheinen bewusst als „Ohne Fachzuordnung".
- Sehr große Warenkörbe können die technische Längengrenze einer mailto-URL
  überschreiten - dann erscheint eine verständliche Fehlermeldung statt
  still abgeschnittener Positionen.
