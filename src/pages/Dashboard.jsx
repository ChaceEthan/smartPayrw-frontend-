// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CreditCard,
  Landmark,
  PiggyBank,
  ReceiptText,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Loader from "../components/ui/Loader.jsx";
import useAuth from "../hooks/useAuth.js";
import { getEmployeesRequest } from "../services/employees.api.js";
import { getPayrollRequest } from "../services/payroll.api.js";
import { getActiveCompany } from "../utils/companyData.js";
import formatCurrency from "../utils/formatCurrency.js";

const RSSB_EMPLOYEE_RATE = 0.06;
const RSSB_EMPLOYER_RATE = 0.06;
const TOTAL_PENSION_RATE = RSSB_EMPLOYEE_RATE + RSSB_EMPLOYER_RATE;

function normalizeEmployees(data) {
  return Array.isArray(data) ? data : data?.employees || data?.data || [];
}

function normalizePayroll(data) {
  return Array.isArray(data) ? data : data?.payrolls || data?.data || [];
}

function readMoney(item, keys) {
  for (const key of keys) {
    const value = item?.[key];

    if (value !== undefined && value !== null && value !== "") {
      const number = Number(String(value).replace(/[^\d.-]/g, ""));

      if (Number.isFinite(number)) {
        return number;
      }
    }
  }

  return 0;
}

function sumBy(items, keys) {
  return items.reduce((total, item) => total + readMoney(item, keys), 0);
}

function buildChartData(payrollItems) {
  return payrollItems.slice(-6).map((item, index) => {
    const payroll = readMoney(item, ["totalGross", "grossPayroll", "gross", "totalNet", "netPay", "amount"]);
    const pension =
      readMoney(item, ["employeePension", "rssbEmployee", "pensionEmployee"]) +
      readMoney(item, ["employerPension", "rssbEmployer", "pensionEmployer"]);

    return {
      period: item.period || item.month || item.name || `P${index + 1}`,
      payroll,
      taxes: readMoney(item, ["taxes", "paye", "totalTax", "withholding"]),
      payments: readMoney(item, ["payments", "paidAmount", "totalPaid", "remittance"]),
      pension: pension || payroll * TOTAL_PENSION_RATE,
    };
  });
}

