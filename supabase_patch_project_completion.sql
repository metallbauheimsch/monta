-- MONTA Fachkorrektur: Prüfung/Lager-Abschluss projektweit statt je Baugruppe
-- Einmalig im Supabase SQL Editor ausführen. NICHT automatisch aus der App.
-- Bestehende Projekte/Baugruppen/Bauteile/Materialpositionen bleiben unverändert.
--
-- Hintergrund: Prüfung und Lager zeigen fachlich bereits seit der
-- Projektnavigation projektweite Daten (siehe MONTA_DECISIONS.md), der
-- Abschlussstatus hing bisher aber zufällig an der Baugruppe, über die der
-- Reiter zuletzt geöffnet wurde (project_structure.tb_pruefung_abgeschlossen /
-- lager_abgeschlossen, Zeile mit bauteil IS NULL). Neu: der Abschlussstatus
-- gehört zum gesamten Projekt.
--
-- ---------------------------------------------------------------------------
-- 1) Neue projektweite Abschlussfelder auf public.projects
-- ---------------------------------------------------------------------------
alter table public.projects
  add column if not exists tb_pruefung_abgeschlossen boolean not null default false;

alter table public.projects
  add column if not exists lager_abgeschlossen boolean not null default false;

-- Kein RLS-Patch nötig: die bestehende Policy "active update projects"
-- (supabase_patch_auth_lockdown.sql) erlaubt aktiven Nutzern bereits das
-- Aktualisieren beliebiger Spalten der eigenen sichtbaren Projekte -
-- unverändert, keine neue Policy.
--
-- Kein Realtime-Patch nötig: projects ist bereits Teil des bestehenden
-- Realtime-Channels "monta-live" (postgres_changes auf public.projects) und
-- wird bereits vollständig per select("*") geladen (src/App.jsx). Neue
-- Spalten werden dadurch automatisch mitgeladen/synchronisiert.
--
-- ---------------------------------------------------------------------------
-- 2) Alte, baugruppengebundene Felder bewusst NICHT anfassen
-- ---------------------------------------------------------------------------
-- project_structure.tb_pruefung_abgeschlossen und project_structure.lager_abgeschlossen
-- bleiben unverändert als Legacy-Daten bestehen (kein Drop, kein Rename, kein
-- Überschreiben, keine automatische Migration bereits gesetzter Werte nach
-- projects). Die App schreibt/liest diese Spalten ab diesem Patch nicht mehr
-- für die UI-Checkbox, verwendet sie aber auch nicht mehr fehlerhaft.
--
-- Falls für ein bestehendes Projekt eine sinnvolle Übernahme gewünscht wird
-- (z. B. weil alle Baugruppen bereits tb_pruefung_abgeschlossen = true
-- hatten), ist das eine bewusste fachliche Entscheidung je Projekt - siehe
-- Abschlussbericht. Beispielhafter, NICHT automatisch auszuführender
-- Vorschlag für eine EINZELNE, manuell geprüfte Übernahme (nur falls
-- gewünscht, Projekt-ID gezielt einsetzen):
--
-- update public.projects set tb_pruefung_abgeschlossen = true
--   where id = '<project-id>';
