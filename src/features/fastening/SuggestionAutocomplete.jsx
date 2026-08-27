import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { computeAutocompleteListPosition } from "./autocompletePosition";

function isPcViewport() {
  return window.matchMedia("(min-width: 1025px)").matches;
}

function visibleViewportBounds() {
  const vv = window.visualViewport;
  if (vv) return { top: vv.offsetTop, bottom: vv.offsetTop + vv.height };
  return { top: 0, bottom: window.innerHeight };
}

const SuggestionAutocomplete = forwardRef(function SuggestionAutocomplete({
  value,
  onChange,
  onCommit,
  options,
  placeholder = "",
  className = "",
  ellipsis = false,
  required = false,
}, ref) {
  const inputRef = useRef(null);
  const wrapRef = useRef(null);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
  }));
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  // true, wenn der Nutzer die Vorauswahl per Pfeiltaste geändert hat –
  // dann darf Leertaste den Vorschlag übernehmen, auch ohne getippten Text
  // (z. B. Bezeichnungsliste nach Fokus komplett durchblättern).
  const [navActive, setNavActive] = useState(false);
  const [tooltip, setTooltip] = useState("");
  const [listStyle, setListStyle] = useState(null);

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return options;
    return options.filter((d) => d.toLowerCase().includes(q));
  }, [value, options]);

  const showList = open && suggestions.length > 0;

  useEffect(() => {
    setHighlight(0);
  }, [value, suggestions.length]);

  function updateTooltip() {
    if (!ellipsis || !isPcViewport()) {
      setTooltip("");
      return;
    }
    const el = inputRef.current;
    if (el && value && el.scrollWidth > el.clientWidth) setTooltip(value);
    else setTooltip("");
  }

  useEffect(updateTooltip, [value, ellipsis]);

  function updateListPosition() {
    if (!inputRef.current) {
      setListStyle(null);
      return;
    }
    const rect = inputRef.current.getBoundingClientRect();
    const { top: visibleTop, bottom: visibleBottom } = visibleViewportBounds();
    setListStyle(
      computeAutocompleteListPosition({
        rect,
        visibleTop,
        visibleBottom,
        layoutHeight: window.innerHeight,
      })
    );
  }

  // Vorschlagsliste kann am unteren (oder bei wenig Platz oberen)
  // Bildschirmrand abgeschnitten werden - deshalb für JEDES Feld dieser
  // Komponente (Bezeichnung/Größe/Ausführung, Formular wie Tabellenzeile)
  // viewportabhängig positioniert, nicht nur im ellipsis-Modus.
  useEffect(() => {
    if (!showList) {
      setListStyle(null);
      return;
    }
    updateListPosition();
    const vv = window.visualViewport;
    window.addEventListener("scroll", updateListPosition, true);
    window.addEventListener("resize", updateListPosition);
    vv?.addEventListener("resize", updateListPosition);
    vv?.addEventListener("scroll", updateListPosition);
    return () => {
      window.removeEventListener("scroll", updateListPosition, true);
      window.removeEventListener("resize", updateListPosition);
      vv?.removeEventListener("resize", updateListPosition);
      vv?.removeEventListener("scroll", updateListPosition);
    };
  }, [showList, value]);

  function accept(suggestion) {
    onChange(suggestion);
    setOpen(false);
    setNavActive(false);
  }

  function bestSuggestion() {
    if (!suggestions.length) return null;
    const exact = suggestions.find((s) => s.toLowerCase() === value.trim().toLowerCase());
    if (exact) return exact;
    return suggestions[highlight] ?? suggestions[0];
  }

  function handleFocus() {
    setOpen(true);
    setNavActive(false);
    updateTooltip();
  }

  function handleBlur() {
    onCommit?.(value);
    setTimeout(() => {
      if (wrapRef.current && !wrapRef.current.contains(document.activeElement)) {
        setOpen(false);
        setNavActive(false);
      }
    }, 120);
  }

  function handleKeyDown(e) {
    if (e.key === "ArrowDown" && open && suggestions.length) {
      e.preventDefault();
      // Erster Pfeil markiert den aktuellen Eintrag (oft Index 0), ohne zu springen.
      if (!navActive) {
        setNavActive(true);
        return;
      }
      setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
      return;
    }
    if (e.key === "ArrowUp" && open && suggestions.length) {
      e.preventDefault();
      if (!navActive) {
        setNavActive(true);
        return;
      }
      setHighlight((h) => Math.max(h - 1, 0));
      return;
    }
    if (e.key === "Tab") {
      // TAB wechselt nur das Feld – der getippte Wert bleibt unverändert,
      // niemals automatische Übernahme eines Vorschlags (auch nicht des
      // optisch markierten ersten Eintrags).
      setOpen(false);
      setNavActive(false);
      return;
    }
    if (e.key === "Enter" && open && suggestions.length) {
      const pick = bestSuggestion();
      if (pick) {
        e.preventDefault();
        if (pick !== value) accept(pick);
        else setOpen(false);
        return;
      }
    }
    // Leertaste: nur übernehmen, wenn Liste offen und ein Eintrag aktiv
    // markiert ist (Pfeil oder Maus über Vorschlag). Sonst normales Leerzeichen.
    if (e.key === " " && open && suggestions.length && navActive) {
      const pick = suggestions[highlight] ?? suggestions[0];
      if (pick) {
        e.preventDefault();
        accept(pick);
        return;
      }
    }
    if (e.key === "Escape") {
      setOpen(false);
      setNavActive(false);
    }
  }

  return (
    <div className="autocompleteWrap" ref={wrapRef}>
      <input
        ref={inputRef}
        className={[className, ellipsis ? "suggestionEllipsis" : ""].filter(Boolean).join(" ")}
        placeholder={placeholder}
        value={value}
        title={tooltip}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setNavActive(false);
        }}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onMouseEnter={updateTooltip}
        required={required}
        autoComplete="off"
      />
      {showList && (
        <ul
          className="autocompleteList autocompleteListFixed"
          style={
            listStyle
              ? {
                  top: listStyle.top,
                  bottom: listStyle.bottom,
                  left: listStyle.left,
                  right: listStyle.right,
                  width: listStyle.width,
                  maxHeight: listStyle.maxHeight,
                }
              : undefined
          }
          role="listbox"
        >
          {suggestions.map((s, idx) => (
            <li
              key={s}
              role="option"
              aria-selected={idx === highlight}
              className={"autocompleteItem" + (idx === highlight ? " active" : "")}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => accept(s)}
              onMouseEnter={() => {
                setHighlight(idx);
                setNavActive(true);
              }}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

export default SuggestionAutocomplete;
