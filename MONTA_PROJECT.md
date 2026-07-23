# MONTA – Projektdokumentation

Interne Web-App für Metallbau Heimsch zur Verwaltung von Befestigungsmaterial
je Projekt. Optimiert ausschließlich für diesen Betrieb, kein Standardprodukt.

## Zugang

Registrierung → E-Mail-Bestätigung → Admin-Freigabe (`active`). Details:
`AUTH_SETUP.md`.

Admin und Nutzer mit `full_module_access` sehen alle Reiter auch auf Tablet/Smartphone
(Stöhr als Admin, Sautter über Vollzugriff). Checkbox „Angemeldet bleiben“ steuert
die Session-Persistenz (siehe AUTH_SETUP.md).

Regalfächer werden dynamisch berechnet (`regalOrder.js`), nicht in der DB gespeichert.

## Datenmodell

Projekt → Baugruppe → Bauteil → Materialposition

(Baugruppe = artgleiche Bauteile, z. B. Stützen S1–S5.)

Die Spalte `bauteilgruppe` kann in der DB noch existieren, wird in der UI
nicht mehr genutzt und nicht migriert.

Zusätzlich:

- `user_profiles` (Auth/Freigabe, optional `full_module_access`)
- `notification_events` (Workflow-Mails, Duplikatschutz)
- `print_station_settings` / `print_station_config` / `print_jobs`
- `material_items.important_note`
- `project_structure.tb_pruefung_abgeschlossen` / `lager_abgeschlossen`

## Ansichten

- **TB:** je Bauteil
- **Prüfung / Lager / Warenkorb:** projektweit (Aggregation nur zur Anzeige)
- **Druck:** nach Baugruppe → Bauteil getrennt, mit Suche

## Workflow

- TB/Prüfung abgeschlossen → sautter@…
- Lagerprüfung abgeschlossen → stoehr@…
- Alle Positionen des **Projekts** bestellt → sautter@…

## Befestigungsregeln (neu / bewusst bearbeitet)

- HV-Garnitur: eine Position, kein Mitlauf, Drehmomente kurz („450 Nm“)
- Hilti HIT / Verbundmörtel: Drehmomente nach Größe
- Ankerstange: U-Scheibe + Sechskantmutter automatisch

Bestehende Positionen werden nicht rückwirkend geändert.

Lokal: dieselben Supabase-Variablen wie Vercel in `.env.local` (siehe AUTH_SETUP.md).

## Sicherheit

`MONTA_SAFETY.md` und `MONTA_PRINCIPLES.md` haben Vorrang.
