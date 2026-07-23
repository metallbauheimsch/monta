import { naturalCompare } from "../../utils/sorting.js";

/** Artikelidentität für projektweite Aggregation (Anzeige, nicht DB). */
export function articleIdentityKey(item) {
  return [
    String(item.bezeichnung || "").trim().toLowerCase(),
    String(item.groesse || "").trim().toLowerCase(),
    String(item.laenge || "").trim().toLowerCase(),
    String(item.oberflaeche || "").trim().toLowerCase(),
  ].join("|");
}

/**
 * HV-Garnitur erkennen (alle historischen Varianten).
 * Erfassung/Lager/Warenkorb/Druck bleiben nutzbar; Prüfung nimmt sie aus.
 */
export function isHvGarnitur(bezeichnung) {
  const s = String(bezeichnung || "")
    .toLowerCase()
    .replace(/[\u00a0]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!s) return false;
  if (s === "hv") return true;
  if (/\bhv[\s-]*garnitur\b/.test(s)) return true;
  if (/\bhv[\s-]*schraube\b/.test(s)) return true;
  return false;
}

/** Standardbezeichnung für neue / bewusst bearbeitete HV-Positionen. */
export const HV_STANDARD_NAME = "HV-Garnitur";

export function normalizeHvDesignation(bezeichnung) {
  if (!isHvGarnitur(bezeichnung)) return bezeichnung;
  return HV_STANDARD_NAME;
}

export function isHiltiHitOrVerbund(bezeichnung) {
  const s = String(bezeichnung || "").toLowerCase();
  if (!s) return false;
  if (s.includes("hilti hit") || s.includes("hilti-hit")) return true;
  if (s.includes("verbundmörtel") || s.includes("verbundmoertel")) return true;
  if (/\bvmu\b/.test(s)) return true;
  if (s.includes("reca") && s.includes("verbund")) return true;
  return false;
}

