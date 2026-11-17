
import axios from "axios";

const API = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    "http://localhost:5001/api",

  headers: {
    "Content-Type": "application/json",
  },

  withCredentials: true,
  timeout: 30000,
});

// Attach authentication token and handle file uploads.
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("medichain_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Let the browser/Axios generate the multipart boundary.
    if (
      typeof FormData !== "undefined" &&
      config.data instanceof FormData
    ) {
      config.headers.delete("Content-Type");
    }

    return config;
  },
  (error) => Promise.reject(error)
);

API.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error(
      "MediChain API Error:",
      error.response?.data || error.message
    );

    return Promise.reject(error);
  }
);

export default API;
