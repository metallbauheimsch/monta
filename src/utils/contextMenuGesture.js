import { useCallback, useRef, useState } from "react";

// Rechtsklick (Desktop) / Long Press (Touch) öffnet ein Kontextmenü - zuerst
// für Bauteile eingeführt (ProjectDetail), hier verallgemeinert (Sprint:
// Projektnavigation), damit Baugruppen dieselbe Gestenlogik nutzen statt
// einer zweiten, abweichenden Implementierung.
export const LONG_PRESS_MS = 600;
export const MOVE_CANCEL_PX = 10;

// Nur der primäre Zeiger (Touch/Stift oder linke Maustaste) startet einen
// Long Press - ein Rechtsklick der Maus löst bereits separat über
// onContextMenu aus und soll hier keinen zusätzlichen Timer starten.
export function isPrimaryPointerDown(e) {
  return !(e.pointerType === "mouse" && e.button !== 0);
}

// Eine Fingerbewegung über die Toleranz hinaus (z. B. Scrollen) bricht den
// laufenden Long Press ab, statt versehentlich ein Kontextmenü zu öffnen.
export function shouldCancelLongPress(start, current) {
  const dx = Math.abs(current.x - start.x);
  const dy = Math.abs(current.y - start.y);
  return dx > MOVE_CANCEL_PX || dy > MOVE_CANCEL_PX;
}

// Tastatur-Aktivierung (Accessibility): Enter/Leertaste auf dem fokussierten
// Element öffnet dasselbe Kontextmenü wie Rechtsklick/Long Press, statt
// ersatzlos zu verschwinden (früher sichtbare, dauerhafte Buttons waren
// ohne Maus/Touch erreichbar). "Spacebar" zusätzlich für ältere Browser.
export function isMenuActivationKey(key) {
  return key === "Enter" || key === " " || key === "Spacebar";
}

/**
 * Generisches Kontextmenü-Gestenverhalten für ein beliebiges Ziel-Objekt
 * (z. B. ein Bauteil oder eine Baugruppe). Liefert Handler für
 * onContextMenu/onPointerDown/onPointerMove/onPointerUp sowie den aktuell
 * geöffneten Menüzustand { target, x, y }.
 */
export function useContextMenuGesture() {
  const [menu, setMenu] = useState(null); // { target, x, y } | null
  const suppressClickRef = useRef(false);
  const longPressRef = useRef(null);

  const clearLongPress = useCallback(() => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current.timer);
      longPressRef.current = null;
    }
  }, []);

  const closeMenu = useCallback(() => setMenu(null), []);
  const openMenu = useCallback((target, x, y) => setMenu({ target, x, y }), []);

  const handleContextMenu = useCallback(
    (e, target) => {
      e.preventDefault();
      e.stopPropagation();
      clearLongPress();
      openMenu(target, e.clientX, e.clientY);
    },
    [clearLongPress, openMenu]
  );

  const handlePointerDown = useCallback(
    (e, target) => {
      if (!isPrimaryPointerDown(e)) return;
      clearLongPress();
      const start = { x: e.clientX, y: e.clientY };
      longPressRef.current = {
        start,
        timer: setTimeout(() => {
          longPressRef.current = null;
          suppressClickRef.current = true;
          openMenu(target, start.x, start.y);
        }, LONG_PRESS_MS),
      };
    },
    [clearLongPress, openMenu]
  );

  const handlePointerMove = useCallback(
    (e) => {
      const lp = longPressRef.current;
      if (!lp) return;
      if (shouldCancelLongPress(lp.start, { x: e.clientX, y: e.clientY })) clearLongPress();
    },
    [clearLongPress]
  );

  const handlePointerUp = useCallback(() => {
    clearLongPress();
  }, [clearLongPress]);

  // Enter/Leertaste öffnet dasselbe Kontextmenü wie Rechtsklick/Long Press
  // (Accessibility) - keine separate Tastatur-Architektur, nur ein weiterer
  // Aufrufer von openMenu(). Position: unterhalb des fokussierten Elements.
  const handleKeyDown = useCallback(
    (e, target) => {
      if (!isMenuActivationKey(e.key)) return;
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      openMenu(target, rect.left, rect.bottom);
    },
    [openMenu]
  );

  // true = der gerade eingehende Klick kam direkt nach einem ausgelösten
  // Long Press und soll unterdrückt werden (kein Doppel-Effekt); setzt das
  // Flag danach zurück.
  const consumeSuppressedClick = useCallback(() => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return true;
    }
    return false;
  }, []);

  return {
    menu,
    closeMenu,
    handleContextMenu,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleKeyDown,
    consumeSuppressedClick,
  };
}
