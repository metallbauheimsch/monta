export default function Shell({ children, deviceMode, setDeviceMode }) {
  return (
    <>
      <header>
        <div>
          <h1>MONTA</h1>
          <p>Befestigungsmaterial-Workflow · Web-App v0.4</p>
        </div>
        <div className="modeSwitch">
          <button className={deviceMode === "pc" ? "active" : ""} onClick={() => setDeviceMode("pc")}>PC</button>
          <button className={deviceMode === "mobil" ? "active" : ""} onClick={() => setDeviceMode("mobil")}>Mobil</button>
        </div>
      </header>
      <main>{children}</main>
    </>
  );
}
