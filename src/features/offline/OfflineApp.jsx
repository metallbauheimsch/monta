import Shell from "../../components/Shell";
import PrintView from "../fastening/PrintView";
import { formatOfflineTimestamp } from "../fastening/OfflinePrepareButton";
import { OFFLINE_STATE } from "../../services/offlineState";

/**
 * Read-only Offline-Ansicht (Sprint: Lager-Offline-Praxis). Wird von
 * App.jsx ANSTELLE von AuthProvider/App gerendert, wenn das Gerät beim
 * Start offline ist (siehe App.jsx, unterster Abschnitt) - berührt damit
 * nie den bestehenden Online-Auth-Lifecycle (AuthContext.jsx läuft in
 * diesem Zweig gar nicht erst an).
 *
 * Zeigt den zuletzt vorbereiteten Projekt-Snapshot über die bestehende
 * PrintView (Suche, Sortierung, Baugruppe→Bauteil-Gruppierung) - keine
 * zweite Offline-Druck-App. PrintView führt ohnehin keine
 * Schreiboperationen aus, ist also bereits vollständig read-only.
 */
export default function OfflineApp({ state, snapshot }) {
  if (state !== OFFLINE_STATE.OFFLINE_WITH_SNAPSHOT || !snapshot) {
    return (
      <Shell compact>
        <div className="card">
          <h2>Keine Internetverbindung</h2>
          <p>Auf diesem Gerät wurde noch kein Projekt für den Offline-Modus vorbereitet.</p>
          <p className="hint">
            Bitte kurz mit WLAN/Hotspot verbinden und in der Druckansicht „Offline-Modus
            vorbereiten“ wählen.
          </p>
        </div>
      </Shell>
    );
  }

  const project = {
    id: snapshot.projectId,
    nr: snapshot.projectNr,
    name: snapshot.projectShortLabel,
    baugruppe: snapshot.projectBaugruppe,
    zeichnung: snapshot.projectZeichnung,
  };

  return (
    <Shell compact>
      <div className="offlineBanner">
        OFFLINE · {snapshot.projectNr} {snapshot.projectShortLabel} · Stand:{" "}
        {formatOfflineTimestamp(snapshot.preparedAt)}
      </div>
      <PrintView
        project={project}
        baugruppe={null}
        items={snapshot.items}
        projectItems={snapshot.items}
        structureRows={snapshot.structureRows}
        offline
      />
    </Shell>
  );
}
