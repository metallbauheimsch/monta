import { useState } from "react";
import { useAuth } from "../../auth/AuthContext";

export default function AccessPending() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const email = profile?.email || user?.email || "";

  async function checkStatus() {
    setBusy(true);
    try {
      await refreshProfile();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="authPage">
      <div className="authCard">
        <p className="authStatusText">Ihr Benutzerkonto wartet auf Freigabe.</p>
        <p className="hint">{email}</p>
        <div className="form">
          <button type="button" onClick={checkStatus} disabled={busy}>
            {busy ? "…" : "Status erneut prüfen"}
          </button>
          <button type="button" className="ghost" onClick={() => signOut()}>
            Abmelden
          </button>
        </div>
      </div>
    </div>
  );
}
