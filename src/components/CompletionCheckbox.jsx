import { useState } from "react";

/**
 * Bewusste Abschluss-Freigabe (TB/Prüfung oder Lager).
 * Aktivieren nur nach Bestätigung; Deaktivieren ohne Extra-Dialog.
 */
export default function CompletionCheckbox({
  label,
  checked,
  onToggle,
  confirmMessage,
}) {
  const [busy, setBusy] = useState(false);

  async function handleChange(e) {
    const next = e.target.checked;
    if (next && confirmMessage && !window.confirm(confirmMessage)) {
      return;
    }
    setBusy(true);
    try {
      await onToggle?.(next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <label className={"checkboxLine completionLine" + (checked ? " completionDone" : "")}>
      <input
        type="checkbox"
        checked={Boolean(checked)}
        disabled={busy}
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
  );
}
