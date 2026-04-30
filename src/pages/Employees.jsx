// @ts-nocheck
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import EmptyState from "../components/shared/EmptyState.jsx";
import Loader from "../components/ui/Loader.jsx";
import Skeleton from "../components/ui/Skeleton.jsx";
import { getApiErrorMessage } from "../services/api.js";
import { getEmployeesRequest } from "../services/employees.api.js";

function normalizeEmployees(data) {
  return Array.isArray(data) ? data : data?.employees || data?.data || [];
}

export default function Employees() {
  const { t } = useTranslation();
  const [employees, setEmployees] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadEmployees() {
      try {
        const { data } = await getEmployeesRequest();
        if (isMounted) {
          setEmployees(normalizeEmployees(data));
        }
      } catch (err) {
        if (isMounted) {
          setError(getApiErrorMessage(err, t("employees.loadError")));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadEmployees();

    return () => {
      isMounted = false;
    };
  }, [t]);

  return (
    <section className="panel">
      <div className="section-heading">
        <p className="eyebrow">{t("employees.eyebrow")}</p>
        <h2>{t("employees.title")}</h2>
      </div>

      {isLoading && (
        <div className="stack">
          <Loader label={t("employees.loading")} />
          <Skeleton style={{ height: 48 }} />
          <Skeleton style={{ height: 48 }} />
        </div>
      )}

      {error && <div className="alert alert--error">{error}</div>}

      {!isLoading && !error && employees.length === 0 && (
        <EmptyState title={t("employees.emptyTitle")} message={t("employees.emptyMessage")} />
      )}

      {!isLoading && !error && employees.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("employees.name")}</th>
                <th>{t("employees.email")}</th>
                <th>{t("employees.role")}</th>
                <th>{t("employees.status")}</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id || employee._id || employee.email}>
                  <td>{employee.name || `${employee.firstName || ""} ${employee.lastName || ""}`}</td>
                  <td>{employee.email || t("employees.notProvided")}</td>
                  <td>{employee.role || employee.position || t("employees.defaultRole")}</td>
                  <td>{employee.status || t("employees.active")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
