import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";

function isPcViewport() {
  return window.matchMedia("(min-width: 761px)").matches;
}

function focusNextField(current) {
  const row = current.closest("tr");
  const scope = row || current.closest("form");
  if (!scope) return;
  const fields = [...scope.querySelectorAll("input:not([type=hidden]), select, textarea, button")];
  const idx = fields.indexOf(current);
  if (idx >= 0 && idx < fields.length - 1) fields[idx + 1].focus();
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
  const [tooltip, setTooltip] = useState("");
  const [listStyle, setListStyle] = useState(null);

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return options;
    return options.filter((d) => d.toLowerCase().includes(q));
  }, [value, options]);

  const showList = open && suggestions.length > 0;

  // Die Trefferliste beginnt immer markiert beim ersten (besten) Treffer -
  // das ist die "Vorauswahl", die per Klick, Tab, Enter oder Leertaste
  // übernommen werden kann.
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
    if (!ellipsis || !inputRef.current) {
      setListStyle(null);
      return;
    }
    const r = inputRef.current.getBoundingClientRect();
    setListStyle({ top: r.bottom + 4, left: r.left, width: r.width });
  }

  useEffect(() => {
    if (!showList || !ellipsis) {
      setListStyle(null);
      return;
    }
    updateListPosition();
    window.addEventListener("scroll", updateListPosition, true);
    window.addEventListener("resize", updateListPosition);
    return () => {
      window.removeEventListener("scroll", updateListPosition, true);
      window.removeEventListener("resize", updateListPosition);
    };
  }, [showList, ellipsis, value]);

  function accept(suggestion) {
    onChange(suggestion);
    setOpen(false);
  }

  // Liefert den markierten ("vorausgewählten") Vorschlag: exakter Treffer
  // hat Vorrang, sonst der aktuell hervorgehobene Eintrag (Standard: der
  // erste/beste Treffer, per Pfeiltasten änderbar).
  function bestSuggestion() {
    if (!suggestions.length) return null;
    const exact = suggestions.find((s) => s.toLowerCase() === value.trim().toLowerCase());
    if (exact) return exact;
    return suggestions[highlight] ?? suggestions[0];
  }

  function handleFocus() {
    setOpen(true);
    updateTooltip();
  }

  function handleBlur() {
    onCommit?.(value);
    setTimeout(() => {
      if (wrapRef.current && !wrapRef.current.contains(document.activeElement)) setOpen(false);
    }, 120);
  }

  function handleKeyDown(e) {
    if (e.key === "ArrowDown" && open && suggestions.length) {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
      return;
    }
    if (e.key === "ArrowUp" && open && suggestions.length) {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
      return;
    }
    if (e.key === "Tab" && !e.shiftKey && open && suggestions.length && value.trim()) {
      const pick = bestSuggestion();
      if (pick && pick !== value) {
        e.preventDefault();
        accept(pick);
        focusNextField(inputRef.current);
        return;
      }
    }
    // Enter oder Leertaste übernehmen den markierten ("vorausgewählten")
    // Vorschlag - genau wie ein Klick darauf.
    if ((e.key === "Enter" || e.key === " ") && open && suggestions.length && value.trim()) {
      const pick = bestSuggestion();
      if (pick && pick !== value) {
        e.preventDefault();
        accept(pick);
        return;
      }
    }
    if (e.key === "Escape") {
      setOpen(false);
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
          className={"autocompleteList" + (ellipsis ? " autocompleteListFixed" : "")}
          style={listStyle || undefined}
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
              onMouseEnter={() => setHighlight(idx)}
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
