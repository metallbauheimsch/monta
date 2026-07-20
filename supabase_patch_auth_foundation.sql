-- MONTA Sicherheits-Sprint: Auth-Foundation
-- Einmalig im Supabase SQL Editor ausführen. Nicht automatisch aus der App.
-- Bestehende projects / material_items / project_structure-Daten bleiben unverändert.
--
-- WICHTIG: Dieser Patch entfernt NOCH KEINE öffentlichen MONTA-Policies.
-- Reihenfolge siehe MONTA_NEXT_SPRINT.md / AUTH_SETUP.md:
--   A) Foundation  B) Admin registrieren + Bootstrap  C) Lockdown

-- ---------------------------------------------------------------------------
-- 1) user_profiles
-- ---------------------------------------------------------------------------
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  status text not null default 'pending',
  role text not null default 'user',
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references auth.users(id),
  blocked_at timestamptz,
  blocked_by uuid references auth.users(id)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'user_profiles_status_check'
  ) then
    alter table public.user_profiles
      add constraint user_profiles_status_check
      check (status in ('pending', 'active', 'blocked'));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'user_profiles_role_check'
  ) then
    alter table public.user_profiles
      add constraint user_profiles_role_check
      check (role in ('user', 'admin'));
  end if;
end $$;

create index if not exists user_profiles_status_idx on public.user_profiles (status);
create index if not exists user_profiles_email_idx on public.user_profiles (lower(email));

alter table public.user_profiles enable row level security;

-- ---------------------------------------------------------------------------
-- 2) Hilfsfunktionen (SECURITY DEFINER, fester search_path, kein dynamisches SQL)
-- ---------------------------------------------------------------------------
create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles p
    where p.user_id = auth.uid()
      and p.status = 'active'
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles p
    where p.user_id = auth.uid()
      and p.status = 'active'
      and p.role = 'admin'
  );
$$;

revoke all on function public.is_active_user() from public;
revoke all on function public.is_admin() from public;
grant execute on function public.is_active_user() to authenticated;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- 3) Profil bei Auth-Registrierung anlegen
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (user_id, email, display_name, status, role)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(trim(coalesce(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'displayName',
      ''
    )), ''),
    'pending',
    'user'
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 4) Schutz: sensible Felder + letzter Admin
-- ---------------------------------------------------------------------------
create or replace function public.user_profiles_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  other_admins integer;
  caller_admin boolean;
begin
  caller_admin := public.is_admin();

  if not caller_admin then
    if new.user_id is distinct from auth.uid() then
      raise exception 'Profiländerung nicht erlaubt.';
    end if;
    -- Nur Anzeigename darf vom Nutzer selbst geändert werden
    new.status := old.status;
    new.role := old.role;
    new.email := old.email;
    new.approved_at := old.approved_at;
    new.approved_by := old.approved_by;
    new.blocked_at := old.blocked_at;
    new.blocked_by := old.blocked_by;
    new.created_at := old.created_at;
    new.user_id := old.user_id;
    return new;
  end if;

  -- Letzter aktiver Admin darf Role/Status nicht verlieren
  if old.role = 'admin' and old.status = 'active' then
    if (new.role is distinct from 'admin') or (new.status is distinct from 'active') then
      select count(*)::integer into other_admins
      from public.user_profiles p
      where p.status = 'active'
        and p.role = 'admin'
        and p.user_id is distinct from old.user_id;
      if coalesce(other_admins, 0) < 1 then
        raise exception 'Der letzte Administrator kann nicht entfernt oder gesperrt werden.';
      end if;
    end if;
  end if;

  if new.user_id = auth.uid() and new.status = 'blocked' then
    raise exception 'Sie können sich nicht selbst sperren.';
  end if;

  if new.status = 'active' and old.status is distinct from 'active' then
    new.approved_at := coalesce(new.approved_at, now());
    new.approved_by := coalesce(new.approved_by, auth.uid());
    new.blocked_at := null;
    new.blocked_by := null;
  end if;

  if new.status = 'blocked' and old.status is distinct from 'blocked' then
    new.blocked_at := coalesce(new.blocked_at, now());
    new.blocked_by := coalesce(new.blocked_by, auth.uid());
  end if;

  return new;
end;
$$;

drop trigger if exists user_profiles_guard_trg on public.user_profiles;
create trigger user_profiles_guard_trg
  before update on public.user_profiles
  for each row execute function public.user_profiles_guard();

-- ---------------------------------------------------------------------------
-- 5) RLS user_profiles (keine öffentlichen Policies)
-- ---------------------------------------------------------------------------
drop policy if exists "profiles select own" on public.user_profiles;
drop policy if exists "profiles select admin" on public.user_profiles;
drop policy if exists "profiles update own" on public.user_profiles;
drop policy if exists "profiles update admin" on public.user_profiles;

create policy "profiles select own"
  on public.user_profiles for select to authenticated
  using (user_id = auth.uid());

create policy "profiles select admin"
  on public.user_profiles for select to authenticated
  using (public.is_admin());

create policy "profiles update own"
  on public.user_profiles for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "profiles update admin"
  on public.user_profiles for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Kein INSERT/DELETE für Clients: Anlage per Trigger, Löschen per Edge Function (Cascade).

-- ---------------------------------------------------------------------------
-- 6) BOOTSTRAP ERSTER ADMIN (auskommentiert – manuell nach Registrierung)
-- ---------------------------------------------------------------------------
-- Nur ausführen, wenn stoehr@metallbau-heimsch.de bereits in auth.users
-- und user_profiles existiert und die E-Mail bestätigt wurde:
/*
update public.user_profiles
set
  status = 'active',
  role = 'admin',
  approved_at = now(),
  approved_by = user_id,
  blocked_at = null,
  blocked_by = null
where lower(email) = lower('stoehr@metallbau-heimsch.de')
  and exists (
    select 1 from auth.users u where u.id = user_profiles.user_id
  );
*/