export function isAnkerstange(bezeichnung) {
  const s = String(bezeichnung || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  if (!s) return false;
  if (s.includes("ankerstange")) return true;
  if (s.includes("gewindestange")) return true;
  if (/\bhilti\s+has\b/.test(s) || s.includes("hilti has-u") || s.includes("hilti has u")) return true;
  if (/\bhas-u\b/.test(s) || /\bhas u\b/.test(s)) return true;
  return false;
}

const HV_TORQUE = {
  M12: 100,
  M16: 250,
  M20: 450,
  M22: 650,
  M24: 800,
};

const HIT_TORQUE = {
  M8: 10,
  M10: 20,
  M12: 40,
  M16: 80,
};

function normalizeSizeKey(groesse) {
  const s = String(groesse || "").trim().toUpperCase().replace(/\s+/g, "");
  const m = s.match(/^M(\d+)/);
  return m ? `M${m[1]}` : s;
}

export function getAutoTorqueNm(bezeichnung, groesse) {
  const size = normalizeSizeKey(groesse);
  if (isHvGarnitur(bezeichnung)) return HV_TORQUE[size] ?? null;
  if (isHiltiHitOrVerbund(bezeichnung)) return HIT_TORQUE[size] ?? null;
  return null;
}

const TORQUE_LONG_RE = /Anziehdrehmoment:\s*\d+\s*Nm/gi;
/** Reine Auto-Zeilen im Kurzformat, z. B. „450 Nm“ allein auf einer Zeile. */
const TORQUE_SHORT_LINE_RE = /(^|\n)\s*\d+\s*Nm\s*(?=\n|$)/g;

/**
 * Automatischen Drehmomenttext anhängen oder ersetzen (Kurzformat „450 Nm“).
 * Manuelle Hinweise bleiben erhalten; alte Auto-Texte werden ersetzt.
 * Identische Hinweiszeilen werden nicht doppelt angehängt.
 */
export function applyAutoTorqueHinweis(hinweis, bezeichnung, groesse) {
  const nm = getAutoTorqueNm(bezeichnung, groesse);
  let text = String(hinweis || "")
    .replace(TORQUE_LONG_RE, "")
    .replace(TORQUE_SHORT_LINE_RE, "$1")
    .replace(/\n{2,}/g, "\n")
    .trim();
  text = dedupeHinweisText(text);
  if (nm == null) return text;
  const line = `${nm} Nm`;
  const parts = splitHinweisParts(text);
  if (parts.some((p) => p.toLowerCase() === line.toLowerCase())) {
    return joinHinweisParts(parts, text);
  }
  parts.push(line);
  return joinHinweisParts(parts, text);
}

/** Hinweis in Teile zerlegen (Zeilen und ·-Trenner). */
export function splitHinweisParts(hinweis) {
  return String(hinweis || "")
    .split(/\n|(?:\s*[·•|]\s*)/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function joinHinweisParts(parts, originalHint) {
  if (!parts.length) return "";
  if (parts.length === 1) return parts[0];
  const raw = String(originalHint || "");
  if (/\n/.test(raw) && !/[·•|]/.test(raw)) return parts.join("\n");
  return parts.join(" · ");
}

/**
 * Vergleichsschlüssel für Hinweise (Anzeige-Deduplizierung).
 * Ignoriert Groß-/Kleinschreibung und Leerzeichen; Originaltext bleibt unverändert.
 */
export function normalizeHinweisForCompare(hinweis) {
  return String(hinweis || "")
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[–—−]/g, "-")
    .replace(/\s+/g, "")
    .trim();
}

/**
 * Identische Hinweistexte höchstens einmal (Reihenfolge erhalten).
 * Nur Anzeige / bewusste Bearbeitung – keine Massenänderung in der DB.
 */
export function dedupeHinweisText(hinweis) {
  const raw = String(hinweis || "").trim();
  if (!raw) return "";
  const parts = splitHinweisParts(raw);
  const seen = new Set();
  const out = [];
  for (const p of parts) {
    const key = normalizeHinweisForCompare(p);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return joinHinweisParts(out, raw);
}

/**
 * Hinweise mehrerer Positionen für Lager/Warenkorb deduplizieren (nur Anzeige).
 * Erste gefundene Schreibweise behalten; important_note per Hinweis ODER-verknüpft.
 */
export function collectUniqueHinweise(items) {
  const seen = new Map();
  const out = [];
  for (const item of items || []) {
    const cleaned = displayHinweisWithoutAutoMark(item.hinweis);
    if (!cleaned) continue;
    for (const part of splitHinweisParts(cleaned)) {
      const key = normalizeHinweisForCompare(part);
      if (!key) continue;
      if (seen.has(key)) {
        if (item.important_note) {
          const idx = seen.get(key);
          out[idx].important_note = true;
        }
        continue;
      }
      seen.set(key, out.length);
      out.push({
        text: part,
        important_note: Boolean(item.important_note),
      });
    }
  }
  return out;
}

const AUTO_MARK = "Automatisch ergänzt";

/**
 * Lager/Warenkorb: technischen Marker „Automatisch ergänzt“ aus der Anzeige
 * entfernen (gespeicherter Wert bleibt unverändert).
 */
export function displayHinweisWithoutAutoMark(hinweis) {
  let t = String(hinweis || "");
  if (!t) return "";
  t = t.replace(new RegExp(AUTO_MARK, "gi"), "");
  t = t
    .replace(/\s*[·•|]\s*/g, " · ")
    .replace(/(^|\n)\s*[·•|,;-]+\s*/g, "$1")
    .replace(/\s*[·•|,;-]+\s*(\n|$)/g, "$1")
    .replace(/ {2,}/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
  t = t.replace(/^[·•|,;-]+\s*|\s*[·•|,;-]+$/g, "").trim();
  return dedupeHinweisText(t);
}

export function isPureAutoMarkHinweis(hinweis) {
  const t = String(hinweis || "").trim();
  if (!t) return false;
  return t.toLowerCase() === AUTO_MARK.toLowerCase();
}

/**
 * Mitlaufartikel für neue / bewusst bearbeitete Positionen.
 * HV-Garnitur: keine Einzelteile.
 * Ankerstange: 1 U-Scheibe + 1 Sechskantmutter (bestehende MONTA-Begriffe).
 * Sechskant-/Senk-/übliche Metallschrauben: Scheibe + Mutter.
 */
export function getMitlaufForBezeichnung(bezeichnung) {
  if (isHvGarnitur(bezeichnung)) return [];
  if (isAnkerstange(bezeichnung)) {
    return [
      { bezeichnung: "U-Scheibe", faktor: 1 },
      { bezeichnung: "Sechskantmutter", faktor: 1 },
    ];
  }
  const key = String(bezeichnung || "").trim().toLowerCase();
  if (!key) return [];

  // Senkschraube / Senkkopfschraube
  if (/senk(?:kopf)?schraube/.test(key)) {
    return [
      { bezeichnung: "U-Scheibe", faktor: 1 },
      { bezeichnung: "Sechskantmutter", faktor: 1 },
    ];
  }

  // Sechskantschraube und vergleichbare Metallschrauben (nicht Bohr/Holz/Blech/Beton)
  if (/sechskantschraube/.test(key)) {
    return [
      { bezeichnung: "U-Scheibe", faktor: 2 },
      { bezeichnung: "Sechskantmutter", faktor: 1 },
    ];
  }
  if (
    /schraube/.test(key) &&
    !/bohr|holz|blech|beton|wurm|anker/.test(key)
  ) {
    return [
      { bezeichnung: "U-Scheibe", faktor: 2 },
      { bezeichnung: "Sechskantmutter", faktor: 1 },
    ];
  }
  return [];
}

/**
 * Mitlaufzeilen inkl. Werkstoff/Ausführung und Größe des Hauptartikels.
 * Keine Änderung bestehender DB-Positionen – nur für neue Ergänzung.
 */
export function buildMitlaufItems(bezeichnung, { groesse = "", oberflaeche = "", menge = 0 } = {}) {
  return getMitlaufForBezeichnung(bezeichnung).map((c) => ({
    bezeichnung: c.bezeichnung,
    faktor: c.faktor,
    groesse: String(groesse || ""),
    oberflaeche: String(oberflaeche || ""),
    menge: Number(menge || 0) * c.faktor,
  }));
}

function normalizeAusf(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\u00a0]/g, " ")
    .replace(/\s+/g, " ");
}

/** Fachlich nicht vorgesehene Werkstoff-Kombinationen (nur Hinweis, keine Korrektur). */
export function getUnavailableFinishHint(bezeichnung, oberflaeche) {
  const ausf = normalizeAusf(oberflaeche);
  if (ausf !== "feuerverzinkt") return null;
  const bez = normalizeAusf(bezeichnung);
  if (/hutmutter/.test(bez)) {
    return "Hutmuttern sind nur in galvanisch verzinkt oder Edelstahl verfügbar.";
  }
  if (/senk(?:kopf)?schraube/.test(bez)) {
    return "Senkschrauben sind nur in galvanisch verzinkt oder Edelstahl verfügbar.";
  }
  return null;
}

/** Kompakte Herkunft: nur Bauteilnamen, natürlich sortiert, ohne Duplikate. */
export function compactBauteilNames(herkunft) {
  const names = [
    ...new Set(
      (herkunft || [])
        .map((h) => String(h.bauteil || "").trim())
        .filter(Boolean)
    ),
  ];
  names.sort((a, b) => naturalCompare(a, b));
  return names;
}

/**
 * Ob die Suche Positionsnummern „anspricht“ (Anzeige Pos. ergänzen).
 */
export function searchWantsPositions(query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return false;
  if (/\bpos\.?\s*\d+/i.test(q)) return true;
  if (/^\d+$/.test(q)) return true;
  // Mehrwort: irgendein Wort ist reine Zahl oder Pos-Bezug
  return q.split(/\s+/).some((w) => /^\d+$/.test(w) || /^pos\.?\d*$/i.test(w));
}

export function matchingPositionsForSearch(herkunft, query) {
  if (!searchWantsPositions(query)) return [];
  const q = String(query || "").trim().toLowerCase();
  const words = q.split(/\s+/);
  const posNums = new Set();
  for (const w of words) {
    const m = w.match(/(?:pos\.?)?(\d+)/i);
    if (m) posNums.add(m[1]);
  }
  const out = [];
  for (const h of herkunft || []) {
    for (const p of h.positions || []) {
      const s = String(p).trim();
      if (!s) continue;
      if (posNums.size === 0 || posNums.has(s) || [...posNums].some((n) => s.includes(n))) {
        out.push(s);
      }
    }
  }
  return [...new Set(out)].sort((a, b) => naturalCompare(a, b));
}
