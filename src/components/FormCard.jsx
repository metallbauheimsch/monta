export default function FormCard({ title, back, onSubmit, children }) {
  return <><button className="ghost" onClick={back}>← Zurück</button><form className="card form" onSubmit={onSubmit} autoComplete="off"><h2>{title}</h2>{children}</form></>;
}
