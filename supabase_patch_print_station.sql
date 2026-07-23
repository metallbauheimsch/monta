-- MONTA Workflow-Sprint: Druckstation (Sicherheitskorrektur)
-- Einmalig im Supabase SQL Editor ausführen. Nicht automatisch aus der App.
-- Bestehende Projektdaten bleiben unverändert.
--
-- Clients ändern print_station_config / print_jobs nur über RPC.
-- Admin weist den Druckstations-Benutzer über print_station_settings zu.

-- ---------------------------------------------------------------------------
-- 1) print_station_settings (Singleton)
-- ---------------------------------------------------------------------------
create table if not exists public.print_station_settings (
  id integer primary key default 1 check (id = 1),
  user_id uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

insert into public.print_station_settings (id, user_id)
values (1, null)
on conflict (id) do nothing;

alter table public.print_station_settings enable row level security;

drop policy if exists "print settings select active" on public.print_station_settings;
drop policy if exists "print settings update admin" on public.print_station_settings;

create policy "print settings select active"
  on public.print_station_settings for select to authenticated
  using (public.is_active_user());

create policy "print settings update admin"
  on public.print_station_settings for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Bei Admin-Änderung: Zeitstempel + alle aktiven Stationen deaktivieren
create or replace function public.print_station_settings_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Nicht berechtigt.';
  end if;

  new.updated_at := now();
  new.updated_by := auth.uid();

  if new.user_id is distinct from old.user_id then
    update public.print_station_config
    set active = false, last_seen_at = now()
    where active = true;
  end if;

  return new;
end;
$$;

drop trigger if exists print_station_settings_guard_trg on public.print_station_settings;
create trigger print_station_settings_guard_trg
  before update on public.print_station_settings
  for each row execute function public.print_station_settings_guard();

-- ---------------------------------------------------------------------------
-- 2) print_station_config – nur Lesen für Clients, Schreiben nur per RPC
-- ---------------------------------------------------------------------------
create table if not exists public.print_station_config (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  device_name text,
  active boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create unique index if not exists print_station_config_device_uidx
  on public.print_station_config (device_id);

create unique index if not exists print_station_one_active_uidx
  on public.print_station_config ((active))
  where active = true;

create index if not exists print_station_config_user_id_idx
  on public.print_station_config (user_id);

alter table public.print_station_config enable row level security;

drop policy if exists "print config select active" on public.print_station_config;
drop policy if exists "print config insert assigned" on public.print_station_config;
drop policy if exists "print config update own" on public.print_station_config;
drop policy if exists "print config update admin" on public.print_station_config;

create policy "print config select active"
  on public.print_station_config for select to authenticated
  using (public.is_active_user());

-- Kein INSERT/UPDATE/DELETE für Clients.

-- ---------------------------------------------------------------------------
-- 3) print_jobs – Anlegen/Ändern nur per RPC
-- ---------------------------------------------------------------------------
create table if not exists public.print_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  baugruppe text not null,
  event_key text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  printed_at timestamptz,
  claimed_by_device text,
  attempts integer not null default 0,
  last_error text,
  created_by uuid references auth.users(id)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'print_jobs_status_check'
  ) then
    alter table public.print_jobs
      add constraint print_jobs_status_check
      check (status in ('pending', 'claimed', 'printed', 'failed'));
  end if;
end $$;

create unique index if not exists print_jobs_event_key_uidx
  on public.print_jobs (event_key);

create index if not exists print_jobs_status_idx
  on public.print_jobs (status, created_at);

create index if not exists print_jobs_claimed_by_device_idx
  on public.print_jobs (claimed_by_device);

alter table public.print_jobs enable row level security;

drop policy if exists "print jobs insert active" on public.print_jobs;
drop policy if exists "print jobs select active" on public.print_jobs;
drop policy if exists "print jobs update station" on public.print_jobs;
drop policy if exists "print jobs update admin" on public.print_jobs;

create policy "print jobs select active"
  on public.print_jobs for select to authenticated
  using (public.is_active_user());

-- Kein INSERT/UPDATE für Clients.

-- ---------------------------------------------------------------------------
-- 4) RPC: create_print_job
-- ---------------------------------------------------------------------------
create or replace function public.create_print_job(
  p_project_id uuid,
  p_baugruppe text,
  p_event_key text
)
returns public.print_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  bg text;
  job public.print_jobs%rowtype;
  exists_structure boolean;
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'Nicht berechtigt.';
  end if;

  bg := nullif(trim(coalesce(p_baugruppe, '')), '');
  if p_project_id is null or bg is null or nullif(trim(coalesce(p_event_key, '')), '') is null then
    raise exception 'Ungültige Druckauftragsdaten.';
  end if;

  if not exists (select 1 from public.projects p where p.id = p_project_id) then
    raise exception 'Projekt nicht gefunden.';
  end if;

  select exists (
    select 1 from public.project_structure s
    where s.project_id = p_project_id
      and s.baugruppe = bg
  ) into exists_structure;

  if not exists_structure then
    raise exception 'Baugruppe nicht gefunden.';
  end if;

  insert into public.print_jobs (
    project_id, baugruppe, event_key, status,
    claimed_at, printed_at, claimed_by_device, attempts, created_by
  ) values (
    p_project_id, bg, trim(p_event_key), 'pending',
    null, null, null, 0, auth.uid()
  )
  on conflict (event_key) do nothing
  returning * into job;

  if job.id is null then
    select * into job from public.print_jobs where event_key = trim(p_event_key);
  end if;

  return job;
