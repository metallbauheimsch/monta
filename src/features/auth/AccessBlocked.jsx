import { useAuth } from "../../auth/AuthContext";

export default function AccessBlocked() {
  const { user, profile, signOut } = useAuth();
  const email = profile?.email || user?.email || "";

  return (
    <div className="authPage">
      <div className="authCard">
        <p className="authStatusText">
          Ihr Benutzerkonto wurde gesperrt. Bitte wenden Sie sich an einen Administrator.
        </p>
        <p className="hint">{email}</p>
        <div className="form">
          <button type="button" className="ghost" onClick={() => signOut()}>
            Abmelden
          </button>
        </div>
      </div>
    </div>
  );
}
