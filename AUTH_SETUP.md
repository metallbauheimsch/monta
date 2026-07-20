# MONTA Auth – Einrichtung

Keine Secrets in dieses Repository. Service-Role nur in Supabase (Dashboard / Edge Functions).

## Rollout-Reihenfolge (verbindlich)

A. `supabase_patch_auth_foundation.sql` im SQL Editor ausführen  
B. Stöhr registriert sich in MONTA (`stoehr@metallbau-heimsch.de`) und bestätigt die E-Mail  
C. Bootstrap-SQL (auskommentierter Block in der Foundation-Datei) ausführen → Admin aktiv  
D. Anmeldung und Benutzerverwaltung prüfen  
E. `supabase_patch_auth_lockdown.sql` ausführen  
F. anon-/pending-/active-Zugriff erneut prüfen  

Zusätzlich (falls noch offen): frühere Struktur-Patches und Realtime.

## Edge Function

Siehe `supabase/functions/admin-users/README.md`.

```bash
supabase functions deploy admin-users
```

## Supabase Dashboard – Auth-Einstellungen (manuell)

### Authentication → Providers → Email

- Enable Email provider
- **Confirm email**: eingeschaltet
- Secure email change: empfohlen

### Authentication → Providers → Email → Password

- Mindestlänge: **mindestens 12** (Dashboard / Auth Settings)
- Zusätzlich greifen die Frontend-Regeln (Groß-/Kleinbuchstabe, Zahl, Sonderzeichen)
- **Leaked password protection** (Have I Been Pwned), sofern im Tarif verfügbar: einschalten

### Authentication → URL Configuration

Site URL (Produktion), z. B.:

- `https://<dein-vercel-projekt>.vercel.app`

Redirect URLs (Whitelist), mindestens:

- `http://localhost:5173/**` (Vite lokal; Port ggf. anpassen)
- `http://127.0.0.1:5173/**`
- `https://<dein-vercel-projekt>.vercel.app/**`

Für Passwort-Reset und E-Mail-Bestätigung dieselben Origins.

### Authentication → Email Templates

- Confirm signup / Reset password prüfen (Absender, Links)
- In diesem Sprint **keine** zusätzlichen Fach-Benachrichtigungen (Baugruppe/Bestellung)

### API Keys

Im Frontend nur:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Niemals `service_role` in `.env` der Web-App oder im Git.

## Umgebungsvariablen (Web-App)

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Lokal: `.env` / `.env.local` (steht in `.gitignore`).
