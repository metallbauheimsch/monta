// Supabase Edge Function: admin-users
// Deploy: supabase functions deploy admin-users --no-verify-jwt=false
// Secrets: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (automatisch in hosted Functions)
//
// Aktionen: delete-user (Pflicht), approve-user, block-user (optional; Freigabe/Sperre auch per RLS möglich)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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
    const callerId = userData.user.id;

    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: callerProfile, error: profileErr } = await adminClient
      .from("user_profiles")
      .select("user_id, status, role")
      .eq("user_id", callerId)
      .maybeSingle();

    if (profileErr || !callerProfile) {
      return json(403, { error: "Kein Profil gefunden." });
    }
    if (callerProfile.status !== "active" || callerProfile.role !== "admin") {
      return json(403, { error: "Keine Administratorrechte." });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return json(400, { error: "Ungültige Anfrage." });
    }

    const action = String(body?.action || "");
    const targetId = String(body?.user_id || "");

    if (!targetId) {
      return json(400, { error: "Benutzer fehlt." });
    }

    async function loadTarget() {
      const { data, error } = await adminClient
        .from("user_profiles")
        .select("*")
        .eq("user_id", targetId)
        .maybeSingle();
      if (error || !data) return null;
      return data;
    }

    async function countOtherActiveAdmins(excludeId) {
      const { count, error } = await adminClient
        .from("user_profiles")
        .select("*", { count: "exact", head: true })
        .eq("status", "active")
        .eq("role", "admin")
        .neq("user_id", excludeId);
      if (error) throw error;
      return count || 0;
    }

    if (action === "delete-user") {
      if (targetId === callerId) {
        return json(400, { error: "Sie können sich nicht selbst löschen." });
      }
      const target = await loadTarget();
      if (!target) {
        return json(404, { error: "Benutzer nicht gefunden." });
      }
      if (target.status === "active" && target.role === "admin") {
        const others = await countOtherActiveAdmins(targetId);
        if (others < 1) {
          return json(400, { error: "Der letzte Administrator kann nicht gelöscht werden." });
        }
      }
      const { error: delErr } = await adminClient.auth.admin.deleteUser(targetId);
      if (delErr) {
        console.error("admin-users delete failed");
        return json(500, { error: "Benutzer konnte nicht gelöscht werden." });
      }
      return json(200, { ok: true });
    }

    if (action === "approve-user") {
      const { error } = await adminClient
        .from("user_profiles")
        .update({
          status: "active",
          approved_at: new Date().toISOString(),
          approved_by: callerId,
          blocked_at: null,
          blocked_by: null,
        })
        .eq("user_id", targetId);
      if (error) return json(500, { error: "Freigabe fehlgeschlagen." });
      return json(200, { ok: true });
    }

    if (action === "block-user") {
      if (targetId === callerId) {
        return json(400, { error: "Sie können sich nicht selbst sperren." });
      }
      const target = await loadTarget();
      if (!target) return json(404, { error: "Benutzer nicht gefunden." });
      if (target.status === "active" && target.role === "admin") {
        const others = await countOtherActiveAdmins(targetId);
        if (others < 1) {
          return json(400, { error: "Der letzte Administrator kann nicht gesperrt werden." });
        }
      }
      const { error } = await adminClient
        .from("user_profiles")
        .update({
          status: "blocked",
          blocked_at: new Date().toISOString(),
          blocked_by: callerId,
        })
        .eq("user_id", targetId);
      if (error) return json(500, { error: "Sperre fehlgeschlagen." });
      return json(200, { ok: true });
    }

    return json(400, { error: "Unbekannte Aktion." });
  } catch (err) {
    console.error("admin-users error");
    return json(500, { error: "Unerwarteter Fehler." });
  }
});
