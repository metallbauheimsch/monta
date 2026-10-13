-- MONTA Sprint 2C: AKTIVIERUNG der einmaligen Druckmail "Projekt materialbereit"
--
-- NUR nach ausdrücklicher Freigabe und NUR wenn alle Voraussetzungen aus
-- PROJECT_READY_PRINT_MAIL.md erfüllt sind (Patch ausgeführt, Edge Function
-- mit project_ready_print deployed, APP_URL geprüft, Frontend live).
-- Im Supabase SQL Editor ausführen. NICHT automatisch aus der App.
--
-- Wirkung (atomar in EINER Transaktion):
--   1) Jedes Projekt, das JETZT materialbereit ist, erhält dauerhaft ein
--      Ereignis 'project_ready_print' mit Status 'skipped' (keine Mail).
--      Da der Schlüssel je Projekt einmalig ist, erhält ein solches
--      Bestandsprojekt auch später nie eine automatische Druckmail - auch
--      nicht nach zwischenzeitlich Rot/Gelb und erneut Grün.
--   2) Schalter enabled = true. Ab dann: Druckmail beim ersten Grünwerden
--      eines anderen Projekts; keine automatischen Druckjobs mehr.
-- Bestehende Projekt-/Materialdaten werden NICHT verändert.

-- ---------------------------------------------------------------------------
-- A) VORAB PRÜFEN (nur lesen, einzeln ausführen und Ergebnis notieren)
-- ---------------------------------------------------------------------------
-- select enabled from public.project_ready_print_settings;              -- muss false sein
-- select count(*) from public.notification_events
--   where event_type = 'project_ready_print';                           -- muss 0 sein
-- select count(*) from public.projects p
--   where public.project_material_ready(p.id);                          -- = erwartete Bestandsmarkierungen
-- select p.nr, p.name from public.projects p
--   where public.project_material_ready(p.id) order by p.nr;            -- Sichtprüfung
-- select status, count(*) from public.print_jobs group by status;       -- offene Druckjobs notieren

-- ---------------------------------------------------------------------------
-- B) AKTIVIEREN (als Ganzes ausführen)
-- ---------------------------------------------------------------------------
begin;

-- Gleichzeitige zweite Ausführung blockieren/abbrechen.
lock table public.project_ready_print_settings in exclusive mode;

do $$
begin
  if not exists (select 1 from public.project_ready_print_settings where id = 1) then
    raise exception 'Abbruch: Patch supabase_patch_project_ready_print_mail.sql fehlt.';
  end if;
  if exists (select 1 from public.project_ready_print_settings where id = 1 and enabled) then
    raise exception 'Abbruch: Druckmail ist bereits aktiv.';
  end if;
end $$;

insert into public.notification_events (
  event_type, event_key, recipient, project_id, baugruppe,
  payload, status, last_error, created_by
)
select
  'project_ready_print',
  'project_ready_print:' || p.id::text,
  'stoehr@metallbau-heimsch.de',
  p.id,
  'Gesamtprojekt',
  jsonb_build_object(
    'project_name', trim(coalesce(p.nr, '') || ' ' || coalesce(p.name, '')),
    'project_wide', true,
    'baseline', true
  ),
  'skipped',
  'Bestandsprojekt: bei Einführung bereits materialbereit - keine Druckmail.',
  null
from public.projects p
where public.project_material_ready(p.id)
on conflict (event_key) do nothing;

update public.project_ready_print_settings
set enabled = true,
    activated_at = now(),
    baseline_count = (
      select count(*) from public.notification_events
      where event_type = 'project_ready_print' and status = 'skipped'
    ),
    updated_at = now()
where id = 1;

commit;

-- ---------------------------------------------------------------------------
-- C) NACH DER AKTIVIERUNG PRÜFEN (nur lesen)
-- ---------------------------------------------------------------------------
-- select enabled, activated_at, baseline_count from public.project_ready_print_settings;
-- select status, count(*) from public.notification_events
--   where event_type = 'project_ready_print' group by status;          -- nur 'skipped' = baseline_count

-- ---------------------------------------------------------------------------
-- D) DEAKTIVIEREN (nur bei Problemen, separat ausführen)
-- ---------------------------------------------------------------------------
-- Stoppt neue Druckmails sofort. Achtung: automatische Druckjobs je
-- Baugruppe werden danach wieder erzeugt (bisheriges Verhalten), aber nur
-- für künftige Baugruppen-Übergänge auf grün - kein Nachdruck für die
-- aktive Phase. Die Bestandsmarkierungen bleiben erhalten. Zum Zeitpunkt
-- der Deaktivierung noch 'pending' stehende Druckmails werden nicht mehr
-- versendet, auch nicht nach erneuter Aktivierung (sie bleiben sichtbar
-- 'pending'; das Projekt erhält keine Druckmail). Eine spätere erneute Aktivierung
-- über Abschnitt B markiert zusätzlich alle DANN grünen Projekte ohne
-- Ereignis als Bestand (keine Mail) - vorher bewusst entscheiden.
--
-- update public.project_ready_print_settings
--   set enabled = false, updated_at = now() where id = 1;

-- ---------------------------------------------------------------------------
-- E) FEHLGESCHLAGENE ZUSTELLUNG KONTROLLIERT WIEDERHOLEN (einzeln)
-- ---------------------------------------------------------------------------
-- Ein fehlgeschlagener Versand bleibt 'failed' (nie stillschweigend als
-- erledigt) und wird NIE automatisch wiederholt.
-- 1. Ursache prüfen:
--    select id, project_id, attempts, last_error, created_at
--      from public.notification_events
--      where event_type = 'project_ready_print' and status = 'failed';
-- 2. Im Resend-Dashboard sicherstellen, dass die Mail tatsächlich NICHT
--    zugestellt wurde (sonst Doppelmail).
-- 3. Ursache beheben (z. B. APP_URL/Mail-Secrets).
-- 4. GENAU dieses Ereignis zurück auf pending setzen:
--    update public.notification_events
--      set status = 'pending', processing_at = null, last_error = null
--      where id = '<event-id>' and event_type = 'project_ready_print' and status = 'failed';
-- 5. Der nächste App-Start auf einem beliebigen Gerät oder der nächste
--    Grünwechsel eines Projekts (frühestens
--    2 Minuten nach der ursprünglichen Anlage, nur solange die Druckmail
--    aktiv ist) übergibt das Ereignis an die Edge
--    Function; diese beansprucht es atomar (kein Doppelversand). Kontrolle:
--    select status, sent_at, attempts from public.notification_events where id = '<event-id>';
