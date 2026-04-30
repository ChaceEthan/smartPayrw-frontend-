import api from "./api.js";

export function getEmployeesRequest() {
  return api.get("/api/employees");
}
