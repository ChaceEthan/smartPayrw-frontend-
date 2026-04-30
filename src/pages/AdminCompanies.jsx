// @ts-nocheck
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import EmptyState from "../components/shared/EmptyState.jsx";
import Loader from "../components/ui/Loader.jsx";
import { getApiErrorMessage } from "../services/api.js";
import { getAdminCompaniesRequest } from "../services/company.api.js";
import { normalizeCompany } from "../utils/companyData.js";

function normalizeCompanies(data) {
  const root = data?.data || data || {};
  const list = Array.isArray(data)
    ? data
    : Array.isArray(root)
      ? root
      : root.companies || root.items || root.results || root.data || [];

  return Array.isArray(list) ? list.map(normalizeCompany).filter(Boolean) : [];
}

export default function AdminCompanies() {
  const { t } = useTranslation();
  const [companies, setCompanies] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadCompanies() {
      try {
        const { data } = await getAdminCompaniesRequest();

        if (isMounted) {
          setCompanies(normalizeCompanies(data));
        }
      } catch (err) {
        if (isMounted) {
          setError(getApiErrorMessage(err, t("adminCompanies.loadError")));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadCompanies();

    return () => {
      isMounted = false;
    };
  }, [t]);

  return (
    <div className="page-grid admin-companies-page">
      <section className="hero-card fintech-hero">
        <p className="eyebrow">{t("adminCompanies.eyebrow")}</p>
        <h2>{t("adminCompanies.title")}</h2>
        <p>{t("adminCompanies.description")}</p>
      </section>

      <section className="panel">
        <div className="section-heading">
          <p className="eyebrow">{t("adminCompanies.listEyebrow")}</p>
          <h3>{t("adminCompanies.listTitle")}</h3>
        </div>

        {isLoading && <Loader label={t("adminCompanies.loading")} />}
        {error && <div className="alert alert--error">{error}</div>}

        {!isLoading && !error && companies.length === 0 && (
          <EmptyState title={t("adminCompanies.emptyTitle")} message={t("adminCompanies.emptyMessage")} />
        )}

        {!isLoading && companies.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("company.name")}</th>
                  <th>{t("company.tin")}</th>
                  <th>{t("company.businessType")}</th>
                  <th>{t("company.status")}</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr key={company.id || company.tin || company.name}>
                    <td>{company.name || t("employees.notProvided")}</td>
                    <td>{company.tin || t("employees.notProvided")}</td>
                    <td>{company.businessType || t("employees.notProvided")}</td>
                    <td>{company.raw?.status || t("company.registered")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
