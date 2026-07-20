
-- MONTA Supabase Tabellenstruktur v0.4 (+ project_structure, Pilot Sprint)
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  nr text not null,
  name text not null,
  baugruppe text,
  zeichnung text,
  created_at timestamptz default now()
);

create table if not exists material_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  pos text,
  einbauort text not null,
  menge numeric not null default 0,
  bezeichnung text not null,
  groesse text,
  laenge text,
  oberflaeche text,
  hinweis text,
  bereit numeric default 0,
  bestellt boolean default false,
  geliefert boolean default false,
  created_at timestamptz default now()
);

-- Baugruppen (bauteil IS NULL) und Bauteile (bauteil gesetzt) – Mehrgeräte-Sync
create table if not exists project_structure (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  baugruppe text not null,
  bauteil text,
  bauteilgruppe text,
  created_at timestamptz default now(),
  sort_order integer
);

create unique index if not exists project_structure_unique
  on project_structure (project_id, baugruppe, (coalesce(bauteil, '')));

alter table projects enable row level security;
alter table material_items enable row level security;
alter table project_structure enable row level security;

drop policy if exists "public read projects" on projects;
drop policy if exists "public insert projects" on projects;
drop policy if exists "public update projects" on projects;
drop policy if exists "public delete projects" on projects;
drop policy if exists "public read items" on material_items;
drop policy if exists "public insert items" on material_items;
drop policy if exists "public update items" on material_items;
drop policy if exists "public delete items" on material_items;
drop policy if exists "public read structure" on project_structure;
drop policy if exists "public insert structure" on project_structure;
drop policy if exists "public update structure" on project_structure;
drop policy if exists "public delete structure" on project_structure;

-- Für den internen Prototyp ohne Login:
create policy "public read projects" on projects for select using (true);
create policy "public insert projects" on projects for insert with check (true);
create policy "public update projects" on projects for update using (true);
create policy "public delete projects" on projects for delete using (true);

create policy "public read items" on material_items for select using (true);
create policy "public insert items" on material_items for insert with check (true);
create policy "public update items" on material_items for update using (true);
create policy "public delete items" on material_items for delete using (true);

create policy "public read structure" on project_structure for select using (true);
create policy "public insert structure" on project_structure for insert with check (true);
create policy "public update structure" on project_structure for update using (true);
create policy "public delete structure" on project_structure for delete using (true);

-- Realtime (falls noch nicht in der Publication):
-- alter publication supabase_realtime add table projects;
-- alter publication supabase_realtime add table material_items;
-- alter publication supabase_realtime add table project_structure;
