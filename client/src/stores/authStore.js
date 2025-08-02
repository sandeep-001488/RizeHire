"use client";
import axios from "axios";
import { create } from "zustand";
import { persist } from "zustand/middleware";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

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
          const response = await axios.post(
            `${API_BASE_URL}/auth/login`,
            credentials,
            { headers: { "Content-Type": "application/json" } }
          );

          const { user, tokens } = response.data.data;

          set({
            user,
            tokens,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            isInitialized: true,
          });

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
          const response = await axios.post(
            `${API_BASE_URL}/auth/register`,
            userData,
            { headers: { "Content-Type": "application/json" } }
          );

          const { user, tokens } = response.data.data;

          set({
            user,
            tokens,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            isInitialized: true,
          });

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
            await axios.post(
              `${API_BASE_URL}/auth/logout`,
              { refreshToken: tokens.refreshToken },
              {
                headers: {
                  Authorization: `Bearer ${tokens.accessToken}`,
                  "Content-Type": "application/json",
                },
              }
            );
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
          const response = await axios.get(`${API_BASE_URL}/auth/profile`, {
            headers: {
              Authorization: `Bearer ${tokens.accessToken}`,
            },
          });

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
