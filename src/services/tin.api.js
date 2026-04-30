// @ts-nocheck
import { PAYROLL_CONTEXT_LABEL, SMARTPAY_SYSTEM_PROMPT } from "../utils/rwandaPayroll.js";
import api from "./api.js";

export async function analyzeTinRequest(tin, language = "en") {
  const { data } = await api.post("/api/tin/analyze", {
    tin,
    context: PAYROLL_CONTEXT_LABEL,
    systemPrompt: SMARTPAY_SYSTEM_PROMPT,
    language,
  });

  return {
    ...(data?.data || data),
    source: "backend",
  };
}
