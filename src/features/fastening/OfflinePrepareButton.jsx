import { useState } from "react";
import { buildSnapshot } from "../../services/offlineSnapshotBuilder";
import { saveSnapshot } from "../../services/offlineSnapshot";
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
 * Korrektur "Offline-Startgarantie"): speichert einen strukturierten,
 * zum jetzigen Zeitpunkt eingefrorenen Projekt-Snapshot lokal auf diesem
 * Gerät (IndexedDB, siehe services/offlineSnapshot.js) UND stellt
 * zusätzlich sicher, dass die komplette App-Shell offline startfähig ist
 * (siehe services/offlineShell.js) - keine Supabase-Schreiboperation, kein
 * Sync zurück, kein automatisches Auslösen bei 100 %. Bewusst nur EIN
 * Snapshot je Gerät: ein erneutes Vorbereiten ersetzt kontrolliert den
 * vorherigen Stand (siehe offlineSnapshotBuilder.js).
 *
 * "WLAN/Hotspot kann jetzt ausgeschaltet werden" erscheint NUR, wenn
 * BEIDES erfolgreich war (isOfflinePrepareSuccessful) - schlägt die
 * App-Shell-Vorbereitung fehl, bleibt ein bereits gespeicherter Snapshot
 * bestehen, aber die Meldung macht klar, dass ein Offline-Start deshalb
 * noch nicht sicher garantiert ist.
 */
export default function OfflinePrepareButton({ project, items, structureRows }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null); // { preparedAt } | { error } | null

  async function handlePrepare() {
    setBusy(true);
    setResult(null);

    let snapshot = null;
    try {
      snapshot = buildSnapshot({ project, items, structureRows });
    } catch (err) {
      setResult({ error: err?.message || "Projekt-Snapshot konnte nicht erstellt werden." });
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
          `Der Projekt-Snapshot wurde gespeichert, die App kann aber möglicherweise nicht ` +
          `vollständig offline starten (${err?.message || "unbekannter Fehler"}). Bitte online ` +
          `bleiben und „Offline-Modus vorbereiten“ erneut versuchen - WLAN/Hotspot noch NICHT ausschalten.`;
      }
    }

    if (isOfflinePrepareSuccessful({ snapshotOk, shellOk })) {
      setResult({ preparedAt: snapshot.preparedAt });
    } else {
      setResult({ error: errorMessage });
    }
    setBusy(false);
  }

  return (
    <div className="offlinePrepare noPrint">
      <button type="button" className="ghost" onClick={handlePrepare} disabled={busy || !project?.id}>
        {busy ? "…" : "Offline-Modus vorbereiten"}
      </button>
      {result?.preparedAt && (
        <p className="hint offlinePrepareOk">
          Offline-Stand gespeichert: {formatOfflineTimestamp(result.preparedAt)}. WLAN/Hotspot kann
          jetzt ausgeschaltet werden.
        </p>
      )}
      {result?.error && <p className="hint dangerText">{result.error}</p>}
    </div>
  );
}
