// Supabase Edge Function: workflow-notifications
// Deploy: supabase functions deploy workflow-notifications
//
// Secrets:
//   MAIL_PROVIDER=resend
//   MAIL_API_KEY=<anbieter-key>
//   MAIL_FROM=MONTA <noreply@deine-domain.de>
//   (+ hosted SUPABASE_URL / ANON / SERVICE_ROLE)
//
// Empfänger werden NUR serverseitig aus event_type bestimmt.
// Atomarer Claim: pending → processing (verhindert Doppelmail bei parallelen Aufrufen).
// Historische Typen baugruppe_created / cart_items_added: nicht mehr versenden.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_TYPES = new Set([
  "tb_pruefung_completed",
  "lager_completed",
  "all_items_ordered",
  // historisch (werden nicht mehr versendet, nur geclaimt/abgeschlossen)
  "baugruppe_created",
  "cart_items_added",
]);

const ACTIVE_TYPES = new Set([
  "tb_pruefung_completed",
  "lager_completed",
  "all_items_ordered",
]);

const RECIPIENT_BY_TYPE = {
  tb_pruefung_completed: "sautter@metallbau-heimsch.de",
  lager_completed: "stoehr@metallbau-heimsch.de",
  all_items_ordered: "sautter@metallbau-heimsch.de",
};

// Deep-Link-Ziel je Ereignistyp (Praxis-Sprint): der jeweils nächste
// fachliche Arbeitsschritt aus Sicht des Empfängers, siehe Mailtexte
// unten. Nur projektweite Reiter (aus utils/tabs.js PROJECT_WIDE_TAB_ORDER,
// hier dupliziert da Deno-Funktionen ohne Frontend-Build laufen) - "tb"
// benötigt zusätzlich eine Baugruppe/ein Bauteil und ist deshalb kein
// gültiges Mail-Deep-Link-Ziel.
const DEEP_LINK_TAB_BY_TYPE = {
  tb_pruefung_completed: "material", // TB/Prüfung fertig -> Lager vorbereiten
  lager_completed: "bestellliste", // "wir müssen einkaufen"
  all_items_ordered: "material", // "Viel Spaß beim Einräumen"
};

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sendMailResend({ apiKey, from, to, subject, text }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, text }),
  });
  if (!res.ok) {
    await res.text().catch(() => "");
    throw new Error(`Mailversand fehlgeschlagen (${res.status}).`);
  }
  return true;
}

async function sendMail(opts) {
  const provider = (Deno.env.get("MAIL_PROVIDER") || "resend").toLowerCase();
  const apiKey = Deno.env.get("MAIL_API_KEY");
  const from = Deno.env.get("MAIL_FROM");
  if (!apiKey || !from) {
    throw new Error("Maildienst ist nicht konfiguriert.");
  }
  if (provider === "resend") {
    return sendMailResend({ apiKey, from, ...opts });
  }
  throw new Error(`Unbekannter MAIL_PROVIDER.`);
}

// Deep-Link-Zeile (Praxis-Sprint): nur wenn APP_URL als Secret gesetzt ist -
// sonst bleibt der bisherige Mailtext unverändert (kein Absturz, kein
// erratener Link). Keine bestehenden Mailtexte werden inhaltlich verändert,
// die Zeile wird nur angehängt.
function deepLinkLine(eventType, projectId) {
  const appUrl = Deno.env.get("APP_URL");
  const tab = DEEP_LINK_TAB_BY_TYPE[eventType];
  if (!appUrl || !projectId || !tab) return "";
  return `\nDirekt zu MONTA: ${appUrl.replace(/\/$/, "")}/?project=${projectId}&tab=${tab}\n`;
}

function buildMail(eventType, payload, _baugruppeField, projectId) {
  const p = payload || {};
  const projectName = p.project_name || "Projekt";
  const link = deepLinkLine(eventType, projectId);

  if (eventType === "tb_pruefung_completed") {
    return {
      subject: `MONTA – TB/Prüfung abgeschlossen – ${projectName}`,
      text:
        `Mahlzeit Tom,\n\n` +
        `du bist an der Reihe! Die technische Bearbeitung und Prüfung für das Projekt „${projectName}“ ist abgeschlossen.\n\n` +
        `Lass den Paternoster wackeln. 😄\n` +
        link +
        `\nMONTA\n`,
    };
  }

  if (eventType === "lager_completed") {
    return {
      subject: `MONTA – Lagerprüfung abgeschlossen – ${projectName}`,
      text:
        `Servus Moritz,\n\n` +
        `du bist an der Reihe! Das Lager für das Projekt „${projectName}“ ist geprüft.\n\n` +
        `Ich habe das Lager ausgeräumt – wir müssen einkaufen. 😄\n` +
        link +
        `\nMONTA\n`,
    };
  }

  if (eventType === "all_items_ordered") {
    return {
      subject: `MONTA – Bestellung abgeschlossen – ${projectName}`,
      text:
        `Servus Tom,\n\n` +
        `ich war mal wieder shoppen! Die Bestellung für das Projekt „${projectName}“ ist raus.\n\n` +
        `Viel Spaß beim Einräumen. 😄\n` +
        link +
        `\nMONTA\n`,
    };
  }

  throw new Error("Unbekannter Ereignistyp.");
}

