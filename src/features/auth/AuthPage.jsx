import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { PASSWORD_RULES, passwordMismatch, validatePassword } from "../../auth/passwordRules";
import { getRememberMePreference, setRememberMePreference } from "../../services/supabaseClient";

function PasswordRules({ password }) {
  const p = String(password || "");
  return (
    <ul className="passwordRules">
      {PASSWORD_RULES.map((r) => {
        const ok = p.length > 0 && r.test(p);
        return (
          <li key={r.id} className={ok ? "ruleOk" : ""}>
            {ok ? "✓" : "·"} {r.label}
          </li>
        );
      })}
    </ul>
  );
}

export default function AuthPage() {
  const {
    signIn,
    signUp,
    signOut,
    requestPasswordReset,
    updatePassword,
    recoveryMode,
    setRecoveryMode,
  } = useAuth();

  const [mode, setMode] = useState(recoveryMode ? "reset" : "login");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [rememberMe, setRememberMe] = useState(() => getRememberMePreference());
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (recoveryMode) setMode("reset");
  }, [recoveryMode]);

  function clearFeedback() {
    setError("");
    setMessage("");
  }

  async function handleLogin(e) {
    e.preventDefault();
    clearFeedback();
    setBusy(true);
    try {
      // Präferenz vor signIn setzen, damit Auth-Storage den richtigen Speicher nutzt
      setRememberMePreference(rememberMe);
      await signIn(email, password);
      setPassword("");
    } catch (err) {
      setError(err?.message || "Anmeldung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    clearFeedback();
    if (!String(displayName || "").trim()) {
      setError("Bitte einen Anzeigenamen eingeben.");
      return;
    }
    const { ok, failed } = validatePassword(password);
    if (!ok) {
      setError(failed.join(" · "));
      return;
    }
    if (passwordMismatch(password, confirm)) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }
    setBusy(true);
    try {
      await signUp({ email, password, displayName });
      setPassword("");
      setConfirm("");
      setMessage(
        "Registrierung erfolgreich. Bitte bestätigen Sie Ihre E-Mail-Adresse. Anschließend muss Ihr Konto durch einen Administrator freigegeben werden."
      );
      setMode("login");
    } catch (err) {
      setError(err?.message || "Registrierung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  async function handleForgot(e) {
    e.preventDefault();
    clearFeedback();
    setBusy(true);
    try {
      await requestPasswordReset(email);
    } catch {
      // Neutrale Meldung unabhängig vom Ergebnis
    } finally {
      setBusy(false);
      setMessage(
        "Wenn ein Konto zu dieser E-Mail-Adresse existiert, wurde eine Nachricht zum Zurücksetzen des Passworts versendet."
      );
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    clearFeedback();
    const { ok, failed } = validatePassword(password);
    if (!ok) {
      setError(failed.join(" · "));
      return;
    }
    if (passwordMismatch(password, confirm)) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }
    setBusy(true);
    try {
      await updatePassword(password);
      setPassword("");
      setConfirm("");
      setRecoveryMode(false);
      setMessage("Passwort wurde aktualisiert. Sie können sich jetzt anmelden.");
      setMode("login");
      try {
        await signOut();
      } catch {
        // Anmeldung bleibt möglich
      }    } catch (err) {
      setError(err?.message || "Passwort konnte nicht gesetzt werden.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="authPage">
      <div className="authCard">
        {message && <p className="authMessage">{message}</p>}
        {error && <p className="authError">{error}</p>}

        {mode === "login" && (
          <form className="form" onSubmit={handleLogin}>
            <h2>Anmelden</h2>
            <input
              type="email"
              autoComplete="username"
              placeholder="E-Mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Passwort"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <label className="checkboxLine">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Angemeldet bleiben
            </label>
            <button type="submit" disabled={busy}>{busy ? "…" : "Anmelden"}</button>
            <div className="authLinks">
              <button type="button" className="linkBtn" onClick={() => { clearFeedback(); setMode("forgot"); }}>
                Passwort vergessen
              </button>
              <button type="button" className="linkBtn" onClick={() => { clearFeedback(); setMode("register"); }}>
                Registrieren
              </button>
            </div>
          </form>
        )}

        {mode === "register" && (
          <form className="form" onSubmit={handleRegister}>
            <h2>Registrieren</h2>
            <input
              type="text"
              autoComplete="name"
              placeholder="Anzeigename"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
            <input
              type="email"
              autoComplete="username"
              placeholder="E-Mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              autoComplete="new-password"
              placeholder="Passwort"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <input
              type="password"
              autoComplete="new-password"
              placeholder="Passwort bestätigen"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
            <PasswordRules password={password} />
            <button type="submit" disabled={busy}>{busy ? "…" : "Registrieren"}</button>
            <div className="authLinks">
              <button type="button" className="linkBtn" onClick={() => { clearFeedback(); setMode("login"); }}>
                Zur Anmeldung
              </button>
            </div>
          </form>
        )}

        {mode === "forgot" && (
          <form className="form" onSubmit={handleForgot}>
            <h2>Passwort vergessen</h2>
            <input
              type="email"
              autoComplete="username"
              placeholder="E-Mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="submit" disabled={busy}>{busy ? "…" : "Link senden"}</button>
            <div className="authLinks">
              <button type="button" className="linkBtn" onClick={() => { clearFeedback(); setMode("login"); }}>
                Zur Anmeldung
              </button>
            </div>
          </form>
        )}

        {mode === "reset" && (
          <form className="form" onSubmit={handleReset}>
            <h2>Neues Passwort</h2>
            <input
              type="password"
              autoComplete="new-password"
              placeholder="Neues Passwort"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <input
              type="password"
              autoComplete="new-password"
              placeholder="Passwort bestätigen"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
            <PasswordRules password={password} />
            <button type="submit" disabled={busy}>{busy ? "…" : "Passwort speichern"}</button>
            <div className="authLinks">
              <button
                type="button"
                className="linkBtn"
                onClick={() => {
                  clearFeedback();
                  setRecoveryMode(false);
                  setMode("login");
                }}
              >
                Zur Anmeldung
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
