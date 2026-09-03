import { useCallback, useRef } from "react";

// Randwischen = Zurück (Praxis-Sprint: Tablet-Navigation). Nach demselben
// Muster wie contextMenuGesture.js (native Pointer Events, reine
// Schwellwert-Funktionen einzeln testbar) - keine zweite Gesten-
// Architektur. Nur Touch löst aus: Desktop-Maus bleibt vollständig
// unberührt, normales horizontales Tabellen-Scrollen startet nicht am
// Rand und wird deshalb nie als Zurück-Geste erkannt.
export const EDGE_ZONE_PX = 24;
export const MIN_HORIZONTAL_PX = 60;
export const MAX_VERTICAL_PX = 50;

/** Geste muss wirklich nahe am linken Bildschirmrand beginnen. */
export function isEdgeSwipeStart(x) {
  return x <= EDGE_ZONE_PX;
}

/**
 * Deutliche Rechtsbewegung, vertikale Abweichung bleibt innerhalb der
 * Toleranz - verhindert, dass vertikales Scrollen (das am Rand beginnt)
 * versehentlich als Zurück-Geste gewertet wird.
 */
export function isValidSwipeBack(start, end) {
  const dx = end.x - start.x;
  const dy = Math.abs(end.y - start.y);
  return dx >= MIN_HORIZONTAL_PX && dy <= MAX_VERTICAL_PX;
}

/**
 * Hook: hängt Pointer-Handler an ein Element (üblicherweise den
 * Hauptinhaltsbereich). Ruft onBack() genau dann auf, wenn eine gültige
 * Randwisch-Geste per Touch abgeschlossen wurde. Kein history.back() -
 * MONTA hat keinen Router, onBack() ist die vom Aufrufer bereitgestellte,
 * bereits bestehende Zurück-Logik (z. B. App.jsx goBack()).
 */
export function useSwipeBack(onBack) {
  const startRef = useRef(null);
  const activeRef = useRef(false);

  const handlePointerDown = useCallback((e) => {
    if (e.pointerType !== "touch") return;
    if (!isEdgeSwipeStart(e.clientX)) return;
    startRef.current = { x: e.clientX, y: e.clientY };
    activeRef.current = true;
  }, []);

  const handlePointerMove = useCallback((e) => {
    if (!activeRef.current || !startRef.current) return;
    const dy = Math.abs(e.clientY - startRef.current.y);
    if (dy > MAX_VERTICAL_PX) {
      activeRef.current = false;
      startRef.current = null;
    }
  }, []);

  const endSwipe = useCallback(
    (e) => {
      if (!activeRef.current || !startRef.current) return;
      const end = { x: e.clientX, y: e.clientY };
      const start = startRef.current;
      activeRef.current = false;
      startRef.current = null;
      if (isValidSwipeBack(start, end) && onBack) onBack();
    },
    [onBack]
  );

  return {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: endSwipe,
    onPointerCancel: endSwipe,
  };
}
