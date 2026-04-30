// @ts-nocheck
import api from "./api.js";

export function registerRequest(payload) {
  return api.post("/api/auth/register", payload);
}

export function loginRequest(payload) {
  return api.post("/api/auth/login", payload);
}

export function getCurrentUserRequest() {
  return api.get("/api/auth/me");
}
