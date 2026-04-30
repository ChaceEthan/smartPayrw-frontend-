// @ts-nocheck
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../shared/LanguageSwitcher.jsx";
import { useAuth } from "../../hooks/useAuth.js";

export default function Navbar() {
  const { logout, user } = useAuth();
  const { t } = useTranslation();

  return (
    <header className="navbar flex-col items-start md:flex-row md:items-center">
      <div className="min-w-0">
        <p className="eyebrow">{t("app.workspace")}</p>
        <h1>{t("app.commandCenter")}</h1>
      </div>
      <div className="navbar__actions w-full md:w-auto">
        <span className="navbar__user">{user?.name || user?.email || t("app.authenticatedUser")}</span>
        <button type="button" className="button button--ghost" onClick={logout}>
          {t("auth.signOut")}
        </button>
        <LanguageSwitcher />
      </div>
    </header>
  );
}
