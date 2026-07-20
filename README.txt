MONTA Web-App v0.4

Interne App für Metallbau Heimsch (Befestigungsmaterial).

## Start

1. Abhängigkeiten: `npm install`
2. Umgebung: `.env` mit `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY`
3. Entwicklung: `npm run dev`
4. Build: `npm run build`

Ohne Supabase-Env startet eine lokale Demo (ohne Auth) – nicht für Produktion.

## Sicherheit / Auth

Siehe `AUTH_SETUP.md` und die SQL-Patches:

- `supabase_patch_auth_foundation.sql`
- `supabase_patch_auth_lockdown.sql`

Service-Role-Schlüssel niemals im Browser oder Repository.

Edge Function zum Benutzerlöschen: `supabase/functions/admin-users/`

## Dokumentation

- `HEIMSCH_PLATFORM.md`
- `MONTA_PROJECT.md`
- `MONTA_DECISIONS.md`
- `MONTA_CHANGELOG.md`
- `MONTA_BACKLOG.md`
- `MONTA_NEXT_SPRINT.md`
