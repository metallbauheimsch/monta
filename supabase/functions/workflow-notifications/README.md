# workflow-notifications

Versendet MONTA-Workflow-Mails. Empfänger werden **nur serverseitig** aus
`event_type` bestimmt (Client-Empfänger wird ignoriert).

## Aktive Ereignistypen

| event_type | Empfänger |
|---|---|
| `tb_pruefung_completed` | sautter@metallbau-heimsch.de |
| `lager_completed` | stoehr@metallbau-heimsch.de |
| `all_items_ordered` | sautter@metallbau-heimsch.de |

Historische Typen `baugruppe_created` / `cart_items_added` werden nicht mehr
versendet (ggf. als erledigt ohne Mail abgeschlossen).

## Atomarer Duplikatschutz

Vor dem Versand: `pending` → `processing` (bedingtes Update).
Nur ein paralleler Aufruf gewinnt den Claim.

Abgelaufenes `processing` (>15 Minuten) kann erneut geclaimt werden.

Manueller Wiederanlauf:

```sql
update public.notification_events
set status = 'pending', processing_at = null
where status = 'processing'
  and processing_at < now() - interval '15 minutes';
```

## Secrets / Deploy

```bash
supabase secrets set MAIL_PROVIDER=resend
supabase secrets set MAIL_API_KEY=re_xxxxxxxx
supabase secrets set MAIL_FROM="MONTA <noreply@ihre-domain.de>"
supabase functions deploy workflow-notifications
```

Niemals Service-Role oder API-Keys in die Web-App legen.
