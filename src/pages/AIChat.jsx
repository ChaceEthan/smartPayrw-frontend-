// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import useAuth from "../hooks/useAuth.js";
import { getApiErrorMessage } from "../services/api.js";
import { extractAssistantReply, sendChatMessage } from "../services/ai.api.js";
import { getEmployeesRequest } from "../services/employees.api.js";
import { analyzeTinRequest } from "../services/tin.api.js";
import {
  formatRwf,
  normalizeTin,
} from "../utils/rwandaPayroll.js";
import {
  buildCompanyContext,
  getActiveCompany,
  getStoredEmployees,
  hasCompany,
  normalizeEmployees,
  saveStoredEmployees,
} from "../utils/companyData.js";

const CHAT_SESSION_KEY = "smartpayrw.aiChatSession";
const EMPTY_VALUE = "-";

const suggestionKeys = [
  "chat.suggestions.companyPayroll",
  "chat.suggestions.taxes",
  "chat.suggestions.tin",
  "chat.suggestions.employees",
];

const workflowActions = [
  {
    key: "tax",
    labelKey: "chat.workflow.tax",
    textKey: "chat.workflow.taxText",
    promptKey: "chat.workflow.taxPrompt",
  },
  {
    key: "employees",
    labelKey: "chat.workflow.employees",
    textKey: "chat.workflow.employeesText",
    promptKey: "chat.workflow.employeesPrompt",
  },
  {
    key: "payroll",
    labelKey: "chat.workflow.payroll",
    textKey: "chat.workflow.payrollText",
    promptKey: "chat.workflow.payrollPrompt",
  },
];

const payrollIntentPattern =
  /payroll|salary|tax|paye|rssb|deduction|gross|net pay|remittance|company|employee|paie|salaire|taxe|impot|entreprise|employe|imishahara|umushahara|umusoro|imisoro|ikigo|abakozi|mishahara|kodi|kampuni|mfanyakazi|wafanyakazi/i;
const tinIntentPattern = /tin|tax identification|rra|company tin|ikigo|kampuni|entreprise/i;

function createMessageId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createChatMessage({ createdAt, role, content = "", translationKey, variant = "advice", ...rest }) {
  return {
    id: createMessageId(),
    role,
    content,
    translationKey,
    variant,
    createdAt: createdAt || new Date().toISOString(),
    ...rest,
  };
}

function getOrCreateChatSessionId() {
  if (typeof window === "undefined") {
    return "server-session";
  }

  const existingSession = window.localStorage.getItem(CHAT_SESSION_KEY);

  if (existingSession) {
    return existingSession;
  }

  const sessionId = createMessageId();
  window.localStorage.setItem(CHAT_SESSION_KEY, sessionId);
  return sessionId;
}

function buildUserSession(user, language, sessionId, companyContext) {
  return {
    sessionId,
    language,
    isAuthenticated: Boolean(user),
    userId: user?.id || user?._id || user?.userId || null,
    name: user?.name || user?.fullName || user?.displayName || null,
    email: user?.email || null,
    role: user?.role || user?.userRole || null,
    company: companyContext?.company || null,
    employeeCount: companyContext?.employeeCount || 0,
    grossPayroll: companyContext?.grossPayroll || 0,
  };
}

