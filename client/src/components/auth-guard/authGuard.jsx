"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import useAuthStore from "@/stores/authStore";
import { Brain, Briefcase, Loader2 } from "lucide-react";

export default function AuthGuard({ children }) {
  const router = useRouter();
  const checkAuthCalled = useRef(false);

  const {
    user,
    tokens,
    isAuthenticated,
    isLoading,
    isInitialized,
    isHydrated,
    checkAuth,
  } = useAuthStore();

  useEffect(() => {
    if (
      isHydrated &&
      !isInitialized &&
      !isLoading &&
      !checkAuthCalled.current
    ) {
      checkAuthCalled.current = true;
      checkAuth().finally(() => {
        checkAuthCalled.current = false;
      });
    }
  }, [isHydrated, isInitialized, isLoading, checkAuth]);

  useEffect(() => {
    if (isHydrated && isInitialized && !isLoading) {
      if (!isAuthenticated) {
        router.push("/auth/login");
      }
    }
  }, [isHydrated, isInitialized, isLoading, isAuthenticated, router]);

  useEffect(() => {
    let timeoutId;
    if (!isHydrated) {
      timeoutId = setTimeout(() => {
        useAuthStore.setState({
          isHydrated: true,
          isInitialized: true,
          isAuthenticated: false,
        });
      }, 2000);
    }
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isHydrated]);

  useEffect(() => {
    let timeoutId;
    if ((!isHydrated || !isInitialized) && !isLoading) {
      timeoutId = setTimeout(() => {
        useAuthStore.setState({
          isHydrated: true,
          isInitialized: true,
          isAuthenticated: false,
        });
      }, 10000);
    }
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isHydrated, isInitialized, isLoading]);

  if (!isHydrated || !isInitialized || isLoading) {
    return <LoadingScreen user={user} />;
  }

  if (!isAuthenticated) {
    return <LoadingScreen user={user} message="Redirecting to login..." />;
  }

  return children;
}

function LoadingScreen({ user, message }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="text-center space-y-8 max-w-md">
        <div className="flex items-center justify-center space-x-3">
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl">
              <Briefcase className="w-8 h-8 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 w-7 h-7 bg-gradient-to-r from-orange-400 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
              <Brain className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
            RizeHire
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Your AI-Powered Career Platform
          </p>
        </div>
        <div className="space-y-6">
          <div className="relative mx-auto w-16 h-16">
            <div className="absolute inset-0 border-4 border-blue-200 dark:border-gray-700 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {message ||
                (user
                  ? `Welcome back, ${user.name || "User"}!`
                  : "Loading your experience...")}
            </p>
            <div className="flex justify-center space-x-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                  style={{
                    animationDelay: `${i * 0.2}s`,
                    animationDuration: "1s",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-400/10 rounded-full blur-3xl"></div>
        </div>
      </div>
    </div>
  );
}