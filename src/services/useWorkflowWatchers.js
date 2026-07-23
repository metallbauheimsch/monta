import { useEffect, useRef } from "react";
import { baugruppeStatus } from "../utils/helpers";
import { parseEinbauort } from "../utils/structure";
import { notifyAllItemsOrdered, nextEventCycle } from "./workflowNotifications";
import { enqueuePrintJob, nextPrintCycle } from "./printStation";

function statusMaps(projects, items) {
  const byBaugruppe = {};
  const byProject = {};
  for (const p of projects || []) {
    const own = (items || []).filter((i) => i.project_id === p.id);
    byProject[p.id] = baugruppeStatus(own).key;
    const byBg = {};
    for (const i of own) {
      const { baugruppe } = parseEinbauort(i.einbauort, p.baugruppe);
      if (!baugruppe) continue;
      if (!byBg[baugruppe]) byBg[baugruppe] = [];
      byBg[baugruppe].push(i);
    }
    for (const [bg, list] of Object.entries(byBg)) {
      byBaugruppe[`${p.id}|${bg}`] = baugruppeStatus(list).key;
    }
  }
  return { byBaugruppe, byProject };
}

/**
 * Projektweit: alle Positionen bestellt → eine Mail.
 * Je Baugruppe: montagebereit → Druckjob.
 */
export function useWorkflowWatchers({ enabled, projects, items, userId }) {
  const seeded = useRef(false);
  const prevBg = useRef({});
  const prevProject = useRef({});
  const busy = useRef(false);

  useEffect(() => {
    if (!enabled) {
      seeded.current = false;
      prevBg.current = {};
      prevProject.current = {};
      return;
    }
    if (busy.current) return;

    async function run() {
      busy.current = true;
      try {
        const { byBaugruppe, byProject } = statusMaps(projects, items);

        if (!seeded.current) {
          prevBg.current = byBaugruppe;
          prevProject.current = byProject;
          seeded.current = true;
          return;
        }

        for (const [projectId, status] of Object.entries(byProject)) {
          const before = prevProject.current[projectId];
          if (before === status) continue;
          const project = projects.find((p) => p.id === projectId);
          if (!project) continue;
          if (status === "bestellt" && before && before !== "bestellt" && before !== "bereit") {
            const cycle = await nextEventCycle("all_items_ordered", projectId, "__project__");
            await notifyAllItemsOrdered({
              project,
              baugruppe: "Gesamtprojekt",
              cycle,
            });
          }
        }

        for (const [key, status] of Object.entries(byBaugruppe)) {
          const before = prevBg.current[key];
          if (before === status) continue;
          const [projectId, baugruppe] = key.split("|");
          const project = projects.find((p) => p.id === projectId);
          if (!project || !baugruppe) continue;
          if (status === "bereit" && before && before !== "bereit") {
            const cycle = await nextPrintCycle(projectId, baugruppe);
            await enqueuePrintJob({ projectId, baugruppe, cycle });
          }
        }

        prevBg.current = byBaugruppe;
        prevProject.current = byProject;
      } finally {
        busy.current = false;
      }
    }

    run();
  }, [enabled, projects, items, userId]);
}
