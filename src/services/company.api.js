// @ts-nocheck
import api from "./api.js";

export function registerCompanyRequest(payload) {
  return api.post("/api/company/register", payload);
}
