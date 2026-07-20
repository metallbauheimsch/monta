-- MONTA Supabase Tabellenstruktur (inkl. Auth / user_profiles)
-- Referenzschema. Live-Änderungen über supabase_patch_*.sql ausführen.

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

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'blocked')),
  role text not null default 'user'
    check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references auth.users(id),
  blocked_at timestamptz,
  blocked_by uuid references auth.users(id)
);

alter table projects enable row level security;
alter table material_items enable row level security;
alter table project_structure enable row level security;
alter table public.user_profiles enable row level security;

-- Hilfsfunktionen und Policies: siehe
--   supabase_patch_auth_foundation.sql
--   supabase_patch_auth_lockdown.sql
--
-- Nach Lockdown gilt für projects / material_items / project_structure:
--   nur authenticated + is_active_user()
-- Für user_profiles:
--   eigenes Profil lesen/aktualisieren (sensible Felder per Trigger geschützt)
--   Admins: alle Profile lesen/aktualisieren
--
-- Keine öffentlichen using (true) / with check (true) Policies mehr.
-- Service-Role-Schlüssel niemals im Frontend verwenden.
--
-- Realtime (falls noch nicht in der Publication):
-- alter publication supabase_realtime add table projects;
-- alter publication supabase_realtime add table material_items;
-- alter publication supabase_realtime add table project_structure;
