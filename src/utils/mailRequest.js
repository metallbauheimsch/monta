// "Anfrage per Mail": HTML-Tabelle in die Zwischenablage (für Outlook
// Strg+V), Klartext als Fallback, danach mailto öffnen.
const RECIPIENT_EMAIL = "vertrieb@schrauben-jaeger.de";
const MAX_MAILTO_LENGTH = 1800;

function padRight(text, width) {
  const s = String(text ?? "");
  return s.length >= width ? s : s + " ".repeat(width - s.length);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildMaterialTableText(rows) {
  const headers = ["Bezeichnung", "Größe", "Länge", "Ausführung", "Menge"];
  const cells = rows.map((r) => [
    r.bezeichnung || "",
    r.groesse || "",
    r.laenge || "",
    r.oberflaeche || "",
    String(r.menge ?? ""),
  ]);
  const widths = headers.map((h, idx) =>
    Math.max(h.length, ...cells.map((c) => String(c[idx] ?? "").length)) + 2
  );
  const line = (cols) => cols.map((c, idx) => padRight(c, widths[idx])).join("").trimEnd();
  return [line(headers), ...cells.map(line)].join("\n");
}

// Grundformat der gesamten Lieferantenmail (Praxis-Sprint: Formatkorrektur) -
// durchgehend Calibri 12pt, für Anrede/Einleitung/Tabelle/Signatur
// gleichermaßen, als Inline-Style auf jedem Element wiederholt (robust für
// Outlooks Word-Rendering-Engine, die eingebettete Stylesheets/Klassen
// unzuverlässig anwendet).
const MAIL_FONT_STYLE = "font-family:Calibri,Arial,sans-serif;font-size:12pt;";

// Kompakte HTML-Tabelle mit Inline-Styles für Outlook (Rahmen, Kopf hellgrau).
export function buildMaterialTableHtml(rows) {
  const headers = ["Bezeichnung", "Größe", "Länge", "Ausführung", "Menge"];
  const thStyle = `border:1px solid #999;padding:6px 8px;background:#eeeeee;font-weight:700;text-align:left;${MAIL_FONT_STYLE}`;
  const tdStyle = `border:1px solid #999;padding:6px 8px;text-align:left;${MAIL_FONT_STYLE}`;
  const head = headers.map((h) => `<th style="${thStyle}">${escapeHtml(h)}</th>`).join("");
  const body = rows
    .map((r) => {
      const cells = [
        r.bezeichnung || "",
        r.groesse || "",
        r.laenge || "",
        r.oberflaeche || "",
        String(r.menge ?? ""),
      ];
      return `<tr>${cells.map((c) => `<td style="${tdStyle}">${escapeHtml(c)}</td>`).join("")}</tr>`;
    })
    .join("");
  return (
    `<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;${MAIL_FONT_STYLE}">` +
    `<thead><tr>${head}</tr></thead>` +
    `<tbody>${body}</tbody>` +
    `</table>`
  );
}

// Telefonnummer exakt vorgegeben (Praxis-Sprint: Formatkorrektur) - genau
// zwei Leerzeichen zwischen "Fon" und "+49", Nummerngruppierung
// "711 755 171". Zentral definiert, damit Plain-Text und HTML garantiert
// denselben Wert verwenden.
const PHONE_LINE = "Fon  +49 711 755 171";
// HTML collapst mehrfache Leerzeichen - dieselbe Telefonnummer mit
// geschützten Leerzeichen, damit beide Doppelabstände auch in Outlook
// sichtbar bleiben.
const PHONE_LINE_HTML = "Fon&nbsp;&nbsp;+49 711 755 171";

// Formaler Anfragetext an den Schraubenhändler (Praxis-Sprint) - exakt
// vorgegeben, gilt einheitlich für Ein- UND Mehrprojekt-Anfrage (kein
// zweiter Text, keine internen MONTA-Formulierungen in der Lieferantenmail).
// Leerzeilen zwischen den Signaturblöcken sind fachlich gewollt und exakt
// vorgegeben (Formatkorrektur nach GPT-Code-Review).
export function buildMailBody({ tableText, includeTable }) {
  const lines = ["Sehr geehrte Damen und Herren,", "", "Bitte bieten Sie mir an", ""];
  if (includeTable && tableText) {
    lines.push(tableText, "");
  } else {
    lines.push("(Tabelle bitte hier einfügen – sie wurde in die Zwischenablage kopiert.)", "");
  }
  lines.push(
    "Mit freundlichen Grüßen",
    "",
    "Moritz Stöhr",
    "Geschäftsführer",
    "",
    "metallbau HEIMSCH GmbH",
    "Julius-Hölder-Straße 10",
    "70597 Stuttgart",
    PHONE_LINE,
    "",
    "Amtsgericht Stuttgart HRB 225939",
    "Ust. ID DE 814207772",
    "Geschäftsführer:",
    "B.Eng. Moritz Stöhr",
    "",
    "info@metallbau-heimsch.de",
    "www.metallbau-heimsch.de/"
  );
  return lines.join("\n");
}

/**
 * Vollständige Lieferantenmail als robustes, Outlook-taugliches HTML
 * (Praxis-Sprint: Formatkorrektur) - dieselbe sichtbare Absatzstruktur wie
 * buildMailBody(), durchgehend Calibri 12pt (Anrede/Einleitung/Tabelle/
 * Signatur). Jede Zeile ein eigenes <div> (kein <p>, das in Outlook
 * zusätzliche Absatzabstände erzeugt); Leerzeilen als
 * "<div>&nbsp;</div>" (zuverlässiger als eine leere Zeile in Outlooks
 * Word-Rendering-Engine). E-Mail/Website als echte <a>-Links.
 */
export function buildMailBodyHtml({ tableHtml }) {
  const line = (text) => `<div style="${MAIL_FONT_STYLE}">${escapeHtml(text)}</div>`;
  const blank = () => `<div style="${MAIL_FONT_STYLE}">&nbsp;</div>`;
  const link = (href, text) =>
    `<div style="${MAIL_FONT_STYLE}"><a href="${href}" style="${MAIL_FONT_STYLE}color:inherit;text-decoration:underline;">${escapeHtml(
      text
    )}</a></div>`;

  return (
    `<div style="${MAIL_FONT_STYLE}">` +
    line("Sehr geehrte Damen und Herren,") +
    blank() +
    line("Bitte bieten Sie mir an") +
    blank() +
    (tableHtml || "") +
    blank() +
    line("Mit freundlichen Grüßen") +
    blank() +
    line("Moritz Stöhr") +
    line("Geschäftsführer") +
    blank() +
    line("metallbau HEIMSCH GmbH") +
    line("Julius-Hölder-Straße 10") +
    line("70597 Stuttgart") +
    `<div style="${MAIL_FONT_STYLE}">${PHONE_LINE_HTML}</div>` +
    blank() +
    line("Amtsgericht Stuttgart HRB 225939") +
    line("Ust. ID DE 814207772") +
    line("Geschäftsführer:") +
    line("B.Eng. Moritz Stöhr") +
    blank() +
    link("mailto:info@metallbau-heimsch.de", "info@metallbau-heimsch.de") +
    link("http://www.metallbau-heimsch.de/", "www.metallbau-heimsch.de/") +
    `</div>`
  );
}

/** Betreff für eine oder mehrere Baustellen (Praxis-Sprint: Mehrprojekt-Anfrage). */
export function buildMailSubject(projectLabels) {
  const labels = (Array.isArray(projectLabels) ? projectLabels : [projectLabels]).filter(Boolean);
  if (labels.length <= 1) return `Anfrage BV ${labels[0] || ""}`.trim();
  return `Anfrage BV ${labels.join(", ")}`.trim();
}

export function buildMailtoRequest({ projectName, projectLabels, rows, includeTable = true }) {
  const subject = buildMailSubject(projectLabels || projectName);
  const table = buildMaterialTableText(rows);
  const body = buildMailBody({ tableText: table, includeTable });
  const url = `mailto:${RECIPIENT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return { url, tooLong: url.length > MAX_MAILTO_LENGTH, subject, table };
}

async function copyTableToClipboard(html, plain) {
  if (navigator.clipboard?.write && window.ClipboardItem) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([plain], { type: "text/plain" }),
        }),
      ]);
      return true;
    } catch {
      // weiter mit text/plain
    }
  }
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(plain);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

function pasteHint() {
  const mobile = window.matchMedia("(max-width: 760px)").matches;
  return mobile
    ? "Tabelle wurde kopiert.\nBitte in die Mail einfügen."
    : "Tabelle wurde kopiert.\nBitte mit Strg+V in Outlook einfügen.";
}

export function openMailClient(url) {
  const link = document.createElement("a");
  link.href = url;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 1) vollständige Mail (Anrede/Einleitung/Tabelle/Signatur, Calibri 12pt)
//    als text/html + text/plain in die Zwischenablage  2) mailto öffnen
// (Praxis-Sprint: Formatkorrektur - vorher wurde nur die Tabelle kopiert,
// jetzt die komplette, fertig formatierte Lieferantenmail, damit sie 1:1
// in Outlook eingefügt werden kann). `projectLabels` (Mehrprojekt-Anfrage)
// ist optional - ohne Angabe verhält sich der Betreff wie bisher anhand
// von `projectName`.
export async function prepareAndOpenMailRequest({ projectName, projectLabels, rows }) {
  const tableHtml = buildMaterialTableHtml(rows);
  const tableText = buildMaterialTableText(rows);
  const fullHtml = buildMailBodyHtml({ tableHtml });
  const fullPlain = buildMailBody({ tableText, includeTable: true });
  const copied = await copyTableToClipboard(fullHtml, fullPlain);

  let { url, tooLong } = buildMailtoRequest({
    projectName,
    projectLabels,
    rows,
    includeTable: true,
  });
  if (tooLong) {
    ({ url, tooLong } = buildMailtoRequest({
      projectName,
      projectLabels,
      rows,
      includeTable: false,
    }));
  }
  if (tooLong) {
    return {
      ok: false,
      error:
        "Die Anfrage enthält zu viele Positionen für eine E-Mail. Bitte die Anfrage aufteilen oder weniger Positionen auswählen.",
    };
  }

  openMailClient(url);
  if (copied) {
    // Kurzer Delay, damit das Mailprogramm den Fokus übernehmen kann,
    // bevor der Hinweis erscheint.
    setTimeout(() => alert(pasteHint()), 300);
  } else {
    alert(
      "Die Tabelle konnte nicht automatisch kopiert werden.\nBitte die Klartext-Tabelle in der Mail verwenden oder die Positionen manuell übernehmen."
    );
  }
  return { ok: true };
}
