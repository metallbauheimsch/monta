-- MONTA Praxis-Sprint: Lager-Gesamtänderung - atomare Mehrzeilen-RPC
-- NUR VORBEREITET. NICHT automatisch ausgeführt.
-- Einmalig manuell im Supabase SQL Editor ausführen, sobald fachlich freigegeben.
--
-- Hintergrund: Eine Lagerzeile fasst mehrere material_items-Zeilen
-- (Ursprungspositionen unterschiedlicher Bauteile) zu einem Artikel
-- zusammen. Ändert der Benutzer im Lager z. B. die Länge, gilt das laut
-- Praxis-Sprint für die GESAMTE Lagerzeile - nicht mehr nur für eine
-- ausgewählte Ursprungsposition (siehe MONTA_DECISIONS.md, Abschnitt
-- Materialersetzung, weiterhin gültig: TB ändert weiterhin gezielt EINE
-- Position, Lager jetzt bewusst ALLE Positionen der Zeile).
--
-- Innerhalb einer Lagerzeile ist der bisherige fachliche Inhalt
-- (Bezeichnung/Größe/Länge/Ausführung) für alle Ursprungspositionen
-- identisch (Definition der Aggregation) - der operative Zustand
-- (bereit/bestellt) kann aber je Position unterschiedlich sein. Deshalb
-- braucht es je Position EINE von zwei Aktionen:
--   - unberührte Position (bereit=0 und nicht bestellt): direktes UPDATE
--   - bereits operativ bearbeitete Position (bereit>0 oder bestellt):
--     Ersetzung wie bei replace_material_item (neue Position, Altposition
--     bleibt mit ihrem realen Zustand erhalten und wird über
--     ersetzt_durch gekennzeichnet)
--
-- Das MUSS in einer einzigen Transaktion geschehen: mehrere unabhängige
-- Client-Aufrufe könnten bei einem Fehler mitten in der Zeile einen
-- inkonsistenten Zwischenzustand hinterlassen (ein Teil der Positionen
-- geändert, ein Teil nicht). Diese Funktion sperrt deshalb alle
-- betroffenen Zeilen (stabile ID-Reihenfolge gegen Deadlocks) sowie die
-- zugehörige projects-Zeile (wie replace_material_item, Sprint 2D) bevor
-- irgendetwas geschrieben wird - schlägt ein einzelner Schritt fehl, wird
-- die GESAMTE Transaktion zurückgerollt (kein Teilerfolg).
--
-- Die bestehende Funktion replace_material_item (Einzelposition, TB)
-- bleibt unverändert bestehen und wird von dieser neuen Funktion nicht
-- ersetzt oder verändert.

create or replace function public.replace_material_items_bulk(
  p_replacements jsonb,
  p_direct_updates jsonb
) returns setof public.material_items
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_project_id uuid;
  v_id uuid;
  v_source public.material_items%rowtype;
  v_new public.material_items%rowtype;
  v_next_pos int;
  v_repl jsonb;
  v_upd jsonb;
  v_all_ids uuid[];
