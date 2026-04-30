// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { BadgeCheck, BriefcaseBusiness, Building2, ReceiptText } from "lucide-react";
import EmptyState from "../components/shared/EmptyState.jsx";
import Loader from "../components/ui/Loader.jsx";
import useAuth from "../hooks/useAuth.js";
import { getApiErrorMessage } from "../services/api.js";
import { getMyCompanyRequest } from "../services/company.api.js";
import { getActiveCompany, hasCompany, normalizeCompany, saveStoredCompany } from "../utils/companyData.js";

function CompanyField({ icon: Icon, label, value }) {
  return (
    <article className="detail-item">
      <span className="card-icon" aria-hidden="true">
        <Icon size={20} strokeWidth={2.2} />
      </span>
      <div>
        <span>{label}</span>
        <strong>{value || "-"}</strong>
      </div>
    </article>
  );
}

export default function MyCompany() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const fallbackCompany = useMemo(() => getActiveCompany(user), [user]);
  const [company, setCompany] = useState(() => fallbackCompany);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadCompany() {
      setError("");

      try {
        const { data } = await getMyCompanyRequest();
        const loadedCompany = saveStoredCompany(normalizeCompany(data));

        if (isMounted) {
          setCompany(loadedCompany);
        }
      } catch (err) {
        if (isMounted) {
          setCompany(fallbackCompany);
          setError(getApiErrorMessage(err, t("myCompany.loadError")));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadCompany();

    return () => {
      isMounted = false;
    };
  }, [fallbackCompany, t]);

  return (
    <div className="page-grid company-page">
      <section className="hero-card company-hero">
        <p className="eyebrow">{t("myCompany.eyebrow")}</p>
        <h2>{t("myCompany.title")}</h2>
        <p>{t("myCompany.description")}</p>
      </section>

      {isLoading && (
        <section className="panel">
          <Loader label={t("myCompany.loading")} />
        </section>
      )}

      {error && <div className="alert alert--error">{error}</div>}

      {!isLoading && !hasCompany(company) && (
        <section className="panel">
          <EmptyState title={t("company.emptyTitle")} message={t("company.emptyMessage")} />
          <Link className="button button--primary company-submit" to="/company">
            {t("company.registerCta")}
          </Link>
        </section>
      )}

      {!isLoading && hasCompany(company) && (
        <section className="panel company-profile">
          <div className="section-heading">
            <p className="eyebrow">{t("company.profileEyebrow")}</p>
            <h3>{t("company.profileTitle")}</h3>
            <p>{t("company.profileDescription")}</p>
          </div>

          <div className="detail-grid detail-grid--three">
            <CompanyField icon={Building2} label={t("company.name")} value={company.name} />
            <CompanyField icon={ReceiptText} label={t("company.tin")} value={company.tin} />
            <CompanyField icon={BriefcaseBusiness} label={t("company.businessType")} value={company.businessType} />
            <CompanyField icon={BadgeCheck} label={t("company.status")} value={t("company.registered")} />
          </div>
        </section>
      )}
    </div>
  );
}
