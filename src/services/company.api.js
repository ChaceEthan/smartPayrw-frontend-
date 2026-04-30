// @ts-nocheck
import api from "./api.js";

export function registerCompanyRequest(form) {
  return api.post("/api/company/register", {
    name: form.name,
    tin: form.tin,
    businessType: form.businessType,
  });
}

export function getMyCompanyRequest() {
  return api.get("/api/company/my");
}

export function getAdminCompaniesRequest() {
  return api.get("/api/admin/companies");
}
