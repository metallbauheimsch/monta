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
-- Sprint 2D (GPT-Code-Review) korrigiert gegenüber Sprint 2C:
--   3) Die Sperre auf die Ursprungszeile allein schützt nur vor einer
--      doppelten Ersetzung DERSELBEN Ursprungsposition. Zwei gleichzeitige
--      Ersetzungen VERSCHIEDENER Ursprungspositionen im selben Projekt
--      (z. B. Gerät A ersetzt Pos. 10, Gerät B gleichzeitig Pos. 20)
--      konnten dieselbe "kleinste freie" Positionsnummer berechnen, da kein
--      eindeutiger Constraint auf (project_id, pos) existiert. Die Funktion
--      sperrt jetzt zusätzlich die zugehörige projects-Zeile
--      (SELECT ... FOR UPDATE), bevor die nächste freie Positionsnummer
--      berechnet wird - das serialisiert die Positionsvergabe projektweit,
--      ohne die projects-Zeile inhaltlich zu verändern. Bewusst kein UNIQUE
--      INDEX auf (project_id, pos): bestehende Echtprojekte wurden nicht auf
--      bereits vorhandene Dopplungen geprüft, ein blind ergänzter Constraint
--      könnte bestehende Projekte beim ersten Anwenden des Patches
--      überraschend blockieren (siehe Abschlussbericht Sprint 2D).
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
-- und keine Umgehung bestehender Policies. Das gilt auch für die neue
-- SELECT ... FOR UPDATE-Sperre auf projects (Sprint 2D): jeder aktive Nutzer
-- besitzt dafür laut "active read projects" / "active update projects"
-- (supabase_patch_auth_lockdown.sql) bereits SELECT- und UPDATE-Rechte -
-- Postgres verlangt für eine gesperrte SELECT-Zeile unter RLS beide
-- Policies. Keine zusätzliche Policy nötig.
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

  -- Projektweite Sperre (Sprint 2D, GPT-Review Punkt 2): verhindert, dass
  -- zwei gleichzeitige Ersetzungen VERSCHIEDENER Ursprungspositionen
  -- desselben Projekts parallel dieselbe "kleinste freie" Positionsnummer
  -- berechnen. Die Sperre auf die Ursprungszeile oben schützt nur vor einer
  -- doppelten Ersetzung DERSELBEN Position. Keine inhaltliche Änderung an
  -- der projects-Zeile - reine Serialisierung der Positionsvergabe.
  perform 1 from public.projects where id = v_source.project_id for update;

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

-- Ausführungsrechte (Sprint 2D, GPT-Review; nach Live-Prüfung korrigiert):
--   - Die Funktion läuft als "security invoker" (siehe oben) und bleibt das -
--     RLS greift dadurch innerhalb der Funktion genauso wie bei einem
--     direkten INSERT/UPDATE aus der App; bestehende Tabellenrechte/Policies
--     ("active insert/update items", "active read/update projects" aus
--     supabase_patch_auth_lockdown.sql) bleiben allein maßgeblich dafür, WAS
--     ein Nutzer sehen/ändern darf.
--   - EXECUTE regelt zusätzlich, WER die Funktion überhaupt aufrufen darf.
--     "revoke ... from public" entzieht nur das implizite PUBLIC-Recht.
--     Supabase erteilt bei "create function" zusätzlich über
--     ALTER DEFAULT PRIVILEGES eigene, direkte EXECUTE-Grants an die Rollen
--     "anon" und "authenticated" - diese direkten Grants werden durch
--     "revoke ... from public" NICHT entfernt. Eine Live-Prüfung nach
--     Ausführung dieses Patches zeigte deshalb zunächst weiterhin
--     anon_can_execute = true, obwohl "from public" bereits entzogen war.
--     Korrektur: EXECUTE wird jetzt zusätzlich explizit von "anon" entzogen,
--     bevor es gezielt an "authenticated" erteilt wird. Live erneut geprüft:
--     security_definer = false, authenticated_can_execute = true,
--     anon_can_execute = false.
revoke execute on function public.replace_material_item(
  uuid, text, text, text, text, text, boolean, numeric
) from public;

revoke execute on function public.replace_material_item(
  uuid, text, text, text, text, text, boolean, numeric
) from anon;

grant execute on function public.replace_material_item(
  uuid, text, text, text, text, text, boolean, numeric
) to authenticated;
