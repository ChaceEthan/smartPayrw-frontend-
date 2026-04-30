// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import EmptyState from "../components/shared/EmptyState.jsx";
import Loader from "../components/ui/Loader.jsx";
import Skeleton from "../components/ui/Skeleton.jsx";
import { getApiErrorMessage } from "../services/api.js";
import { createEmployeeRequest, getEmployeesRequest } from "../services/employees.api.js";
import {
  getStoredEmployees,
  normalizeEmployee,
  normalizeEmployees,
  saveStoredEmployees,
  upsertEmployee,
} from "../utils/companyData.js";
import formatCurrency from "../utils/formatCurrency.js";

const initialForm = {
  name: "",
  email: "",
  role: "",
  salary: "",
};

export default function Employees() {
  const { t } = useTranslation();
  const [employees, setEmployees] = useState(() => getStoredEmployees());
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const numericSalary = useMemo(() => Number(String(form.salary).replace(/[^\d.]/g, "")), [form.salary]);
  const canSubmit = useMemo(
    () => Boolean(form.name.trim() && Number.isFinite(numericSalary) && numericSalary > 0 && !isSubmitting),
    [form.name, isSubmitting, numericSalary]
  );

  useEffect(() => {
    let isMounted = true;

    async function loadEmployees() {
      try {
        const { data } = await getEmployeesRequest();
        if (isMounted) {
          const loadedEmployees = saveStoredEmployees(normalizeEmployees(data));
          setEmployees(loadedEmployees);
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

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!canSubmit) {
      setError(t("employees.validation"));
      return;
    }

    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role.trim(),
        salary: numericSalary,
      };
      const { data } = await createEmployeeRequest(payload);
      const createdEmployee = normalizeEmployee(data) || normalizeEmployee(payload);
      const nextEmployees = saveStoredEmployees(upsertEmployee(employees, createdEmployee));

      setEmployees(nextEmployees);
      setForm(initialForm);
      setSuccess(t("employees.addSuccess"));
    } catch (err) {
      setError(getApiErrorMessage(err, t("employees.addError")));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="page-grid employees-page">
      <section className="hero-card employees-hero">
        <div className="section-heading">
          <p className="eyebrow">{t("employees.eyebrow")}</p>
          <h2>{t("employees.title")}</h2>
          <p>{t("employees.description")}</p>
        </div>
      </section>

      <section className="employees-layout">
        <form className="panel employee-form" onSubmit={handleSubmit}>
          <div className="section-heading">
            <p className="eyebrow">{t("employees.formEyebrow")}</p>
            <h3>{t("employees.formTitle")}</h3>
          </div>

          <label>
            {t("employees.name")}
            <input
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder={t("employees.namePlaceholder")}
            />
          </label>

          <label>
            {t("employees.email")}
            <input
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              placeholder={t("employees.emailPlaceholder")}
            />
          </label>

          <label>
            {t("employees.role")}
            <input
              value={form.role}
              onChange={(event) => updateField("role", event.target.value)}
              placeholder={t("employees.rolePlaceholder")}
            />
          </label>

          <label>
            {t("employees.salary")}
            <input
              inputMode="decimal"
              value={form.salary}
              onChange={(event) => updateField("salary", event.target.value)}
              placeholder={t("employees.salaryPlaceholder")}
            />
          </label>

          <button type="submit" className="button button--primary employee-submit" disabled={!canSubmit}>
            {isSubmitting ? t("employees.adding") : t("employees.add")}
          </button>
        </form>

        <section className="panel employees-list">
          <div className="section-heading">
            <p className="eyebrow">{t("employees.listEyebrow")}</p>
            <h3>{t("employees.listTitle")}</h3>
          </div>

          {isLoading && (
            <div className="stack">
              <Loader label={t("employees.loading")} />
              <Skeleton style={{ height: 48 }} />
              <Skeleton style={{ height: 48 }} />
            </div>
          )}

          {error && <div className="alert alert--error">{error}</div>}
          {success && <div className="alert alert--success">{success}</div>}

          {!isLoading && !error && employees.length === 0 && (
            <EmptyState title={t("employees.emptyTitle")} message={t("employees.emptyMessage")} />
          )}

          {!isLoading && employees.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t("employees.name")}</th>
                    <th>{t("employees.email")}</th>
                    <th>{t("employees.role")}</th>
                    <th>{t("employees.salary")}</th>
                    <th>{t("employees.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => (
                    <tr key={employee.id || employee.email || employee.name}>
                      <td>{employee.name || t("employees.notProvided")}</td>
                      <td>{employee.email || t("employees.notProvided")}</td>
                      <td>{employee.role || t("employees.defaultRole")}</td>
                      <td className="salary-cell">
                        {employee.salary ? formatCurrency(employee.salary) : t("employees.notProvided")}
                      </td>
                      <td>{employee.status || t("employees.active")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </div>
  );
}
