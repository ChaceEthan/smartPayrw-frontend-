// @ts-nocheck
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../shared/LanguageSwitcher.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { getActiveCompany } from "../../utils/companyData.js";

export default function Navbar() {
  const { logout, user } = useAuth();
  const { t } = useTranslation();
  const company = getActiveCompany(user);

  return (
    <header className="navbar flex-col items-start md:flex-row md:items-center">
      <div className="min-w-0">
        <p className="eyebrow">{t("app.workspace")}</p>
        <h1>{t("app.commandCenter")}</h1>
      </div>
      <div className="navbar__actions w-full md:w-auto">
        <div className="navbar__identity">
          <span className="navbar__user">{user?.name || user?.email || t("app.authenticatedUser")}</span>
          <small>{company?.name || t("company.noCompanyShort")}</small>
        </div>
        <button type="button" className="button button--ghost" onClick={logout}>
          {t("auth.signOut")}
        </button>
        <LanguageSwitcher />
      </div>
    </header>
  );
}
