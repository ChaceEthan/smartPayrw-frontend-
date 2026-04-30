// @ts-nocheck
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { requestMobileMoneyPayment } from "../services/payments.api.js";
import formatCurrency from "../utils/formatCurrency.js";

const providers = [
  { id: "mtn", labelKey: "payments.providers.mtn", brandClass: "provider-option--mtn" },
  { id: "airtel", labelKey: "payments.providers.airtel", brandClass: "provider-option--airtel" },
];

function createPaymentReference(provider) {
  return `SPR-${provider.toUpperCase()}-${Date.now().toString().slice(-8)}`;
}

function normalizePaymentResponse(data, fallback) {
  const payload = data?.data || data || {};

  return {
    reference: payload.reference || payload.transactionId || payload.requestId || fallback.reference,
    status: payload.status || payload.state || fallback.status,
    message: payload.message || fallback.message,
    provider: payload.provider || fallback.provider,
    amount: payload.amount || fallback.amount,
    phoneNumber: payload.phoneNumber || payload.msisdn || fallback.phoneNumber,
    isSimulation: Boolean(payload.isSimulation ?? fallback.isSimulation),
  };
}

export default function Payments() {
  const { t } = useTranslation();
  const [amount, setAmount] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [provider, setProvider] = useState("mtn");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const numericAmount = useMemo(() => Number(String(amount).replace(/[^\d.]/g, "")), [amount]);
  const canSubmit = numericAmount > 0 && phoneNumber.trim().length >= 9 && !isSubmitting;

  async function handleSubmit(event) {
    event.preventDefault();

    if (!canSubmit) {
      setError(t("payments.validation"));
      return;
    }

    const fallback = {
      reference: createPaymentReference(provider),
      status: "simulation",
      message: t("payments.simulationMessage"),
      provider,
      amount: numericAmount,
      phoneNumber: phoneNumber.trim(),
      isSimulation: true,
    };

    setIsSubmitting(true);
    setError("");
    setResult(null);

    try {
      const { data } = await requestMobileMoneyPayment(provider, {
        amount: numericAmount,
        phoneNumber: phoneNumber.trim(),
        currency: "RWF",
      });

      setResult(normalizePaymentResponse(data, { ...fallback, isSimulation: false, status: "requested" }));
    } catch {
      setResult(fallback);
      setError(t("payments.simulationNotice"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="panel payments-page">
      <div className="section-heading">
        <p className="eyebrow">{t("payments.eyebrow")}</p>
        <h2>{t("payments.title")}</h2>
        <p>{t("payments.description")}</p>
      </div>

      <div className="payments-layout grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <form className="payment-form" onSubmit={handleSubmit}>
          <div className="provider-grid">
            {providers.map((item) => {
              const isSelected = provider === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  className={`provider-option ${item.brandClass} ${isSelected ? "provider-option--active" : ""}`}
                  onClick={() => setProvider(item.id)}
                  aria-pressed={isSelected}
                >
                  <span>{t(item.labelKey)}</span>
                  <strong>{item.id.toUpperCase()}</strong>
                </button>
              );
            })}
          </div>

          <label>
            {t("payments.amount")}
            <input
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder={t("payments.amountPlaceholder")}
            />
          </label>

          <label>
            {t("payments.phone")}
            <input
              inputMode="tel"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              placeholder={t("payments.phonePlaceholder")}
            />
          </label>

          <button type="submit" className="button button--primary payment-submit" disabled={!canSubmit}>
            {isSubmitting ? t("payments.submitting") : t("payments.submit")}
          </button>
        </form>

        <aside className="payment-summary">
          <span>{t("payments.summaryLabel")}</span>
          <strong>{numericAmount > 0 ? formatCurrency(numericAmount) : formatCurrency(0)}</strong>
          <p>{t("payments.summaryCopy")}</p>
        </aside>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      {result && (
        <article className={`payment-result ${result.isSimulation ? "payment-result--simulation" : ""}`}>
          <div>
            <span>{t("payments.result.status")}</span>
            <strong>{t(`payments.statuses.${result.status}`, { defaultValue: result.status })}</strong>
          </div>
          <div>
            <span>{t("payments.result.reference")}</span>
            <strong>{result.reference}</strong>
          </div>
          <div>
            <span>{t("payments.result.provider")}</span>
            <strong>{t(`payments.providers.${result.provider}`, { defaultValue: result.provider })}</strong>
          </div>
          <div>
            <span>{t("payments.result.amount")}</span>
            <strong>{formatCurrency(result.amount)}</strong>
          </div>
          <p>{result.message}</p>
        </article>
      )}
    </section>
  );
}
