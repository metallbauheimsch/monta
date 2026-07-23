import { groupBy } from "../../utils/helpers";
import { naturalCompare } from "../../utils/sorting";
import { uniqueSortedPositions } from "./technikerUtils";
import {
  compactBauteilNames,
  matchingPositionsForSearch,
  searchWantsPositions,
  displayHinweisWithoutAutoMark,
} from "./fasteningRules";

export function buildHerkunft(baugruppe, items) {
  const byBauteil = groupBy(items, (i) => i.bauteil);
  return Object.keys(byBauteil)
    .sort((a, b) => naturalCompare(a, b))
    .map((bauteil) => ({
      baugruppe,
      bauteil,
      positions: uniqueSortedPositions(byBauteil[bauteil]),
    }));
}

/** Herkunft über mehrere Baugruppen (projektweite Aggregation). */
export function buildHerkunftProject(items) {
  const byKey = groupBy(items, (i) => `${i.baugruppe || ""}\u0001${i.bauteil || ""}`);
  return Object.values(byKey)
    .map((arr) => ({
      baugruppe: arr[0].baugruppe || "",
      bauteil: arr[0].bauteil || "",
      positions: uniqueSortedPositions(arr),
    }))
    .sort(
      (a, b) =>
        naturalCompare(a.bauteil, b.bauteil) || naturalCompare(a.baugruppe, b.baugruppe)
    );
}

export function formatHerkunftText(herkunft) {
  return compactBauteilNames(herkunft).join(", ");
}

function minPosNumber(h) {
  const nums = (h.positions || [])
    .map((p) => parseInt(String(p).trim(), 10))
    .filter((n) => !Number.isNaN(n));
  return nums.length ? Math.min(...nums) : Number.POSITIVE_INFINITY;
}

export function primaryHerkunftEntry(herkunft) {
  const list = [...(herkunft || [])].sort(
    (x, y) =>
      naturalCompare(x.bauteil || "", y.bauteil || "") ||
      naturalCompare(x.baugruppe || "", y.baugruppe || "") ||
      minPosNumber(x) - minPosNumber(y)
  );
  return list[0] || null;
}

/** Sortierung: Bauteil → Baugruppe → kleinste Pos. */
export function herkunftSortKey(herkunft) {
  const h = primaryHerkunftEntry(herkunft);
  if (!h) return "\uffff";
  const pos = minPosNumber(h);
  const posPart = Number.isFinite(pos) ? String(pos).padStart(10, "0") : "9999999999";
  return [h.bauteil || "", h.baugruppe || "", posPart].join("\u0001");
}

/** Vollständige Suchteile (nicht nur sichtbarer Text). */
export function herkunftSearchParts(herkunft, items = []) {
  const parts = [];
  for (const h of herkunft || []) {
    parts.push(h.baugruppe, h.bauteil);
    for (const p of h.positions || []) {
      const s = String(p).trim();
      if (!s) continue;
      parts.push(s, `Pos ${s}`, `Pos. ${s}`, `Position ${s}`);
    }
  }
  for (const i of items || []) {
    const note = displayHinweisWithoutAutoMark(i.hinweis);
    if (note) parts.push(note);
    if (i.important_note) parts.push("wichtig");
    if (i.baugruppe) parts.push(i.baugruppe);
    if (i.bauteil) parts.push(i.bauteil);
    if (i.pos) parts.push(i.pos, `Pos ${i.pos}`, `Pos. ${i.pos}`);
  }
  return parts;
}

export function herkunftVisibleParts(herkunft, search = "") {
  const names = compactBauteilNames(herkunft);
  const showPos = searchWantsPositions(search);
  const matched = showPos ? matchingPositionsForSearch(herkunft, search) : [];
  const allPos = showPos
    ? [
        ...new Set(
          (herkunft || [])
            .flatMap((h) => (h.positions || []).map((p) => String(p).trim()).filter(Boolean))
        ),
      ].sort((a, b) => naturalCompare(a, b))
    : [];
  const posList = matched.length ? matched : allPos;
  return { names, showPos, posList };
}
