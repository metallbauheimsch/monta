-- MONTA Workflow-Sprint: Benachrichtigungen + wichtiger Hinweis (Sicherheitskorrektur)
-- Einmalig im Supabase SQL Editor ausführen. Nicht automatisch aus der App.
-- Bestehende Projektdaten bleiben erhalten (neue Spalte default false).

-- ---------------------------------------------------------------------------
-- 1) Wichtiger Hinweis an Materialpositionen
-- ---------------------------------------------------------------------------
alter table public.material_items
  add column if not exists important_note boolean not null default false;

-- ---------------------------------------------------------------------------
-- 2) notification_events (Duplikatschutz + Versandprotokoll)
-- ---------------------------------------------------------------------------
create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  project_id uuid references public.projects(id) on delete set null,
  baugruppe text,
  material_item_id uuid references public.material_items(id) on delete set null,
  event_key text not null,
  recipient text not null,
  payload jsonb,
  status text not null default 'pending',
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  last_error text,
  created_by uuid references auth.users(id),
  processing_at timestamptz
);

alter table public.notification_events
  add column if not exists processing_at timestamptz;

do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'notification_events_status_check'
  ) then
    alter table public.notification_events drop constraint notification_events_status_check;
  end if;
  alter table public.notification_events
    add constraint notification_events_status_check
    check (status in ('pending', 'processing', 'sent', 'failed'));

  if not exists (
    select 1 from pg_constraint where conname = 'notification_events_type_check'
  ) then
    alter table public.notification_events
      add constraint notification_events_type_check
      check (event_type in ('baugruppe_created', 'cart_items_added', 'all_items_ordered'));
  end if;
end $$;

create unique index if not exists notification_events_event_key_uidx
  on public.notification_events (event_key);

create index if not exists notification_events_status_idx
  on public.notification_events (status, created_at desc);

create index if not exists notification_events_created_by_idx
  on public.notification_events (created_by);

alter table public.notification_events enable row level security;

drop policy if exists "notif insert active" on public.notification_events;
drop policy if exists "notif select admin" on public.notification_events;
drop policy if exists "notif select own recent" on public.notification_events;

-- Insert: active + eigener created_by + erlaubter Typ + verbindlicher Empfänger.
-- Empfänger wird von der Edge Function erneut serverseitig gesetzt/ignoriert;
-- die Policy verhindert missbräuchliche freie Adressen bereits beim Insert.
create policy "notif insert active"
  on public.notification_events for insert to authenticated
  with check (
    public.is_active_user()
    and created_by = auth.uid()
    and status = 'pending'
    and (
      (event_type = 'baugruppe_created'
        and recipient = 'sautter@metallbau-heimsch.de')
      or (event_type = 'cart_items_added'
        and recipient = 'stoehr@metallbau-heimsch.de')
      or (event_type = 'all_items_ordered'
        and recipient = 'sautter@metallbau-heimsch.de')
    )
  );

create policy "notif select admin"
  on public.notification_events for select to authenticated
  using (public.is_admin());

create policy "notif select own recent"
  on public.notification_events for select to authenticated
  using (public.is_active_user() and created_by = auth.uid());

-- Kein UPDATE/DELETE für Clients: Status nur per Edge Function (service_role).

-- notification_events bewusst NICHT in Realtime (Oberfläche braucht es nicht).

-- ---------------------------------------------------------------------------
-- 3) next_notification_cycle – Auth-Check in der Funktion
-- ---------------------------------------------------------------------------
create or replace function public.next_notification_cycle(
  p_type text,
  p_project uuid,
  p_baugruppe text
)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  n integer;
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'Nicht berechtigt.';
  end if;

  select coalesce(count(*), 0)::integer + 1 into n
  from public.notification_events
  where event_type = p_type
    and project_id = p_project
    and baugruppe is not distinct from p_baugruppe;

  return n;
end;
$$;

revoke all on function public.next_notification_cycle(text, uuid, text) from public;
grant execute on function public.next_notification_cycle(text, uuid, text) to authenticated;

-- Wiederanlauf hängen gebliebener processing-Events (manuell / Wartung):
-- update public.notification_events
-- set status = 'pending', processing_at = null
-- where status = 'processing'
--   and processing_at < now() - interval '15 minutes';
