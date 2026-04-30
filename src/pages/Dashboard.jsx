// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
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
import { getEmployeesRequest } from "../services/employees.api.js";
import { getPayrollRequest } from "../services/payroll.api.js";
import formatCurrency from "../utils/formatCurrency.js";

const demoEmployees = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }, { id: 6 }, { id: 7 }, { id: 8 }];
const demoPayroll = [
  { period: "Jan", totalGross: 1850000, taxes: 318000, payments: 1532000 },
  { period: "Feb", totalGross: 2120000, taxes: 372000, payments: 1748000 },
  { period: "Mar", totalGross: 2380000, taxes: 416500, payments: 1963500 },
  { period: "Apr", totalGross: 2600000, taxes: 459000, payments: 2141000 },
];

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
  return payrollItems.slice(-6).map((item, index) => ({
    period: item.period || item.month || item.name || `P${index + 1}`,
    payroll: readMoney(item, ["totalGross", "grossPayroll", "gross", "totalNet", "netPay", "amount"]),
    taxes: readMoney(item, ["taxes", "paye", "totalTax", "withholding"]),
    payments: readMoney(item, ["payments", "paidAmount", "totalPaid", "remittance"]),
  }));
}

export default function Dashboard() {
  const { t } = useTranslation();
  const [employees, setEmployees] = useState([]);
  const [payroll, setPayroll] = useState([]);
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadAnalytics() {
      try {
        const [employeesResponse, payrollResponse] = await Promise.all([
          getEmployeesRequest(),
          getPayrollRequest(),
        ]);

        if (isMounted) {
          setEmployees(normalizeEmployees(employeesResponse.data));
          setPayroll(normalizePayroll(payrollResponse.data));
        }
      } catch (err) {
        if (isMounted) {
          setEmployees(demoEmployees);
          setPayroll(demoPayroll);
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

    return {
      totalPayroll,
      totalEmployees: employees.length,
      taxes,
      payments,
      chartData: buildChartData(payroll),
    };
  }, [employees.length, payroll]);

  const cards = [
    {
      key: "totalPayroll",
      label: t("dashboard.analytics.totalPayroll"),
      value: formatCurrency(analytics.totalPayroll),
      caption: t("dashboard.analytics.totalPayrollCaption"),
    },
    {
      key: "totalEmployees",
      label: t("dashboard.analytics.totalEmployees"),
      value: analytics.totalEmployees,
      caption: t("dashboard.analytics.totalEmployeesCaption"),
    },
    {
      key: "taxes",
      label: t("dashboard.analytics.taxes"),
      value: formatCurrency(analytics.taxes),
      caption: t("dashboard.analytics.taxesCaption"),
    },
    {
      key: "payments",
      label: t("dashboard.analytics.payments"),
      value: formatCurrency(Math.max(0, analytics.payments)),
      caption: t("dashboard.analytics.paymentsCaption"),
    },
  ];

  return (
    <div className="page-grid dashboard-page">
      <section className="hero-card dashboard-hero md:flex md:items-end md:justify-between md:gap-6">
        <div>
          <p className="eyebrow">{t("dashboard.eyebrow")}</p>
          <h2>{t("dashboard.title")}</h2>
          <p>{t("dashboard.description")}</p>
        </div>
        <Link className="button button--primary dashboard-hero__action" to="/payments">
          {t("dashboard.paymentCta")}
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
          <section className="analytics-grid grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label={t("dashboard.analyticsLabel")}>
            {cards.map((card) => (
              <article className="stat-card analytics-card" key={card.key}>
                <span>{card.label}</span>
                <strong>{card.value}</strong>
                <p>{card.caption}</p>
              </article>
            ))}
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
                  <Bar dataKey="payments" name={t("dashboard.analytics.payments")} fill="#17211a" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </article>
          </section>
        </>
      )}
    </div>
  );
}
