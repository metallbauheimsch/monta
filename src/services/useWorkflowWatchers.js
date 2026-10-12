import { useEffect, useRef } from "react";
import { baugruppeStatus } from "../utils/helpers";
import { parseEinbauort } from "../utils/structure";
import {
  notifyAllItemsOrdered,
  nextEventCycle,
  requestProjectReadyPrintMails,
} from "./workflowNotifications";
import { enqueuePrintJob, nextPrintCycle } from "./printStation";
import {
  planWorkflowTransitions,
  printJobsAfterReadyMail,
  readyProjectIds,
} from "./workflowTransitions";

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
 * Sprint 2C: Projekt bereit → Kandidat für die einmalige Druckmail
 * (Entscheidung serverseitig, bis zur Aktivierung wirkungslos). Ist die
 * Druckmail aktiv, entfallen die automatischen Druckjobs.
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
          // Sprint 2C: Nachholen beim Laden (z. B. Grünwerden auf einem
          // Gerät mit altem Stand). Der Server sendet höchstens einmal je
          // Projekt und nie für markierte Bestandsprojekte. Bewusst ohne
          // await, damit der bisherige Ablauf (busy) unverändert bleibt.
          const ready = readyProjectIds(byProject);
          if (ready.length) requestProjectReadyPrintMails(ready);
          return;
        }

        const plan = planWorkflowTransitions(
          prevProject.current,
          byProject,
          prevBg.current,
          byBaugruppe
        );

        for (const projectId of plan.allItemsOrdered) {
          const project = projects.find((p) => p.id === projectId);
          if (!project) continue;
          const cycle = await nextEventCycle("all_items_ordered", projectId, "__project__");
          await notifyAllItemsOrdered({
            project,
            baugruppe: "Gesamtprojekt",
            cycle,
          });
        }

        let printJobs = plan.printJobs;
        if (printJobs.length) {
          // Nur wenn ein Druckjob anstünde, muss vorher bekannt sein, ob
          // die Druckmail aktiv ist (dann kein automatischer Druckjob).
          const { active } = await requestProjectReadyPrintMails(plan.readyProjects);
          printJobs = printJobsAfterReadyMail(printJobs, active);
        } else if (plan.readyProjects.length) {
          requestProjectReadyPrintMails(plan.readyProjects);
        }

        for (const { projectId, baugruppe } of printJobs) {
          const project = projects.find((p) => p.id === projectId);
          if (!project || !baugruppe) continue;
          const cycle = await nextPrintCycle(projectId, baugruppe);
          await enqueuePrintJob({ projectId, baugruppe, cycle });
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
