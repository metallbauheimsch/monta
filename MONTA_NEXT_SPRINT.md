# MONTA – Nächster Sprint

## Sprint 6 (Ergänzung) – erledigt

- Baugruppe und Bauteil können direkt umbenannt werden (Inline-Feld, kein
  Dialog), vorhandene Materialpositionen bleiben zugeordnet, keine Kopie,
  leere/nur-Leerzeichen-Namen werden verhindert.
- Neues Projekt legt keine Baugruppe mehr automatisch an; stattdessen
  erscheint der Button „Baugruppe anlegen", solange keine Baugruppe
  existiert. Bestehende Projekte bleiben unverändert.
- Liste „Befestigungsmaterial" (Druckansicht) fasst gleiche Verbindungsmittel
  je Bauteil zusammen (Mengen addiert), keine Vermischung über Bauteile
  hinweg.
- Lager sortiert innerhalb jeder Baugruppe nach dem echten Regalfach
  (niedrigste Fachnummer zuerst, „Ohne Fachzuordnung" zuletzt) und zeigt das
  Fach je Position an.

## Sprint 6 – erledigt

- Prüfung: feste 20-mm-Regel statt Prozentregel, ausschließlich direkte
  Paare (keine Ketten über Zwischenwerte), Positionsnummer in TB-Ansicht
  und Prüfungsansicht sichtbar.
- Baugruppe löschen (inkl. Bauteile, Materialpositionen, lokaler
  Statusinformationen), mit Sicherheitsabfrage.
- Lager: Hinweistext „X Stk. in den Warenkorb gelegt", manueller Wert bleibt
  beim Deaktivieren von „Vollständig vorhanden" nach Möglichkeit erhalten.
- Bestellliste in „Warenkorb" umbenannt, Button „Warenkorb kopieren"
  (einfache Textliste für E-Mail an den Schraubenhändler).
- Bestell-/Lieferstatus je Warenkorb-Position (Checkbox „Bestellt", Feld
  „Gelieferte Menge", automatische Statusberechnung inkl. Teillieferung).
- Montage läuft über die Druckansicht (Sortierung „Baugruppe"), jetzt
  zusätzlich nach Bauteil gegliedert.
- Regal/Paternoster: echte, vom Betrieb dokumentierte Fachzuordnung statt
  Platzhalter-Sortierung.

Details siehe `MONTA_PROJECT.md` und `MONTA_CHANGELOG.md`.

## Offene Punkte aus Sprint 6

- Fachzuordnung (Regal) für U-Scheibe, Sechskantmutter, Stoppmutter,
  Hutmutter, Karosseriescheibe, Ankerstange, Blindniete ist fachlich noch
  nicht geklärt - erscheinen aktuell bewusst als „Ohne Fachzuordnung".
- Bestell-/Lieferstatus und Bestell-/Lager-Statusinformationen sind weiterhin
  rein lokal im Browser gespeichert (nicht zwischen PC und iPhone geteilt) -
  siehe „Bekannte Einschränkungen" in `MONTA_PROJECT.md`.

## Offene Punkte aus der Bestandsaufnahme (weiterhin nicht umgesetzt)

- Git-Repository ist vorhanden und mit GitHub verbunden (Branch `main`,
  Remote `origin`) - die noch offenen Änderungen aus Sprint 6 sind aber
  weiterhin nicht committet/gepusht (siehe Abschlussbericht).
- Prüfen, ob geräteübergreifend geteilte Daten (leere Baugruppen/Bauteile,
  „Bestellung erfolgt"-Häkchen, gelernte Bezeichnungen, Bestell-/
  Lieferstatus) für den echten PC+iPhone-Betrieb ausreichen, oder ob diese
  künftig über Supabase statt nur lokal gespeichert werden sollen.
- `supabase_schema.sql` um die Spalte `archived` ergänzen, sobald eine
  echte Migration gewünscht ist (aktuell bewusst nicht angefasst).