begin
  -- Alle betroffenen Ursprungs-IDs (Ersetzung + Direktänderung) einsammeln,
  -- in stabiler Reihenfolge sperren - verhindert Deadlocks bei zwei
  -- gleichzeitigen Gesamtänderungen, die sich teilweise überschneidende
  -- Zeilen betreffen, und stellt sicher, dass alle Positionen wirklich zur
  -- selben, ursprünglich angezeigten Lagerzeile gehören (Zwischenzeit-
  -- Änderungen fallen dadurch atomar auf: siehe ersetzt_durch-Prüfung
  -- unten).
  select array(
    select (r->>'source_id')::uuid from jsonb_array_elements(coalesce(p_replacements, '[]'::jsonb)) r
    union
    select (u->>'id')::uuid from jsonb_array_elements(coalesce(p_direct_updates, '[]'::jsonb)) u
  ) into v_all_ids;

  if v_all_ids is null or array_length(v_all_ids, 1) is null then
    raise exception 'Keine Positionen für die Gesamtänderung angegeben.';
  end if;

  for v_id in select unnest(v_all_ids) order by 1
  loop
    select * into v_source from public.material_items where id = v_id for update;
    if not found then
      raise exception 'Position % wurde nicht gefunden.', v_id;
    end if;
    if v_source.ersetzt_durch is not null then
      raise exception 'Position % wurde inzwischen bereits ersetzt - bitte die Lagerzeile neu laden.', v_id;
    end if;
    if v_project_id is null then
      v_project_id := v_source.project_id;
    elsif v_project_id <> v_source.project_id then
      raise exception 'Alle Positionen einer Gesamtänderung müssen zum selben Projekt gehören.';
    end if;
  end loop;

  -- Projektweite Sperre für die Positionsvergabe (wie replace_material_item).
  perform 1 from public.projects where id = v_project_id for update;

  -- Ersetzungen: operativ bereits bearbeitete Positionen.
  for v_repl in select * from jsonb_array_elements(coalesce(p_replacements, '[]'::jsonb))
  loop
    select * into v_source from public.material_items where id = (v_repl->>'source_id')::uuid;

    select min(g.n) into v_next_pos
    from generate_series(
      1,
      (select coalesce(max(m.pos::int), 0) + 1
         from public.material_items m
        where m.project_id = v_project_id and m.pos ~ '^[0-9]+$')
    ) as g(n)
    where not exists (
      select 1 from public.material_items m2
      where m2.project_id = v_project_id and m2.pos = g.n::text
    );

    insert into public.material_items (
      id, project_id, pos, einbauort, menge, bezeichnung, groesse, laenge,
      oberflaeche, hinweis, important_note, bereit, bestellt, geliefert
    ) values (
      gen_random_uuid(),
      v_project_id,
      coalesce(v_next_pos, 1)::text,
      v_source.einbauort,
      coalesce((v_repl->>'menge')::numeric, v_source.menge),
      coalesce(v_repl->>'bezeichnung', v_source.bezeichnung),
      coalesce(v_repl->>'groesse', v_source.groesse),
      coalesce(v_repl->>'laenge', v_source.laenge),
      coalesce(v_repl->>'oberflaeche', v_source.oberflaeche),
      coalesce(v_repl->>'hinweis', v_source.hinweis),
      coalesce((v_repl->>'important_note')::boolean, v_source.important_note),
      0,
      false,
      false
    )
    returning * into v_new;

    update public.material_items set ersetzt_durch = v_new.id where id = v_source.id
    returning * into v_source;

    return next v_source;
    return next v_new;
  end loop;

  -- Direktänderungen: unberührte Positionen (bereit=0, nicht bestellt).
  for v_upd in select * from jsonb_array_elements(coalesce(p_direct_updates, '[]'::jsonb))
  loop
    update public.material_items set
      bezeichnung = coalesce(v_upd->>'bezeichnung', bezeichnung),
      groesse = coalesce(v_upd->>'groesse', groesse),
      laenge = coalesce(v_upd->>'laenge', laenge),
      oberflaeche = coalesce(v_upd->>'oberflaeche', oberflaeche),
      hinweis = coalesce(v_upd->>'hinweis', hinweis),
      important_note = coalesce((v_upd->>'important_note')::boolean, important_note)
    where id = (v_upd->>'id')::uuid
    returning * into v_new;

    return next v_new;
  end loop;

  return;
end;
$$;

-- Ausführungsrechte wie bei replace_material_item (Sprint 2D-Korrektur):
-- "security invoker" - bestehende RLS-Policies ("active insert/update
-- items", "active read/update projects" aus
-- supabase_patch_auth_lockdown.sql) bleiben allein maßgeblich dafür, WAS
-- ein Nutzer sehen/ändern darf. EXECUTE zusätzlich explizit von anon
-- entzogen, bevor es an authenticated erteilt wird (Supabase erteilt bei
-- "create function" sonst weiterhin einen direkten Grant an anon, den
-- "revoke ... from public" allein nicht entfernt).
revoke execute on function public.replace_material_items_bulk(jsonb, jsonb) from public;
revoke execute on function public.replace_material_items_bulk(jsonb, jsonb) from anon;
grant execute on function public.replace_material_items_bulk(jsonb, jsonb) to authenticated;
