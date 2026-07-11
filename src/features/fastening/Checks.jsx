import { groupBy } from "../../utils/helpers";
import { parseEinbauort } from "../../utils/structure";

const LENGTH_TOLERANCE_MM = 20; // absolute Differenz in mm

// Marker, den TechnikerEditor beim automatischen Anlegen von Mitlaufartikeln
// (U-Scheibe, Sechskantmutter usw.) einträgt - diese Positionen sind rein
// abgeleitet und sollen die Prüfung nicht verfälschen.
const AUTO_HINWEIS = "Automatisch ergänzt";

function parseLength(value) {
  const n = parseFloat(String(value ?? "").trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

// Zwei Längen gelten als ähnlich, wenn sie nicht identisch sind und die
// absolute Abweichung maximal 20 mm beträgt (feste Regel, keine Prozent-
// berechnung). Beispiele: 80/100 -> 20 mm Differenz -> ähnlich (Grenzfall);
// 80/101 -> 21 mm Differenz -> nicht mehr ähnlich. Die Prüfung ist
// symmetrisch, die Reihenfolge der beiden Längen spielt keine Rolle.
function lengthsAreSimilar(a, b) {
  if (a === b) return false;
  return Math.abs(a - b) <= LENGTH_TOLERANCE_MM;
}

function isCheckable(item) {
  return Boolean(item.bezeichnung) && Boolean(item.groesse) && item._laenge !== null && item.hinweis !== AUTO_HINWEIS;
}

function groupKey(item) {
  return `${item.bezeichnung.trim().toLowerCase()}|${item.groesse.trim().toLowerCase()}`;
}

// Innerhalb einer Gruppe (gleiche Bezeichnung + Größe) werden ausschließlich
// direkte Paare verglichen - keine Ketten über Zwischenwerte. Beispiel
// 20/40/41: 20↔40 und 40↔41 sind jeweils direkte Treffer (≤20 mm), aber
// 20↔41 ist es nicht (21 mm) und darf deshalb nicht zusammen mit 20 in
// einer gemeinsamen Gruppe erscheinen. Jedes Paar wird daher einzeln als
// eigener Treffer geführt, auch wenn eine Position in mehreren Paaren
// vorkommt.
function findSimilarPairs(items) {
  const groups = groupBy(items, groupKey);
  const pairs = [];
  Object.values(groups).forEach((arr) => {
    for (let i = 0; i < arr.length; i += 1) {
      for (let j = i + 1; j < arr.length; j += 1) {
        if (lengthsAreSimilar(arr[i]._laenge, arr[j]._laenge)) {
          const pair = [arr[i], arr[j]].sort((a, b) => a._laenge - b._laenge);
          pairs.push(pair);
        }
      }
    }
  });
  return pairs;
}

// Prüfung erkennt ähnliche Befestigungsmittel: gleiche Bezeichnung, gleiche
// Größe, beide mit hinterlegter Länge, absolute Längenabweichung maximal
// 20 mm (und die Längen sind nicht identisch). Es werden ausschließlich
// direkte Paare angezeigt, keine über Zwischenwerte verbundenen Gruppen.
// Automatisch ergänzte Mitlaufartikel werden ignoriert.
export default function Checks({ items, baugruppe, project }) {
  const candidates = items
    .map((i) => ({ ...i, _laenge: parseLength(i.laenge) }))
    .filter(isCheckable);

  const warnings = findSimilarPairs(candidates);

  return (
    <div className="card">
      <h2>Prüfung{baugruppe ? ` · ${baugruppe}` : ""}</h2>
      <p className="hint">
        Findet Befestigungsmittel mit gleicher Bezeichnung und Größe, deren Länge um maximal 20 mm abweicht.
        Automatisch ergänzte Positionen werden nicht berücksichtigt.
      </p>
      {warnings.length === 0 ? (
        <p>Keine Auffälligkeiten gefunden.</p>
      ) : (
        warnings.map((pair, idx) => (
          <div className="line" key={idx}>
            <b>Ähnliche Längen prüfen</b>
            {pair.map((i) => {
              const { bauteil } = parseEinbauort(i.einbauort, project?.baugruppe);
              // Sprint 6: Positionsnummer ergänzt, damit sich mehrere Positionen
              // mit identischen Materialangaben eindeutig unterscheiden lassen
              // (z. B. "Pos. 12 · 12 × Sechskantschraube M12×20 · Steg").
              return (
                <p key={i.id}>
                  Pos. {i.pos} · {i.menge} × {i.bezeichnung} {i.groesse}×{i.laenge} · {bauteil}
                </p>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}
