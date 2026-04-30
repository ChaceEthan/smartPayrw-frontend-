// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Banknote,
  Building2,
  Landmark,
  PhoneCall,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";
import Loader from "../components/ui/Loader.jsx";
import useAuth from "../hooks/useAuth.js";
import { getApiErrorMessage } from "../services/api.js";
import { getEmployeesRequest } from "../services/employees.api.js";
import { analyzeTinRequest } from "../services/tin.api.js";
import { buildCompanyContext, getActiveCompany, getStoredEmployees, normalizeEmployees, saveStoredEmployees } from "../utils/companyData.js";
import formatCurrency from "../utils/formatCurrency.js";
import { calculatePayrollForSalary, normalizeTin } from "../utils/rwandaPayroll.js";

const deadlineItems = [
  { key: "paye", day: "15", labelKey: "tax.deadlines.payeTitle", textKey: "tax.deadlines.payeText" },
  { key: "rssb", day: "15", labelKey: "tax.deadlines.rssbTitle", textKey: "tax.deadlines.rssbText" },
  { key: "records", day: "30", labelKey: "tax.deadlines.recordsTitle", textKey: "tax.deadlines.recordsText" },
];

const innovationItems = [
  { key: "fast", icon: Sparkles, titleKey: "tax.innovation.fastTitle", textKey: "tax.innovation.fastText" },
  { key: "simple", icon: ShieldCheck, titleKey: "tax.innovation.simpleTitle", textKey: "tax.innovation.simpleText" },
  { key: "ai", icon: ReceiptText, titleKey: "tax.innovation.aiTitle", textKey: "tax.innovation.aiText" },
];

function readNumber(source, keys) {
  for (const key of keys) {
    const value = source?.[key];

    if (value !== undefined && value !== null && value !== "") {
      const numeric = Number(String(value).replace(/[^\d.-]/g, ""));

      if (Number.isFinite(numeric)) {
        return numeric;
      }
    }
  }

  return 0;
}

function normalizeTaxPayroll(payload) {
  const source = payload || {};

  return {
    grossPayroll: readNumber(source, ["grossPayroll", "monthlyGrossPayroll", "totalGrossPayroll", "gross"]),
    paye: readNumber(source, ["paye", "PAYE", "payAsYouEarn"]),
    employeePension: readNumber(source, ["employeePension", "rssbEmployee", "pensionEmployee"]),
    employerPension: readNumber(source, ["employerPension", "rssbEmployer", "pensionEmployer"]),
    employerContributions: readNumber(source, ["employerContributions", "employerContribution"]),
    totalRemittance: readNumber(source, ["totalRemittance", "remittance", "monthlyRemittance"]),
  };
}

function buildEmployeePayroll(employees) {
  return employees.reduce(
    (summary, employee) => {
      const payroll = calculatePayrollForSalary(employee.salary || 0);

      return {
        grossPayroll: summary.grossPayroll + payroll.gross,
        paye: summary.paye + payroll.paye,
        employeePension: summary.employeePension + payroll.employeePension,
        employerPension: summary.employerPension + payroll.employerPension,
        employerContributions: summary.employerContributions + payroll.employerContributions,
        totalRemittance: summary.totalRemittance + payroll.totalRemittance,
      };
    },
    {
      grossPayroll: 0,
      paye: 0,
      employeePension: 0,
      employerPension: 0,
      employerContributions: 0,
      totalRemittance: 0,
    }
  );
}

function MetricCard({ icon: Icon, label, value, caption }) {
  return (
    <article className="stat-card analytics-card">
      <div className="card-icon" aria-hidden="true">
        <Icon size={20} strokeWidth={2.2} />
      </div>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{caption}</p>
    </article>
  );
}

