# MONTA – Backlog

Dieses Dokument enthält ausschließlich noch offene Aufgaben.

---

# Priorität A – Pilotversion

## Auth + Workflow in Live-Supabase

Siehe `AUTH_SETUP.md`, `MONTA_NEXT_SPRINT.md`, `PRINT_STATION_SETUP.md`:

1. Auth Foundation → Bootstrap → Lockdown
2. `supabase_patch_workflow_notifications.sql`
3. `supabase_patch_print_station.sql`
4. `supabase_patch_workflow_completion.sql`
5. Edge Functions deployen: `admin-users`, `workflow-notifications`
6. Mail-Secrets (Resend o. ä.) setzen
7. Druckstations-Benutzer zuweisen und PC einrichten
8. Sautter: `full_module_access` in der Benutzerverwaltung setzen
   („Vollzugriff auf TB und Prüfung“; Spalte aus `supabase_patch_workflow_completion.sql`)

## PWA / mobile Installation

- Service Worker / Installationsfluss noch offen

## Live-Test Projektlogik / Korrekturen

- `.env.local` prüfen (gleiche Werte wie Vercel)
- Bauteil duplizieren an Echtdaten (bewusst)
- HV-Drehmoment-Kurzformat
- Hinweisfilter Lager/Warenkorb

---

# Priorität B – Nach Pilotbetrieb

## Nachvollziehbarkeit (bewusst zurückgestellt)

Später: wer Baugruppe/Bestellung/Lieferung/Druckstation – ohne großes Protokoll jetzt.
Keine `created_by`-Pflichtspalten in diesem Stand.

## Lager / Druck / Projekte

- Weitere Schnellfilter, Drucklayouts, Archivsuche

---

# Ideenparkplatz

Vor jeder Umsetzung: einfachste sinnvolle Lösung für Metallbau Heimsch?

---

# Aktueller Fokus

1. Auth- und Workflow-Patches live anwenden
2. Mailanbieter + Edge Functions
3. Druckstation am Büro-PC testen
4. Danach PWA
