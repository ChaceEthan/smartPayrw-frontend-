// @ts-nocheck
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import EmptyState from "../components/shared/EmptyState.jsx";
import Loader from "../components/ui/Loader.jsx";
import { getApiErrorMessage } from "../services/api.js";
import { getPayrollRequest } from "../services/payroll.api.js";
import formatCurrency from "../utils/formatCurrency.js";

function normalizePayroll(data) {
  return Array.isArray(data) ? data : data?.payrolls || data?.data || [];
}

export default function Payroll() {
  const { t } = useTranslation();
  const [payroll, setPayroll] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadPayroll() {
      try {
        const { data } = await getPayrollRequest();
        if (isMounted) {
          setPayroll(normalizePayroll(data));
        }
      } catch (err) {
        if (isMounted) {
          setError(getApiErrorMessage(err, t("payroll.loadError")));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadPayroll();

    return () => {
      isMounted = false;
    };
  }, [t]);

  return (
    <section className="panel">
      <div className="section-heading">
        <p className="eyebrow">{t("payroll.eyebrow")}</p>
        <h2>{t("payroll.title")}</h2>
      </div>

      {isLoading && <Loader label={t("payroll.loading")} />}
      {error && <div className="alert alert--error">{error}</div>}

      {!isLoading && !error && payroll.length === 0 && (
        <EmptyState title={t("payroll.emptyTitle")} message={t("payroll.emptyMessage")} />
      )}

      {!isLoading && !error && payroll.length > 0 && (
        <div className="cards-grid">
          {payroll.map((item) => (
            <article className="stat-card" key={item.id || item._id || item.period}>
              <span>{item.period || item.month || t("payroll.defaultRun")}</span>
              <strong>{formatCurrency(item.totalNet || item.netPay || item.amount)}</strong>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
