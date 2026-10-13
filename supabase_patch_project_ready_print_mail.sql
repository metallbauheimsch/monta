-- MONTA Sprint 2C: Einmalige Druckmail "Projekt materialbereit" an stoehr@
-- VORBEREITUNG - nach diesem Patch bleibt die Funktion INAKTIV.
--
-- Einmalig im Supabase SQL Editor ausführen. NICHT automatisch aus der App.
-- Bestehende Projekte/Baugruppen/Bauteile/Materialpositionen, bestehende
-- notification_events und print_jobs bleiben unverändert. Es wird KEIN
-- Benachrichtigungsereignis erzeugt und KEINE Mail versendet.
--
-- Aktivierung ausschließlich separat und bewusst über
--   supabase_activate_project_ready_print_mail.sql
-- (markiert zuvor alle bei Einführung bereits materialbereiten Projekte
-- dauerhaft als "keine Druckmail" - in derselben Transaktion).
--
-- Reihenfolge und Prüfpunkte: siehe PROJECT_READY_PRINT_MAIL.md.

-- ---------------------------------------------------------------------------
-- 1) notification_events: neuer Ereignistyp + Status "skipped"
-- ---------------------------------------------------------------------------
-- "skipped" kennzeichnet Bestandsprojekte, die bei Einführung bereits
-- materialbereit waren (bewusst KEINE Mail). Unterscheidbar von "sent",
-- damit nie ein nicht versendetes Ereignis wie ein versendetes aussieht.
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
      'warenkorb_completed',
      'project_ready_print'
    ));

  if exists (
    select 1 from pg_constraint where conname = 'notification_events_status_check'
  ) then
    alter table public.notification_events drop constraint notification_events_status_check;
  end if;
  alter table public.notification_events
    add constraint notification_events_status_check
    check (status in ('pending', 'processing', 'sent', 'failed', 'skipped'));
end $$;

-- Insert-Policy "notif insert active" bleibt bewusst UNVERÄNDERT: Clients
-- können project_ready_print NICHT direkt einfügen. Anlage ausschließlich
-- über die Funktion request_project_ready_print_mails() (unten), die
-- Aktivierung, Materialstand und Einmaligkeit serverseitig prüft.

-- Einmaligkeit: der bestehende eindeutige Index auf event_key
-- (notification_events_event_key_uidx) wird genutzt. Schlüssel je Projekt
-- OHNE Zyklus: 'project_ready_print:<project_id>' - kann nie erneut
-- verwendet werden, auch nicht nach erneutem Grünwerden.

-- ---------------------------------------------------------------------------
-- 2) Aktivierungsschalter (eine Zeile, Standard: inaktiv)
-- ---------------------------------------------------------------------------
create table if not exists public.project_ready_print_settings (
  id integer primary key default 1 check (id = 1),
  enabled boolean not null default false,
  activated_at timestamptz,
  baseline_count integer,
  updated_at timestamptz not null default now()
);

insert into public.project_ready_print_settings (id, enabled)
values (1, false)
on conflict (id) do nothing;

-- RLS ohne Policies: Clients lesen/schreiben diese Tabelle nie direkt.
-- Umschalten nur im SQL Editor (Aktivierungs-/Deaktivierungsskript).
alter table public.project_ready_print_settings enable row level security;

