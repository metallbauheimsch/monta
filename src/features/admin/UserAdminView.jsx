import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../services/supabaseClient";
import { useAuth } from "../../auth/AuthContext";

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

export default function UserAdminView({ onBack }) {
  const { user, profile, invokeAdminUsers, isAdmin } = useAuth();
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("pending");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

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
              <th>Registriert am</th>
              <th>Freigegeben am</th>
              <th>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7}>Keine Benutzer in diesem Filter.</td>
              </tr>
            )}
            {filtered.map((row) => {
              const busy = busyId === row.user_id;
              return (
                <tr key={row.user_id}>
                  <td>{row.display_name || "–"}</td>
                  <td>{row.email}</td>
                  <td>{statusLabel(row.status)}</td>
                  <td>{row.role === "admin" ? "Administrator" : "Benutzer"}</td>
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
