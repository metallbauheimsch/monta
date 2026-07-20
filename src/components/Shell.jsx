export default function Shell({
  children,
  userLabel,
  showAdmin,
  onOpenAdmin,
  onLogout,
  compact = false,
}) {
  return (
    <>
      <header className={compact ? "headerAuth" : undefined}>
        <div className="headerBrand">
          <img src="/icon-96.png" alt="" className="headerLogo" width={40} height={40} />
          <div>
            <h1>MONTA</h1>
            {!compact && <p>Befestigungsmaterial-Workflow · Web-App v0.4</p>}
          </div>
        </div>
        {onLogout && (
          <div className="headerActions noPrint">
            {showAdmin && (
              <button type="button" className="ghost headerBtn" onClick={onOpenAdmin}>
                Benutzerverwaltung
              </button>
            )}
            {userLabel && <span className="headerUser">{userLabel}</span>}
            <button type="button" className="ghost headerBtn" onClick={onLogout}>
              Abmelden
            </button>
          </div>
        )}
      </header>
      <main>{children}</main>
    </>
  );
}
