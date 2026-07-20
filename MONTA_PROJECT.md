# MONTA – Projektdokumentation

Interne Web-App für Metallbau Heimsch zur Verwaltung von Befestigungsmaterial
je Projekt. Optimiert ausschließlich für diesen Betrieb, kein Standardprodukt.

Statistiken sind grundsätzlich kein Bestandteil von MONTA.

## Zugang

MONTA ist nicht öffentlich. Zugriff nur nach:

1. Registrierung (E-Mail + Passwort + Anzeigename)
2. E-Mail-Bestätigung
3. Freigabe durch einen Administrator (`status = active`)

Rollen: `user` | `admin`. Status: `pending` | `active` | `blocked`.

Erster Administrator: `stoehr@metallbau-heimsch.de` (manueller SQL-Bootstrap
nach Registrierung, siehe `AUTH_SETUP.md`).

## Datenmodell

Projekt → Baugruppe → Bauteilgruppe (optional) → Bauteil → Materialposition

Zusätzlich: `user_profiles` (Supabase Auth + Freigabe/Rolle).

- `projects`, `material_items`, `project_structure` nur für aktive Nutzer (RLS).
- Bauteilgruppen: Spalte `bauteilgruppe` auf `project_structure`.

## Funktionen (Ist-Stand nach Sicherheits-Sprint)

- Anmeldung / Registrierung / Passwort vergessen / Abmelden
- Warteseite (pending) und Sperrseite (blocked) ohne Projektdaten
- Benutzerverwaltung für Administratoren (Freigeben, Sperren, Löschen, Rollen)
- Freitextsuche, Bauteilgruppen, Mobile ≤1024 px (ohne TB/Prüfung)
- Mehrgeräte-Sync nur nach erfolgreicher Freigabe

## Speicherorte

**Supabase:** Auth, Profile, Projekte, Struktur, Material.

**Lokal:** Session-Token nur über Supabase Auth; manuelle Lagerwerte und
gelernte Bezeichnungen weiterhin lokal. Passwörter werden nicht lokal gespeichert.

## Bekannte Einschränkungen / offene Einrichtung

- SQL-Patches und Dashboard-Auth manuell: siehe `AUTH_SETUP.md`
- Edge Function `admin-users` manuell deployen
- E-Mail-Fachbenachrichtigungen und Druckstation: Folgesprints
