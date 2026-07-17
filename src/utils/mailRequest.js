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

// Kompakte HTML-Tabelle mit Inline-Styles für Outlook (Rahmen, Kopf hellgrau).
export function buildMaterialTableHtml(rows) {
  const headers = ["Bezeichnung", "Größe", "Länge", "Ausführung", "Menge"];
  const thStyle =
    "border:1px solid #999;padding:6px 8px;background:#eeeeee;font-weight:700;text-align:left;font-size:12px;";
  const tdStyle = "border:1px solid #999;padding:6px 8px;font-size:12px;text-align:left;";
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
    `<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-family:Calibri,Arial,sans-serif;font-size:12px;">` +
    `<thead><tr>${head}</tr></thead>` +
    `<tbody>${body}</tbody>` +
    `</table>`
  );
}

function buildMailBody({ tableText, includeTable }) {
  const lines = [
    "Guten Tag,",
    "",
    "bitte senden Sie uns ein Angebot für folgende Positionen.",
    "",
  ];
  if (includeTable && tableText) {
    lines.push(tableText, "");
  } else {
    lines.push("(Tabelle bitte hier einfügen – sie wurde in die Zwischenablage kopiert.)", "");
  }
  lines.push("Mit freundlichen Grüßen", "Metallbau Heimsch");
  return lines.join("\n");
}

export function buildMailtoRequest({ projectName, rows, includeTable = true }) {
  const subject = `Anfrage BV ${projectName || ""}`.trim();
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

// 1) HTML-Tabelle in Zwischenablage  2) Klartext-Fallback  3) Mail öffnen
export async function prepareAndOpenMailRequest({ projectName, rows }) {
  const html = buildMaterialTableHtml(rows);
  const plainTable = buildMaterialTableText(rows);
  const copied = await copyTableToClipboard(html, plainTable);

  let { url, tooLong } = buildMailtoRequest({
    projectName,
    rows,
    includeTable: true,
  });
  if (tooLong) {
    ({ url, tooLong } = buildMailtoRequest({
      projectName,
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
