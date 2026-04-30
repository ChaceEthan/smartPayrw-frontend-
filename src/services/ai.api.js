// @ts-nocheck
import {
  PAYROLL_CONTEXT_LABEL,
  SMARTPAY_SYSTEM_PROMPT,
  buildPayrollAiContext,
} from "../utils/rwandaPayroll.js";
import api from "./api.js";

export function sendChatMessage(message, history = [], options = {}) {
  const messagePayload = typeof message === "string" ? { message } : message || {};
  const messageText = messagePayload.message || "";
  const isTIN = Boolean(messagePayload.isTIN || options.isTIN);

  return api.post("/api/ai/chat", {
    ...messagePayload,
    message: messageText,
    isTIN,
    tin: messagePayload.tin || options.detectedTin || undefined,
    context: PAYROLL_CONTEXT_LABEL,
    timestamp: options.timestamp || new Date().toISOString(),
    userSession: options.userSession || null,
    systemPrompt: SMARTPAY_SYSTEM_PROMPT,
    language: options.language || "en",
    payrollContext: buildPayrollAiContext(options.tinAnalysis),
    messages: history,
  });
}

export function extractAssistantReply(data, fallbackMessage) {
  const reply =
    data?.message ||
    data?.reply ||
    data?.response ||
    data?.content ||
    data?.advice ||
    data?.data?.message ||
    data?.data?.reply ||
    data?.data?.response ||
    data?.data?.content ||
    data?.data?.advice ||
    data?.choices?.[0]?.message?.content ||
    fallbackMessage ||
    "The AI service responded, but no message content was returned.";

  if (typeof reply === "string") {
    return reply;
  }

  return reply?.content || reply?.message || fallbackMessage || "The AI service responded, but no message content was returned.";
}
