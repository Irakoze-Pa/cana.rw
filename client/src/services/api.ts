import axios, { AxiosError } from "axios";

export const apiBaseUrl =
  import.meta.env.VITE_API_URL || "/api/v1";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const api = axios.create({
  // A relative URL uses Vite's development proxy locally and works behind a
  // reverse proxy in production. Set VITE_API_URL for a separately hosted API.
  baseURL: apiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  // Let the browser set the multipart boundary for FormData uploads. A forced
  // JSON content type makes multer receive the site/product fields but not the
  // selected image file.
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    config.headers.setContentType?.(false);
    delete config.headers["Content-Type"];
  }

  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: { code?: string; message?: string }; message?: string }>) => {
    const body = error.response?.data;
    return Promise.reject(
      new ApiError(
        body?.error?.message || body?.message || error.message || "The request could not be completed.",
        error.response?.status,
        body?.error?.code
      )
    );
  }
);

export default api;
