import { supabase } from "./supabaseClient";

const DEVICE_KEY = "monta_print_device_id_v1";
const SILENT_KEY = "monta_print_silent_mode_v1";

export function getOrCreateDeviceId() {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export function isSilentPrintMode() {
  try {
    return localStorage.getItem(SILENT_KEY) === "1";
  } catch {
    return false;
  }
}

export function setSilentPrintMode(on) {
  try {
    if (on) localStorage.setItem(SILENT_KEY, "1");
    else localStorage.removeItem(SILENT_KEY);
  } catch {
    // ignore
  }
}

export async function loadPrintStationSettings() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("print_station_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (error) {
    console.error("MONTA: print_station_settings:", error.message);
    return null;
  }
  return data;
}

/** Admin: Zuweisung; Trigger setzt updated_* und deaktiviert alte Stationen. */
export async function setPrintStationUser(userId) {
  if (!supabase) throw new Error("Supabase fehlt.");
  const { error } = await supabase
    .from("print_station_settings")
    .update({ user_id: userId })
    .eq("id", 1);
  if (error) throw error;
}

export async function loadActivePrintStation() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("print_station_config")
    .select("*")
    .eq("active", true)
    .maybeSingle();
  if (error) {
    console.error("MONTA: print_station_config:", error.message);
    return null;
  }
  return data;
}

export async function activateThisDevice(deviceName) {
  if (!supabase) throw new Error("Supabase fehlt.");
  const deviceId = getOrCreateDeviceId();
  const { data, error } = await supabase.rpc("activate_print_station", {
    p_device_id: deviceId,
    p_device_name: deviceName || "Druckstation-PC",
  });
  if (error) throw error;
  return data;
}

export async function deactivateThisDevice() {
  if (!supabase) throw new Error("Supabase fehlt.");
  const deviceId = getOrCreateDeviceId();
  const { error } = await supabase.rpc("deactivate_print_station", {
    p_device_id: deviceId,
  });
  if (error) throw error;
}

export async function enqueuePrintJob({ projectId, baugruppe, cycle }) {
  if (!supabase) return null;
  const eventKey = `print_ready:${projectId}:${baugruppe}:${cycle}`;
  const { data, error } = await supabase.rpc("create_print_job", {
    p_project_id: projectId,
    p_baugruppe: baugruppe,
    p_event_key: eventKey,
  });
  if (error) {
    console.error("MONTA: create_print_job:", error.message);
    return null;
  }
  return data;
}

export async function nextPrintCycle(projectId, baugruppe) {
  if (!supabase) return 1;
  const { count, error } = await supabase
    .from("print_jobs")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("baugruppe", baugruppe);
  if (error) return Date.now();
  return (count || 0) + 1;
}

export async function claimPrintJob(jobId) {
  const deviceId = getOrCreateDeviceId();
  const { data, error } = await supabase.rpc("claim_print_job", {
    p_job_id: jobId,
    p_device_id: deviceId,
  });
  if (error) throw error;
  return data;
}

export async function finishPrintJob(jobId, ok, lastError) {
  if (!supabase) return;
  const deviceId = getOrCreateDeviceId();
  if (ok) {
    const { error } = await supabase.rpc("finish_print_job", {
      p_job_id: jobId,
      p_device_id: deviceId,
    });
    if (error) throw error;
  } else {
    const { error } = await supabase.rpc("fail_print_job", {
      p_job_id: jobId,
      p_device_id: deviceId,
      p_error: lastError || "Druck abgebrochen",
    });
    if (error) throw error;
  }
}

export async function resetPrintJob(jobId) {
  if (!supabase) return;
  const { error } = await supabase.rpc("reset_print_job", { p_job_id: jobId });
  if (error) throw error;
}

export async function requeuePrintJob(jobId) {
  if (!supabase) return;
  const deviceId = getOrCreateDeviceId();
  const { error } = await supabase.rpc("requeue_print_job", {
    p_job_id: jobId,
    p_device_id: deviceId,
  });
  if (error) throw error;
}

export async function adminCompletePrintJob(jobId) {
  if (!supabase) return;
  const { error } = await supabase.rpc("admin_complete_print_job", { p_job_id: jobId });
  if (error) throw error;
}

export async function loadPrintJobs(limit = 30) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("print_jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("MONTA: print_jobs:", error.message);
    return [];
  }
  return data || [];
}

export function isThisDeviceActiveStation(station) {
  if (!station?.active) return false;
  return station.device_id === getOrCreateDeviceId();
}
