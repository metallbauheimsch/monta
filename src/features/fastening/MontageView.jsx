import { groupBy } from "../../utils/helpers";
import { parseEinbauort } from "../../utils/structure";
import Line from "./Line";

// Montageansicht gruppiert projektweit nach Bauteilen:
// große Baugruppenkiste, kleine Kisten je Bauteil.
export default function MontageView({ items, project }) {
  const groups = groupBy(items, (i) => parseEinbauort(i.einbauort, project?.baugruppe).bauteil);
  return Object.entries(groups).map(([bauteil, arr]) => (
    <div className="card" key={bauteil}>
      <h3>Bauteil {bauteil}</h3>
      {arr.map((i) => <Line key={i.id} item={i} />)}
    </div>
  ));
}
