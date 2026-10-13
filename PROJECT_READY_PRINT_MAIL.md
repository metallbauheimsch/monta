# Einmalige Druckmail „Material bereit“ – Aktivierung (Sprint 2C)

Ersetzt die automatische Druckausgabe über die Druckstation durch genau eine
Mail je Projekt an `stoehr@metallbau-heimsch.de` mit einem Link zur
projektweiten Druckansicht. Gedruckt wird danach manuell („Drucken“ in der
Druckansicht).

**Stand im Code:** vollständig vorbereitet, **inaktiv**. Ohne SQL-Patch
existiert die Datenbankfunktion nicht; mit Patch, aber ohne Aktivierung
steht der Schalter auf `enabled = false`. In beiden Fällen entsteht kein
Ereignis, keine Mail, und die bisherigen Druckjobs laufen unverändert.
Beim App-Start wird im inaktiven Zustand nicht nachgefragt; nur wenn ein
Projekt bzw. eine Baugruppe tatsächlich grün wird.

## Funktionsweise

- Auslöser ist ausschließlich die Materialbereitschaft (Projektampel grün),
  nicht die Checkboxen „Lagerprüfung abgeschlossen“ / „Warenkorb
  abgeschlossen“.
- Der Browser meldet nur Kandidaten (Projekt wurde grün bzw. ist beim Laden
  grün). Beim Laden fragt ein Gerät nur nach, wenn es die Druckmail bereits
  einmal als aktiv erkannt hat (lokaler Gerätemerker, wird bei „inaktiv“
  wieder gelöscht). So entsteht im inaktiven Zustand kein Aufruf bei jedem
  App-Start; eine Aktivierung wird beim nächsten Grünwechsel erkannt. Die Datenbankfunktion `request_project_ready_print_mails` prüft
  selbst: Schalter aktiv, Material **frisch** vollständig bereit, Schlüssel
  `project_ready_print:<projekt-id>` noch nicht vorhanden.
- Der Schlüssel hat **keinen Zyklus** und liegt im bestehenden eindeutigen
  Index von `notification_events.event_key`. Je Projekt kann es dadurch
  höchstens ein Ereignis geben, über alle Geräte, Neuladen und spätere
  Statuswechsel hinweg. Melden zwei Geräte gleichzeitig, gewinnt genau ein
  Insert.
- **Bestandsprojekte:** Die Aktivierung markiert in derselben Transaktion
  alle zu diesem Zeitpunkt grünen Projekte dauerhaft mit Status `skipped`.
  Sie erhalten auch nach Rot/Gelb → Grün nie eine automatische Druckmail.
- **Druckstation:** Nach der Aktivierung legt die Datenbank (Trigger auf
  `print_jobs`) keine neuen automatischen Druckjobs mehr an, auch nicht von
  Geräten mit noch altem App-Stand. Der Browser fragt zusätzlich nach und
  erzeugt dann ebenfalls keine. Manuelles Drucken, bestehende Druckjobs,
  Requeue/Reset bleiben unverändert.
- **Fehlschlag:** Die Edge Function markiert einen fehlgeschlagenen Versand
  als `failed` (nie als `sent`). Fehlt `APP_URL`, wird nicht ohne Link
  gesendet, sondern ebenfalls `failed` („APP_URL fehlt …“). `failed` wird nie
  automatisch wiederholt.
  - Hängt ein Ereignis als `pending`, etwa weil der Browser vor dem
    Versandaufruf geschlossen wurde, reicht es der nächste App-Start eines
    Geräts mit erkannter Aktivierung oder der nächste Grünwechsel nach
    (frühestens nach 2 Minuten, nur Ereignisse der aktuellen Aktivierung).
  - Die Edge Function beansprucht atomar, dadurch entsteht kein
    Doppelversand.

## Bekannte Grenze

Der Versand wird von einem geöffneten MONTA-Browser angestoßen. Wird ein
Projekt grün, während kein aktueller App-Stand geöffnet ist, geht die Mail
beim nächsten App-Start eines aktiven Nutzers raus, höchstens einmal. Ein
rein serverseitiger Versand (Datenbank-Trigger mit HTTP-Aufruf) wäre eine
größere Infrastrukturänderung und ist bewusst nicht Teil dieses Schritts.

## Aktivierungsreihenfolge (jede Stufe einzeln freigeben)

Bei jedem **Abbruchpunkt**: nicht weitermachen, Ergebnis melden.

### Stufe 0 – Vorbereitung (nur lesen)

