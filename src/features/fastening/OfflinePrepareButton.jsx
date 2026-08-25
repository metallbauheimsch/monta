import { useEffect, useState } from "react";
import { buildSnapshot, snapshotMatchesProject, offlinePrepareButtonLabel } from "../../services/offlineSnapshotBuilder";
import { saveSnapshot, loadSnapshot } from "../../services/offlineSnapshot";
import { prepareOfflineShell, isOfflinePrepareSuccessful } from "../../services/offlineShell";

export function formatOfflineTimestamp(iso) {
  try {
    return new Date(iso).toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/**
 * "Offline-Modus vorbereiten" (Sprint: Lager-Offline-Praxis, GPT-Review-
 * Korrektur "Offline-Startgarantie", Praxiskorrektur "Offline-Status nach
 * Reiterwechsel"): speichert einen strukturierten, zum jetzigen Zeitpunkt
 * eingefrorenen Projekt-Snapshot lokal auf diesem Gerät (IndexedDB, siehe
 * services/offlineSnapshot.js) UND stellt zusätzlich sicher, dass die
 * komplette App-Shell offline startfähig ist (siehe services/
 * offlineShell.js) - keine Supabase-Schreiboperation, kein Sync zurück,
 * kein automatisches Auslösen bei 100 %. Bewusst nur EIN Snapshot je
 * Gerät: ein erneutes Vorbereiten ersetzt kontrolliert den vorherigen
 * Stand (siehe offlineSnapshotBuilder.js).
 *
 * Praxiskorrektur: der Vorbereitet-Status ist NICHT nur temporärer
 * React-State, sondern wird beim Mounten aus dem gespeicherten Snapshot
 * (IndexedDB) geladen und bleibt dadurch auch nach einem Reiterwechsel
 * sichtbar. "Offline vorbereitet" (Online-Zustand, Snapshot vorhanden) ist
 * bewusst NICHT dasselbe wie "OFFLINE" (siehe OfflineApp.jsx - der
 * tatsächliche Offline-Start) - unterschiedliche Formulierung, damit
 * niemand annimmt, gerade offline zu arbeiten, obwohl MONTA weiterhin live
 * läuft. Ein Reiterwechsel liest hier nur (useEffect beim Mounten), er
 * verändert/erzeugt/löscht den Snapshot nie.
 */
export default function OfflinePrepareButton({ project, items, structureRows }) {
  const [savedSnapshotMeta, setSavedSnapshotMeta] = useState(null); // { preparedAt, projectId } | null
  const [metaLoaded, setMetaLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    loadSnapshot()
      .then((snap) => {
        if (cancelled) return;
        setSavedSnapshotMeta(snap ? { preparedAt: snap.preparedAt, projectId: snap.projectId } : null);
      })
      .finally(() => {
        if (!cancelled) setMetaLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const hasMatchingSnapshot = snapshotMatchesProject(savedSnapshotMeta, project?.id);

  async function handlePrepare() {
    setBusy(true);
    setError(null);

    let snapshot = null;
    try {
      snapshot = buildSnapshot({ project, items, structureRows });
    } catch (err) {
      setError(err?.message || "Projekt-Snapshot konnte nicht erstellt werden.");
      setBusy(false);
      return;
    }

    let snapshotOk = false;
    let shellOk = false;
    let errorMessage = null;

    try {
      await saveSnapshot(snapshot);
      snapshotOk = true;
    } catch (err) {
      errorMessage = `Projekt-Snapshot konnte nicht gespeichert werden: ${err?.message || "unbekannter Fehler"}.`;
    }

    if (snapshotOk) {
      try {
        await prepareOfflineShell();
        shellOk = true;
      } catch (err) {
        errorMessage =
          `Der Snapshot wurde gespeichert, die App kann aber möglicherweise nicht vollständig ` +
          `offline starten (${err?.message || "unbekannter Fehler"}). Bitte online bleiben und ` +
          `erneut versuchen - WLAN/Hotspot noch NICHT ausschalten.`;
      }
    }

    if (isOfflinePrepareSuccessful({ snapshotOk, shellOk })) {
      setSavedSnapshotMeta({ preparedAt: snapshot.preparedAt, projectId: snapshot.projectId });
    } else {
      setError(errorMessage);
    }
    setBusy(false);
  }

  return (
    <div className="offlinePrepare noPrint">
      {hasMatchingSnapshot && (
        <p className="hint offlinePrepareOk">
          ✓ Offline vorbereitet · Stand: {formatOfflineTimestamp(savedSnapshotMeta.preparedAt)}
        </p>
      )}
      <button
        type="button"
        className="ghost"
        onClick={handlePrepare}
        disabled={busy || !project?.id || !metaLoaded}
      >
        {busy ? "…" : offlinePrepareButtonLabel(hasMatchingSnapshot)}
      </button>
      {error && <p className="hint dangerText">{error}</p>}
    </div>
  );
}
