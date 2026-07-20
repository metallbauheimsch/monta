# admin-users Edge Function

## Zweck

Serverseitiges Löschen von Auth-Nutzern (und Cascade von `user_profiles`).
Optional: `approve-user`, `block-user` (Freigabe/Sperre laufen in der App
üblicherweise per RLS-Update).

## Secrets

In gehosteten Supabase-Functions sind standardmäßig gesetzt:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Niemals `SUPABASE_SERVICE_ROLE_KEY` in die Web-App oder ins Repository legen.

## Deploy (manuell)

```bash
supabase login
supabase link --project-ref <PROJECT_REF>
supabase functions deploy admin-users
```

JWT-Prüfung beibehalten (Standard). Die Function prüft zusätzlich Admin-Status
über `user_profiles`.

## Aufruf

`POST /functions/v1/admin-users`

Header:

- `Authorization: Bearer <access_token des Admins>`
- `apikey: <anon key>`
- `Content-Type: application/json`

Body:

```json
{ "action": "delete-user", "user_id": "<uuid>" }
```

Weitere Aktionen: `approve-user`, `block-user`.
