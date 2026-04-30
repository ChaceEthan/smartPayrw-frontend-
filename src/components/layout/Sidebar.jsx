// @ts-nocheck
import {
  Bot,
  BriefcaseBusiness,
  Building2,
  ChartNoAxesColumn,
  CreditCard,
  FileText,
  LayoutDashboard,
  Landmark,
  PiggyBank,
  ShieldCheck,
  Store,
  Users,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import logoUrl from "../../assets/logo.svg";

const navItems = [
  { to: "/", labelKey: "nav.dashboard", shortLabelKey: "nav.short.dashboard", icon: LayoutDashboard },
  { to: "/company", labelKey: "nav.company", shortLabelKey: "nav.short.company", icon: BriefcaseBusiness },
  { to: "/my-company", labelKey: "nav.myCompany", shortLabelKey: "nav.short.myCompany", icon: Building2 },
  { to: "/tax-dashboard", labelKey: "nav.taxDashboard", shortLabelKey: "nav.short.taxDashboard", icon: Landmark },
  { to: "/business", labelKey: "nav.business", shortLabelKey: "nav.short.business", icon: Store },
  { to: "/employees", labelKey: "nav.employees", shortLabelKey: "nav.short.employees", icon: Users },
  { to: "/payroll", labelKey: "nav.payroll", shortLabelKey: "nav.short.payroll", icon: ChartNoAxesColumn },
  { to: "/payments", labelKey: "nav.payments", shortLabelKey: "nav.short.payments", icon: CreditCard },
  { to: "/pension", labelKey: "nav.pension", shortLabelKey: "nav.short.pension", icon: PiggyBank },
  { to: "/reports", labelKey: "nav.reports", shortLabelKey: "nav.short.reports", icon: FileText },
  { to: "/admin", labelKey: "nav.admin", shortLabelKey: "nav.short.admin", icon: ShieldCheck },
  { to: "/admin/companies", labelKey: "nav.adminCompanies", shortLabelKey: "nav.short.adminCompanies", icon: Building2 },
  { to: "/ai-chat", labelKey: "nav.aiChat", shortLabelKey: "nav.short.aiChat", icon: Bot },
];

export default function Sidebar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const activeItem = navItems.find((item) => item.to === location.pathname) || navItems[0];

  function handleMobileNavChange(event) {
    navigate(event.target.value);
  }

  return (
    <aside className="sidebar md:min-h-screen">
      <div className="brand brand--responsive">
        <span className="brand__mark" aria-hidden="true">
          <img className="brand__mark-image" src={logoUrl} alt="" />
        </span>
        <div className="brand__text">
          <strong>SmartPayRW</strong>
          <small>{t("nav.brandSubtitle")}</small>
        </div>
      </div>

      <label className="mobile-nav">
        <span>{t("nav.mobileMenu")}</span>
        <select value={activeItem.to} onChange={handleMobileNavChange} aria-label={t("nav.mainNavigation")}>
          {navItems.map((item) => (
            <option key={item.to} value={item.to}>
              {t(item.labelKey)}
            </option>
          ))}
        </select>
      </label>

      <nav className="sidebar__nav" aria-label={t("nav.mainNavigation")}>
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) => (isActive ? "active" : undefined)}
              title={t(item.labelKey)}
            >
              <Icon aria-hidden="true" size={18} strokeWidth={2.2} />
              <span className="nav-label nav-label--short">{t(item.shortLabelKey)}</span>
              <span className="nav-label nav-label--full">{t(item.labelKey)}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
