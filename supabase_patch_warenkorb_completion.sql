-- MONTA Praxis-Sprint: "Warenkorb abgeschlossen" (zusätzlich zu "Alle Pos. bestellt")
-- Einmalig im Supabase SQL Editor ausführen. NICHT automatisch aus der App.
-- Bestehende Projekte/Baugruppen/Bauteile/Materialpositionen bleiben unverändert.
--
-- Hintergrund: "Alle Pos. bestellt" ist die bestehende automatische/fachliche
-- Aussage über die einzelnen Positionen (unverändert, siehe EinkaufView.jsx).
-- "Warenkorb abgeschlossen" ist ein fachlich eigenständiger, bewusster
-- manueller Projektabschluss des Bestellvorgangs - analog zu
-- tb_pruefung_abgeschlossen / lager_abgeschlossen (siehe
-- supabase_patch_project_completion.sql), NICHT dasselbe Feld.
--
-- ---------------------------------------------------------------------------
-- 1) Neues projektweites Abschlussfeld auf public.projects
-- ---------------------------------------------------------------------------
alter table public.projects
  add column if not exists warenkorb_abgeschlossen boolean not null default false;

-- Kein RLS-Patch für UPDATE nötig: die bestehende Policy "active update
-- projects" (supabase_patch_auth_lockdown.sql) erlaubt aktiven Nutzern
-- bereits das Aktualisieren beliebiger Spalten der eigenen sichtbaren
-- Projekte - unverändert, keine neue Policy.
--
-- Kein Realtime-Patch nötig: projects ist bereits Teil des bestehenden
-- Realtime-Channels "monta-live" (postgres_changes auf public.projects) und
-- wird bereits vollständig per select("*") geladen (src/App.jsx). Die neue
-- Spalte wird dadurch automatisch mitgeladen/synchronisiert.
--
-- ---------------------------------------------------------------------------
-- 2) notification_events: neuer event_type "warenkorb_completed"
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'notification_events_type_check'
  ) then
    alter table public.notification_events drop constraint notification_events_type_check;
  end if;
  alter table public.notification_events
    add constraint notification_events_type_check
    check (event_type in (
      'baugruppe_created',
      'cart_items_added',
      'all_items_ordered',
      'tb_pruefung_completed',
      'lager_completed',
      'warenkorb_completed'
    ));
end $$;

-- Insert-Policy: Empfänger-Whitelist um den neuen Typ erweitern
drop policy if exists "notif insert active" on public.notification_events;

create policy "notif insert active"
  on public.notification_events for insert to authenticated
  with check (
    public.is_active_user()
    and created_by = auth.uid()
    and status = 'pending'
    and (
      (event_type = 'tb_pruefung_completed'
        and recipient = 'sautter@metallbau-heimsch.de')
      or (event_type = 'lager_completed'
        and recipient = 'stoehr@metallbau-heimsch.de')
      or (event_type = 'all_items_ordered'
        and recipient = 'sautter@metallbau-heimsch.de')
      or (event_type = 'warenkorb_completed'
        and recipient = 'sautter@metallbau-heimsch.de')
      -- Historische Typen weiterhin insertierbar (keine neuen Client-Mails erwartet)
      or (event_type = 'baugruppe_created'
        and recipient = 'sautter@metallbau-heimsch.de')
      or (event_type = 'cart_items_added'
        and recipient = 'stoehr@metallbau-heimsch.de')
    )
  );

-- ---------------------------------------------------------------------------
-- 3) Nach diesem Patch zusätzlich nötig (siehe Abschlussbericht)
-- ---------------------------------------------------------------------------
-- supabase functions deploy workflow-notifications
--   (minimal erweitert um den neuen Mailtext für "warenkorb_completed";
--   bestehende Mailtexte/Events bleiben unverändert)
