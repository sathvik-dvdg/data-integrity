import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1",
  timeout: 15000,
});

// Response interceptor for unified error handling
API.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const message = err.response?.data?.message || err.response?.data?.error || "Network error occurred";
    console.error("API Error:", message);
    return Promise.reject(new Error(message));
  }
);

export const getDashboardSummary = (signal) => API.get("/summary", { signal });
export const getLatestBlock = (signal) => API.get("/block/latest", { signal });
export const verifyBlock = (blockNumber, signal) => API.get(`/verify/${blockNumber}`, { signal });
export const getLogs = (signal) => API.get("/logs", { signal });

export default API;
