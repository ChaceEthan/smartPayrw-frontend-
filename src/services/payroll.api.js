import api from "./api.js";

export function getPayrollRequest() {
  return api.get("/api/payroll");
}
