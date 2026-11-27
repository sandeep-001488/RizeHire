"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import AuthGuard from "@/components/auth-guard/authGuard";
import useAuthStore from "@/stores/authStore";
import SeekerDashboard from "@/components/dashboard/SeekerDashboard";
import PosterDashboard from "@/components/dashboard/PosterDashboard";

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, isHydrated, user } = useAuthStore();

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.push("/auth/login");
    }
  }, [isAuthenticated, isHydrated, router]);

  if (!isHydrated || !isAuthenticated || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AuthGuard>
      {user.role === "poster" ? <PosterDashboard user={user} /> : <SeekerDashboard user={user} />}
    </AuthGuard>
  );
}
