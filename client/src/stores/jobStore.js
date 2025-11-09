import { create } from "zustand";
import { jobsAPI } from "@/lib/api"; 

const useJobStore = create((set, get) => ({
  jobs: [],
  currentJob: null,
  myJobs: [],
  filters: {
    search: "",
    jobType: "",
    workMode: "",
    location: "",
    experienceLevel: "",
    skills: [],
  },
  pagination: {
    current: 1,
    pages: 1,
    total: 0,
    limit: 10,
  },
  myJobsPagination: {
    current: 1,
    pages: 1,
    total: 0,
    limit: 10,
  },
  isLoading: false,
  isLoadingMyJobs: false,

  // Setters
  setJobs: (jobs) => set({ jobs }),
  setCurrentJob: (job) => set({ currentJob: job }),
  setMyJobs: (jobs) => set({ myJobs: jobs }),
  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),
  setPagination: (pagination) => set({ pagination }),
  setMyJobsPagination: (pagination) => set({ myJobsPagination: pagination }),
  setLoading: (isLoading) => set({ isLoading }),
  setLoadingMyJobs: (isLoadingMyJobs) => set({ isLoadingMyJobs }),

  // Actions
  addJob: (job) =>
    set((state) => ({
      jobs: [job, ...state.jobs],
      myJobs: [job, ...state.myJobs],
    })),

  updateJob: (jobId, updates) =>
    set((state) => ({
      jobs: state.jobs.map((job) =>
        job._id === jobId ? { ...job, ...updates } : job
      ),
      myJobs: state.myJobs.map((job) =>
        job._id === jobId ? { ...job, ...updates } : job
      ),
      currentJob:
        state.currentJob?._id === jobId
          ? { ...state.currentJob, ...updates }
          : state.currentJob,
    })),

  removeJob: (jobId) =>
    set((state) => ({
      jobs: state.jobs.filter((job) => job._id !== jobId),
      myJobs: state.myJobs.filter((job) => job._id !== jobId),
      currentJob: state.currentJob?._id === jobId ? null : state.currentJob,
    })),

  clearFilters: () =>
    set({
      filters: {
        search: "",
        jobType: "",
        workMode: "",
        location: "",
        experienceLevel: "",
        skills: [],
      },
    }),

  // API Actions
  fetchJobs: async (params = {}) => {
    try {
      set({ isLoading: true });
      const state = get();
      const queryParams = {
        page: state.pagination.current,
        limit: state.pagination.limit,
        ...state.filters,
        ...params,
      };
      Object.keys(queryParams).forEach((key) => {
        if (
          queryParams[key] === "" ||
          (Array.isArray(queryParams[key]) && queryParams[key].length === 0)
        ) {
          delete queryParams[key];
        }
      });
      const response = await jobsAPI.getJobs(queryParams);
      if (response.data.success) {
        set({
          jobs: response.data.data.jobs,
          pagination: response.data.data.pagination,
        });
      }
    } catch (error) {
      console.error("Error fetching jobs:", error);
      throw error.response?.data || error;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchJob: async (jobId) => {
    try {
      set({ isLoading: true });
      const response = await jobsAPI.getJob(jobId);
      if (response.data.success) {
        set({ currentJob: response.data.data.job });
        return response.data.data.job;
      }
    } catch (error) {
      console.error("Error fetching job:", error);
      throw error.response?.data || error;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchMyJobs: async (params = {}) => {
    try {
      set({ isLoadingMyJobs: true });
      const state = get();
      const queryParams = {
        page: state.myJobsPagination.current,
        limit: state.myJobsPagination.limit,
        ...params,
      };
      const response = await jobsAPI.getMyJobs(queryParams);
      if (response.data.success) {
        set({
          myJobs: response.data.data.jobs,
          myJobsPagination: response.data.data.pagination,
        });
      }
    } catch (error) {
      console.error("Error fetching my jobs:", error);
      throw error.response?.data || error;
    } finally {
      set({ isLoadingMyJobs: false });
    }
  },

  createJob: async (jobData) => {
    try {
      const response = await jobsAPI.createJob(jobData);
      if (response.data.success) {
        const newJob = response.data.data.job;
        get().addJob(newJob);
        return newJob;
      }
    } catch (error) {
      console.error("Error creating job:", error);
      throw error.response?.data || error;
    }
  },

  updateJobById: async (jobId, updates) => {
    try {
      const response = await jobsAPI.updateJob(jobId, updates);
      if (response.data.success) {
        const updatedJob = response.data.data.job;
        get().updateJob(jobId, updatedJob);
        return updatedJob;
      }
    } catch (error) {
      console.error("Error updating job:", error);
      throw error.response?.data || error;
    }
  },

  deleteJob: async (jobId) => {
    try {
      const response = await jobsAPI.deleteJob(jobId);
      if (response.data.success) {
        get().removeJob(jobId);
        return true;
      }
    } catch (error) {
      console.error("Error deleting job:", error);
      throw error.response?.data || error;
    }
  },
}));

export default useJobStore;