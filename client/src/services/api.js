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

export default api;