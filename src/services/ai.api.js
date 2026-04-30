// @ts-nocheck
import {
  PAYROLL_CONTEXT_LABEL,
  SMARTPAY_SYSTEM_PROMPT,
  buildPayrollAiContext,
} from "../utils/rwandaPayroll.js";
import api from "./api.js";

export function sendChatMessage(message, history = [], options = {}) {
  return api.post("/api/ai/chat", {
    message,
    context: PAYROLL_CONTEXT_LABEL,
    systemPrompt: SMARTPAY_SYSTEM_PROMPT,
    language: options.language || "en",
    payrollContext: buildPayrollAiContext(options.tinAnalysis),
    messages: history,
  });
}

export function extractAssistantReply(data, fallbackMessage) {
  return (
    data?.message ||
    data?.reply ||
    data?.response ||
    data?.content ||
    data?.data?.message ||
    data?.choices?.[0]?.message?.content ||
    fallbackMessage ||
    "The AI service responded, but no message content was returned."
  );
}
