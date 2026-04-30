// @ts-nocheck
export const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
export const IS_API_CONFIGURED = Boolean(API_BASE_URL);

export const TOKEN_STORAGE_KEY = "token";
export const USER_STORAGE_KEY = "smartpayrw_user";
