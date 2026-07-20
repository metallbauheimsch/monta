// Kompaktes Suchfeld mit Löschen-Button (×). Suche wird nicht persistiert.
export default function SearchField({ value, onChange, placeholder = "Suchen …" }) {
  return (
    <div className="searchField">
      <input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        aria-label={placeholder}
      />
      {value ? (
        <button
          type="button"
          className="searchClear"
          title="Suche löschen"
          aria-label="Suche löschen"
          onClick={() => onChange("")}
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
