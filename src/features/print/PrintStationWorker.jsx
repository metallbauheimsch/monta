import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../services/supabaseClient";
import {
  claimPrintJob,
  finishPrintJob,
  getOrCreateDeviceId,
  isSilentPrintMode,
  isThisDeviceActiveStation,
  loadActivePrintStation,
  loadPrintJobs,
} from "../../services/printStation";

/**
 * Läuft nur auf dem aktivierten Druckstations-Gerät.
 * Beansprucht pending Jobs atomar und öffnet den Browser-Druckdialog.
 */
export default function PrintStationWorker({ enabled, projects, onOpenPrintJob }) {
  const [station, setStation] = useState(null);
  const processing = useRef(false);

  const refreshStation = useCallback(async () => {
    const s = await loadActivePrintStation();
    setStation(s);
    return s;
  }, []);

  const processPending = useCallback(async () => {
    if (!enabled || processing.current) return;
    const s = await refreshStation();
    if (!isThisDeviceActiveStation(s)) return;

    processing.current = true;
    try {
      const jobs = await loadPrintJobs(20);
      const pending = jobs.filter((j) => j.status === "pending");
      for (const job of pending) {
        let claimed;
        try {
          claimed = await claimPrintJob(job.id);
        } catch {
          continue;
        }
        if (!claimed) continue;

        const project = projects.find((p) => p.id === claimed.project_id);
        if (!project) {
          await finishPrintJob(claimed.id, false, "Projekt nicht gefunden");
          continue;
        }

        // Druckansicht öffnen / Callback an App
        if (typeof onOpenPrintJob === "function") {
          onOpenPrintJob({ projectId: claimed.project_id, baugruppe: claimed.baugruppe });
        }

        // Kurz warten, damit die Ansicht gerendert wird
        await new Promise((r) => setTimeout(r, 600));

        const silent = isSilentPrintMode();
        window.print();

        if (silent) {
          await finishPrintJob(claimed.id, true);
        } else {
          const ok = window.confirm("Wurde die Liste erfolgreich gedruckt?");
          await finishPrintJob(claimed.id, ok, ok ? null : "Druck nicht bestätigt");
        }
      }
    } finally {
      processing.current = false;
    }
  }, [enabled, projects, onOpenPrintJob, refreshStation]);

  useEffect(() => {
    if (!enabled || !supabase) return undefined;
    refreshStation();
    processPending();

    const channel = supabase
      .channel("monta-print-jobs")
      .on("postgres_changes", { event: "*", schema: "public", table: "print_jobs" }, () => {
        processPending();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "print_station_config" }, () => {
        refreshStation();
      })
      .subscribe();

    const poll = setInterval(() => {
      if (document.visibilityState === "visible") processPending();
    }, 20000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [enabled, processPending, refreshStation]);

  if (!enabled || !isThisDeviceActiveStation(station)) return null;

  return (
    <div className="printStationBanner noPrint">
      Druckstation aktiv · Gerät {getOrCreateDeviceId().slice(0, 8)}…
    </div>
  );
}
