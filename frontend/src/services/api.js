import axios from "axios";

// Create an Axios instance with the correct backend URL
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1",
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Response Interceptor for better error logging
API.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (!error.response) {
      console.error("API Error: Network error occurred. Check if the backend is running at http://localhost:5000 and CORS is configured.");
    }
    return Promise.reject(error);
  }
);

export const getDashboardSummary = () => API.get("/summary");
export const getLogs = (page = 1, limit = 50) => API.get(`/logs?page=${page}&limit=${limit}`);
export const verifyBlock = (blockNumber) => API.get(`/verify/${blockNumber}`);
export const requestVerification = (message) => API.post("/verify/request", { message });
export const getLatestBlock = () => API.get("/block/latest");
export const downloadAuditReport = () => API.get("/export", { responseType: "blob" });

export default API;
