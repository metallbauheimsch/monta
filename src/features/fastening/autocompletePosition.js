/**
 * Reine Positionsberechnung für die Vorschlagslisten der TB-Eingabe
 * (Bezeichnung/Größe/Ausführung, siehe SuggestionAutocomplete.jsx).
 * Getrennt von der Komponente, damit sie ohne React-Renderer testbar ist
 * (wie die übrigen reinen Logikmodule in diesem Projekt, z. B.
 * useItemEditor.js / replacement.js).
 *
 * Entscheidet ausschließlich anhand der tatsächlich verfügbaren Fläche rund
 * um das Eingabefeld, ob die Liste nach unten oder oben öffnet - nicht
 * anhand von Bildschirmbreite oder Gerätetyp. Bei zu wenig Platz auf beiden
 * Seiten wird die verfügbare Höhe genutzt; die Liste bleibt über CSS
 * (overflow:auto, siehe style.css) intern scrollbar.
 */
const GAP = 4;
const MIN_SPACE = 140;
const MIN_HEIGHT = 60;
// Bisherige Obergrenze auf PC (siehe style.css, min(70vh, 480px)) bleibt
// als sinnvolle Höchsthöhe erhalten, statt die Liste auf sehr großen
// Bildschirmen unnötig über den ganzen verfügbaren Platz zu strecken.
const MAX_HEIGHT_CAP = 480;

/**
 * @param {object} args
 * @param {{top:number,bottom:number,left:number,width:number}} args.rect
 *   Position des Eingabefelds (getBoundingClientRect).
 * @param {number} args.visibleTop Oberer Rand des tatsächlich sichtbaren
 *   Bereichs (window.visualViewport.offsetTop, sonst 0 - relevant bei
 *   geöffneter Bildschirmtastatur auf iOS/Safari).
 * @param {number} args.visibleBottom Unterer Rand des tatsächlich
 *   sichtbaren Bereichs (visualViewport-Offset + Höhe, sonst
 *   window.innerHeight).
 * @param {number} args.layoutHeight window.innerHeight - Bezugsgröße für
 *   position:fixed (Layout-Viewport, unabhängig von der Bildschirmtastatur).
 */
export function computeAutocompleteListPosition({ rect, visibleTop, visibleBottom, layoutHeight }) {
  const spaceBelow = visibleBottom - rect.bottom - GAP;
  const spaceAbove = rect.top - visibleTop - GAP;

  // 1) genug Platz unten -> wie bisher nach unten.
  // 2) zu wenig Platz unten, aber mehr Platz oben -> nach oben.
  // 3) weder oben noch unten genug -> die größere verfügbare Seite nutzen,
  //    Höhe auf den verfügbaren Platz begrenzen (intern scrollbar).
  const openUp = spaceBelow < MIN_SPACE && spaceAbove > spaceBelow;
  const available = Math.max(openUp ? spaceAbove : spaceBelow, MIN_HEIGHT);
  const maxHeight = Math.min(available, MAX_HEIGHT_CAP);

  return {
    direction: openUp ? "up" : "down",
    left: rect.left,
    right: "auto",
    width: rect.width,
    maxHeight,
    top: openUp ? "auto" : rect.bottom + GAP,
    bottom: openUp ? Math.max(layoutHeight - rect.top + GAP, 0) : "auto",
  };
}