function percent(value) {
  return `${Math.round(value * 100)}%`;
}

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const company = useMemo(() => getActiveCompany(user), [user]);
  const [employees, setEmployees] = useState([]);
  const [payroll, setPayroll] = useState([]);
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadAnalytics() {
      try {
        const [employeesResponse, payrollResponse] = await Promise.all([getEmployeesRequest(), getPayrollRequest()]);

        if (isMounted) {
          setEmployees(normalizeEmployees(employeesResponse.data));
          setPayroll(normalizePayroll(payrollResponse.data));
        }
      } catch {
        if (isMounted) {
          setNotice(t("dashboard.demoNotice"));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadAnalytics();

    return () => {
      isMounted = false;
    };
  }, [t]);

  const analytics = useMemo(() => {
    const totalPayroll = sumBy(payroll, ["totalGross", "grossPayroll", "gross", "totalNet", "netPay", "amount"]);
    const taxes = sumBy(payroll, ["taxes", "paye", "totalTax", "withholding"]);
    const payments = sumBy(payroll, ["payments", "paidAmount", "totalPaid", "remittance"]) || totalPayroll - taxes;
    const employeePension = sumBy(payroll, ["employeePension", "rssbEmployee", "pensionEmployee"]) || totalPayroll * RSSB_EMPLOYEE_RATE;
    const employerPension = sumBy(payroll, ["employerPension", "rssbEmployer", "pensionEmployer"]) || totalPayroll * RSSB_EMPLOYER_RATE;

    return {
      totalPayroll,
      totalEmployees: employees.length,
      taxes,
      payments,
      employeePension,
      employerPension,
      totalPension: employeePension + employerPension,
      chartData: buildChartData(payroll),
    };
  }, [employees.length, payroll]);

  const cards = [
    {
      key: "totalPayroll",
      icon: Wallet,
      label: t("dashboard.analytics.totalPayroll"),
      value: formatCurrency(analytics.totalPayroll),
      caption: t("dashboard.analytics.totalPayrollCaption"),
    },
    {
      key: "totalEmployees",
      icon: Users,
      label: t("dashboard.analytics.totalEmployees"),
      value: analytics.totalEmployees,
      caption: t("dashboard.analytics.totalEmployeesCaption"),
    },
    {
      key: "taxes",
      icon: ReceiptText,
      label: t("dashboard.analytics.taxes"),
      value: formatCurrency(analytics.taxes),
      caption: t("dashboard.analytics.taxesCaption"),
    },
    {
      key: "payments",
      icon: CreditCard,
      label: t("dashboard.analytics.payments"),
      value: formatCurrency(Math.max(0, analytics.payments)),
      caption: t("dashboard.analytics.paymentsCaption"),
    },
    {
      key: "pension",
      icon: PiggyBank,
      label: t("dashboard.analytics.pension"),
      value: formatCurrency(analytics.totalPension),
      caption: t("dashboard.analytics.pensionCaption", {
        employeeRate: percent(RSSB_EMPLOYEE_RATE),
        employerRate: percent(RSSB_EMPLOYER_RATE),
      }),
    },
  ];

  const complianceItems = [
    {
      key: "paye",
      icon: Landmark,
      title: t("dashboard.compliance.payeTitle"),
      text: t("dashboard.compliance.payeText"),
    },
    {
      key: "rssb",
      icon: PiggyBank,
      title: t("dashboard.compliance.rssbTitle"),
      text: t("dashboard.compliance.rssbText", {
        employeeRate: percent(RSSB_EMPLOYEE_RATE),
        employerRate: percent(RSSB_EMPLOYER_RATE),
      }),
    },
    {
      key: "deadline",
      icon: CalendarDays,
      title: t("dashboard.compliance.deadlineTitle"),
      text: t("dashboard.compliance.deadlineText"),
    },
  ];

  return (
    <div className="page-grid dashboard-page">
      <section className="hero-card dashboard-hero md:flex md:items-end md:justify-between md:gap-6">
        <div>
          <p className="eyebrow">{t("dashboard.eyebrow")}</p>
          <h2>{t("dashboard.title")}</h2>
          <p>{t("dashboard.description")}</p>

          {company ? (
            <div className="company-summary-card" aria-label={t("company.profileTitle")}>
              <div className="card-icon" aria-hidden="true">
                <Building2 size={20} strokeWidth={2.2} />
              </div>
              <div>
                <span>{t("company.name")}</span>
                <strong>{company.name}</strong>
              </div>
              <div>
                <span>{t("company.tin")}</span>
                <strong>{company.tin}</strong>
              </div>
              <div>
                <span>{t("company.businessType")}</span>
                <strong>{company.businessType || t("employees.notProvided")}</strong>
              </div>
            </div>
          ) : (
            <div className="company-empty-note">
              <BriefcaseBusiness size={18} aria-hidden="true" />
              <span>{t("company.emptyMessage")}</span>
            </div>
          )}
        </div>
        <Link className="button button--primary dashboard-hero__action" to={company ? "/payments" : "/company"}>
          {company ? t("dashboard.paymentCta") : t("company.registerCta")}
        </Link>
      </section>

      {isLoading && (
        <section className="panel">
          <Loader label={t("dashboard.loading")} />
        </section>
      )}

      {notice && <div className="alert alert--error">{notice}</div>}

      {!isLoading && (
        <>
          <section className="analytics-grid grid gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-label={t("dashboard.analyticsLabel")}>
            {cards.map((card) => {
              const Icon = card.icon;

              return (
                <article className="stat-card analytics-card" key={card.key}>
                  <div className="card-icon" aria-hidden="true">
                    <Icon size={20} strokeWidth={2.2} />
                  </div>
                  <span>{card.label}</span>
                  <strong>{card.value}</strong>
                  <p>{card.caption}</p>
                </article>
              );
            })}
          </section>

          <section className="pension-panel panel">
            <div className="section-heading">
              <p className="eyebrow">{t("dashboard.pension.eyebrow")}</p>
              <h3>{t("dashboard.pension.title")}</h3>
              <p>{t("dashboard.pension.description")}</p>
            </div>
            <div className="pension-breakdown">
              <div>
                <span>{t("dashboard.pension.employeeShare")}</span>
                <strong>{formatCurrency(analytics.employeePension)}</strong>
                <small>{percent(RSSB_EMPLOYEE_RATE)}</small>
              </div>
              <div>
                <span>{t("dashboard.pension.employerShare")}</span>
                <strong>{formatCurrency(analytics.employerPension)}</strong>
                <small>{percent(RSSB_EMPLOYER_RATE)}</small>
              </div>
              <div>
                <span>{t("dashboard.pension.total")}</span>
                <strong>{formatCurrency(analytics.totalPension)}</strong>
                <small>{percent(TOTAL_PENSION_RATE)}</small>
              </div>
            </div>
          </section>

          <section className="chart-grid grid gap-4 xl:grid-cols-2">
            <article className="panel chart-panel">
              <div className="section-heading">
                <p className="eyebrow">{t("dashboard.charts.payrollTrendEyebrow")}</p>
                <h3>{t("dashboard.charts.payrollTrend")}</h3>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={analytics.chartData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="payrollGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#5e7e4f" stopOpacity={0.42} />
                      <stop offset="95%" stopColor="#5e7e4f" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(23,33,26,0.12)" />
                  <XAxis dataKey="period" tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Area type="monotone" dataKey="payroll" stroke="#5e7e4f" fill="url(#payrollGradient)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </article>

            <article className="panel chart-panel">
              <div className="section-heading">
                <p className="eyebrow">{t("dashboard.charts.cashflowEyebrow")}</p>
                <h3>{t("dashboard.charts.cashflow")}</h3>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={analytics.chartData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(23,33,26,0.12)" />
                  <XAxis dataKey="period" tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Bar dataKey="taxes" name={t("dashboard.analytics.taxes")} fill="#c9ef6f" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="pension" name={t("dashboard.analytics.pension")} fill="#5e7e4f" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="payments" name={t("dashboard.analytics.payments")} fill="#17211a" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </article>
          </section>

          <section className="panel compliance-panel">
            <div className="section-heading">
              <p className="eyebrow">{t("dashboard.compliance.eyebrow")}</p>
              <h3>{t("dashboard.compliance.title")}</h3>
              <p>{t("dashboard.compliance.description")}</p>
            </div>
            <div className="compliance-grid">
              {complianceItems.map((item) => {
                const Icon = item.icon;

                return (
                  <article key={item.key} className="compliance-card">
                    <div className="card-icon" aria-hidden="true">
                      <Icon size={20} strokeWidth={2.2} />
                    </div>
                    <h4>{item.title}</h4>
                    <p>{item.text}</p>
                  </article>
                );
              })}
            </div>
            <div className="compliance-note">
              <ShieldCheck size={18} aria-hidden="true" />
              <span>{t("dashboard.compliance.note")}</span>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
