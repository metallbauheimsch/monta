import { groupBy } from "../../utils/helpers";
import { parseEinbauort } from "../../utils/structure";

const LENGTH_TOLERANCE = 0.2; // 20%

// Marker, den TechnikerEditor beim automatischen Anlegen von Mitlaufartikeln
// (U-Scheibe, Sechskantmutter usw.) einträgt - diese Positionen sind rein
// abgeleitet und sollen die Prüfung nicht verfälschen.
const AUTO_HINWEIS = "Automatisch ergänzt";

function parseLength(value) {
  const n = parseFloat(String(value ?? "").trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

// Zwei Längen gelten als ähnlich, wenn die Abweichung maximal 20% beträgt.
// Berechnungsbasis ist die kleinere der beiden Längen (so ergeben sich genau
// die vom Betrieb vorgegebenen Beispiele: 50/45 -> 11% ähnlich, 100/120 ->
// 20% ähnlich (Grenzfall), 80/100 -> 25% nicht mehr ähnlich). Die Prüfung
// ist symmetrisch, die Reihenfolge der beiden Längen spielt keine Rolle.
function lengthsAreSimilar(a, b) {
  if (a === b) return false;
  const base = Math.min(a, b);
  if (base <= 0) return false;
  return Math.abs(a - b) / base <= LENGTH_TOLERANCE;
}

function isCheckable(item) {
  return Boolean(item.bezeichnung) && Boolean(item.groesse) && item._laenge !== null && item.hinweis !== AUTO_HINWEIS;
}

function groupKey(item) {
  return `${item.bezeichnung.trim().toLowerCase()}|${item.groesse.trim().toLowerCase()}`;
}

// Innerhalb einer Gruppe (gleiche Bezeichnung + Größe) werden nur die
// Positionen behalten, die mindestens einen ähnlichen Längen-Partner haben -
// so bleibt die Trefferliste klar, statt die ganze Gruppe unabhängig vom
// tatsächlichen Längenunterschied anzuzeigen.
function findSimilarClusters(items) {
  const groups = groupBy(items, groupKey);
  return Object.values(groups)
    .map((arr) =>
      arr
        .filter((i) => arr.some((other) => other.id !== i.id && lengthsAreSimilar(i._laenge, other._laenge)))
        .sort((a, b) => a._laenge - b._laenge)
    )
    .filter((arr) => arr.length > 1);
}

// Prüfung erkennt ähnliche Befestigungsmittel: gleiche Bezeichnung, gleiche
// Größe, beide mit hinterlegter Länge, Längenabweichung maximal 20%.
// Bewusst einfach gehalten - keine komplizierte Bewertung, nur eine klare
// Trefferliste. Automatisch ergänzte Mitlaufartikel werden ignoriert.
export default function Checks({ items, baugruppe, project }) {
  const candidates = items
    .map((i) => ({ ...i, _laenge: parseLength(i.laenge) }))
    .filter(isCheckable);

  const warnings = findSimilarClusters(candidates);

  return (
    <div className="card">
      <h2>Prüfung{baugruppe ? ` · ${baugruppe}` : ""}</h2>
      <p className="hint">
        Findet Befestigungsmittel mit gleicher Bezeichnung und Größe, deren Länge um maximal 20% abweicht.
        Automatisch ergänzte Positionen werden nicht berücksichtigt.
      </p>
      {warnings.length === 0 ? (
        <p>Keine Auffälligkeiten gefunden.</p>
      ) : (
        warnings.map((arr, idx) => (
          <div className="line" key={idx}>
            <b>Ähnliche Längen prüfen</b>
            {arr.map((i) => {
              const { bauteil } = parseEinbauort(i.einbauort, project?.baugruppe);
              return <p key={i.id}>{i.menge} × {i.bezeichnung} {i.groesse}×{i.laenge} · {bauteil}</p>;
            })}
          </div>
        ))
      )}
    </div>
  );
}
