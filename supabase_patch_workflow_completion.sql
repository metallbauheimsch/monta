-- MONTA Workflow-Korrektursprint: Abschlussfreigaben + Vollzugriff
-- Einmalig im SQL Editor ausführen. Nicht automatisch aus der App.
-- Setzt voraus: project_structure, user_profiles, notification_events existieren.

-- ---------------------------------------------------------------------------
-- 1) Abschlussstatus an Baugruppenzeilen (bauteil IS NULL)
-- ---------------------------------------------------------------------------
alter table public.project_structure
  add column if not exists tb_pruefung_abgeschlossen boolean not null default false;

alter table public.project_structure
  add column if not exists lager_abgeschlossen boolean not null default false;

-- ---------------------------------------------------------------------------
-- 2) Vollzugriff auf alle Reiter (z. B. Sautter); Admin hat ohnehin Vollzugriff
-- ---------------------------------------------------------------------------
alter table public.user_profiles
  add column if not exists full_module_access boolean not null default false;

-- ---------------------------------------------------------------------------
-- 3) notification_events: neue event_types (historisches baugruppe_created bleibt)
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
      'lager_completed'
    ));
end $$;

-- Insert-Policy: Empfänger-Whitelist für neue Typen
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
      -- Historische Typen weiterhin insertierbar (keine neuen Client-Mails erwartet)
      or (event_type = 'baugruppe_created'
        and recipient = 'sautter@metallbau-heimsch.de')
      or (event_type = 'cart_items_added'
        and recipient = 'stoehr@metallbau-heimsch.de')
    )
  );

-- full_module_access darf nur Admin setzen (Guard erweitern, falls vorhanden)
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
    new.status := old.status;
    new.role := old.role;
    new.email := old.email;
    new.approved_at := old.approved_at;
    new.approved_by := old.approved_by;
    new.blocked_at := old.blocked_at;
    new.blocked_by := old.blocked_by;
    new.created_at := old.created_at;
    new.user_id := old.user_id;
    new.full_module_access := old.full_module_access;
    return new;
  end if;

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
