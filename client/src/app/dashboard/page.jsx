"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AuthGuard from "@/components/auth-guard/authGuard";
import useAuthStore from "@/stores/authStore";
import { jobsAPI, aiAPI, applicationsAPI } from "@/lib/api";
import {
  Briefcase,
  PlusCircle,
  FileText,
  Brain,
  Eye,
  Users,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

export default function DashboardPage() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);

  const [posterStats, setPosterStats] = useState({ myJobs: 0, views: 0 });
  const [recentJobs, setRecentJobs] = useState([]);

  const [seekerStats, setSeekerStats] = useState({ applications: 0 });
  const [recentApplications, setRecentApplications] = useState([]);
  const [recommendations, setRecommendations] = useState([]);

   const { isAuthenticated, isHydrated, user } = useAuthStore();

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.push("/auth/login");
    }
  }, [isAuthenticated, isHydrated, router]);


  useEffect(() => {
    if (user) {
      if (user.role === "poster") {
        fetchPosterDashboard();
      } else if (user.role === "seeker") {
        fetchSeekerDashboard();
        console.log("recent applications",recentApplications);
        
      } else {
        setIsLoading(false);
      }
    }
  }, [user]);

  const fetchPosterDashboard = async () => {
    setIsLoading(true);
    try {
      const myJobsRes = await jobsAPI.getMyJobs({ limit: 5 });
      const jobs = myJobsRes.data.data.jobs;
      setRecentJobs(jobs);
      setPosterStats({
        myJobs: myJobsRes.data.data.pagination.total,
        views: jobs.reduce((total, job) => total + (job.views || 0), 0),
      });
    } catch (error) {
      console.error("Error fetching poster dashboard:", error);
      toast.error("Failed to load poster dashboard data.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSeekerDashboard = async () => {
    setIsLoading(true);
    try {
      const [applicationsRes, recommendationsRes] = await Promise.allSettled([
        applicationsAPI.getMyApplications({ limit: 5 }),
        aiAPI.getRecommendations(),
      ]);

      if (applicationsRes.status === "fulfilled") {
        setRecentApplications(applicationsRes.value.data.data.applications);
        setSeekerStats({
          applications: applicationsRes.value.data.data.pagination.total,
        });
      }
      if (recommendationsRes.status === "fulfilled") {
        setRecommendations(
          recommendationsRes.value.data.data.recommendations || []
        );
      }
    } catch (error) {
      console.error("Error fetching seeker dashboard:", error);
      toast.error("Failed to load seeker dashboard data.");
    } finally {
      setIsLoading(false);
    }
  };

  const seekerActions = [
    {
      title: "Browse Jobs",
      description: "Find your next opportunity",
      href: "/jobs",
      icon: Briefcase,
      color: "bg-blue-500",
    },
    {
      title: "AI Recommendations",
      description: "Get personalized job suggestions",
      href: "/ai/recommendations",
      icon: Brain,
      color: "bg-purple-500",
    },
    {
      title: "My Applications",
      description: "Track your job applications",
      href: "/applications",
      icon: FileText,
      color: "bg-orange-500",
    },
    {
      title: "My Profile",
      description: "Update your skills and resume",
      href: "/profile",
      icon: Users,
      color: "bg-green-500",
    },
  ];

  const posterActions = [
    {
      title: "Post New Job",
      description: "Share your opportunity with thousands",
      href: "/post-job",
      icon: PlusCircle,
      color: "bg-primary",
    },
    {
      title: "My Posted Jobs",
      description: "Manage your job listings",
      href: "/jobs/my-posted-jobs",
      icon: Briefcase,
      color: "bg-blue-500",
    },
    {
      title: "My Profile",
      description: "Update your company information",
      href: "/profile",
      icon: Users,
      color: "bg-green-500",
    },
  ];

  const quickActions = user?.role === "poster" ? posterActions : seekerActions;

   if (!isHydrated || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // --- RENDER POSTER DASHBOARD ---
  if (user.role === "poster") {
    return (
      <AuthGuard>
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold">Welcome back, {user?.name}!</h1>
            <p className="text-muted-foreground mt-2">
              Here's what's happening with your job postings.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Posted Jobs
                </CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{posterStats.myJobs}</div>
                <p className="text-xs text-muted-foreground">
                  Active job postings
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Views
                </CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{posterStats.views}</div>
                <p className="text-xs text-muted-foreground">
                  Across all your job posts
                </p>
              </CardContent>
            </Card>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {quickActions.map((action, index) => (
                <Link key={index} href={action.href}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardHeader>
                      <div
                        className={`h-10 w-10 rounded-lg ${action.color} flex items-center justify-center mb-2`}
                      >
                        <action.icon className="h-5 w-5 text-white" />
                      </div>
                      <CardTitle className="text-base">
                        {action.title}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Your Recent Posted Jobs</CardTitle>
              <Link href="/jobs/my-posted-jobs">
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {recentJobs.length > 0 ? (
                <div className="space-y-4">
                  {recentJobs.map((job) => (
                    <div
                      key={job._id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium">{job.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {job.jobType} • {job.workMode}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          router.push(`/jobs/${job._id}/applicants`)
                        }
                      >
                        <Users className="mr-2 h-4 w-4" />
                        {job.applicationCount || 0} Applicants
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No jobs posted yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </AuthGuard>
    );
  }

  // --- RENDER SEEKER DASHBOARD ---
  if (user.role === "seeker") {
    return (
      <AuthGuard>
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold">Welcome back, {user?.name}!</h1>
            <p className="text-muted-foreground mt-2">
              Here's what's happening with your applications today.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  My Applications
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {seekerStats.applications}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total applications sent
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Recommended Jobs
                </CardTitle>
                <Brain className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {recommendations.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  New AI matches found
                </p>
              </CardContent>
            </Card>
          </div>

          {!user.parsedResume && (
            <Card className="bg-yellow-50 dark:bg-yellow-950 border-yellow-300 dark:border-yellow-800">
              <CardHeader>
                <CardTitle className="text-yellow-800 dark:text-yellow-200">
                  Complete Your Profile
                </CardTitle>
                <CardDescription className="text-yellow-700 dark:text-yellow-300">
                  You must parse your resume to apply for jobs.</CardDescription>
                <Button asChild className="mt-4 w-fit"></Button>
              </CardHeader>
            </Card>
          )}

          <div>
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickActions.map((action, index) => (
                <Link key={index} href={action.href}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardHeader>
                      <div
                        className={`h-10 w-10 rounded-lg ${action.color} flex items-center justify-center mb-2`}
                      >
                        <action.icon className="h-5 w-5 text-white" />
                      </div>
                      <CardTitle className="text-base">
                        {action.title}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recent Applications</CardTitle>
                <Link href="/applications">
                  <Button variant="ghost" size="sm">
                    View All
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {recentApplications.length > 0 ? (
                  <div className="space-y-4">
                    {recentApplications.map((app) => (
                      app.job ? (
                        <Link key={app._id} href={`/jobs/${app.job._id}`}>
                          <div className="p-3 border rounded-lg">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">{app.job.title}</h4>
                              <Badge>{app.status}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Applied {formatDate(app.appliedAt)}
                            </p>
                          </div>
                        </Link>
                      ) : (
                        <div key={app._id} className="p-3 border rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            Application details not available.
                          </p>
                        </div>
                      )
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No applications sent yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </AuthGuard>
    );
  }

  // Fallback for weird states
  return <AuthGuard>{null}</AuthGuard>;
}