end;
$$;

revoke all on function public.create_print_job(uuid, text, text) from public;
grant execute on function public.create_print_job(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 5) RPC: claim / finish / fail / reset
-- ---------------------------------------------------------------------------
create or replace function public.claim_print_job(p_job_id uuid, p_device_id text)
returns public.print_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg public.print_station_config%rowtype;
  job public.print_jobs%rowtype;
  did text;
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'Nicht berechtigt.';
  end if;

  did := nullif(trim(coalesce(p_device_id, '')), '');
  if did is null then
    raise exception 'Geräte-ID fehlt.';
  end if;

  select * into cfg
  from public.print_station_config
  where active = true
    and user_id = auth.uid()
    and device_id = did
  limit 1;

  if not found then
    raise exception 'Dieses Gerät ist keine aktive Druckstation.';
  end if;

  -- Zugewiesener Benutzer muss noch der Settings-User sein
  if not exists (
    select 1 from public.print_station_settings s
    where s.id = 1 and s.user_id = auth.uid()
  ) then
    raise exception 'Druckstations-Zuweisung entzogen.';
  end if;

  update public.print_station_config
  set last_seen_at = now()
  where id = cfg.id;

  update public.print_jobs
  set
    status = 'claimed',
    claimed_at = now(),
    claimed_by_device = did,
    attempts = attempts + 1,
    last_error = null
  where id = p_job_id
    and status = 'pending'
  returning * into job;

  if not found then
    raise exception 'Auftrag nicht mehr verfügbar.';
  end if;

  return job;
end;
$$;

revoke all on function public.claim_print_job(uuid, text) from public;
grant execute on function public.claim_print_job(uuid, text) to authenticated;

create or replace function public.finish_print_job(p_job_id uuid, p_device_id text)
returns public.print_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  did text;
  job public.print_jobs%rowtype;
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'Nicht berechtigt.';
  end if;

  did := nullif(trim(coalesce(p_device_id, '')), '');
  if did is null then
    raise exception 'Geräte-ID fehlt.';
  end if;

  if not exists (
    select 1 from public.print_station_config c
    where c.active = true
      and c.user_id = auth.uid()
      and c.device_id = did
  ) then
    raise exception 'Dieses Gerät ist keine aktive Druckstation.';
  end if;

  update public.print_jobs
  set
    status = 'printed',
    printed_at = now(),
    last_error = null
  where id = p_job_id
    and status = 'claimed'
    and claimed_by_device = did
  returning * into job;

  if not found then
    raise exception 'Auftrag kann nicht als gedruckt markiert werden.';
  end if;

  update public.print_station_config
  set last_seen_at = now()
  where device_id = did and user_id = auth.uid();

  return job;
end;
$$;

revoke all on function public.finish_print_job(uuid, text) from public;
grant execute on function public.finish_print_job(uuid, text) to authenticated;

create or replace function public.fail_print_job(
  p_job_id uuid,
  p_device_id text,
  p_error text default null
)
returns public.print_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  did text;
  job public.print_jobs%rowtype;
  err text;
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'Nicht berechtigt.';
  end if;

  did := nullif(trim(coalesce(p_device_id, '')), '');
  if did is null then
    raise exception 'Geräte-ID fehlt.';
  end if;

  if not exists (
    select 1 from public.print_station_config c
    where c.active = true
      and c.user_id = auth.uid()
      and c.device_id = did
  ) then
    raise exception 'Dieses Gerät ist keine aktive Druckstation.';
  end if;

  err := left(trim(coalesce(p_error, 'Druck fehlgeschlagen')), 500);

  update public.print_jobs
  set
    status = 'failed',
    last_error = err
  where id = p_job_id
    and status = 'claimed'
    and claimed_by_device = did
  returning * into job;

  if not found then
    raise exception 'Auftrag kann nicht als fehlgeschlagen markiert werden.';
  end if;

  return job;
end;
$$;

revoke all on function public.fail_print_job(uuid, text, text) from public;
grant execute on function public.fail_print_job(uuid, text, text) to authenticated;

create or replace function public.reset_print_job(p_job_id uuid)
returns public.print_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  job public.print_jobs%rowtype;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Nicht berechtigt.';
  end if;

  update public.print_jobs
  set
    status = 'pending',
    claimed_at = null,
    claimed_by_device = null,
    printed_at = null,
    last_error = null
  where id = p_job_id
    and status in ('failed', 'claimed', 'printed')
  returning * into job;

  if not found then
    raise exception 'Auftrag kann nicht zurückgesetzt werden.';
  end if;

  return job;
