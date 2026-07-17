// "Anfrage per Mail" (Sprint 7 - Korrekturen aus Praxistest, Punkt 6):
// öffnet das Standard-Mailprogramm des Geräts mit einer vorausgefüllten
// Angebotsanfrage - ersetzt die vorherigen Buttons "Tabelle kopieren" und
// "CSV exportieren" im Warenkorb. Bewusst die einfachste robuste Lösung:
// ein mailto-Link, kein Versand über eine eigene Serverfunktion und keine
// Abhängigkeit von einem bestimmten Mailprogramm (z. B. Outlook).
const RECIPIENT_EMAIL = "vertrieb@schrauben-jaeger.de";

// mailto-Links unterstützen keinen zuverlässigen Anzeigenamen im
// Empfänger-Feld (je nach Mailprogramm unterschiedlich behandelt) - daher
// bewusst nur die reine Adresse, der Anzeigename "Schrauben-Jäger AG" ist
// im eigenen Adressbuch des Nutzers ohnehin meist bereits hinterlegt.

// Viele Mailprogramme/Betriebssysteme begrenzen die Länge einer mailto-URL
// (in der Praxis oft rund 2000 Zeichen). Deutlich darunter, damit die Mail
// zuverlässig vollständig öffnet statt an einer technischen Grenze
// abgeschnitten zu werden.
const MAX_MAILTO_LENGTH = 1800;

function padRight(text, width) {
  const s = String(text ?? "");
  return s.length >= width ? s : s + " ".repeat(width - s.length);
}

// Baut eine saubere, lesbare Klartext-Tabelle (feste Spaltenbreiten anhand
// des tatsächlichen Inhalts) - ausschließlich Bezeichnung, Größe, Länge,
// Ausführung, Menge, wie vom Betrieb vorgegeben.
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

// Baut die vollständige mailto-URL. Gibt zusätzlich "tooLong" zurück, damit
// der Aufrufer eine verständliche Fehlermeldung zeigen kann, statt
// Positionen still abzuschneiden.
export function buildMailtoRequest({ projectName, rows }) {
  const subject = `Anfrage BV ${projectName || ""}`.trim();
  const table = buildMaterialTableText(rows);
  const body = [
    "Guten Tag,",
    "",
    "bitte senden Sie uns ein Angebot für folgende Positionen:",
    "",
    table,
    "",
    "Mit freundlichen Grüßen",
    "Metallbau Heimsch",
  ].join("\n");
  const url = `mailto:${RECIPIENT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return { url, tooLong: url.length > MAX_MAILTO_LENGTH };
}

// Öffnet den mailto-Link im Standard-Mailprogramm des Geräts.
export function openMailClient(url) {
  const link = document.createElement("a");
  link.href = url;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