/** Atomar: nur pending (oder abgelaufenes processing) → processing. */
async function claimEvent(admin, id) {
  const staleIso = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const nowIso = new Date().toISOString();

  let { data } = await admin
    .from("notification_events")
    .update({ status: "processing", processing_at: nowIso })
    .eq("id", id)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();

  if (!data) {
    ({ data } = await admin
      .from("notification_events")
      .update({ status: "processing", processing_at: nowIso })
      .eq("id", id)
      .eq("status", "processing")
      .lt("processing_at", staleIso)
      .select("*")
      .maybeSingle());
  }

  if (!data) return null;

  const nextAttempts = (data.attempts || 0) + 1;
  await admin
    .from("notification_events")
    .update({ attempts: nextAttempts })
    .eq("id", id)
    .eq("status", "processing");

  return { ...data, attempts: nextAttempts };
}

async function markSent(admin, id) {
  await admin
    .from("notification_events")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      last_error: null,
      processing_at: null,
    })
    .eq("id", id)
    .eq("status", "processing");
}

async function markFailed(admin, id, message) {
  await admin
    .from("notification_events")
    .update({
      status: "failed",
      last_error: message || "E-Mail konnte nicht gesendet werden.",
      processing_at: null,
    })
    .eq("id", id)
    .eq("status", "processing");
}

/** Historische Typen: ohne Mail als erledigt markieren (kein Versand mehr). */
async function markRetired(admin, id) {
  await admin
    .from("notification_events")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      last_error: "Ereignistyp nicht mehr aktiv (kein Versand).",
      processing_at: null,
    })
    .eq("id", id)
    .eq("status", "processing");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceKey) {
      return json(500, { error: "Serverkonfiguration unvollständig." });
    }

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return json(401, { error: "Nicht angemeldet." });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return json(401, { error: "Sitzung ungültig." });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: profile } = await admin
      .from("user_profiles")
      .select("status")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (!profile || profile.status !== "active") {
      return json(403, { error: "Kein aktiver MONTA-Zugang." });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return json(400, { error: "Ungültige Anfrage." });
    }

    const ids = Array.isArray(body?.event_ids)
      ? body.event_ids.filter(Boolean)
      : body?.event_id
        ? [body.event_id]
        : [];

    if (!ids.length) {
      return json(400, { error: "Keine Ereignisse angegeben." });
    }

    const results = [];

    for (const id of ids) {
      const ev = await claimEvent(admin, id);
      if (!ev) {
        results.push({ id, ok: true, skipped: true });
        continue;
      }
      if (!ALLOWED_TYPES.has(ev.event_type)) {
        await markFailed(admin, id, "Ungültiger Ereignistyp.");
        results.push({ id, ok: false, error: "Ungültiger Ereignistyp." });
        continue;
      }
      if (!ACTIVE_TYPES.has(ev.event_type)) {
        await markRetired(admin, id);
        results.push({ id, ok: true, retired: true });
        continue;
      }

      const recipient = RECIPIENT_BY_TYPE[ev.event_type];
      if (!recipient) {
        await markFailed(admin, id, "Ungültiger Ereignistyp.");
        results.push({ id, ok: false, error: "Ungültiger Ereignistyp." });
        continue;
      }
      try {
        const mail = buildMail(ev.event_type, ev.payload, ev.baugruppe, ev.project_id);
        await sendMail({ to: recipient, subject: mail.subject, text: mail.text });
        await markSent(admin, id);
        results.push({ id, ok: true });
      } catch {
        console.error("workflow-notifications send failed");
        await markFailed(admin, id);
        results.push({ id, ok: false, error: "E-Mail konnte nicht gesendet werden." });
      }
    }

    return json(200, { results });
  } catch {
    console.error("workflow-notifications error");
    return json(500, { error: "Unerwarteter Fehler." });
  }
});
