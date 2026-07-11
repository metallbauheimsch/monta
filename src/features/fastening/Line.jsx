import { articleKey } from "../../utils/helpers";

export default function Line({ item }) {
  return <div className="line"><b>{item.menge} × {articleKey(item)}</b>{item.hinweis && <p>{item.hinweis}</p>}</div>;
}