-- ---------------------------------------------------------------------------
-- 3) Materialbereitschaft eines Projekts (serverseitig, frisch)
-- ---------------------------------------------------------------------------
-- Gleiche Regel wie die Projektampel "Grün" (baugruppeStatus in
-- src/utils/helpers.js): mindestens eine aktive Position (nicht ersetzt)
-- und keine aktive Position mit Restmenge (menge - bereit > 0).
create or replace function public.project_material_ready(p_project uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select
    count(*) filter (where m.ersetzt_durch is null) > 0
    and count(*) filter (
      where m.ersetzt_durch is null
        and coalesce(m.menge, 0) - coalesce(m.bereit, 0) > 0
    ) = 0
  from public.material_items m
  where m.project_id = p_project;
$$;

revoke all on function public.project_material_ready(uuid) from public;

-- ---------------------------------------------------------------------------
-- 4) RPC: einmalige Druckmail anfordern (vom Client als Hinweis aufgerufen)
-- ---------------------------------------------------------------------------
-- Der Client meldet Projekte, die er als bereit sieht. Entscheidung hier:
--   - inaktiv               -> nichts, enabled = false
--   - Projekt nicht bereit  -> nichts (frische Prüfung, kein Client-Stand)
--   - Schlüssel existiert   -> nichts (bereits gesendet, fehlgeschlagen,
--                              in Arbeit oder Bestandsprojekt "skipped")
--   - sonst                 -> genau ein pending-Event; nur der Aufrufer,
--                              dessen Insert gewinnt, erhält die ID
--                              (gleichzeitige Geräte -> on conflict).
-- Zusätzlich: seit > 2 Minuten hängende pending-Events dieses Typs aus der
-- aktuellen Aktivierung (z. B. Browser vor dem Versandaufruf geschlossen,
-- oder bewusst manuell von failed auf pending zurückgesetzt). Die Edge Function beansprucht atomar
-- pending -> processing, mehrfacher Aufruf führt nicht zu Doppelversand.
-- "failed" wird NIE automatisch erneut versucht.
create or replace function public.request_project_ready_print_mails(p_project_ids uuid[])
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  cfg public.project_ready_print_settings%rowtype;
  proj public.projects%rowtype;
  pid uuid;
  new_id uuid;
  created_ids uuid[] := '{}';
  retry_ids uuid[] := '{}';
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'Nicht berechtigt.';
  end if;

  select * into cfg from public.project_ready_print_settings where id = 1;
  if not found or not cfg.enabled then
    return jsonb_build_object('enabled', false, 'created', '[]'::jsonb, 'retry', '[]'::jsonb);
  end if;

  if coalesce(array_length(p_project_ids, 1), 0) > 500 then
    raise exception 'Zu viele Projekte in einer Anfrage.';
  end if;

  foreach pid in array coalesce(p_project_ids, '{}'::uuid[]) loop
    select * into proj from public.projects where id = pid;
    if not found then
      continue;
    end if;
    if not public.project_material_ready(pid) then
      continue;
    end if;

    new_id := null;
    insert into public.notification_events (
      event_type, event_key, recipient, project_id, baugruppe,
      payload, status, created_by
    ) values (
      'project_ready_print',
      'project_ready_print:' || pid::text,
      'stoehr@metallbau-heimsch.de',
      pid,
      'Gesamtprojekt',
      jsonb_build_object(
        'project_name', trim(coalesce(proj.nr, '') || ' ' || coalesce(proj.name, '')),
        'project_wide', true
      ),
      'pending',
      auth.uid()
    )
    on conflict (event_key) do nothing
    returning id into new_id;

    if new_id is not null then
      created_ids := created_ids || new_id;
    end if;
  end loop;

  select coalesce(array_agg(e.id), '{}'::uuid[]) into retry_ids
  from (
    select n.id
    from public.notification_events n
    where n.event_type = 'project_ready_print'
      and n.status = 'pending'
      and n.created_at < now() - interval '2 minutes'
      -- Nur Ereignisse der aktuellen Aktivierung: pending-Reste aus einer
      -- früheren, inzwischen deaktivierten Phase werden nach erneuter
      -- Aktivierung NICHT nachträglich versendet.
      and cfg.activated_at is not null
      and n.created_at >= cfg.activated_at
    order by n.created_at
    limit 20
  ) e;

  return jsonb_build_object(
    'enabled', true,
    'created', to_jsonb(created_ids),
    'retry', to_jsonb(retry_ids)
  );
end;
$$;

revoke all on function public.request_project_ready_print_mails(uuid[]) from public;
grant execute on function public.request_project_ready_print_mails(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- 5) Automatische Druckjobs nach Aktivierung serverseitig unterbinden
-- ---------------------------------------------------------------------------
-- Solange enabled = false: keinerlei Wirkung (bisherige Druckstation
-- unverändert). Nach Aktivierung legt create_print_job() keine neuen
-- Druckjobs mehr an - auch nicht von Geräten mit noch altem App-Stand.
-- Bestehende Druckjobs, Requeue/Reset im Admin-Bereich und die manuelle
-- Druckansicht sind nicht betroffen (keine Inserts).
create or replace function public.print_jobs_block_when_ready_mail_active()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.project_ready_print_settings s
    where s.id = 1 and s.enabled
  ) then
    return null;
  end if;
  return new;
end;
$$;

revoke all on function public.print_jobs_block_when_ready_mail_active() from public;

drop trigger if exists print_jobs_ready_mail_guard on public.print_jobs;
create trigger print_jobs_ready_mail_guard
  before insert on public.print_jobs
  for each row execute function public.print_jobs_block_when_ready_mail_active();

-- ---------------------------------------------------------------------------
-- 6) Kontrolle nach Ausführung (nur lesen)
-- ---------------------------------------------------------------------------
-- select enabled from public.project_ready_print_settings;            -- false
-- select count(*) from public.notification_events
--   where event_type = 'project_ready_print';                         -- 0
