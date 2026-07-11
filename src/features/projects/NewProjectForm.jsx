import FormCard from "../../components/FormCard";

// Erster Schritt legt bewusst nur das Projekt selbst an (Sprint 4): keine
// Baugruppe erzwingen. Baugruppen werden danach auf der Projektseite
// ergänzt. autoComplete="off", damit der Browser hier keine alten,
// zuvor abgeschickten Werte vorschlägt/einträgt - das Formular startet leer.
export default function NewProjectForm({ setView, createProject }) {
  return (
    <FormCard title="Neues Projekt" back={() => setView("projects")} onSubmit={createProject}>
      <input name="nr" placeholder="Projektnummer" autoComplete="off" required />
      <input name="name" placeholder="Kurzbezeichnung" autoComplete="off" required />
      <input name="zeichnung" placeholder="Zeichnungsnummer" autoComplete="off" />
      <button>Projekt anlegen</button>
    </FormCard>
  );
}
