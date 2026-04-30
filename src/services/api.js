// @ts-nocheck
import axios from "axios";
import {
  IS_API_CONFIGURED,
  USER_STORAGE_KEY,
} from "../config/app.config.js";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (!IS_API_CONFIGURED) {
    return Promise.reject(new Error("Missing VITE_API_URL. Add it to your frontend environment."));
  }

  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem(USER_STORAGE_KEY);
    }

    return Promise.reject(error);
  }
);

export function getApiErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  return error.response?.data?.message || error.response?.data?.error || error.message || fallback;
}

export default api;
