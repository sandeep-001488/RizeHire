import { create } from "zustand";
import api from "@/lib/api";

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
              status: newStatus,
              ...(feedback && { feedback: [...applicant.feedback, feedback] }),
            }
          : applicant
      ),
      myApplications: state.myApplications.map((app) =>
        app._id === applicationId
          ? {
              ...app,
              status: newStatus,
              ...(feedback && { feedback: [...app.feedback, feedback] }),
            }
          : app
      ),
      currentApplication:
        state.currentApplication?._id === applicationId
          ? {
              ...state.currentApplication,
              status: newStatus,
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
      const response = await api.post(`/applications/jobs/${jobId}/apply`, {
        coverLetter,
      });

      if (response.data.success) {
        // Optionally refetch my applications to get the updated list
        await get().fetchMyApplications();
        return response.data.data;
      }
    } catch (error) {
      console.error("Error applying to job:", error);
      throw error;
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

      // Remove empty filters
      Object.keys(queryParams).forEach((key) => {
        if (queryParams[key] === "") {
          delete queryParams[key];
        }
      });

      const response = await api.get("/applications/my-applications", {
        params: queryParams,
      });

      if (response.data.success) {
        set({
          myApplications: response.data.data.applications,
          myApplicationsPagination: response.data.data.pagination,
        });
      }
    } catch (error) {
      console.error("Error fetching my applications:", error);
      throw error;
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

      // Remove empty filters
      Object.keys(queryParams).forEach((key) => {
        if (queryParams[key] === "" || queryParams[key] === "all") {
          delete queryParams[key];
        }
      });

      const response = await api.get(`/applications/jobs/${jobId}/applicants`, {
        params: queryParams,
      });

      if (response.data.success) {
        set({
          jobApplicants: response.data.data.applicants,
          applicantsPagination: response.data.data.pagination,
          applicantsStats: response.data.data.stats,
        });
      }
    } catch (error) {
      console.error("Error fetching job applicants:", error);
      throw error;
    } finally {
      set({ isLoadingApplicants: false });
    }
  },

  fetchApplication: async (applicationId) => {
    try {
      set({ isLoading: true });
      const response = await api.get(`/applications/${applicationId}`);

      if (response.data.success) {
        set({ currentApplication: response.data.data.application });
        return response.data.data.application;
      }
    } catch (error) {
      console.error("Error fetching application:", error);
      throw error;
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

      const response = await api.put(
        `/applications/${applicationId}/status`,
        payload
      );

      if (response.data.success) {
        get().updateApplicationStatus(
          applicationId,
          status,
          feedback ? { message: feedback, createdAt: new Date() } : null
        );
        return response.data.data;
      }
    } catch (error) {
      console.error("Error updating application status:", error);
      throw error;
    }
  },

  addFeedback: async (applicationId, message, visibleToApplicant = true) => {
    try {
      const response = await api.post(
        `/applications/${applicationId}/feedback`,
        {
          message,
          visibleToApplicant,
        }
      );

      if (response.data.success) {
        const feedback = response.data.data.feedback;
        get().updateApplicationStatus(applicationId, null, feedback);
        return feedback;
      }
    } catch (error) {
      console.error("Error adding feedback:", error);
      throw error;
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
