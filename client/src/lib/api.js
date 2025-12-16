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
    const { tokens } = useAuthStore.getState();
    if (tokens?.accessToken) {
      config.headers.Authorization = `Bearer ${tokens.accessToken}`;
      if (tokens?.refreshToken) {
        config.headers["X-Refresh-Token"] = tokens.refreshToken;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // Check for new tokens in response headers
    const newAccessToken = response.headers["x-new-access-token"];
    const newRefreshToken = response.headers["x-new-refresh-token"];
    
    if (newAccessToken && newRefreshToken) {
      const { setTokens } = useAuthStore.getState();
      setTokens({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });
    }
    
    return response;
  },
  async (error) => {
    if (error.response?.status === 401 && error.response?.data?.requiresAuth) {
      const { logout } = useAuthStore.getState();
      logout();
      window.location.href = "/auth/login";
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  logout: (refreshToken) => api.post("/auth/logout", { refreshToken }),
  getProfile: () => api.get("/auth/profile"),
  updateProfile: (data) => api.put("/auth/profile", data),
   updateSkills: (data) => api.put("/auth/profile/skills", data),
  // --- NEW ---
  forgotPassword: (data) => api.post("/auth/forgot-password", data),
  resetPassword: (token, data) =>
    api.patch(`/auth/reset-password/${token}`, data),
  parseResume: (formData) =>
    api.post("/auth/profile/parse-resume", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }),
};

export const jobsAPI = {
  getJobs: (params) => api.get("/jobs", { params }),
  getJob: (id) => api.get(`/jobs/${id}`),
  createJob: (data) => {
    const { hardConstraints, ...jobData } = data;
    const hardConstraintsData = {
      gender: hardConstraints?.gender || null,
      minYears: hardConstraints?.minYears || null,
    };
    const requestData = {
      ...jobData,
      hardConstraints: hardConstraintsData,
    };
    return api.post("/jobs", requestData);
  },
  updateJob: (id, data) => api.put(`/jobs/${id}`, data),
  deleteJob: (id) => api.delete(`/jobs/${id}`),
  getMyJobs: (params) => api.get("/jobs/my-posted-jobs", { params }),
};

export const applicationsAPI = {
  applyToJob: (jobId, data) => {
    return api.post(`/applications/jobs/${jobId}/apply`, data, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
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



export default api;