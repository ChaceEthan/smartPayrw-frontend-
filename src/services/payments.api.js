// @ts-nocheck
import api from "./api.js";

const paymentEndpoints = {
  mtn: "/api/payments/mtn/request",
  airtel: "/api/payments/airtel/request",
};

export function requestMobileMoneyPayment(provider, payload) {
  const normalizedProvider = String(provider || "").toLowerCase();
  const endpoint = paymentEndpoints[normalizedProvider];

  if (!endpoint) {
    return Promise.reject(new Error("Unsupported payment provider."));
  }

  return api.post(endpoint, {
    ...payload,
    provider: normalizedProvider,
  });
}
