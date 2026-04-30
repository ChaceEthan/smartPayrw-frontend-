// @ts-nocheck
import { useAuth } from "../../hooks/useAuth.js";

export default function Navbar() {
  const { logout, user } = useAuth();

  return (
    <header className="navbar">
      <div>
        <p className="eyebrow">SmartPayRW workspace</p>
        <h1>Payroll Command Center</h1>
      </div>
      <div className="navbar__actions">
        <span>{user?.name || user?.email || "Authenticated user"}</span>
        <button type="button" className="button button--ghost" onClick={logout}>
          Sign out
        </button>
      </div>
    </header>
  );
}