export default function TaxDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const company = useMemo(() => getActiveCompany(user), [user]);
  const [tin, setTin] = useState(() => company?.tin || "");
  const [employees, setEmployees] = useState(() => getStoredEmployees());
  const [tinAnalysis, setTinAnalysis] = useState(null);
  const [error, setError] = useState("");
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (company?.tin) {
      setTin(company.tin);
    }
  }, [company?.tin]);

  useEffect(() => {
    let isMounted = true;

    async function loadEmployees() {
      try {
        const { data } = await getEmployeesRequest();
        const loadedEmployees = saveStoredEmployees(normalizeEmployees(data));

        if (isMounted) {
          setEmployees(loadedEmployees);
        }
      } catch {
        if (isMounted) {
          setEmployees(getStoredEmployees());
        }
      } finally {
        if (isMounted) {
          setIsLoadingEmployees(false);
        }
      }
    }

    loadEmployees();

    return () => {
      isMounted = false;
    };
  }, []);

  const companyContext = useMemo(() => buildCompanyContext(company, employees), [company, employees]);
  const analyzedPayroll = normalizeTaxPayroll(tinAnalysis?.payrollSummary || tinAnalysis?.payroll || tinAnalysis?.payrollData);
  const employeePayroll = useMemo(() => buildEmployeePayroll(employees), [employees]);
  const payroll = analyzedPayroll.grossPayroll > 0 || analyzedPayroll.totalRemittance > 0 ? analyzedPayroll : employeePayroll;
  const pensionTotal = payroll.employeePension + payroll.employerPension;
  const activeCompanyName = tinAnalysis?.companyName || tinAnalysis?.company || company?.name || t("company.emptyTitle");

  async function handleTinSubmit(event) {
    event.preventDefault();

    if (!normalizeTin(tin)) {
      setError(t("tax.validation"));
      return;
    }

    setError("");
    setIsAnalyzing(true);

    try {
      const analysis = await analyzeTinRequest(normalizeTin(tin), "rw");
      setTinAnalysis(analysis);
    } catch (err) {
      setError(getApiErrorMessage(err, t("tax.loadError")));
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <div className="page-grid fintech-page tax-dashboard-page">
      <section className="hero-card fintech-hero md:flex md:items-end md:justify-between md:gap-6">
        <div>
          <p className="eyebrow">{t("tax.eyebrow")}</p>
          <h2>{t("tax.title")}</h2>
          <p>{t("tax.description")}</p>
        </div>
        <form className="tin-search-card" onSubmit={handleTinSubmit}>
          <label>
            {t("tax.tinLabel")}
            <input
              inputMode="numeric"
              value={tin}
              onChange={(event) => setTin(event.target.value)}
              placeholder={t("tax.tinPlaceholder")}
              maxLength={14}
            />
          </label>
          <button type="submit" className="button button--primary" disabled={isAnalyzing}>
            {isAnalyzing ? t("tax.analyzing") : t("tax.analyze")}
          </button>
        </form>
      </section>

      {error && <div className="alert alert--error">{error}</div>}

      <section className="analytics-grid grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          icon={Building2}
          label={t("tax.cards.company")}
          value={activeCompanyName}
          caption={tinAnalysis?.tin || company?.tin || t("employees.notProvided")}
        />
        <MetricCard
          icon={WalletCards}
          label={t("tax.cards.payroll")}
          value={formatCurrency(payroll.grossPayroll)}
          caption={t("tax.cards.payrollCaption", { count: companyContext.employeeCount })}
        />
        <MetricCard
          icon={ReceiptText}
          label={t("tax.cards.paye")}
          value={formatCurrency(payroll.paye)}
          caption={t("tax.cards.payeCaption")}
        />
        <MetricCard
          icon={Landmark}
          label={t("tax.cards.rssb")}
          value={formatCurrency(payroll.totalRemittance)}
          caption={t("tax.cards.rssbCaption")}
        />
        <MetricCard
          icon={Banknote}
          label={t("tax.cards.pension")}
          value={formatCurrency(pensionTotal)}
          caption={t("tax.cards.pensionCaption")}
        />
      </section>

      <section className="tax-layout">
        <article className="panel">
          <div className="section-heading">
            <p className="eyebrow">{t("tax.companySectionEyebrow")}</p>
            <h3>{t("tax.companySectionTitle")}</h3>
            <p>{t("tax.companySectionText")}</p>
          </div>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="card-icon" aria-hidden="true"><Building2 size={20} /></span>
              <div><span>{t("company.name")}</span><strong>{activeCompanyName}</strong></div>
            </div>
            <div className="detail-item">
              <span className="card-icon" aria-hidden="true"><ReceiptText size={20} /></span>
              <div><span>{t("company.tin")}</span><strong>{tinAnalysis?.tin || normalizeTin(tin) || "-"}</strong></div>
            </div>
            <div className="detail-item">
              <span className="card-icon" aria-hidden="true"><ShieldCheck size={20} /></span>
              <div>
                <span>{t("tin.status")}</span>
                <strong>{tinAnalysis?.registrationStatus || tinAnalysis?.status || t("company.registered")}</strong>
              </div>
            </div>
          </div>
          {isLoadingEmployees && <Loader label={t("employees.loading")} />}
        </article>

        <article className="panel payment-guide-panel">
          <div className="section-heading">
            <p className="eyebrow">{t("paymentGuide.eyebrow")}</p>
            <h3>{t("paymentGuide.title")}</h3>
            <p>{t("paymentGuide.description")}</p>
          </div>
          <div className="guide-grid">
            <div>
              <PhoneCall size={20} aria-hidden="true" />
              <h4>{t("paymentGuide.mtnTitle")}</h4>
              <ol>
                <li>{t("paymentGuide.mtnStepOne")}</li>
                <li>{t("paymentGuide.mtnStepTwo")}</li>
                <li>{t("paymentGuide.mtnStepThree")}</li>
              </ol>
            </div>
            <div>
              <Landmark size={20} aria-hidden="true" />
              <h4>{t("paymentGuide.bankTitle")}</h4>
              <p>{t("paymentGuide.bankText")}</p>
            </div>
            <div>
              <ReceiptText size={20} aria-hidden="true" />
              <h4>{t("paymentGuide.etaxTitle")}</h4>
              <p>{t("paymentGuide.etaxText")}</p>
            </div>
          </div>
        </article>
      </section>

      <section className="panel">
        <div className="section-heading">
          <p className="eyebrow">{t("tax.deadlines.eyebrow")}</p>
          <h3>{t("tax.deadlines.title")}</h3>
        </div>
        <div className="deadline-grid">
          {deadlineItems.map((item) => (
            <article key={item.key} className="deadline-card">
              <span>{item.day}</span>
              <div>
                <h4>{t(item.labelKey)}</h4>
                <p>{t(item.textKey)}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="innovation-strip">
        {innovationItems.map((item) => {
          const Icon = item.icon;

          return (
            <article key={item.key}>
              <Icon size={20} aria-hidden="true" />
              <h4>{t(item.titleKey)}</h4>
              <p>{t(item.textKey)}</p>
            </article>
          );
        })}
      </section>
    </div>
  );
}
