import { useState } from "react";

/**
 * Bewusste Abschluss-Freigabe (TB/Prüfung oder Lager).
 * Aktivieren nur nach Bestätigung; Deaktivieren ohne Extra-Dialog.
 *
 * Bestätigung als im Seiteninhalt sichtbare Einblendung (kein
 * window.confirm): native Browser-Dialoge können durch Browser-/
 * Webview-Einstellungen unterdrückt werden, ohne dass das erkennbar ist -
 * die Aktion würde dann unbemerkt sofort ausgeführt oder blockiert.
 */
export default function CompletionCheckbox({
  label,
  checked,
  onToggle,
  confirmMessage,
}) {
  const [busy, setBusy] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState(false);

  async function commit(next) {
    setBusy(true);
    try {
      await onToggle?.(next);
    } finally {
      setBusy(false);
    }
  }

  function handleChange(e) {
    const next = e.target.checked;
    if (next && confirmMessage) {
      setPendingConfirm(true);
      return;
    }
    commit(next);
  }

  function handleConfirm() {
    setPendingConfirm(false);
    commit(true);
  }

  function handleCancel() {
    setPendingConfirm(false);
  }

  return (
    <div className="completionWrap">
      <label className={"checkboxLine completionLine" + (checked ? " completionDone" : "")}>
        <input
          type="checkbox"
          checked={Boolean(checked)}
          disabled={busy || pendingConfirm}
          onChange={handleChange}
        />
        {checked ? (
          <>
            <span>{label}</span>
            <span className="completionBadge">Abgeschlossen</span>
          </>
        ) : (
          <span>{label}</span>
        )}
      </label>
      {pendingConfirm && (
        <div className="completionConfirm">
          <span>{confirmMessage}</span>
          <div className="completionConfirmButtons">
            <button type="button" className="ghost" onClick={handleCancel}>
              Abbrechen
            </button>
            <button type="button" onClick={handleConfirm}>
              Bestätigen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
