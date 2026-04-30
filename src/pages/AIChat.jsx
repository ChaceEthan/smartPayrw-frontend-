// @ts-nocheck
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { extractAssistantReply, sendChatMessage } from "../services/ai.api.js";
import { analyzeTinRequest } from "../services/tin.api.js";
import { buildLocalPayrollResponse, formatRwf } from "../utils/rwandaPayroll.js";

const initialMessage = {
  role: "assistant",
  translationKey: "chat.initialMessage",
};

const suggestionKeys = ["chat.suggestions.taxes", "chat.suggestions.tin", "chat.suggestions.payroll"];

export default function AIChat() {
  const { i18n, t } = useTranslation();
  const [messages, setMessages] = useState([initialMessage]);
  const [message, setMessage] = useState("");
  const [tin, setTin] = useState("");
  const [tinAnalysis, setTinAnalysis] = useState(null);
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isAnalyzingTin, setIsAnalyzingTin] = useState(false);
  const inputRef = useRef(null);

  const canSend = useMemo(() => message.trim().length > 0 && !isSending, [isSending, message]);
  const selectedLanguage = i18n.resolvedLanguage || i18n.language || "en";

  async function handleSubmit(event) {
    event.preventDefault();

    if (!canSend) {
      return;
    }

    const userMessage = { role: "user", content: message.trim() };
    const history = [...messages, userMessage].map((item) => ({
      role: item.role,
      content: item.translationKey ? t(item.translationKey) : item.content,
    }));

    setMessages((current) => [...current, userMessage]);
    setMessage("");
    setError("");
    setIsSending(true);

    try {
      const { data } = await sendChatMessage(userMessage.content, history, {
        language: selectedLanguage,
        tinAnalysis,
      });
      setMessages((current) => [
        ...current,
        { role: "assistant", content: extractAssistantReply(data, t("chat.emptyResponse")) },
      ]);
    } catch (err) {
      const fallbackMessage = buildLocalPayrollResponse({
        message: userMessage.content,
        tinAnalysis,
        t,
      });

      setError(t("chat.local.backendNotice"));
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: fallbackMessage,
        },
      ]);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  }

  function handleSuggestionClick(suggestion) {
    setMessage(suggestion);
    inputRef.current?.focus();
  }

  async function handleTinSubmit(event) {
    event.preventDefault();

    if (!tin.trim() || isAnalyzingTin) {
      return;
    }

    setIsAnalyzingTin(true);
    setError("");

    try {
      const analysis = await analyzeTinRequest(tin, selectedLanguage);
      setTinAnalysis(analysis);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: t(analysis.isValid ? "tin.chatSummary" : "tin.invalidSummary", {
            tin: analysis.tin || tin,
            company: analysis.companyName,
            employees: analysis.employeeCount,
            gross: formatRwf(analysis.payrollSummary.grossPayroll),
            remittance: formatRwf(analysis.payrollSummary.totalRemittance),
            source: t(`tin.source.${analysis.source}`),
          }),
        },
      ]);
    } finally {
      setIsAnalyzingTin(false);
    }
  }

  function handleAskAboutTin() {
    if (!tinAnalysis?.isValid) {
      return;
    }

    setMessage(t("tin.askPrompt", { tin: tinAnalysis.tin }));
    inputRef.current?.focus();
  }

  return (
    <section className="panel chat-panel">
      <div className="section-heading">
        <p className="eyebrow">{t("chat.eyebrow")}</p>
        <h2>{t("chat.title")}</h2>
        <p>{t("chat.description")}</p>
      </div>

      <div className="suggestion-row" aria-label={t("chat.suggestionsLabel")}>
        {suggestionKeys.map((suggestionKey) => {
          const suggestion = t(suggestionKey);

          return (
            <button
              key={suggestionKey}
              type="button"
              className="suggestion-chip"
              onClick={() => handleSuggestionClick(suggestion)}
              disabled={isSending}
            >
              {suggestion}
            </button>
          );
        })}
      </div>

      <form className="tin-analyzer" onSubmit={handleTinSubmit}>
        <div>
          <p className="eyebrow">{t("tin.eyebrow")}</p>
          <h3>{t("tin.title")}</h3>
          <p>{t("tin.description")}</p>
        </div>

        <div className="tin-analyzer__controls">
          <label>
            {t("tin.inputLabel")}
            <input
              inputMode="numeric"
              value={tin}
              onChange={(event) => setTin(event.target.value)}
              placeholder={t("tin.placeholder")}
              maxLength={14}
            />
          </label>
          <button type="submit" className="button button--primary" disabled={!tin.trim() || isAnalyzingTin}>
            {isAnalyzingTin ? t("tin.analyzing") : t("tin.analyze")}
          </button>
        </div>

        {tinAnalysis && (
          <div className="tin-results">
            <div className="tin-results__summary">
              <div>
                <span>{t("tin.company")}</span>
                <strong>{tinAnalysis.companyName || t("tin.invalidTin")}</strong>
              </div>
              <div>
                <span>{t("tin.status")}</span>
                <strong>{t(`tin.statuses.${tinAnalysis.registrationStatus}`)}</strong>
              </div>
              <div>
                <span>{t("tin.riskLabel")}</span>
                <strong>{t(`tin.risk.${tinAnalysis.riskLevel}`)}</strong>
              </div>
              <div>
                <span>{t("tin.sourceLabel")}</span>
                <strong>{t(`tin.source.${tinAnalysis.source}`)}</strong>
              </div>
            </div>

            {tinAnalysis.isValid && (
              <>
                <div className="tin-metrics">
                  <div>
                    <span>{t("tin.metrics.employees")}</span>
                    <strong>{tinAnalysis.employeeCount}</strong>
                  </div>
                  <div>
                    <span>{t("tin.metrics.grossPayroll")}</span>
                    <strong>{formatRwf(tinAnalysis.payrollSummary.grossPayroll)}</strong>
                  </div>
                  <div>
                    <span>{t("tin.metrics.paye")}</span>
                    <strong>{formatRwf(tinAnalysis.payrollSummary.paye)}</strong>
                  </div>
                  <div>
                    <span>{t("tin.metrics.totalRemittance")}</span>
                    <strong>{formatRwf(tinAnalysis.payrollSummary.totalRemittance)}</strong>
                  </div>
                </div>

                <div className="tin-obligations">
                  <h4>{t("tin.obligationsTitle")}</h4>
                  <ul>
                    {tinAnalysis.obligations.map((obligation) => (
                      <li key={obligation}>{t(`tin.obligations.${obligation}`)}</li>
                    ))}
                  </ul>
                </div>

                <div className="tin-liabilities">
                  <h4>{t("tin.liabilitiesTitle")}</h4>
                  <ul>
                    {tinAnalysis.liabilities.map((liability) => (
                      <li key={liability.key}>
                        {t(`tin.liabilities.${liability.key}`, {
                          amount: formatRwf(liability.amount),
                          months: liability.months,
                        })}
                      </li>
                    ))}
                  </ul>
                </div>

                <button type="button" className="button button--ghost" onClick={handleAskAboutTin}>
                  {t("tin.askAi")}
                </button>
              </>
            )}
          </div>
        )}
      </form>

      <div className="chat-window" aria-live="polite">
        {messages.map((item, index) => (
          <article key={`${item.role}-${index}`} className={`message message--${item.role}`}>
            <span>{item.role === "user" ? t("chat.you") : t("chat.assistant")}</span>
            <p>{item.translationKey ? t(item.translationKey) : item.content}</p>
          </article>
        ))}
        {isSending && (
          <article className="message message--assistant message--typing">
            <span>{t("chat.assistant")}</span>
            <div className="typing-indicator" aria-label={t("chat.typing")}>
              <i />
              <i />
              <i />
            </div>
          </article>
        )}
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      <form className="chat-form" onSubmit={handleSubmit}>
        <textarea
          ref={inputRef}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={t("chat.placeholder")}
          rows={3}
        />
        <button type="submit" className="button button--primary" disabled={!canSend}>
          {isSending ? t("chat.sending") : t("chat.send")}
        </button>
      </form>
    </section>
  );
}
