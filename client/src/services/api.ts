import axios from "axios";

const api = axios.create({
  // A relative URL uses Vite's development proxy locally and works behind a
  // reverse proxy in production. Set VITE_API_URL for a separately hosted API.
  baseURL: import.meta.env.VITE_API_URL || "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
