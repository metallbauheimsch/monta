import { getSupabaseFunctionsUrl, supabase } from "./supabaseClient";

export const MAIL_RECIPIENTS = {
  tb_pruefung_completed: "sautter@metallbau-heimsch.de",
  lager_completed: "stoehr@metallbau-heimsch.de",
  all_items_ordered: "sautter@metallbau-heimsch.de",
};

async function invokeWorkflow(eventIds) {
  if (!supabase || !eventIds?.length) return;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return;
  const base = getSupabaseFunctionsUrl();
  if (!base) return;
  try {
    const res = await fetch(`${base}/workflow-notifications`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ event_ids: eventIds }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.error("MONTA: Workflow-Mail:", body?.error || res.status);
    }
  } catch (err) {
    console.error("MONTA: Workflow-Mail Aufruf fehlgeschlagen.", err?.message || err);
  }
}

export async function enqueueNotification({
  eventType,
  eventKey,
  recipient,
  projectId,
  baugruppe,
  materialItemId,
  payload,
}) {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  const row = {
    event_type: eventType,
    event_key: eventKey,
    recipient,
    project_id: projectId || null,
    baugruppe: baugruppe || null,
    material_item_id: materialItemId || null,
    payload: payload || {},
    status: "pending",
    created_by: user?.id || null,
  };
  const { data, error } = await supabase
    .from("notification_events")
    .insert(row)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") return null;
    console.error("MONTA: notification_events Insert:", error.message);
    return null;
  }
  return data?.id || null;
}

export async function enqueueAndSend(events) {
  const ids = [];
  for (const ev of events) {
    const id = await enqueueNotification(ev);
    if (id) ids.push(id);
  }
  if (ids.length) await invokeWorkflow(ids);
  return ids;
}

export async function notifyTbPruefungCompleted({ project, baugruppe, cycle }) {
  const key = `tb_pruefung_completed:${project.id}:${baugruppe}:${cycle}`;
  return enqueueAndSend([
    {
      eventType: "tb_pruefung_completed",
      eventKey: key,
      recipient: MAIL_RECIPIENTS.tb_pruefung_completed,
      projectId: project.id,
      baugruppe,
      payload: {
        project_name: `${project.nr} ${project.name}`.trim(),
        baugruppe,
      },
    },
  ]);
}

export async function notifyLagerCompleted({ project, baugruppe, cycle }) {
  const key = `lager_completed:${project.id}:${baugruppe}:${cycle}`;
  return enqueueAndSend([
    {
      eventType: "lager_completed",
      eventKey: key,
      recipient: MAIL_RECIPIENTS.lager_completed,
      projectId: project.id,
      baugruppe,
      payload: {
        project_name: `${project.nr} ${project.name}`.trim(),
        baugruppe,
      },
    },
  ]);
}

export async function notifyAllItemsOrdered({ project, baugruppe, cycle }) {
  const scope = baugruppe || "Gesamtprojekt";
  const key = `all_items_ordered:${project.id}:project:${cycle}`;
  return enqueueAndSend([
    {
      eventType: "all_items_ordered",
      eventKey: key,
      recipient: MAIL_RECIPIENTS.all_items_ordered,
      projectId: project.id,
      baugruppe: scope,
      payload: {
        project_name: `${project.nr} ${project.name}`.trim(),
        baugruppe: scope,
        project_wide: true,
      },
    },
  ]);
}

export async function nextEventCycle(eventType, projectId, baugruppe) {
  if (!supabase) return 1;
  const { data, error } = await supabase.rpc("next_notification_cycle", {
    p_type: eventType,
    p_project: projectId,
    p_baugruppe: baugruppe,
  });
  if (error) {
    console.error("MONTA: event cycle:", error.message);
    return Math.floor(Date.now() / 1000) % 1000000000;
  }
  return data || 1;
}
