import { useEffect, useRef } from "react";

/**
 * Generisches Kontextmenü (Desktop: Rechtsklick, Mobil: Long Press) für ein
 * beliebiges Ziel-Objekt - zuerst nur für Bauteile vorhanden, jetzt auch für
 * Baugruppen genutzt (Sprint: Projektnavigation), statt einer zweiten,
 * abweichenden Menü-Implementierung. `items`: [{ label, onClick, danger? }].
 */
export default function EntityContextMenu({ x, y, onClose, items }) {
  const menuRef = useRef(null);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    function onPointer(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer, true);
    };
  }, [onClose]);

  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let left = x;
    let top = y;
    if (left + rect.width > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - rect.width - 8);
    }
    if (top + rect.height > window.innerHeight - 8) {
      top = Math.max(8, window.innerHeight - rect.height - 8);
    }
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  }, [x, y]);

  return (
    <div ref={menuRef} className="bauteilContextMenu" style={{ left: x, top: y }} role="menu">
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          role="menuitem"
          className={item.danger ? "dangerItem" : undefined}
          onClick={item.onClick}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
