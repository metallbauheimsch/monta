# MONTA – Nächster Sprint

## Sicherheits-Sprint: Auth / Freigabe / Benutzerverwaltung – erledigt (Code)

- Auth-Oberfläche (Anmelden, Registrieren, Passwort vergessen/zurücksetzen)
- `user_profiles` + Trigger + `is_active_user` / `is_admin`
- Pending-/Blocked-Seiten ohne Projektdaten
- Admin Benutzerverwaltung
- Edge Function `admin-users` (vorbereitet, nicht auto-deployed)
- SQL: `supabase_patch_auth_foundation.sql`, `supabase_patch_auth_lockdown.sql`

Details: `AUTH_SETUP.md`, `MONTA_PROJECT.md`, `MONTA_DECISIONS.md`, `MONTA_CHANGELOG.md`.

## Verbindliche Rollout-Reihenfolge (Live)

A. `supabase_patch_auth_foundation.sql`  
B. Stöhr registrieren + E-Mail bestätigen (`stoehr@metallbau-heimsch.de`)  
C. Bootstrap-SQL (auskommentierter Block in Foundation) → Admin aktiv  
D. Anmeldung und Benutzerverwaltung prüfen  
E. `supabase_patch_auth_lockdown.sql`  
F. anon / pending / active Zugriffstest  

Zusätzlich: `supabase functions deploy admin-users`  
Dashboard-Einstellungen laut `AUTH_SETUP.md`.

Falls noch offen (ältere Patches):

- `supabase_patch_project_structure.sql`
- `supabase_patch_component_groups.sql`
- Realtime / Delete-Policy aus Stabilitäts-Sprint

## Nächster sinnvoller Fokus

- Auth in Produktion absichern und testen
- Danach: E-Mail-Benachrichtigungen oder Druckstation oder PWA

## Weiterhin offen

- Spalte `archived` in der Live-DB, sobald gewünscht
- Benutzerbezogene Nachvollziehbarkeit (`created_by` etc.)
