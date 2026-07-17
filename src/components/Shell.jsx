export default function Shell({ children }) {
  return (
    <>
      <header>
        <div>
          <h1>MONTA</h1>
          <p>Befestigungsmaterial-Workflow · Web-App v0.4</p>
        </div>
      </header>
      <main>{children}</main>
    </>
  );
}
