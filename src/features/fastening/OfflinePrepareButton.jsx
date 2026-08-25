import { useState } from "react";
import { buildSnapshot } from "../../services/offlineSnapshotBuilder";
import { saveSnapshot } from "../../services/offlineSnapshot";

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
 * "Offline-Modus vorbereiten" (Sprint: Lager-Offline-Praxis): speichert
 * einen strukturierten, zum jetzigen Zeitpunkt eingefrorenen Projekt-
 * Snapshot lokal auf diesem Gerät (IndexedDB, siehe
 * services/offlineSnapshot.js) - keine Supabase-Schreiboperation, kein
 * Sync zurück, kein automatisches Auslösen bei 100 %. Bewusst nur EIN
 * Snapshot je Gerät: ein erneutes Vorbereiten ersetzt kontrolliert den
 * vorherigen Stand (siehe offlineSnapshotBuilder.js).
 */
export default function OfflinePrepareButton({ project, items, structureRows }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null); // { preparedAt } | { error } | null

  async function handlePrepare() {
    setBusy(true);
    setResult(null);
    try {
      const snapshot = buildSnapshot({ project, items, structureRows });
      await saveSnapshot(snapshot);
      setResult({ preparedAt: snapshot.preparedAt });
    } catch (err) {
      setResult({ error: err?.message || "Offline-Modus konnte nicht vorbereitet werden." });
    } finally {
      setBusy(false);
    }
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