end;
$$;

revoke all on function public.reset_print_job(uuid) from public;
grant execute on function public.reset_print_job(uuid) to authenticated;

create or replace function public.admin_complete_print_job(p_job_id uuid)
returns public.print_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  job public.print_jobs%rowtype;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Nicht berechtigt.';
  end if;

  update public.print_jobs
  set
    status = 'printed',
    printed_at = coalesce(printed_at, now()),
    last_error = null
  where id = p_job_id
    and status in ('pending', 'claimed', 'failed')
  returning * into job;

  if not found then
    raise exception 'Auftrag kann nicht abgeschlossen werden.';
  end if;

  return job;
end;
$$;

revoke all on function public.admin_complete_print_job(uuid) from public;
grant execute on function public.admin_complete_print_job(uuid) to authenticated;

-- Station: fehlgeschlagenen eigenen Claim erneut in die Warteschlange
create or replace function public.requeue_print_job(p_job_id uuid, p_device_id text)
returns public.print_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  did text;
  job public.print_jobs%rowtype;
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'Nicht berechtigt.';
  end if;

  did := nullif(trim(coalesce(p_device_id, '')), '');
  if did is null then
    raise exception 'Geräte-ID fehlt.';
  end if;

  if not exists (
    select 1 from public.print_station_config c
    where c.active = true
      and c.user_id = auth.uid()
      and c.device_id = did
  ) then
    raise exception 'Dieses Gerät ist keine aktive Druckstation.';
  end if;

  update public.print_jobs
  set
    status = 'pending',
    claimed_at = null,
    claimed_by_device = null,
    printed_at = null,
    last_error = null
  where id = p_job_id
    and status = 'failed'
    and claimed_by_device = did
  returning * into job;

  if not found then
    raise exception 'Auftrag kann nicht erneut eingereiht werden.';
  end if;

  return job;
end;
$$;

revoke all on function public.requeue_print_job(uuid, text) from public;
grant execute on function public.requeue_print_job(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 6) RPC: activate / deactivate station
-- ---------------------------------------------------------------------------
create or replace function public.activate_print_station(
  p_device_id text,
  p_device_name text
)
returns public.print_station_config
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed uuid;
  did text;
  dname text;
  row public.print_station_config%rowtype;
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'Nicht berechtigt.';
  end if;

  did := nullif(trim(coalesce(p_device_id, '')), '');
  if did is null or char_length(did) > 80 then
    raise exception 'Ungültige Geräte-ID.';
  end if;

  dname := left(trim(coalesce(p_device_name, '')), 80);
  if dname = '' then
    dname := 'Druckstation-PC';
  end if;

  select user_id into allowed from public.print_station_settings where id = 1;
  if allowed is distinct from auth.uid() then
    raise exception 'Sie sind nicht als Druckstations-Benutzer hinterlegt.';
  end if;

  update public.print_station_config
  set active = false
  where active = true;

  insert into public.print_station_config (
    user_id, device_id, device_name, active, last_seen_at, created_by
  ) values (
    auth.uid(), did, dname, true, now(), auth.uid()
  )
  on conflict (device_id) do update
  set
    user_id = auth.uid(),
    device_name = excluded.device_name,
    active = true,
    last_seen_at = now()
  where public.print_station_config.device_id = excluded.device_id
    and exists (
      select 1 from public.print_station_settings s
      where s.id = 1 and s.user_id = auth.uid()
    )
  returning * into row;

  if row.id is null then
    raise exception 'Aktivierung nicht möglich.';
  end if;

  return row;
end;
$$;

revoke all on function public.activate_print_station(text, text) from public;
grant execute on function public.activate_print_station(text, text) to authenticated;

create or replace function public.deactivate_print_station(p_device_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  did text;
  n integer;
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'Nicht berechtigt.';
  end if;

  did := nullif(trim(coalesce(p_device_id, '')), '');
  if did is null then
    raise exception 'Geräte-ID fehlt.';
  end if;

  update public.print_station_config
  set active = false, last_seen_at = now()
  where device_id = did
    and user_id = auth.uid();

  get diagnostics n = row_count;
  if n = 0 and not public.is_admin() then
    raise exception 'Gerät nicht gefunden oder nicht berechtigt.';
  end if;

  -- Admin darf fremdes Gerät deaktivieren
  if n = 0 and public.is_admin() then
    update public.print_station_config
    set active = false, last_seen_at = now()
    where device_id = did;
  end if;
end;
$$;

revoke all on function public.deactivate_print_station(text) from public;
grant execute on function public.deactivate_print_station(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 7) Realtime idempotent
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'print_jobs'
  ) then
    alter publication supabase_realtime add table public.print_jobs;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'print_station_config'
  ) then
    alter publication supabase_realtime add table public.print_station_config;
  end if;
end $$;
