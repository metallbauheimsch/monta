MONTA Web-App v0.4

## Start

1. `npm install`
2. `.env`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
3. `npm run dev` / `npm run build`

## Sicherheit & Workflow

- Auth: `AUTH_SETUP.md`
- Druckstation lokal: `PRINT_STATION_SETUP.md`
- SQL-Patches: `supabase_patch_*.sql` (manuell)
- Edge Functions: `supabase/functions/` (manuell deployen)

Niemals Service-Role-Schlüssel in die Web-App legen.

## Dokumentation

HEIMSCH_PLATFORM.md, MONTA_*.md
