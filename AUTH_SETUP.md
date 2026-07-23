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

Fach-Mails laufen über Edge Function `workflow-notifications` (siehe
`supabase/functions/workflow-notifications/README.md`), nicht über Auth-Templates.

Aktive Auslöser: TB/Prüfung abgeschlossen, Lagerprüfung abgeschlossen,
vollständig bestellt. Keine Mail beim Anlegen einer Baugruppe.

### Vollzugriff (Reiter mobil)

Administratoren sehen alle Reiter auf allen Geräten.

Zusätzliches Profilfeld `full_module_access` (Admin setzt in der
Benutzerverwaltung als „Vollzugriff auf TB und Prüfung“): erlaubt TB und
Prüfung auch auf Tablet/Smartphone für ausgewählte normale Nutzer (z. B. Sautter).

Falls die Spalte in der Live-DB fehlt: vorhandenen Patch
`supabase_patch_workflow_completion.sql` ausführen (nicht neu anlegen).

Während das Profil noch lädt, werden TB/Prüfung nicht vorschnell ausgeblendet.

### Angemeldet bleiben

Auf der Anmeldeseite (Standard: aktiv). Steuert nur den Speicherort der
Supabase-Session (localStorage vs. sessionStorage). Keine Passwortspeicherung.

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

Lokal: `.env.local` anlegen (Vorlage: `.env.example`, steht in `.gitignore`).

**Wichtig:** Ohne `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY` verbindet
die lokale App sich nicht mit Supabase. Dann fehlen die Live-Projektdaten
(Vercel hat dieselben Variablen in den Project Settings).

Schritte:

1. In Vercel dieselben beiden Variablennamen notieren (Werte nicht ins Repo).
2. Lokal `.env.local` mit denselben Werten füllen.
3. Dev-Server neu starten (`npm run dev`).
4. Mit demselben aktiven Benutzer anmelden.

Niemals Keys in Changelog, Chat-Logs oder Git speichern.
