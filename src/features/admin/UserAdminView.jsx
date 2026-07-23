import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../services/supabaseClient";
import { useAuth } from "../../auth/AuthContext";
import {
  loadActivePrintStation,
  loadPrintJobs,
  loadPrintStationSettings,
  resetPrintJob,
  setPrintStationUser,
  adminCompletePrintJob,
} from "../../services/printStation";

const FILTERS = [
  { id: "pending", label: "Wartet auf Freigabe" },
  { id: "active", label: "Aktiv" },
  { id: "blocked", label: "Gesperrt" },
  { id: "all", label: "Alle" },
];

function formatDate(v) {
  if (!v) return "–";
  try {
    return new Date(v).toLocaleString("de-DE");
  } catch {
    return "–";
  }
}

function statusLabel(s) {
  if (s === "pending") return "Wartet";
  if (s === "active") return "Aktiv";
  if (s === "blocked") return "Gesperrt";
  return s || "–";
}

export default function UserAdminView({ onBack, onPrintStationUserChanged }) {
  const { user, profile, invokeAdminUsers, isAdmin } = useAuth();
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("pending");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [stationUserId, setStationUserId] = useState(null);
  const [activeStation, setActiveStation] = useState(null);
  const [printJobs, setPrintJobs] = useState([]);

  const loadUsers = useCallback(async () => {
    if (!supabase || !isAdmin) return;
    setError("");
    const { data, error: err } = await supabase
      .from("user_profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (err) {
      setError(err.message || "Benutzerliste konnte nicht geladen werden.");
      return;
    }
    setRows(data || []);
  }, [isAdmin]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const reloadPrintMeta = useCallback(async () => {
    const [s, st, jobs] = await Promise.all([
      loadPrintStationSettings(),
      loadActivePrintStation(),
      loadPrintJobs(12),
    ]);
    setStationUserId(s?.user_id || null);
    setActiveStation(st);
    setPrintJobs(jobs);
  }, []);

  useEffect(() => {
    if (isAdmin) reloadPrintMeta();
  }, [isAdmin, reloadPrintMeta]);

  const activeUsers = useMemo(
    () => rows.filter((r) => r.status === "active"),
    [rows]
  );

  const activeAdminCount = useMemo(
    () => rows.filter((r) => r.status === "active" && r.role === "admin").length,
    [rows]
  );

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((r) => r.status === filter);
  }, [rows, filter]);

  function isSelf(row) {
    return row.user_id === user?.id;
  }

  function isLastAdmin(row) {
    return row.status === "active" && row.role === "admin" && activeAdminCount <= 1;
  }

  async function patchProfile(userId, patch) {
    setBusyId(userId);
    setError("");
    try {
      const { error: err } = await supabase.from("user_profiles").update(patch).eq("user_id", userId);
      if (err) throw err;
      await loadUsers();
    } catch (err) {
      setError(err?.message || "Änderung fehlgeschlagen.");
    } finally {
      setBusyId(null);
    }
  }

  async function approve(row) {
    await patchProfile(row.user_id, {
      status: "active",
      approved_at: new Date().toISOString(),
      approved_by: user.id,
      blocked_at: null,
      blocked_by: null,
    });
  }

  async function block(row) {
    if (isSelf(row)) {
      setError("Sie können sich nicht selbst sperren.");
      return;
    }
    if (isLastAdmin(row)) {
      setError("Der letzte Administrator kann nicht gesperrt werden.");
      return;
    }
    if (!confirm(`Benutzer ${row.email} wirklich sperren?`)) return;
    await patchProfile(row.user_id, {
      status: "blocked",
      blocked_at: new Date().toISOString(),
      blocked_by: user.id,
    });
  }

  async function unblock(row) {
    await patchProfile(row.user_id, {
      status: "active",
      approved_at: row.approved_at || new Date().toISOString(),
      approved_by: row.approved_by || user.id,
      blocked_at: null,
      blocked_by: null,
    });
  }

  async function makeAdmin(row) {
    await patchProfile(row.user_id, { role: "admin" });
  }

  async function removeAdmin(row) {
    if (isSelf(row) && isLastAdmin(row)) {
      setError("Der letzte Administrator kann seine Rolle nicht entfernen.");
      return;
    }
    if (isLastAdmin(row)) {
      setError("Der letzte Administrator kann seine Rolle nicht verlieren.");
      return;
    }
    if (!confirm(`Administratorrechte von ${row.email} wirklich entfernen?`)) return;
    await patchProfile(row.user_id, { role: "user" });
  }

  async function toggleFullModuleAccess(row) {
    const next = !row.full_module_access;
    await patchProfile(row.user_id, { full_module_access: next });
  }

  async function deleteUser(row) {
    if (isSelf(row)) {
      setError("Sie können sich nicht selbst löschen.");
      return;
    }
    if (isLastAdmin(row)) {
      setError("Der letzte Administrator kann nicht gelöscht werden.");
      return;
    }
    if (
      !confirm(
        "Benutzer wirklich dauerhaft löschen? Dieser Vorgang kann nicht rückgängig gemacht werden."
      )
    ) {
      return;
    }
    setBusyId(row.user_id);
    setError("");
    try {
      await invokeAdminUsers("delete-user", { user_id: row.user_id });
      await loadUsers();
    } catch (err) {
      setError(err?.message || "Löschen fehlgeschlagen.");
    } finally {
      setBusyId(null);
    }
  }

  if (!isAdmin) {
    return (
      <div className="card">
        <p>Keine Berechtigung.</p>
        <button type="button" className="ghost" onClick={onBack}>Zurück</button>
      </div>
    );
  }

  return (
    <div>
      <div className="row noPrint" style={{ marginBottom: 8 }}>
        <div>
          <h2>Benutzerverwaltung</h2>
          <p className="hint">Angemeldet als {profile?.display_name || profile?.email}</p>
        </div>
        <button type="button" className="ghost" onClick={onBack} style={{ width: "auto" }}>
          Zurück zu MONTA
        </button>
      </div>

      {error && <p className="authError">{error}</p>}

      <div className="card noPrint">
        <h3>Druckstations-Benutzer</h3>
        <p className="hint">Nur ein Benutzer. Das konkrete Gerät aktiviert dieser Nutzer selbst am PC.</p>
        <label className="radioLine">
          <input
            type="radio"
            name="printStationUser"
            checked={!stationUserId}
            onChange={async () => {
              if (
                !confirm(
                  "Druckstations-Benutzer wirklich ändern? Die bisherige Druckstation wird deaktiviert."
                )
              ) {
                return;
              }
                try {
                await setPrintStationUser(null);
                setStationUserId(null);
                onPrintStationUserChanged?.(null);
                await reloadPrintMeta();
              } catch (err) {
                setError(err?.message || "Speichern fehlgeschlagen.");
              }
            }}
          />
          Keine Druckstation
        </label>
        {activeUsers.map((r) => (
          <label className="radioLine" key={r.user_id}>
            <input
              type="radio"
              name="printStationUser"
              checked={stationUserId === r.user_id}
              onChange={async () => {
                if (stationUserId === r.user_id) return;
                if (
                  !confirm(
                    "Druckstations-Benutzer wirklich ändern? Die bisherige Druckstation wird deaktiviert."
                  )
                ) {
                  return;
                }
                try {
                  await setPrintStationUser(r.user_id);
                  setStationUserId(r.user_id);
                  onPrintStationUserChanged?.(r.user_id);
                  await reloadPrintMeta();
                } catch (err) {
                  setError(err?.message || "Speichern fehlgeschlagen.");
                }
              }}
            />
            {r.display_name || "–"} – {r.email}
          </label>
        ))}
        <p className="hint" style={{ marginTop: 8 }}>
          Aktive Station:{" "}
          {activeStation
            ? `${activeStation.device_name || "Gerät"} · Kontakt ${
                activeStation.last_seen_at
                  ? new Date(activeStation.last_seen_at).toLocaleString("de-DE")
                  : "–"
              }`
            : "keine"}
        </p>
        <h4>Druckaufträge</h4>
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
              {printJobs.length === 0 && (
                <tr>
                  <td colSpan={4}>Keine Aufträge</td>
                </tr>
              )}
              {printJobs.map((j) => (
                <tr key={j.id}>
                  <td>{j.baugruppe}</td>
                  <td>{j.status}</td>
                  <td>{formatDate(j.created_at)}</td>
                  <td>
                    <div className="adminActions">
                      <button type="button" className="ghost" onClick={() => resetPrintJob(j.id).then(reloadPrintMeta)}>
                        Zurücksetzen
                      </button>
                      {j.status !== "printed" && (
                        <button type="button" className="ghost" onClick={() => adminCompletePrintJob(j.id).then(reloadPrintMeta)}>
                          Erledigt
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

      <div className="tabs noPrint">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={filter === f.id ? "active" : ""}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="tableWrap card">
        <table className="editTable">
          <thead>
            <tr>
              <th>Name</th>
              <th>E-Mail</th>
              <th>Status</th>
              <th>Rolle</th>
              <th>Vollzugriff</th>
              <th>Registriert am</th>
              <th>Freigegeben am</th>
              <th>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8}>Keine Benutzer in diesem Filter.</td>
              </tr>
            )}
            {filtered.map((row) => {
              const busy = busyId === row.user_id;
              const fullAccess =
                row.role === "admin" || Boolean(row.full_module_access);
              return (
                <tr key={row.user_id}>
                  <td>{row.display_name || "–"}</td>
                  <td>{row.email}</td>
                  <td>{statusLabel(row.status)}</td>
                  <td>{row.role === "admin" ? "Administrator" : "Benutzer"}</td>
                  <td>{fullAccess ? "Ja" : "Nein"}</td>
                  <td>{formatDate(row.created_at)}</td>
                  <td>{formatDate(row.approved_at)}</td>
                  <td>
                    <div className="adminActions">
                      {row.status === "pending" && (
                        <>
                          <button type="button" disabled={busy} onClick={() => approve(row)}>
                            Freigeben
                          </button>
                          <button type="button" className="danger" disabled={busy} onClick={() => deleteUser(row)}>
                            Ablehnen / löschen
                          </button>
                        </>
                      )}
                      {row.status === "active" && (
                        <>
                          <button type="button" className="ghost" disabled={busy || isSelf(row)} onClick={() => block(row)}>
                            Sperren
                          </button>
                          {row.role !== "admin" ? (
                            <button type="button" className="ghost" disabled={busy} onClick={() => makeAdmin(row)}>
                              Zum Administrator
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="ghost"
                              disabled={busy || isLastAdmin(row)}
                              onClick={() => removeAdmin(row)}
                            >
                              Adminrechte entfernen
                            </button>
                          )}
                          {row.role !== "admin" && (
                            <button
                              type="button"
                              className="ghost"
                              disabled={busy}
                              onClick={() => toggleFullModuleAccess(row)}
                            >
                              {row.full_module_access
                                ? "Vollzugriff entfernen"
                                : "Vollzugriff auf TB und Prüfung"}
                            </button>
                          )}
                          <button
                            type="button"
                            className="danger"
                            disabled={busy || isSelf(row) || isLastAdmin(row)}
                            onClick={() => deleteUser(row)}
                          >
                            Löschen
                          </button>
                        </>
                      )}
                      {row.status === "blocked" && (
                        <>
                          <button type="button" disabled={busy} onClick={() => unblock(row)}>
                            Entsperren
                          </button>
                          <button type="button" className="danger" disabled={busy || isSelf(row)} onClick={() => deleteUser(row)}>
                            Löschen
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
