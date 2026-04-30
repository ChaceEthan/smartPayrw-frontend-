// @ts-nocheck
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { BarChart3, CreditCard, FileText, Plus, ReceiptText, WalletCards } from "lucide-react";
import { addStoredTransaction, getStoredTransactions, summarizeTransactions } from "../utils/businessData.js";
import formatCurrency from "../utils/formatCurrency.js";

const initialForm = {
  description: "",
  amount: "",
  paymentMethod: "cash",
  date: new Date().toISOString().slice(0, 10),
};

function ReportCard({ icon: Icon, label, value, caption }) {
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

export default function Business() {
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState(() => getStoredTransactions());
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(initialForm.date);

  const numericAmount = useMemo(() => Number(String(form.amount).replace(/[^\d.]/g, "")), [form.amount]);
  const reports = useMemo(() => summarizeTransactions(transactions), [transactions]);
  const dailyTransactions = useMemo(
    () => transactions.filter((transaction) => transaction.date === selectedDate),
    [selectedDate, transactions]
  );
  const selectedDaySales = dailyTransactions.reduce((total, transaction) => total + transaction.amount, 0);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!form.description.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError(t("business.validation"));
      return;
    }

    const nextTransactions = addStoredTransaction({
      description: form.description.trim(),
      amount: numericAmount,
      paymentMethod: form.paymentMethod,
      date: form.date,
    });

    setTransactions(nextTransactions);
    setSelectedDate(form.date);
    setForm(initialForm);
    setError("");
  }

  return (
    <div className="page-grid fintech-page business-page">
      <section className="hero-card fintech-hero">
        <p className="eyebrow">{t("business.eyebrow")}</p>
        <h2>{t("business.title")}</h2>
        <p>{t("business.description")}</p>
      </section>

      <section className="analytics-grid grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ReportCard
          icon={WalletCards}
          label={t("business.cards.today")}
          value={formatCurrency(reports.dailySales)}
          caption={t("business.cards.todayCaption")}
        />
        <ReportCard
          icon={ReceiptText}
          label={t("business.cards.transactions")}
          value={reports.count}
          caption={t("business.cards.transactionsCaption")}
        />
        <ReportCard
          icon={BarChart3}
          label={t("business.cards.total")}
          value={formatCurrency(reports.totalSales)}
          caption={t("business.cards.totalCaption")}
        />
        <ReportCard
          icon={CreditCard}
          label={t("business.cards.average")}
          value={formatCurrency(reports.averageSale)}
          caption={t("business.cards.averageCaption")}
        />
      </section>

      <section className="business-layout">
        <form className="panel business-form" onSubmit={handleSubmit}>
          <div className="section-heading">
            <p className="eyebrow">{t("business.formEyebrow")}</p>
            <h3>{t("business.formTitle")}</h3>
          </div>

          <label>
            {t("business.descriptionLabel")}
            <input
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              placeholder={t("business.descriptionPlaceholder")}
            />
          </label>

          <label>
            {t("business.amount")}
            <input
              inputMode="decimal"
              value={form.amount}
              onChange={(event) => updateField("amount", event.target.value)}
              placeholder={t("business.amountPlaceholder")}
            />
          </label>

          <label>
            {t("business.paymentMethod")}
            <select value={form.paymentMethod} onChange={(event) => updateField("paymentMethod", event.target.value)}>
              <option value="cash">{t("business.methods.cash")}</option>
              <option value="momo">{t("business.methods.momo")}</option>
              <option value="bank">{t("business.methods.bank")}</option>
              <option value="card">{t("business.methods.card")}</option>
            </select>
          </label>

          <label>
            {t("business.date")}
            <input type="date" value={form.date} onChange={(event) => updateField("date", event.target.value)} />
          </label>

          <button type="submit" className="button button--primary business-submit">
            <Plus size={18} aria-hidden="true" />
            {t("business.add")}
          </button>

          {error && <div className="alert alert--error">{error}</div>}
        </form>

        <section className="panel">
          <div className="section-heading">
            <p className="eyebrow">{t("business.dailyEyebrow")}</p>
            <h3>{t("business.dailyTitle")}</h3>
          </div>

          <label className="date-filter">
            {t("business.chooseDate")}
            <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
          </label>

          <div className="daily-sales-summary">
            <span>{t("business.dailySales")}</span>
            <strong>{formatCurrency(selectedDaySales)}</strong>
          </div>

          {dailyTransactions.length === 0 ? (
            <div className="empty-state">
              <h3>{t("business.emptyTitle")}</h3>
              <p>{t("business.emptyMessage")}</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t("business.descriptionLabel")}</th>
                    <th>{t("business.paymentMethod")}</th>
                    <th>{t("business.amount")}</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyTransactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td>{transaction.description}</td>
                      <td>{t(`business.methods.${transaction.paymentMethod}`, { defaultValue: transaction.paymentMethod })}</td>
                      <td className="salary-cell">{formatCurrency(transaction.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>

      <section className="panel">
        <div className="section-heading">
          <p className="eyebrow">{t("business.reportEyebrow")}</p>
          <h3>{t("business.reportTitle")}</h3>
          <p>{t("business.reportText")}</p>
        </div>
        <div className="report-strip">
          <FileText size={20} aria-hidden="true" />
          <span>{t("business.simpleReport", { count: reports.count, total: formatCurrency(reports.totalSales) })}</span>
        </div>
      </section>
    </div>
  );
}
