import { create } from "zustand";

const useJobStore = create((set, get) => ({
  jobs: [],
  currentJob: null,
  jobApplicants: [],
  applicantsStats: {
    totalApplications: 0,
    pendingApplications: 0,
    acceptedApplications: 0,
    rejectedApplications: 0,
  },
  applicantsPagination: {
    current: 1,
    pages: 1,
    total: 0,
    limit: 10,
  },
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
  isLoading: false,
  isLoadingApplicants: false,

  setJobs: (jobs) => set({ jobs }),
  setCurrentJob: (job) => set({ currentJob: job }),
  setJobApplicants: (applicants) => set({ jobApplicants: applicants }),
  setApplicantsStats: (stats) => set({ applicantsStats: stats }),
  setApplicantsPagination: (pagination) =>
    set({ applicantsPagination: pagination }),
  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),
  setPagination: (pagination) => set({ pagination }),
  setLoading: (isLoading) => set({ isLoading }),
  setLoadingApplicants: (isLoadingApplicants) => set({ isLoadingApplicants }),

  addJob: (job) =>
    set((state) => ({
      jobs: [job, ...state.jobs],
    })),

  updateJob: (jobId, updates) =>
    set((state) => ({
      jobs: state.jobs.map((job) =>
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
      currentJob: state.currentJob?._id === jobId ? null : state.currentJob,
    })),

  updateApplicantStatus: (applicationId, newStatus) =>
    set((state) => ({
      jobApplicants: state.jobApplicants.map((applicant) =>
        applicant.applicationId === applicationId
          ? { ...applicant, status: newStatus }
          : applicant
      ),
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

  clearJobApplicants: () =>
    set({
      jobApplicants: [],
      applicantsStats: {
        totalApplications: 0,
        pendingApplications: 0,
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
}));

export default useJobStore;