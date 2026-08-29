import axios from "axios";

// In dev, Vite proxies /api and /uploads to the server (see vite.config.ts),
// so a relative base URL works for both local dev and a same-origin
// production deploy. Set VITE_API_BASE_URL to point at a separate API host.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "",
  withCredentials: true,
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err?.response?.data?.error ?? err.message ?? "Something went wrong.";
    return Promise.reject(new Error(message));
  }
);
