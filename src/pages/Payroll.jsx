// @ts-nocheck
import { useEffect, useState } from "react";
import EmptyState from "../components/shared/EmptyState.jsx";
import Loader from "../components/ui/Loader.jsx";
import { getApiErrorMessage } from "../services/api.js";
import { getPayrollRequest } from "../services/payroll.api.js";
import formatCurrency from "../utils/formatCurrency.js";

function normalizePayroll(data) {
  return Array.isArray(data) ? data : data?.payrolls || data?.data || [];
}

export default function Payroll() {
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
          setError(getApiErrorMessage(err, "Unable to load payroll records."));
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
  }, []);

  return (
    <section className="panel">
      <div className="section-heading">
        <p className="eyebrow">Compensation</p>
        <h2>Payroll</h2>
      </div>

      {isLoading && <Loader label="Loading payroll..." />}
      {error && <div className="alert alert--error">{error}</div>}

      {!isLoading && !error && payroll.length === 0 && (
        <EmptyState title="No payroll records" message="Completed payroll runs will appear here." />
      )}

      {!isLoading && !error && payroll.length > 0 && (
        <div className="cards-grid">
          {payroll.map((item) => (
            <article className="stat-card" key={item.id || item._id || item.period}>
              <span>{item.period || item.month || "Payroll run"}</span>
              <strong>{formatCurrency(item.totalNet || item.netPay || item.amount)}</strong>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
