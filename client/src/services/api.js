import axios from "axios";

const api = axios.create({
  // Same-origin "/api" works both locally (via the Vite dev proxy)
  // and in production (via the Netlify /api/* -> function redirect).
  // Override with VITE_API_URL if the API lives on another domain.
  baseURL: import.meta.env.VITE_API_URL || "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor to attach JWT token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor to clear stale/invalid tokens on 401 so the user is never
// stuck on an "authentication error". The login endpoint is excluded: there a
// 401 means wrong credentials and must still surface the server message.
api.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (body && typeof body === "object" && "success" in body) {
      response.data = body.data !== undefined ? body.data : body;
    }
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";
    if (status === 401 && !url.includes("/auth/login")) {
      localStorage.removeItem("token");
      if (window.location.pathname !== "/") {
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  }
);

export default api;