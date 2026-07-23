import { useCallback, useEffect, useState } from "react";
import {
  activateThisDevice,
  deactivateThisDevice,
  getOrCreateDeviceId,
  isSilentPrintMode,
  isThisDeviceActiveStation,
  loadActivePrintStation,
  loadPrintJobs,
  loadPrintStationSettings,
  requeuePrintJob,
  setSilentPrintMode,
  finishPrintJob,
} from "../../services/printStation";

export default function PrintStationPanel({ userId, isAssignedUser }) {
  const [settings, setSettings] = useState(null);
  const [station, setStation] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [deviceName, setDeviceName] = useState("Büro-PC Einkauf");
  const [silent, setSilent] = useState(() => isSilentPrintMode());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const [s, st, j] = await Promise.all([
      loadPrintStationSettings(),
      loadActivePrintStation(),
      loadPrintJobs(15),
    ]);
    setSettings(s);
    setStation(st);
    setJobs(j);
    if (st?.device_name) setDeviceName(st.device_name);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const thisActive = isThisDeviceActiveStation(station);
  const assigned = isAssignedUser || settings?.user_id === userId;

  async function handleActivate() {
    if (!deviceName.trim()) {
      setError("Bitte einen Gerätenamen eingeben.");
      return;
    }
    if (station?.active && station.device_id !== getOrCreateDeviceId()) {
      if (
        !confirm(
          "Es ist bereits eine andere Druckstation aktiv. Wirklich dieses Gerät aktivieren? Die bisherige Station wird deaktiviert."
        )
      ) {
        return;
      }
    }
    setBusy(true);
    setError("");
    try {
      await activateThisDevice(deviceName.trim());
      await reload();
    } catch (err) {
      setError(err?.message || "Aktivierung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeactivate() {
    setBusy(true);
    setError("");
    try {
      await deactivateThisDevice();
      await reload();
    } catch (err) {
      setError(err?.message || "Deaktivierung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  if (!assigned) return null;

  return (
    <div className="card printStationPanel noPrint">
      <h3>Druckstation</h3>
      <p className="hint">
        Nur dieses konkrete Gerät verarbeitet Druckaufträge. Smartphone/Tablet desselben
        Benutzers drucken nicht mit. Stilles Drucken erfordert lokale Windows-/Browser-Einrichtung
        (Ricoh IM C2010).
      </p>
      {error && <p className="authError">{error}</p>}

      {thisActive ? (
        <>
          <p>
            <b>Status:</b> aktiv · {station?.device_name || "Gerät"} · letzter Kontakt{" "}
            {station?.last_seen_at
              ? new Date(station.last_seen_at).toLocaleString("de-DE")
              : "–"}
          </p>
          <button type="button" className="ghost" disabled={busy} onClick={handleDeactivate}>
            Druckstation auf diesem Gerät deaktivieren
          </button>
        </>
      ) : (
        <div className="form">
          <input
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            placeholder="Gerätename, z. B. Büro-PC Einkauf"
          />
          <button type="button" disabled={busy} onClick={handleActivate}>
            Dieses Gerät als Druckstation aktivieren
          </button>
        </div>
      )}

      <label className="checkboxLine" style={{ marginTop: 10 }}>
        <input
          type="checkbox"
          checked={silent}
          onChange={(e) => {
            const on = e.target.checked;
            if (
              on &&
              !confirm(
                "Silent-Modus nur aktivieren, wenn Chrome/Edge und der Ricoh-Drucker lokal für stilles Drucken eingerichtet sind. Sonst Aufträge ohne Bestätigung als gedruckt markieren?"
              )
            ) {
              return;
            }
            setSilent(on);
            setSilentPrintMode(on);
          }}
        />
        Silent-Druckmodus (nur nach lokaler Einrichtung)
      </label>

      <h4 style={{ marginTop: 14 }}>Aufträge</h4>
      <div className="tableWrap">
        <table className="editTable">
          <thead>
            <tr>
              <th>Baugruppe</th>
              <th>Status</th>
              <th>Erstellt</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 && (
              <tr>
                <td colSpan={4}>Keine Aufträge</td>
              </tr>
            )}
            {jobs.map((j) => (
              <tr key={j.id}>
                <td>{j.baugruppe}</td>
                <td>{j.status}</td>
                <td>{new Date(j.created_at).toLocaleString("de-DE")}</td>
                <td>
                    <div className="adminActions">
                      {j.status === "failed" && (
                        <button type="button" className="ghost" onClick={() => requeuePrintJob(j.id).then(reload)}>
                          Erneut einreihen
                        </button>
                      )}
                      {j.status === "claimed" && (
                        <button type="button" className="ghost" onClick={() => finishPrintJob(j.id, true).then(reload)}>
                          Als gedruckt
                        </button>
                      )}
                    </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