function detectTinFromMessage(value) {
  const matches = String(value || "").matchAll(/(^|[^\d])((?:\d[\s-]?){9})(?![\d])/g);

  for (const match of matches) {
    const normalizedTin = normalizeTin(match[2]);

    if (/^\d{9}$/.test(normalizedTin)) {
      return normalizedTin;
    }
  }

  return "";
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function firstObject(...values) {
  return values.find((value) => isPlainObject(value)) || null;
}

function getResponseRoot(data) {
  return firstObject(data?.data, data) || {};
}

function getNestedObject(source, keys) {
  for (const key of keys) {
    if (isPlainObject(source?.[key])) {
      return source[key];
    }
  }

  return null;
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const numeric = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(numeric) ? numeric : null;
}

function readNumber(source, keys) {
  for (const key of keys) {
    if (source?.[key] !== undefined && source?.[key] !== null) {
      const numeric = toNumber(source[key]);

      if (numeric !== null) {
        return numeric;
      }
    }
  }

  return null;
}

function normalizePayrollData(payload) {
  if (!isPlainObject(payload)) {
    return null;
  }

  const payroll = {
    employeeCount: readNumber(payload, ["employeeCount", "employees", "staffCount", "headcount"]),
    averageSalary: readNumber(payload, ["averageSalary", "avgSalary", "monthlyAverageSalary"]),
    gross: readNumber(payload, ["gross", "grossSalary", "grossPay", "monthlyGross"]),
    grossPayroll: readNumber(payload, ["grossPayroll", "monthlyGrossPayroll", "totalGrossPayroll"]),
    paye: readNumber(payload, ["paye", "PAYE", "payAsYouEarn"]),
    employeePension: readNumber(payload, ["employeePension", "pension", "rssbEmployee", "employeeRssb"]),
    employeeMaternity: readNumber(payload, ["employeeMaternity", "maternity", "maternityBenefit"]),
    cbhi: readNumber(payload, ["cbhi", "CBHI"]),
    employeeDeductions: readNumber(payload, ["employeeDeductions", "deductions", "totalDeductions"]),
    employerContributions: readNumber(payload, [
      "employerContributions",
      "employerContribution",
      "employerStatutoryContributions",
    ]),
    netPay: readNumber(payload, ["netPay", "net", "takeHomePay"]),
    totalRemittance: readNumber(payload, ["totalRemittance", "remittance", "monthlyRemittance"]),
    employerCost: readNumber(payload, ["employerCost", "totalEmployerCost"]),
  };

  const hasPayrollValues = Object.values(payroll).some((value) => value !== null);
  return hasPayrollValues ? payroll : null;
}

function hasTinShape(payload) {
  if (!isPlainObject(payload)) {
    return false;
  }

  return Boolean(
    payload.tin ||
      payload.TIN ||
      payload.companyName ||
      payload.company ||
      payload.legalName ||
      payload.registrationStatus ||
      payload.taxStatus
  );
}

function findTinPayload(data) {
  const root = getResponseRoot(data);
  const result = firstObject(root.result, root.payload, root.analysis);

  return (
    firstObject(
      root.tinData,
      root.tinAnalysis,
      root.companyInfo,
      root.company,
      result?.tinData,
      result?.tinAnalysis,
      result?.companyInfo,
      result?.company
    ) ||
    (hasTinShape(root) ? root : null) ||
    (hasTinShape(result) ? result : null)
  );
}

function findPayrollPayload(data) {
  const root = getResponseRoot(data);
  const result = firstObject(root.result, root.payload, root.analysis);

  return firstObject(
    root.payroll,
    root.payrollData,
    root.payrollBreakdown,
    root.payrollSummary,
    root.breakdown,
    getNestedObject(root, ["deductions", "taxes"]),
    result?.payroll,
    result?.payrollData,
    result?.payrollBreakdown,
    result?.payrollSummary,
    result?.breakdown
  );
}

function normalizeTinData(payload, fallbackTinAnalysis = null) {
  const source = {
    ...(fallbackTinAnalysis || {}),
    ...(payload || {}),
  };
  const payrollSummary =
    normalizePayrollData(payload?.payrollSummary) ||
    normalizePayrollData(payload?.payroll) ||
    normalizePayrollData(payload?.payrollData) ||
    normalizePayrollData(fallbackTinAnalysis?.payrollSummary);
  const companyName = source.companyName || source.company || source.legalName || source.name || "";
  const tin = normalizeTin(source.tin || source.TIN || fallbackTinAnalysis?.tin || "");

  if (!tin && !companyName && !source.registrationStatus && !source.taxStatus) {
    return null;
  }

  return {
    tin,
    companyName,
    sector: source.sector || "",
    registrationStatus: source.registrationStatus || source.status || source.taxStatus || "",
    riskLevel: source.riskLevel || source.risk || "",
    source: source.source || fallbackTinAnalysis?.source || "backend",
    employeeCount:
      source.employeeCount ?? source.employees ?? source.staffCount ?? fallbackTinAnalysis?.employeeCount ?? null,
    averageSalary: source.averageSalary ?? fallbackTinAnalysis?.averageSalary ?? null,
    isValid: source.isValid ?? fallbackTinAnalysis?.isValid ?? Boolean(companyName),
    payrollSummary,
    obligations: source.obligations || fallbackTinAnalysis?.obligations || [],
    liabilities: source.liabilities || fallbackTinAnalysis?.liabilities || [],
  };
}

function hasPayrollIntent(message) {
  return payrollIntentPattern.test(String(message || ""));
}

function hasTinIntent(message) {
  return tinIntentPattern.test(String(message || ""));
}

function buildPayrollBreakdownForPrompt(message, tinAnalysis, companyContext) {
  const wantsCompanyPayroll = /company|business|employer|employees|entreprise|ikigo|abakozi|kampuni|wafanyakazi/i.test(
    String(message || "")
  );
  const tinPayrollSummary = normalizePayrollData(tinAnalysis?.payrollSummary);

  if (companyContext?.employeeCount > 0) {
    return normalizePayrollData({
      employeeCount: companyContext.employeeCount,
      averageSalary: companyContext.averageSalary,
      grossPayroll: companyContext.grossPayroll,
    });
  }

  if (wantsCompanyPayroll && tinPayrollSummary) {
    return {
      ...tinPayrollSummary,
      employeeCount: tinAnalysis.employeeCount,
      averageSalary: tinAnalysis.averageSalary,
    };
  }

  return null;
}

function createAssistantMessageFromResponse(data, options) {
  const { companyContext, detectedTin, fallbackMessage, requestContent, t, tinAnalysis } = options;
  const root = getResponseRoot(data);
  const responseType = String(root.type || root.intent || root.category || "").toLowerCase();
  const reply = extractAssistantReply(data, fallbackMessage);
  const tinData = normalizeTinData(findTinPayload(data), detectedTin ? tinAnalysis : null);

  if (tinData && (responseType.includes("tin") || detectedTin || hasTinIntent(requestContent))) {
    return createChatMessage({
      role: "assistant",
      content: reply,
      variant: "tin",
      tinData,
      companyContext,
    });
  }

  const payrollData =
    normalizePayrollData(findPayrollPayload(data)) ||
    (responseType.includes("payroll") || hasPayrollIntent(requestContent)
      ? buildPayrollBreakdownForPrompt(requestContent, tinAnalysis, companyContext)
      : null);

  if (payrollData) {
    return createChatMessage({
      role: "assistant",
      content: reply,
      variant: "payroll",
      payrollData,
      companyContext,
    });
  }

  return createChatMessage({
    role: "assistant",
    content: reply || t("chat.emptyResponse"),
    variant: "advice",
    companyContext,
  });
}

function getHistoryContent(message, t) {
  if (message.translationKey) {
    return t(message.translationKey);
  }

  if (message.content) {
    return message.content;
  }

  if (message.tinData) {
    return `TIN ${message.tinData.tin || EMPTY_VALUE}: ${message.tinData.companyName || EMPTY_VALUE}`;
  }

  if (message.payrollData) {
    return `Payroll remittance: ${message.payrollData.totalRemittance || EMPTY_VALUE}`;
  }

  if (message.companyContext?.company) {
    return `Company ${message.companyContext.company.name || EMPTY_VALUE}, TIN ${
      message.companyContext.company.tin || EMPTY_VALUE
    }, employees ${message.companyContext.employeeCount || 0}`;
  }

  return "";
}

function buildMessageHistory(messages, t) {
  return messages.map((item) => ({
    role: item.role,
    content: getHistoryContent(item, t),
    timestamp: item.createdAt,
    type: item.variant,
  }));
}

function formatMessageTime(timestamp, language) {
  if (!timestamp) {
    return "";
  }

  try {
    return new Intl.DateTimeFormat(language, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(timestamp));
  } catch {
    return "";
  }
}

function formatEnum(t, key, value) {
  if (!value) {
    return EMPTY_VALUE;
  }

  return t(`${key}.${value}`, { defaultValue: value });
}

function formatMoney(value) {
  return value === null || value === undefined ? null : formatRwf(value);
}

function DetailField({ label, value }) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return (
    <div className="structured-field">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TinResponseCard({ data, t }) {
  const payroll = normalizePayrollData(data.payrollSummary);

  return (
    <div className="structured-card">
      <h4>{t("chat.cards.companyInfo")}</h4>
      <div className="structured-grid">
        <DetailField label={t("chat.cards.tin")} value={data.tin || EMPTY_VALUE} />
        <DetailField label={t("tin.company")} value={data.companyName || t("tin.invalidTin")} />
        <DetailField label={t("tin.status")} value={formatEnum(t, "tin.statuses", data.registrationStatus)} />
        <DetailField label={t("tin.riskLabel")} value={formatEnum(t, "tin.risk", data.riskLevel)} />
        <DetailField label={t("tin.sourceLabel")} value={formatEnum(t, "tin.source", data.source)} />
        <DetailField label={t("tin.metrics.employees")} value={data.employeeCount ?? EMPTY_VALUE} />
      </div>

      {payroll && (
        <div className="structured-card__section">
          <h5>{t("chat.cards.payrollExposure")}</h5>
          <div className="structured-grid">
            <DetailField
              label={t("tin.metrics.grossPayroll")}
              value={formatMoney(payroll.grossPayroll ?? payroll.gross)}
            />
            <DetailField label={t("tin.metrics.paye")} value={formatMoney(payroll.paye)} />
            <DetailField label={t("chat.cards.employerContributions")} value={formatMoney(payroll.employerContributions)} />
            <DetailField label={t("tin.metrics.totalRemittance")} value={formatMoney(payroll.totalRemittance)} />
          </div>
        </div>
      )}
    </div>
  );
}

function PayrollBreakdownCard({ data, t }) {
  const grossValue = data.grossPayroll ?? data.gross;
  const grossLabel =
    data.grossPayroll !== null && data.grossPayroll !== undefined
      ? t("chat.cards.grossPayroll")
      : t("chat.cards.grossSalary");

  return (
    <div className="structured-card">
      <h4>{t("chat.cards.payrollBreakdown")}</h4>
      <div className="structured-grid">
        <DetailField label={t("chat.cards.employeeCount")} value={data.employeeCount} />
        <DetailField label={t("chat.cards.averageSalary")} value={formatMoney(data.averageSalary)} />
        <DetailField label={grossLabel} value={formatMoney(grossValue)} />
        <DetailField label={t("chat.cards.paye")} value={formatMoney(data.paye)} />
        <DetailField label={t("chat.cards.pension")} value={formatMoney(data.employeePension)} />
        <DetailField label={t("chat.cards.maternity")} value={formatMoney(data.employeeMaternity)} />
        <DetailField label={t("chat.cards.cbhi")} value={formatMoney(data.cbhi)} />
        <DetailField label={t("chat.cards.employeeDeductions")} value={formatMoney(data.employeeDeductions)} />
        <DetailField label={t("chat.cards.netPay")} value={formatMoney(data.netPay)} />
        <DetailField label={t("chat.cards.employerContributions")} value={formatMoney(data.employerContributions)} />
        <DetailField label={t("chat.cards.totalRemittance")} value={formatMoney(data.totalRemittance)} />
        <DetailField label={t("chat.cards.employerCost")} value={formatMoney(data.employerCost)} />
      </div>
    </div>
  );
}

function CompanyContextCard({ data, t }) {
  if (!data?.company) {
    return null;
  }

  const previewEmployees = data.employees.slice(0, 4);

  return (
    <div className="structured-card structured-card--company">
      <h4>{t("chat.cards.companyInfo")}</h4>
      <div className="structured-grid">
        <DetailField label={t("company.name")} value={data.company.name} />
        <DetailField label={t("company.tin")} value={data.company.tin} />
        <DetailField label={t("company.businessType")} value={data.company.businessType} />
        <DetailField label={t("chat.cards.employeeCount")} value={data.employeeCount} />
        <DetailField label={t("chat.cards.grossPayroll")} value={formatMoney(data.grossPayroll)} />
        <DetailField label={t("chat.cards.averageSalary")} value={formatMoney(data.averageSalary)} />
      </div>

      {previewEmployees.length > 0 && (
        <div className="structured-card__section">
          <h5>{t("company.employeesPreview")}</h5>
          <div className="employee-preview-list">
            {previewEmployees.map((employee) => (
              <div key={employee.id || employee.email || employee.name}>
                <strong>{employee.name || t("employees.notProvided")}</strong>
                <span>
                  {employee.role || t("employees.defaultRole")} -{" "}
                  {employee.salary ? formatMoney(employee.salary) : t("employees.notProvided")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FormattedMessageText({ text }) {
  if (!text) {
    return null;
  }

  const blocks = String(text)
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <div className="message__content">
      {blocks.map((block, blockIndex) => {
        const lines = block
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
        const isList = lines.length > 1 && lines.every((line) => /^([-*]|\d+[.)])\s+/.test(line));

        if (isList) {
          return (
            <ul key={`${block}-${blockIndex}`}>
              {lines.map((line) => (
                <li key={line}>{line.replace(/^([-*]|\d+[.)])\s+/, "")}</li>
              ))}
            </ul>
          );
        }

        return (
          <p key={`${block}-${blockIndex}`}>
            {lines.map((line, lineIndex) => (
              <span key={`${line}-${lineIndex}`}>
                {line}
                {lineIndex < lines.length - 1 && <br />}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

export default function AIChat() {
  const { i18n, t } = useTranslation();
  const { user } = useAuth();
  const [company, setCompany] = useState(() => getActiveCompany(user));
  const [companyEmployees, setCompanyEmployees] = useState(() => getStoredEmployees());
  const [messages, setMessages] = useState(() => [
    createChatMessage({
      role: "assistant",
      translationKey: "chat.initialMessage",
    }),
  ]);
  const [message, setMessage] = useState("");
  const [tin, setTin] = useState("");
  const [tinAnalysis, setTinAnalysis] = useState(null);
  const [error, setError] = useState("");
  const [lastFailedRequest, setLastFailedRequest] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [isAnalyzingTin, setIsAnalyzingTin] = useState(false);
  const inputRef = useRef(null);

  const selectedLanguage = i18n.resolvedLanguage || i18n.language || "en";
  const chatSessionId = useMemo(() => getOrCreateChatSessionId(), []);
  const companyContext = useMemo(() => buildCompanyContext(company, companyEmployees), [company, companyEmployees]);
  const companyKey = `${company?.id || ""}:${company?.tin || ""}:${company?.name || ""}`;
  const userSession = useMemo(
    () => buildUserSession(user, selectedLanguage, chatSessionId, companyContext),
    [chatSessionId, companyContext, selectedLanguage, user]
  );
  const canSend = useMemo(() => message.trim().length > 0 && !isSending, [isSending, message]);

  useEffect(() => {
    setCompany(getActiveCompany(user));
  }, [user]);

  useEffect(() => {
    if (!hasCompany(company)) {
      return undefined;
    }

    let isMounted = true;

    async function loadCompanyEmployees() {
      try {
        const { data } = await getEmployeesRequest();
        const loadedEmployees = saveStoredEmployees(normalizeEmployees(data));

        if (isMounted) {
          setCompanyEmployees(loadedEmployees);
        }
      } catch {
        if (isMounted) {
          setCompanyEmployees(getStoredEmployees());
        }
      }
    }

    loadCompanyEmployees();

    return () => {
      isMounted = false;
    };
  }, [companyKey]);

  async function submitChatMessage(rawMessage, { appendUserMessage = true } = {}) {
    const trimmedMessage = rawMessage.trim();

    if (!trimmedMessage || isSending) {
      return;
    }

    const detectedTin = detectTinFromMessage(trimmedMessage);
    const requestTimestamp = new Date().toISOString();
    const userMessage = createChatMessage({
      role: "user",
      content: trimmedMessage,
      createdAt: requestTimestamp,
      isTIN: Boolean(detectedTin),
      detectedTin,
    });
    const nextMessages = appendUserMessage ? [...messages, userMessage] : messages;

    if (appendUserMessage) {
      setMessages((current) => [...current, userMessage]);
      setMessage("");
    }

    setError("");

    if (!hasCompany(companyContext.company)) {
      setLastFailedRequest(null);
      setMessages((current) => [
        ...current,
        createChatMessage({
          role: "assistant",
          content: t("chat.noCompanyMessage"),
          variant: "advice",
        }),
      ]);
      inputRef.current?.focus();
      return;
    }

    setIsSending(true);

    let activeTinAnalysis = tinAnalysis;

    try {
      if (detectedTin) {
        activeTinAnalysis = await analyzeTinRequest(detectedTin, selectedLanguage);
        setTin(detectedTin);
        setTinAnalysis(activeTinAnalysis);
      }

      const history = buildMessageHistory(nextMessages, t);
      const fallbackMessage = t("chat.emptyResponse");
      const { data } = await sendChatMessage(
        {
          message: trimmedMessage,
          isTIN: Boolean(detectedTin),
          tin: detectedTin || undefined,
        },
        history,
        {
          detectedTin,
          language: selectedLanguage,
          timestamp: requestTimestamp,
          tinAnalysis: activeTinAnalysis,
          userSession,
          companyContext,
        }
      );

      const assistantMessage = createAssistantMessageFromResponse(data, {
        detectedTin,
        fallbackMessage,
        requestContent: trimmedMessage,
        t,
        tinAnalysis: activeTinAnalysis,
        companyContext,
      });

      setLastFailedRequest(null);
      setMessages((current) => [...current, assistantMessage]);
    } catch (err) {
      setLastFailedRequest({ message: trimmedMessage });
      setError(getApiErrorMessage(err, t("chat.backendError")));
      setMessages((current) => [
        ...current,
        createChatMessage({
          role: "assistant",
          content: t("chat.fallback"),
          variant: "advice",
          companyContext,
        }),
      ]);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (canSend) {
      submitChatMessage(message);
    }
  }

  function handleRetry() {
    if (!lastFailedRequest || isSending) {
      return;
    }

    submitChatMessage(lastFailedRequest.message, { appendUserMessage: false });
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
      setTin(analysis.tin || tin);
      setMessages((current) => [
        ...current,
        createChatMessage({
          role: "assistant",
          variant: "tin",
          tinData: normalizeTinData(analysis, analysis),
          content: t(analysis.isValid ? "tin.chatSummary" : "tin.invalidSummary", {
            tin: analysis.tin || tin,
            company: analysis.companyName,
            employees: analysis.employeeCount,
            gross: formatMoney(analysis.payrollSummary?.grossPayroll) || EMPTY_VALUE,
            remittance: formatMoney(analysis.payrollSummary?.totalRemittance) || EMPTY_VALUE,
            source: t(`tin.source.${analysis.source}`, { defaultValue: analysis.source || "backend" }),
          }),
        }),
      ]);
    } catch (err) {
      setError(getApiErrorMessage(err, t("tin.loadError")));
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

  function renderMessageBody(item) {
    const text = item.translationKey ? t(item.translationKey) : item.content;
    const companyCard = item.companyContext?.company ? <CompanyContextCard data={item.companyContext} t={t} /> : null;

    if (item.variant === "tin" && item.tinData) {
      return (
        <div className="message__body">
          {companyCard}
          <TinResponseCard data={item.tinData} t={t} />
          <FormattedMessageText text={text} />
        </div>
      );
    }

    if (item.variant === "payroll" && item.payrollData) {
      return (
        <div className="message__body">
          {companyCard}
          <PayrollBreakdownCard data={item.payrollData} t={t} />
          <FormattedMessageText text={text} />
        </div>
      );
    }

    if (companyCard) {
      return (
        <div className="message__body">
          {companyCard}
          <FormattedMessageText text={text} />
        </div>
      );
    }

    return <FormattedMessageText text={text} />;
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

      <div className="ai-workflow-grid" aria-label={t("chat.workflow.label")}>
        {workflowActions.map((action) => (
          <button
            key={action.key}
            type="button"
            className="ai-workflow-card"
            onClick={() => handleSuggestionClick(t(action.promptKey))}
            disabled={isSending}
          >
            <strong>{t(action.labelKey)}</strong>
            <span>{t(action.textKey)}</span>
          </button>
        ))}
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
                <strong>{t(`tin.statuses.${tinAnalysis.registrationStatus}`, { defaultValue: tinAnalysis.registrationStatus || EMPTY_VALUE })}</strong>
              </div>
              <div>
                <span>{t("tin.riskLabel")}</span>
                <strong>{t(`tin.risk.${tinAnalysis.riskLevel}`, { defaultValue: tinAnalysis.riskLevel || EMPTY_VALUE })}</strong>
              </div>
              <div>
                <span>{t("tin.sourceLabel")}</span>
                <strong>{t(`tin.source.${tinAnalysis.source}`, { defaultValue: tinAnalysis.source || EMPTY_VALUE })}</strong>
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
                    <strong>{formatMoney(tinAnalysis.payrollSummary?.grossPayroll) || EMPTY_VALUE}</strong>
                  </div>
                  <div>
                    <span>{t("tin.metrics.paye")}</span>
                    <strong>{formatMoney(tinAnalysis.payrollSummary?.paye) || EMPTY_VALUE}</strong>
                  </div>
                  <div>
                    <span>{t("tin.metrics.totalRemittance")}</span>
                    <strong>{formatMoney(tinAnalysis.payrollSummary?.totalRemittance) || EMPTY_VALUE}</strong>
                  </div>
                </div>

                <div className="tin-obligations">
                  <h4>{t("tin.obligationsTitle")}</h4>
                  <ul>
                    {(tinAnalysis.obligations || []).map((obligation) => (
                      <li key={obligation}>{t(`tin.obligations.${obligation}`)}</li>
                    ))}
                  </ul>
                </div>

                <div className="tin-liabilities">
                  <h4>{t("tin.liabilitiesTitle")}</h4>
                  <ul>
                    {(tinAnalysis.liabilities || []).map((liability) => (
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
        {messages.map((item) => (
          <article
            key={item.id}
            className={`message message--${item.role} ${
              item.variant === "tin" || item.variant === "payroll" || item.companyContext ? "message--structured" : ""
            }`}
          >
            <div className="message__meta">
              <span>{item.role === "user" ? t("chat.you") : t("chat.assistant")}</span>
              {item.isTIN && <strong>{t("chat.tinDetected")}</strong>}
              <time dateTime={item.createdAt}>{formatMessageTime(item.createdAt, selectedLanguage)}</time>
            </div>
            {renderMessageBody(item)}
          </article>
        ))}
        {isSending && (
          <article className="message message--assistant message--typing">
            <div className="message__meta">
              <span>{t("chat.assistant")}</span>
              <time dateTime={new Date().toISOString()}>{formatMessageTime(new Date().toISOString(), selectedLanguage)}</time>
            </div>
            <div className="typing-indicator" aria-label={t("chat.typing")}>
              <i />
              <i />
              <i />
            </div>
          </article>
        )}
      </div>

      {error && (
        <div className="alert alert--error">
          <span>{error}</span>
          {lastFailedRequest && (
            <button type="button" className="button button--ghost alert__action" onClick={handleRetry} disabled={isSending}>
              {t("chat.retry")}
            </button>
          )}
        </div>
      )}

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
