import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

const navItems = [
  { to: "/", labelKey: "nav.dashboard" },
  { to: "/employees", labelKey: "nav.employees" },
  { to: "/payroll", labelKey: "nav.payroll" },
  { to: "/ai-chat", labelKey: "nav.aiChat" },
];

export default function Sidebar() {
  const { t } = useTranslation();

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand__mark">SP</span>
        <div>
          <strong>SmartPayRW</strong>
          <small>{t("nav.brandSubtitle")}</small>
        </div>
      </div>

      <nav className="sidebar__nav" aria-label={t("nav.mainNavigation")}>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) => (isActive ? "active" : undefined)}
          >
            {t(item.labelKey)}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
