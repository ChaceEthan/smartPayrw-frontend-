// @ts-nocheck
import { createLocalId, toNumber } from "./companyData.js";

const TRANSACTIONS_STORAGE_KEY = "smartpayrw.businessTransactions";

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function readTransactions() {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const value = window.localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
    return value ? JSON.parse(value) : [];
  } catch {
    window.localStorage.removeItem(TRANSACTIONS_STORAGE_KEY);
    return [];
  }
}

function writeTransactions(transactions) {
  if (canUseStorage()) {
    window.localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(transactions));
  }
}

export function normalizeTransaction(data) {
  const amount = toNumber(data?.amount || data?.total || data?.value);
  const description = String(data?.description || data?.customer || data?.item || "").trim();

  if (!description && !amount) {
    return null;
  }

  return {
    id: data?.id || data?._id || createLocalId(),
    description,
    amount: amount || 0,
    paymentMethod: data?.paymentMethod || data?.method || "cash",
    date: data?.date || data?.createdAt || new Date().toISOString().slice(0, 10),
    createdAt: data?.createdAt || new Date().toISOString(),
  };
}

export function normalizeTransactions(data) {
  const list = Array.isArray(data) ? data : data?.transactions || data?.data || [];
  return Array.isArray(list) ? list.map(normalizeTransaction).filter(Boolean) : [];
}

export function getStoredTransactions() {
  return normalizeTransactions(readTransactions());
}

export function saveStoredTransactions(transactions) {
  const normalized = normalizeTransactions(transactions);
  writeTransactions(normalized);
  return normalized;
}

export function addStoredTransaction(transaction) {
  const normalizedTransaction = normalizeTransaction(transaction);

  if (!normalizedTransaction) {
    return getStoredTransactions();
  }

  const nextTransactions = [normalizedTransaction, ...getStoredTransactions()];
  writeTransactions(nextTransactions);
  return nextTransactions;
}

export function summarizeTransactions(transactions) {
  const normalized = normalizeTransactions(transactions);
  const today = new Date().toISOString().slice(0, 10);
  const dailySales = normalized
    .filter((transaction) => transaction.date === today)
    .reduce((total, transaction) => total + transaction.amount, 0);
  const totalSales = normalized.reduce((total, transaction) => total + transaction.amount, 0);
  const averageSale = normalized.length > 0 ? totalSales / normalized.length : 0;

  return {
    count: normalized.length,
    dailySales,
    totalSales,
    averageSale,
    today,
  };
}
