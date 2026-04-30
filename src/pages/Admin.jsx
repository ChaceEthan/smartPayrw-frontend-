// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Building2, CircleDollarSign, ReceiptText, ShieldCheck, Users, WalletCards } from "lucide-react";
import Loader from "../components/ui/Loader.jsx";
import useAuth from "../hooks/useAuth.js";
import { getEmployeesRequest } from "../services/employees.api.js";
import { getPayrollRequest } from "../services/payroll.api.js";
import { buildCompanyContext, getActiveCompany, getStoredEmployees, normalizeEmployees, saveStoredEmployees } from "../utils/companyData.js";
import { getStoredTransactions, summarizeTransactions } from "../utils/businessData.js";
import formatCurrency from "../utils/formatCurrency.js";

function normalizePayroll(data) {
  return Array.isArray(data) ? data : data?.payrolls || data?.items || data?.data || [];
}

function readMoney(item, keys) {
  for (const key of keys) {
    const value = item?.[key];

    if (value !== undefined && value !== null && value !== "") {
      const numeric = Number(String(value).replace(/[^\d.-]/g, ""));

      if (Number.isFinite(numeric)) {
        return numeric;
      }
    }
  }

  return 0;
}

function AdminCard({ icon: Icon, label, value, caption }) {
  return (
    <article className="stat-card analytics-card admin-stat-card">
      <div className="card-icon" aria-hidden="true">
        <Icon size={20} strokeWidth={2.2} />
      </div>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{caption}</p>
    </article>
  );
}

export default function Admin() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const company = useMemo(() => getActiveCompany(user), [user]);
  const [employees, setEmployees] = useState(() => getStoredEmployees());
  const [payroll, setPayroll] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadAdminData() {
      try {
        const [employeesResponse, payrollResponse] = await Promise.all([getEmployeesRequest(), getPayrollRequest()]);
        const loadedEmployees = saveStoredEmployees(normalizeEmployees(employeesResponse.data));

        if (isMounted) {
          setEmployees(loadedEmployees);
          setPayroll(normalizePayroll(payrollResponse.data));
        }
      } catch {
        if (isMounted) {
          setEmployees(getStoredEmployees());
          setNotice(t("admin.notice"));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadAdminData();

    return () => {
      isMounted = false;
    };
  }, [t]);

  const companyContext = useMemo(() => buildCompanyContext(company, employees), [company, employees]);
  const transactionSummary = useMemo(() => summarizeTransactions(getStoredTransactions()), []);
  const payrollTotal =
    payroll.reduce((total, item) => total + readMoney(item, ["totalGross", "grossPayroll", "gross", "amount"]), 0) ||
    companyContext.grossPayroll;
  const taxTotal = payroll.reduce((total, item) => total + readMoney(item, ["taxes", "paye", "totalTax"]), 0);
  const totalUsers = (user ? 1 : 0) + employees.length;
  const companies = company ? 1 : 0;

  return (
    <div className="page-grid fintech-page admin-page">
      <section className="hero-card fintech-hero">
        <p className="eyebrow">{t("admin.eyebrow")}</p>
        <h2>{t("admin.title")}</h2>
        <p>{t("admin.description")}</p>
      </section>

      {notice && <div className="alert alert--error">{notice}</div>}
      {isLoading && (
        <section className="panel">
          <Loader label={t("admin.loading")} />
        </section>
      )}

      {!isLoading && (
        <>
          <section className="analytics-grid grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <AdminCard
              icon={Users}
              label={t("admin.cards.users")}
              value={totalUsers}
              caption={t("admin.cards.usersCaption")}
            />
            <AdminCard
              icon={Building2}
              label={t("admin.cards.companies")}
              value={companies}
              caption={company?.name || t("company.noCompanyShort")}
            />
            <AdminCard
              icon={WalletCards}
              label={t("admin.cards.payroll")}
              value={formatCurrency(payrollTotal)}
              caption={t("admin.cards.payrollCaption")}
            />
            <AdminCard
              icon={ReceiptText}
              label={t("admin.cards.taxes")}
              value={formatCurrency(taxTotal)}
              caption={t("admin.cards.taxesCaption")}
            />
            <AdminCard
              icon={CircleDollarSign}
              label={t("admin.cards.sales")}
              value={formatCurrency(transactionSummary.totalSales)}
              caption={t("admin.cards.salesCaption")}
            />
          </section>

          <section className="admin-layout">
            <article className="panel">
              <div className="section-heading">
                <p className="eyebrow">{t("admin.healthEyebrow")}</p>
                <h3>{t("admin.healthTitle")}</h3>
              </div>
              <div className="admin-health-list">
                <div>
                  <ShieldCheck size={20} aria-hidden="true" />
                  <span>{t("admin.health.company")}</span>
                  <strong>{company ? t("admin.health.ready") : t("admin.health.pending")}</strong>
                </div>
                <div>
                  <ShieldCheck size={20} aria-hidden="true" />
                  <span>{t("admin.health.employees")}</span>
                  <strong>{employees.length}</strong>
                </div>
                <div>
                  <ShieldCheck size={20} aria-hidden="true" />
                  <span>{t("admin.health.transactions")}</span>
                  <strong>{transactionSummary.count}</strong>
                </div>
              </div>
            </article>

            <article className="panel">
              <div className="section-heading">
                <p className="eyebrow">{t("admin.workflowEyebrow")}</p>
                <h3>{t("admin.workflowTitle")}</h3>
                <p>{t("admin.workflowText")}</p>
              </div>
              <div className="innovation-strip innovation-strip--compact">
                <article>
                  <WalletCards size={20} aria-hidden="true" />
                  <h4>{t("admin.workflow.payrollTitle")}</h4>
                  <p>{t("admin.workflow.payrollText")}</p>
                </article>
                <article>
                  <ReceiptText size={20} aria-hidden="true" />
                  <h4>{t("admin.workflow.taxTitle")}</h4>
                  <p>{t("admin.workflow.taxText")}</p>
                </article>
              </div>
            </article>
          </section>
        </>
      )}
    </div>
  );
}
