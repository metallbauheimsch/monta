-- MONTA Sicherheits-Sprint: Auth-Lockdown
-- Einmalig im Supabase SQL Editor ausführen. Nicht automatisch aus der App.
-- Bestehende Projektdaten werden nicht verändert – nur Policies.
--
-- VORAUSSETZUNG: Foundation ausgeführt, erster Admin aktiv (Bootstrap).
-- Reihenfolge: Foundation → Registrierung/Bootstrap → DIESES Script.

-- ---------------------------------------------------------------------------
-- 1) Öffentliche Policies entfernen (projects / material_items / project_structure)
-- ---------------------------------------------------------------------------
drop policy if exists "public read projects" on public.projects;
drop policy if exists "public insert projects" on public.projects;
drop policy if exists "public update projects" on public.projects;
drop policy if exists "public delete projects" on public.projects;

drop policy if exists "public read items" on public.material_items;
drop policy if exists "public insert items" on public.material_items;
drop policy if exists "public update items" on public.material_items;
drop policy if exists "public delete items" on public.material_items;

drop policy if exists "public read structure" on public.project_structure;
drop policy if exists "public insert structure" on public.project_structure;
drop policy if exists "public update structure" on public.project_structure;
drop policy if exists "public delete structure" on public.project_structure;

-- Falls ältere/abweichende Policy-Namen existieren:
drop policy if exists "active read projects" on public.projects;
drop policy if exists "active insert projects" on public.projects;
drop policy if exists "active update projects" on public.projects;
drop policy if exists "active delete projects" on public.projects;
drop policy if exists "active read items" on public.material_items;
drop policy if exists "active insert items" on public.material_items;
drop policy if exists "active update items" on public.material_items;
drop policy if exists "active delete items" on public.material_items;
drop policy if exists "active read structure" on public.project_structure;
drop policy if exists "active insert structure" on public.project_structure;
drop policy if exists "active update structure" on public.project_structure;
drop policy if exists "active delete structure" on public.project_structure;

-- ---------------------------------------------------------------------------
-- 2) Nur aktive authentifizierte Nutzer
-- ---------------------------------------------------------------------------
alter table public.projects enable row level security;
alter table public.material_items enable row level security;
alter table public.project_structure enable row level security;

create policy "active read projects"
  on public.projects for select to authenticated
  using (public.is_active_user());
create policy "active insert projects"
  on public.projects for insert to authenticated
  with check (public.is_active_user());
create policy "active update projects"
  on public.projects for update to authenticated
  using (public.is_active_user())
  with check (public.is_active_user());
create policy "active delete projects"
  on public.projects for delete to authenticated
  using (public.is_active_user());

create policy "active read items"
  on public.material_items for select to authenticated
  using (public.is_active_user());
create policy "active insert items"
  on public.material_items for insert to authenticated
  with check (public.is_active_user());
create policy "active update items"
  on public.material_items for update to authenticated
  using (public.is_active_user())
  with check (public.is_active_user());
create policy "active delete items"
  on public.material_items for delete to authenticated
  using (public.is_active_user());

create policy "active read structure"
  on public.project_structure for select to authenticated
  using (public.is_active_user());
create policy "active insert structure"
  on public.project_structure for insert to authenticated
  with check (public.is_active_user());
create policy "active update structure"
  on public.project_structure for update to authenticated
  using (public.is_active_user())
  with check (public.is_active_user());
create policy "active delete structure"
  on public.project_structure for delete to authenticated
  using (public.is_active_user());

-- anon hat keine Policies → kein Datenzugriff (auch nicht mit Anon-Key allein).
-- Realtime: Clients brauchen gültige Session eines aktiven Nutzers.
