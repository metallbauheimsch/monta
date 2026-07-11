import { useState } from "react";
import { articleKey, groupBy, baugruppeStatus, remainingQty } from "../../utils/helpers";
import { parseEinbauort } from "../../utils/structure";
import { getOrderStatus, setOrderBestellt, setOrderGeliefert, computeDeliveryStatus } from "./orderStatus";

// Warenkorb (früher "Bestellliste", Sprint 5 Erweiterung #3/#6, umbenannt in
// Sprint 6): gleicher Aufbau wie die Druckansicht - immer das komplette
// Projekt, sortiert Baugruppe -> Artikel, keine ausklappbaren Bereiche. Pro
// Baugruppe steht eine Checkbox "Bestellung erfolgt" (schaltet den Status
// von Offen auf Bestellt), pro Artikel Größe/Länge/Ausführung/Bestellmenge +
// Herkunft (Bauteil – Menge). Nur Positionen mit Restmenge > 0 erscheinen
// (automatisch aus "bereit" - der Warenkorb enthält ausschließlich die
// Fehlmengen aus dem Lager).
//
// Sprint 6: zusätzlich pro Position ein einfacher Bestell-/Lieferstatus
// (Checkbox "Bestellt" + Feld "Gelieferte Menge") - siehe orderStatus.js.

function deliveryBadgeClass(key) {
  if (key === "vollstaendig") return "green";
  if (key === "nicht_bestellt") return "red";
  return "yellow";
}

function formatArticleLine(r) {
  const groesseLaenge = `${r.groesse}${r.laenge ? ` x ${r.laenge}` : ""}`.trim();
  const teile = [r.bezeichnung, groesseLaenge].filter(Boolean).join(" ");
  return r.oberflaeche ? `${teile}, ${r.oberflaeche}` : teile;
}

// Baut den einfachen Text für "Warenkorb kopieren" - keine Tabelle, kein
// HTML, keine technischen IDs, damit er sich direkt in eine E-Mail an den
// Schraubenhändler einfügen lässt.
function buildClipboardText(project, baugruppeNames, rowsByBaugruppe) {
  const blocks = baugruppeNames.map((bg) => {
    const lines = [`Baugruppe: ${bg}`, ...rowsByBaugruppe[bg].map((r) => `${r.bestellmenge} Stk. ${formatArticleLine(r)}`)];
    return lines.join("\n");
  });
  return [`Projekt: ${project.name}`, "", blocks.join("\n\n")].join("\n").trim();
}

async function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // Fallback für ältere/nicht-sichere Kontexte ohne Clipboard-API.
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

export default function EinkaufView({ items, project, isBaugruppeBestellt, setBaugruppeBestellt }) {
  const [copyFeedback, setCopyFeedback] = useState(false);
  // orderStatus.js liest direkt aus localStorage - dieser Zähler erzwingt
  // nach jeder Änderung ein Neu-Rendern (analog zum Registry-Muster in
  // ProjectDetail.jsx).
  const [, forceUpdate] = useState(0);
  const bump = () => forceUpdate((n) => n + 1);

  const enriched = items.map((i) => ({
    ...i,
    ...parseEinbauort(i.einbauort, project?.baugruppe),
    _rest: remainingQty(i),
  }));
  const missing = enriched.filter((i) => i._rest > 0);
  const byBaugruppe = groupBy(missing, (i) => i.baugruppe);
  const baugruppeNames = Object.keys(byBaugruppe).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const rowsByBaugruppe = {};
  baugruppeNames.forEach((bg) => {
    const articleGroups = groupBy(byBaugruppe[bg], articleKey);
    rowsByBaugruppe[bg] = Object.entries(articleGroups)
      .map(([key, arr]) => {
        const first = arr[0];
        const bestellmenge = arr.reduce((s, i) => s + i._rest, 0);
        const herkunft = arr.map((i) => ({ id: i.id, bauteil: i.bauteil, menge: i._rest }));
        return {
          key,
          bezeichnung: first.bezeichnung,
          groesse: first.groesse,
          laenge: first.laenge,
          oberflaeche: first.oberflaeche,
          bestellmenge,
          herkunft,
        };
      })
      .sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true }));
  });

  async function handleCopy() {
    const text = buildClipboardText(project, baugruppeNames, rowsByBaugruppe);
    try {
      await copyToClipboard(text);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2500);
    } catch {
      alert("Kopieren nicht möglich. Bitte Text manuell markieren.");
    }
  }

  function handleBestelltChange(bg, comboKey, checked) {
    setOrderBestellt(project.id, bg, comboKey, checked);
    bump();
  }

  function handleGeliefertChange(bg, comboKey, value) {
    setOrderGeliefert(project.id, bg, comboKey, value);
    bump();
  }

  return (
    <div className="card">
      <div className="row">
        <h2>Warenkorb</h2>
        <button className="ghost" onClick={handleCopy}>Warenkorb kopieren</button>
      </div>
      {copyFeedback && <p className="hint copyFeedback">Warenkorb kopiert</p>}
      <p className="hint">
        Enthält ausschließlich die Fehlmengen aus dem Lager (Bestellmenge = Gesamtmenge − bereits gelegt),
        komplettes Projekt, gruppiert nach Baugruppe und Artikel.
      </p>
      {baugruppeNames.length === 0 && <p>Keine offenen Bestellmengen.</p>}
      {baugruppeNames.map((bg) => {
        const bgAllItems = enriched.filter((i) => i.baugruppe === bg);
        const bestellt = isBaugruppeBestellt?.(project.id, bg) || false;
        const status = baugruppeStatus(bgAllItems, bestellt);

        return (
          <section className="baugruppeSection" key={bg}>
            <div className="row">
              <h3>{status.emoji} {bg}</h3>
              <label className="checkboxLine">
                <input
                  type="checkbox"
                  checked={bestellt}
                  onChange={(e) => setBaugruppeBestellt?.(project.id, bg, e.target.checked)}
                />
                Bestellung erfolgt
              </label>
            </div>
            {rowsByBaugruppe[bg].map((r) => {
              const orderStatus = getOrderStatus(project.id, bg, r.key);
              const delivery = computeDeliveryStatus(r.bestellmenge, orderStatus);
              return (
                <div className="workflowCard" key={r.key}>
                  <div className="row">
                    <b>
                      {r.bezeichnung} {r.groesse}
                      {r.laenge ? `×${r.laenge}` : ""} {r.oberflaeche}
                    </b>
                    <span className="badge yellow">Bestellmenge: {r.bestellmenge}</span>
                  </div>
                  <ul className="simpleList">
                    {r.herkunft.map((h) => (
                      <li key={h.id}>{h.bauteil} – {h.menge}</li>
                    ))}
                  </ul>
                  <div className="orderTracking">
                    <label className="checkboxLine">
                      <input
                        type="checkbox"
                        checked={orderStatus.bestellt}
                        onChange={(e) => handleBestelltChange(bg, r.key, e.target.checked)}
                      />
                      Bestellt
                    </label>
                    <label className="inlineField">
                      Gelieferte Menge
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        value={orderStatus.geliefert}
                        onChange={(e) => handleGeliefertChange(bg, r.key, e.target.value)}
                      />
                    </label>
                    <span className={"badge " + deliveryBadgeClass(delivery.key)}>{delivery.label}</span>
                  </div>
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
