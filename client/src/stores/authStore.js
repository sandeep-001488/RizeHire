"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authAPI } from "@/lib/api";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      isInitialized: false,
      isHydrated: false,

      setHydrated: () => {
        set({ isHydrated: true });
      },

      login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authAPI.login(credentials);
          const { user, tokens } = response.data.data;
          
          // Set all state synchronously
          set({
            user,
            tokens,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            isInitialized: true,
          });
          
          // Force a storage sync
          await new Promise(resolve => setTimeout(resolve, 50));
          
          return { success: true, user, tokens };
        } catch (error) {
          const errorMessage = error.response?.data?.message || "Login failed";
          set({
            error: errorMessage,
            isLoading: false,
            isAuthenticated: false,
            isInitialized: true,
          });
          return { success: false, error: errorMessage };
        }
      },

      register: async (userData) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authAPI.register(userData);
          const { user, tokens } = response.data.data;
          
          set({
            user,
            tokens,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            isInitialized: true,
          });
          
          // Force a storage sync
          await new Promise(resolve => setTimeout(resolve, 50));
          
          return { success: true, user, tokens };
        } catch (error) {
          const errorMessage =
            error.response?.data?.message || "Registration failed";
          set({
            error: errorMessage,
            isLoading: false,
            isAuthenticated: false,
            isInitialized: true,
          });
          return { success: false, error: errorMessage };
        }
      },

      logout: async () => {
        const { tokens } = get();
        try {
          if (tokens?.refreshToken) {
            await authAPI.logout(tokens.refreshToken);
          }
        } catch (error) {
          console.error("Logout API error:", error);
        }
        set({
          user: null,
          tokens: null,
          isAuthenticated: false,
          error: null,
          isInitialized: true,
        });
      },

      checkAuth: async () => {
        if (typeof window === "undefined") {
          set({ isInitialized: true, isAuthenticated: false });
          return;
        }
        const { tokens } = get();
        if (!tokens?.accessToken) {
          set({
            isInitialized: true,
            isAuthenticated: false,
            user: null,
            tokens: null,
          });
          return;
        }
        set({ isLoading: true });
        try {
          const response = await authAPI.getProfile();
          set({
            user: response.data.data.user,
            isAuthenticated: true,
            isLoading: false,
            isInitialized: true,
          });
        } catch (error) {
          set({
            user: null,
            tokens: null,
            isAuthenticated: false,
            isLoading: false,
            isInitialized: true,
          });
        }
      },

      forgotPassword: async (email) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authAPI.forgotPassword({ email });
          set({ isLoading: false });
          return { success: true, message: response.data.message };
        } catch (error) {
          const errorMessage =
            error.response?.data?.message || "Failed to send reset email";
          set({ isLoading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      resetPassword: async (token, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authAPI.resetPassword(token, { password });
          const { user, tokens } = response.data.data;
          
          set({
            user,
            tokens,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            isInitialized: true,
          });
          
          return { success: true, user };
        } catch (error) {
          const errorMessage =
            error.response?.data?.message || "Failed to reset password";
          set({
            isLoading: false,
            error: errorMessage,
            isAuthenticated: false,
            isInitialized: true,
          });
          return { success: false, error: errorMessage };
        }
      },

      parseResume: async (file) => {
        set({ isLoading: true, error: null });
        const formData = new FormData();
        formData.append("resume", file);
        try {
          const response = await authAPI.parseResume(formData);
          const { user } = response.data.data;
          set((state) => ({
            ...state,
            user,
            isLoading: false,
            error: null,
          }));
          return { success: true, user };
        } catch (error) {
          const errorMessage =
            error.response?.data?.message || "Failed to parse resume";
          set({ isLoading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      setUser: (user) => {
        set({ user, isAuthenticated: !!user });
      },

      updateUser: (userData) =>
        set((state) => ({
          user: { ...state.user, ...userData },
        })),

      getAuthHeader: () => {
        const { tokens } = get();
        return tokens?.accessToken ? `Bearer ${tokens.accessToken}` : null;
      },

      setTokens: (tokens) => {
        set({ tokens });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
        isInitialized: state.isInitialized,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHydrated();
        } else {
          useAuthStore.setState({
            isHydrated: true,
            isInitialized: true,
            isAuthenticated: false,
          });
        }
      },
    }
  )
);

export default useAuthStore;