1. Review-Branch fachlich abgenommen (TB-Reiter, Lagerabschluss).
2. **APP_URL prüfen, ohne das Secret auszulesen:**
   - In einer aktuellen MONTA-Workflow-Mail (z. B. „Lagerprüfung
     abgeschlossen“) steht die Zeile „Direkt zu MONTA: <adresse>/?project=…“.
     Die Adresse davor ist der Wert von `APP_URL`.
   - Abgleich mit der **Produktions-Domain** in Vercel (Project → Domains),
     nicht mit einer Preview-URL.
   - Optional `supabase secrets list`. Das zeigt nur Namen und Prüfsummen,
     keine Werte. `APP_URL` muss aufgeführt sein.
   - **Abbruch,** wenn keine Mail die Zeile enthält oder die Adresse nicht
     die Produktions-Domain ist. `APP_URL` muss dann zuerst gesondert
     freigegeben gesetzt werden.
3. Klären, ob noch offene Druckjobs (`pending`) gedruckt werden sollen:
   `select status, count(*) from public.print_jobs group by status;`

### Stufe 1 – SQL-Patch (Struktur, bleibt inaktiv)

1. `supabase_patch_project_ready_print_mail.sql` im SQL Editor ausführen.
2. Prüfen:
   - `select enabled from public.project_ready_print_settings;` → `false`
   - `select count(*) from public.notification_events where event_type = 'project_ready_print';` → `0`
3. **Abbruch** bei Fehlern, z. B. wenn die Spalte `ersetzt_durch` oder die
   Funktion `is_active_user` fehlt.

### Stufe 2 – Edge Function deployen

1. `supabase functions deploy workflow-notifications`
2. Kontrolle: Die bestehenden Mails (TB/Prüfung, Lager, Alle bestellt,
   Warenkorb) funktionieren unverändert. Beim nächsten ohnehin anstehenden
   realen Abschluss die Mail prüfen, keine Testmail erzeugen.
3. **Abbruch,** wenn eine bestehende Mail fehlt oder sich verändert hat.
   Dann den vorherigen Stand der Function erneut deployen.

**Diese Reihenfolge ist zwingend:** Die Edge Function muss vor der
Aktivierung deployed sein. Andernfalls markiert die alte Function ein neues
Ereignis als „Ungültiger Ereignistyp“ (`failed`). Das ist sicher, weil keine
Mail rausgeht, erfordert dann aber einen manuellen Wiederholungsschritt.

### Stufe 3 – Frontend (bleibt inaktiv)

1. Review-Branch nach Freigabe auf `main` mergen und Produktion deployen.
2. Kontrolle: TB-Reiter und Lagerabschluss wie abgenommen. Druckjobs der
   Druckstation laufen weiter wie bisher (Schalter noch `false`).
3. Alle Geräte (Büro-PC, Tablets) einmal neu laden.

### Stufe 4 – Aktivierung (Bestandsmarkierung + Einschalten, atomar)

1. Abschnitt A in `supabase_activate_project_ready_print_mail.sql`
   ausführen: Vorab-Abfragen, Anzahl und Liste der grünen Projekte notieren.
2. Abschnitt B (Transaktion) als Ganzes ausführen.
3. Abschnitt C:
   - `enabled = true`
   - `baseline_count` = Anzahl aus A
   - nur Status `skipped` vorhanden
4. **Abbruch/Rücknahme,** wenn die Zahlen nicht stimmen: Abschnitt D
   (Deaktivieren) ausführen.

### Stufe 5 – Beobachtung

- Beim ersten real grün werdenden Projekt:
  - genau eine Mail an stoehr@,
  - der Link öffnet nach Anmeldung das Projekt im Reiter „Druck“.
- Kontrolle:
  `select status, count(*) from public.notification_events where event_type = 'project_ready_print' group by status;`
- Es entstehen keine neuen `print_jobs`.

## Fehlgeschlagene Zustellung

Abschnitt E in `supabase_activate_project_ready_print_mail.sql`:

1. Ursache in `last_error` lesen.
2. Im Resend-Dashboard sicherstellen, dass die Mail **nicht** zugestellt
   wurde.
3. Ursache beheben.
4. Genau dieses Ereignis gezielt von `failed` auf `pending` setzen.

Der nächste App-Start eines Geräts mit erkannter Aktivierung (oder der
nächste Grünwechsel) sendet es dann genau einmal.

## Rücknahme

Abschnitt D: `enabled = false`.

- Neue Druckmails stoppen sofort.
- Automatische Druckjobs je Baugruppe entstehen danach wieder wie bisher.
- Bestandsmarkierungen und bereits versendete Ereignisse bleiben erhalten.
- Bei Deaktivierung noch `pending` stehende Druckmails werden nicht mehr
  versendet, auch nicht nach einer erneuten Aktivierung.
- Kein Nachdruck: Druckjobs entstehen erst wieder bei künftigen Übergängen
  einer Baugruppe auf grün.
