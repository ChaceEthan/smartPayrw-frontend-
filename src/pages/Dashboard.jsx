import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const readinessItems = [
  {
    titleKey: "dashboard.readiness.authTitle",
    descriptionKey: "dashboard.readiness.authDescription",
  },
  {
    titleKey: "dashboard.readiness.routesTitle",
    descriptionKey: "dashboard.readiness.routesDescription",
  },
  {
    titleKey: "dashboard.readiness.aiTitle",
    descriptionKey: "dashboard.readiness.aiDescription",
  },
];

export default function Dashboard() {
  const { t } = useTranslation();

  return (
    <div className="page-grid">
      <section className="hero-card">
        <p className="eyebrow">{t("dashboard.eyebrow")}</p>
        <h2>{t("dashboard.title")}</h2>
        <p>{t("dashboard.description")}</p>
        <Link className="button button--primary" to="/ai-chat">
          {t("dashboard.cta")}
        </Link>
      </section>

      <section className="stats-grid" aria-label={t("dashboard.readinessLabel")}>
        {readinessItems.map((item) => (
          <article className="stat-card" key={item.titleKey}>
            <span>{t(item.titleKey)}</span>
            <p>{t(item.descriptionKey)}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
