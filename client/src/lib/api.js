import axios from "axios";
import useAuthStore from "@/stores/authStore";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const authHeader = useAuthStore.getState().getAuthHeader();
    if (authHeader) {
      config.headers.Authorization = authHeader;
    } else {
      console.log("⚠️ API Request without auth header:", config.url);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const { tokens, logout, setTokens } = useAuthStore.getState();

      if (tokens?.refreshToken) {
        try {
          const response = await axios.post(
            `${API_BASE_URL}/auth/refresh-token`,
            {
              refreshToken: tokens.refreshToken,
            }
          );

          const newTokens = response.data.data.tokens;
          setTokens(newTokens);

          originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          console.error("Token refresh failed:", refreshError);
          logout();
          if (typeof window !== "undefined") {
            window.location.href = "/auth/login";
          }
        }
      } else {
        logout();
        if (typeof window !== "undefined") {
          window.location.href = "/auth/login";
        }
      }
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  logout: (refreshToken) => api.post("/auth/logout", { refreshToken }),
  getProfile: () => api.get("/auth/profile"),
  updateProfile: (data) => {
    return api.put("/auth/profile", data);
  },
};

export const jobsAPI = {
  getJobs: (params) => api.get("/jobs", { params }),
  getJob: (id) => api.get(`/jobs/${id}`),
  createJob: (data) => api.post("/jobs", data),
  updateJob: (id, data) => api.put(`/jobs/${id}`, data),
  deleteJob: (id) => api.delete(`/jobs/${id}`),
  getMyJobs: (params) => api.get("/jobs/my-posted-jobs", { params }),
};

export const applicationsAPI = {
  applyToJob: (jobId, data) => {
    return api.post(`/applications/jobs/${jobId}/apply`, data);
  },
  getMyApplications: (params) => {
    return api.get("/applications/my-applications", { params });
  },
  getJobApplicants: (jobId, params) => {
    const url = `/applications/jobs/${jobId}/applicants`;
    return api.get(url, { params });
  },
  getApplication: (applicationId) => {
    return api.get(`/applications/${applicationId}`);
  },
  updateApplicationStatus: (applicationId, data) => {
    return api.put(`/applications/${applicationId}/status`, data);
  },
  addFeedback: (applicationId, data) => {
    return api.post(`/applications/${applicationId}/feedback`, data);
  },
};

export const aiAPI = {
  extractSkills: (data) => api.post("/ai/extract-skills", data),
  getJobMatch: (jobId) => api.get(`/ai/job-match/${jobId}`),
  getRecommendations: () => api.get("/ai/recommendations"),
  getCareerSuggestions: () => api.get("/ai/career-suggestions"),
  optimizeDescription: (data) => api.post("/ai/optimize-description", data),
  getInterviewQuestions: (jobId) => api.get(`/ai/interview-questions/${jobId}`),
};

export const paymentsAPI = {
  verifyPayment: (data) => api.post("/payments/verify", data),
  getPaymentStatus: (jobId) => api.get(`/payments/status/${jobId}`),
  updateWalletAddress: (data) => api.put("/payments/wallet", data),
  updatePaymentVerification: (jobId, data) =>
    api.put(`/payments/verify/${jobId}`, data),
  getPaymentHistory: () => api.get("/payments/history"),
  getFeeInfo: () => api.get("/payments/fee-info"),
};

export default api;
