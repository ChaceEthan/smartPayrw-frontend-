// @ts-nocheck
import { PAYROLL_CONTEXT_LABEL, SMARTPAY_SYSTEM_PROMPT, simulateTinAnalysis } from "../utils/rwandaPayroll.js";
import api from "./api.js";

export async function analyzeTinRequest(tin, language = "en") {
  try {
    const { data } = await api.post("/api/tin/analyze", {
      tin,
      context: PAYROLL_CONTEXT_LABEL,
      systemPrompt: SMARTPAY_SYSTEM_PROMPT,
      language,
    });

    return {
      ...simulateTinAnalysis(tin),
      ...(data?.data || data),
      source: "backend",
    };
  } catch (error) {
    return simulateTinAnalysis(tin);
  }
}
