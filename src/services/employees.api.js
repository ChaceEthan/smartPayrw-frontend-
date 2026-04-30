import api from "./api.js";

export function getEmployeesRequest() {
  return api.get("/api/employees");
}

export function createEmployeeRequest(payload) {
  return api.post("/api/employees", payload);
}
