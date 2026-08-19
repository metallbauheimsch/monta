# MONTA – Nächster Sprint

## Materialersetzung + Sekundärsortierung – erledigt (Code, Review-Branch)

- Zentrale Ersatzlogik (`src/features/fastening/replacement.js`), genutzt
  von TB und Lager - keine getrennte Fachlogik je Ansicht.
- Bereits vorbereitete/bestellte Positionen werden bei fachlicher
  Identitätsänderung nicht mehr direkt überschrieben, sondern über eine
  neue Position ersetzt; Altposition bleibt mit realem Zustand erhalten
  und gekennzeichnet. Unberührte Positionen (auch im Lager) werden direkt
  geändert - keine unnötige Historie.
- Sprint 2C (GPT-Code-Review): Ersetzung läuft jetzt atomar über eine
  Datenbankfunktion (`replace_material_item`), Löschschutz verhindert,
  dass eine referenzierte Position (auch über Ersatzketten) gelöscht
  werden kann, Lager übernimmt Hinweis/Wichtig der Ursprungsposition,
  Mengenerhöhung bei bereits bestellter Position setzt bestellt bewusst
  zurück.
- Lager-Ersetzen-Funktion für admin/`full_module_access`, inkl.
  Ursprungsauswahl bei aggregierten Zeilen.
- Statusampel/Workflow-Watcher/Druck/Warenkorb/Prüfung berücksichtigen
  ersetzte Altpositionen nicht mehr als aktuellen Bedarf.
- Sekundärsortierung nach Größe/Länge zentral in `utils/sorting.js`,
  eingebunden in TB, Lager, Warenkorb, Druck.
- `npm test`: 105 bestanden; Build ok.
- Branch: `review/sprint-2-material-replacement` (siehe Abschlussbericht).

## Manuell / Live offen

- `supabase_patch_material_replacement.sql` ausführen (nullable Spalte
  `material_items.ersetzt_durch` mit `on delete restrict`, atomare
  Funktion `replace_material_item` - keine Änderung an Bestandsdaten).
- Review-Branch fachlich freigeben, PR mergen.
- Manueller Test an einem Testprojekt vor Nutzung an Echtprojekten,
  inkl. Doppelgerät-Test für parallele Ersetzung.
- Danach weiterhin offen: Auth-Patches / Edge Function `admin-users`,
  Sautter `full_module_access`, PWA (siehe Backlog).
