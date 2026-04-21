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

export const getLatestBlock = () => API.get("/block/latest");
export const verifyBlock = (blockNumber) => API.get(`/verify/${blockNumber}`);
export const getLogs = () => API.get("/logs");
export const getStats = () => API.get("/stats");

export default API;
