import { create } from "zustand";
import { applicationsAPI } from "@/lib/api";

const useApplicationStore = create((set, get) => ({
  myApplications: [],
  jobApplicants: [],
  currentApplication: null,
  applicantsStats: {
    totalApplications: 0,
    pendingApplications: 0,
    viewedApplications: 0,
    movingForwardApplications: 0,
    acceptedApplications: 0,
    rejectedApplications: 0,
  },
  myApplicationsPagination: {
    current: 1,
    pages: 1,
    total: 0,
    limit: 10,
  },
  applicantsPagination: {
    current: 1,
    pages: 1,
    total: 0,
    limit: 10,
  },
  applicantsFilters: {
    status: "all",
    sortBy: "matchScore", // New default sort
    sortOrder: "desc",
  },
  myApplicationsFilters: {
    status: "all",
  },
  isLoading: false,
  isLoadingApplicants: false,
  isLoadingMyApplications: false,

  setMyApplications: (applications) => set({ myApplications: applications }),
  setJobApplicants: (applicants) => set({ jobApplicants: applicants }),
  setCurrentApplication: (application) =>
    set({ currentApplication: application }),
  setApplicantsStats: (stats) => set({ applicantsStats: stats }),
  setMyApplicationsPagination: (pagination) =>
    set({ myApplicationsPagination: pagination }),
  setApplicantsPagination: (pagination) =>
    set({ applicantsPagination: pagination }),
  setApplicantsFilters: (filters) =>
    set((state) => ({
      applicantsFilters: { ...state.applicantsFilters, ...filters },
    })),
  setMyApplicationsFilters: (filters) =>
    set((state) => ({
      myApplicationsFilters: { ...state.myApplicationsFilters, ...filters },
    })),
  setLoading: (isLoading) => set({ isLoading }),
  setLoadingApplicants: (isLoadingApplicants) => set({ isLoadingApplicants }),
  setLoadingMyApplications: (isLoadingMyApplications) =>
    set({ isLoadingMyApplications }),

  addApplication: (application) =>
    set((state) => ({
      myApplications: [application, ...state.myApplications],
    })),

  updateApplicationStatus: (applicationId, newStatus, feedback = null) =>
    set((state) => ({
      jobApplicants: state.jobApplicants.map((applicant) =>
        applicant.applicationId === applicationId
          ? {
              ...applicant,
              status: newStatus || applicant.status, // Allow null to only update feedback
              ...(feedback && { feedback: [...applicant.feedback, feedback] }),
            }
          : applicant
      ),
      myApplications: state.myApplications.map((app) =>
        app._id === applicationId
          ? {
              ...app,
              status: newStatus || app.status,
              ...(feedback && { feedback: [...app.feedback, feedback] }),
            }
          : app
      ),
      currentApplication:
        state.currentApplication?._id === applicationId
          ? {
              ...state.currentApplication,
              status: newStatus || state.currentApplication.status,
              ...(feedback && {
                feedback: [...state.currentApplication.feedback, feedback],
              }),
            }
          : state.currentApplication,
    })),

  removeApplication: (applicationId) =>
    set((state) => ({
      myApplications: state.myApplications.filter(
        (app) => app._id !== applicationId
      ),
      jobApplicants: state.jobApplicants.filter(
        (app) => app.applicationId !== applicationId
      ),
      currentApplication:
        state.currentApplication?._id === applicationId
          ? null
          : state.currentApplication,
    })),

  clearApplicantsFilters: () =>
    set({
      applicantsFilters: {
        status: "all",
        sortBy: "matchScore",
        sortOrder: "desc",
      },
    }),
  clearMyApplicationsFilters: () =>
    set({
      myApplicationsFilters: {
        status: "all",
      },
    }),
  clearJobApplicants: () =>
    set({
      jobApplicants: [],
      applicantsStats: {
        totalApplications: 0,
        pendingApplications: 0,
        viewedApplications: 0,
        movingForwardApplications: 0,
        acceptedApplications: 0,
        rejectedApplications: 0,
      },
      applicantsPagination: {
        current: 1,
        pages: 1,
        total: 0,
        limit: 10,
      },
    }),

  // API Actions
  applyToJob: async (jobId, coverLetter) => {
    try {
      set({ isLoading: true });
      const response = await applicationsAPI.applyToJob(jobId, { coverLetter });
      if (response.data.success) {
        await get().fetchMyApplications();
        return response.data.data;
      }
    } catch (error) {
      console.error("Error applying to job:", error);
      throw error.response?.data || error;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchMyApplications: async (params = {}) => {
    try {
      set({ isLoadingMyApplications: true });
      const state = get();
      const queryParams = {
        page: state.myApplicationsPagination.current,
        limit: state.myApplicationsPagination.limit,
        ...state.myApplicationsFilters,
        ...params,
      };
      Object.keys(queryParams).forEach((key) => {
        if (queryParams[key] === "") {
          delete queryParams[key];
        }
      });
      const response = await applicationsAPI.getMyApplications(queryParams);
      if (response.data.success) {
        set({
          myApplications: response.data.data.applications,
          myApplicationsPagination: response.data.data.pagination,
        });
      }
    } catch (error) {
      console.error("Error fetching my applications:", error);
      throw error.response?.data || error;
    } finally {
      set({ isLoadingMyApplications: false });
    }
  },

  fetchJobApplicants: async (jobId, params = {}) => {
    try {
      set({ isLoadingApplicants: true });
      const state = get();
      const queryParams = {
        page: state.applicantsPagination.current,
        limit: state.applicantsPagination.limit,
        ...state.applicantsFilters,
        ...params,
      };
      Object.keys(queryParams).forEach((key) => {
        if (queryParams[key] === "" || queryParams[key] === "all") {
          delete queryParams[key];
        }
      });
      const response = await applicationsAPI.getJobApplicants(
        jobId,
        queryParams
      );
      if (response.data.success) {
        set({
          jobApplicants: response.data.data.applicants,
          applicantsPagination: response.data.data.pagination,
          applicantsStats: response.data.data.stats,
        });
      }
    } catch (error) {
      console.error("Error fetching job applicants:", error);
      throw error.response?.data || error;
    } finally {
      set({ isLoadingApplicants: false });
    }
  },

  fetchApplication: async (applicationId) => {
    try {
      set({ isLoading: true });
      const response = await applicationsAPI.getApplication(applicationId);
      if (response.data.success) {
        set({ currentApplication: response.data.data.application });
        return response.data.data.application;
      }
    } catch (error) {
      console.error("Error fetching application:", error);
      throw error.response?.data || error;
    } finally {
      set({ isLoading: false });
    }
  },

  updateApplicationStatusById: async (
    applicationId,
    status,
    feedback = null
  ) => {
    try {
      const payload = { status };
      if (feedback) {
        payload.feedback = feedback;
      }
      const response = await applicationsAPI.updateApplicationStatus(
        applicationId,
        payload
      );
      if (response.data.success) {
        get().updateApplicationStatus(
          applicationId,
          status,
          feedback ? { message: feedback, createdAt: new Date() } : null
        );
        // Refetch stats
        await get().fetchJobApplicants(
          response.data.data.application.jobId,
          {}
        );
        return response.data.data;
      }
    } catch (error) {
      console.error("Error updating application status:", error);
      throw error.response?.data || error;
    }
  },

  addFeedback: async (applicationId, message, visibleToApplicant = true) => {
    try {
      const response = await applicationsAPI.addFeedback(applicationId, {
        message,
        visibleToApplicant,
      });
      if (response.data.success) {
        const feedback = response.data.data.feedback;
        get().updateApplicationStatus(applicationId, null, feedback);
        return feedback;
      }
    } catch (error) {
      console.error("Error adding feedback:", error);
      throw error.response?.data || error;
    }
  },

  getApplicationsByStatus: (status) => {
    const state = get();
    if (status === "all") return state.myApplications;
    return state.myApplications.filter((app) => app.status === status);
  },

  getApplicantsByStatus: (status) => {
    const state = get();
    if (status === "all") return state.jobApplicants;
    return state.jobApplicants.filter((app) => app.status === status);
  },
}));

export default useApplicationStore;
