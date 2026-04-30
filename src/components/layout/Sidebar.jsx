import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

const navItems = [
  { to: "/", labelKey: "nav.dashboard", shortLabelKey: "nav.short.dashboard" },
  { to: "/employees", labelKey: "nav.employees", shortLabelKey: "nav.short.employees" },
  { to: "/payroll", labelKey: "nav.payroll", shortLabelKey: "nav.short.payroll" },
  { to: "/payments", labelKey: "nav.payments", shortLabelKey: "nav.short.payments" },
  { to: "/ai-chat", labelKey: "nav.aiChat", shortLabelKey: "nav.short.aiChat" },
];

export default function Sidebar() {
  const { t } = useTranslation();

  return (
    <aside className="sidebar md:min-h-screen">
      <div className="brand brand--responsive">
        <span className="brand__mark" aria-hidden="true">SP</span>
        <div className="brand__text">
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
            title={t(item.labelKey)}
          >
            <span className="nav-label nav-label--short">{t(item.shortLabelKey)}</span>
            <span className="nav-label nav-label--full">{t(item.labelKey)}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
