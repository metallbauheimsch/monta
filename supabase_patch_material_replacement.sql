-- MONTA Sprint 2B/2C: Materialersetzung - minimale Schemaerweiterung
-- NUR VORBEREITET. NICHT automatisch ausgeführt.
-- Einmalig manuell im Supabase SQL Editor ausführen, sobald fachlich freigegeben.
--
-- Sprint 2C (GPT-Code-Review) korrigiert gegenüber Sprint 2B:
--   1) ersetzt_durch verwendet jetzt "on delete restrict" statt
--      "on delete set null" - eine Altposition darf niemals automatisch
--      wieder als aktueller Bedarf erscheinen, nur weil die neue Position
--      später gelöscht wird.
--   2) Die eigentliche Ersetzung läuft jetzt über eine einzelne atomare
--      Datenbankfunktion (replace_material_item), nicht mehr über zwei
--      getrennte Schreibvorgänge vom Client aus. Das verhindert
--      Zwischenzustände bei Realtime/Workflow und schützt vor doppelter
--      paralleler Ersetzung derselben Ursprungsposition (Sperre per
--      SELECT ... FOR UPDATE).
--
-- ---------------------------------------------------------------------------
-- 1) Spalte ersetzt_durch
-- ---------------------------------------------------------------------------
--
--   ersetzt_durch IS NULL
--     -> Position ist normaler aktueller Bedarf (heutiges Verhalten,
--        exakt wie bisher - betrifft ALLE bestehenden Datensätze).
--
--   ersetzt_durch = <id einer anderen material_items-Zeile>
--     -> diese Position wurde durch jene neue Position ersetzt; sie bleibt
--        als Nachweis der real vorbereiteten/bestellten Menge erhalten,
--        zählt aber nicht mehr als aktueller Bedarf.
--
-- Sicherheit (MONTA_SAFETY.md):
--   - Keine Massenmigration, kein Backfill: Default ist NULL, bestehende
--     Zeilen werden durch dieses Skript inhaltlich nicht angefasst.
--   - "on delete restrict": eine Position, auf die eine ältere Position
--     über ersetzt_durch verweist, kann nicht gelöscht werden, solange
--     dieser Verweis besteht (auch nicht über eine Ersatzkette A->B->C -
--     B und C sind dann jeweils durch die jeweils ältere Position
--     referenziert). Das Löschen schlägt mit einem klaren Datenbankfehler
--     fehl; die App fängt das zusätzlich ab und zeigt einen verständlichen
--     Hinweis, bevor überhaupt ein Löschversuch gestartet wird.
--   - Idempotent: mehrfaches Ausführen ist ungefährlich (IF NOT EXISTS).

alter table public.material_items
  add column if not exists ersetzt_durch uuid references public.material_items(id) on delete restrict;

create index if not exists material_items_ersetzt_durch_idx
  on public.material_items (ersetzt_durch);

comment on column public.material_items.ersetzt_durch is
  'Verweis auf die neue material_items-Zeile, falls diese Position fachlich ersetzt wurde (NULL = aktueller Bedarf). on delete restrict: eine referenzierte Position kann nicht gelöscht werden. Siehe Sprint 2B/2C.';

-- ---------------------------------------------------------------------------
-- 2) Atomare Ersatzfunktion
-- ---------------------------------------------------------------------------
--
-- Kapselt ausschließlich die Materialersetzung selbst (kein größeres
-- Server-Framework): legt in EINER Transaktion die neue Position an und
-- markiert die alte als ersetzt. "select ... for update" sperrt die
-- Ursprungszeile für die Dauer des Aufrufs - ein zweiter, gleichzeitiger
-- Ersetzen-Versuch derselben Ursprungsposition wartet, bis der erste
-- fertig ist, und bricht danach mit einer klaren Fehlermeldung ab (die
-- Ursprungszeile ist dann bereits ersetzt). Es können dadurch nie zwei
-- aktive Ersatzpositionen für dieselbe Ursprungsposition entstehen.
--
-- Bewusst OHNE "security definer": Jeder aktive Nutzer darf laut
-- bestehenden RLS-Policies ("active insert items" / "active update items"
-- in supabase_patch_auth_lockdown.sql) material_items ohnehin bereits
-- direkt anlegen und ändern. Die Funktion läuft deshalb als
-- "security invoker" (Postgres-Standard) unter den Rechten des Aufrufers -
-- RLS greift dadurch innerhalb der Funktion genauso wie bei einem direkten
-- INSERT/UPDATE aus der App. Es entsteht keine zusätzliche Rechteausweitung
-- und keine Umgehung bestehender Policies.
create or replace function public.replace_material_item(
  p_source_id uuid,
  p_bezeichnung text,
  p_groesse text,
  p_laenge text,
  p_oberflaeche text,
  p_hinweis text,
  p_important_note boolean,
  p_menge numeric
) returns public.material_items
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_source public.material_items%rowtype;
  v_new public.material_items%rowtype;
  v_next_pos int;
begin
  -- Ursprungszeile sperren: verhindert, dass ein zweiter, gleichzeitiger
  -- Aufruf mit derselben p_source_id parallel eine zweite Ersatzposition
  -- anlegt (siehe Kommentar oben).
  select * into v_source
  from public.material_items
  where id = p_source_id
  for update;

  if not found then
    raise exception 'Ursprungsposition wurde nicht gefunden.';
  end if;

  if v_source.ersetzt_durch is not null then
    raise exception 'Diese Position wurde bereits ersetzt.';
  end if;

  -- Kleinste freie, projektweit eindeutige Positionsnummer (wie bisher
  -- clientseitig in technikerUtils.allocatePositions: nicht einfach
  -- fortlaufend, sondern Lücken zuerst).
  select min(g.n) into v_next_pos
  from generate_series(
    1,
    (select coalesce(max(m.pos::int), 0) + 1
       from public.material_items m
      where m.project_id = v_source.project_id and m.pos ~ '^[0-9]+$')
  ) as g(n)
  where not exists (
    select 1 from public.material_items m2
    where m2.project_id = v_source.project_id and m2.pos = g.n::text
  );

  insert into public.material_items (
    id, project_id, pos, einbauort, menge, bezeichnung, groesse, laenge,
    oberflaeche, hinweis, important_note, bereit, bestellt, geliefert
  ) values (
    gen_random_uuid(),
    v_source.project_id,
    coalesce(v_next_pos, 1)::text,
    v_source.einbauort,
    coalesce(p_menge, v_source.menge),
    coalesce(p_bezeichnung, v_source.bezeichnung),
    coalesce(p_groesse, v_source.groesse),
    coalesce(p_laenge, v_source.laenge),
    coalesce(p_oberflaeche, v_source.oberflaeche),
    coalesce(p_hinweis, v_source.hinweis),
    coalesce(p_important_note, v_source.important_note),
    0,
    false,
    false
  )
  returning * into v_new;

  update public.material_items
     set ersetzt_durch = v_new.id
   where id = v_source.id;

  return v_new;
end;
$$;

-- Ausführung nur für angemeldete (RLS-geprüfte) Nutzer; anon bleibt ohne Zugriff.
grant execute on function public.replace_material_item(
  uuid, text, text, text, text, text, boolean, numeric
) to authenticated;

-- Kein UPDATE auf bestehende Zeilen, keine Löschung, keine weitere
-- RLS-Änderung nötig (bestehende "active update/select/insert items"-
-- Policies aus supabase_patch_auth_lockdown.sql decken die neue Spalte und
-- die Funktion automatisch mit ab, da diese als security invoker läuft).
