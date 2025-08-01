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
import AuthGuard from "@/components/auth/AuthGuard";
import useAuthStore from "@/stores/authStore";
import { jobsAPI, aiAPI } from "@/lib/api";
import {
  Briefcase,
  PlusCircle,
  FileText,
  Brain,
  TrendingUp,
  Users,
  Eye,
  Clock,
} from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    myJobs: 0,
    applications: 0,
    views: 0,
  });
  const [recentJobs, setRecentJobs] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [myJobsRes, applicationsRes, recommendationsRes] =
        await Promise.allSettled([
          jobsAPI.getMyJobs({ limit: 5 }),
          jobsAPI.getMyApplications(),
          aiAPI.getRecommendations(),
        ]);

      if (myJobsRes.status === "fulfilled") {
        const jobs = myJobsRes.value.data.data.jobs;
        setRecentJobs(jobs);
        setStats((prev) => ({
          ...prev,
          myJobs: jobs.length,
          views: jobs.reduce((total, job) => total + (job.views || 0), 0),
        }));
      }

      if (applicationsRes.status === "fulfilled") {
        setStats((prev) => ({
          ...prev,
          applications: applicationsRes.value.data.data.applications.length,
        }));
      }

      if (recommendationsRes.status === "fulfilled") {
        setRecommendations(
          recommendationsRes.value.data.data.recommendations || []
        );
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    {
      title: "Post New Job",
      description: "Share your opportunity with thousands of developers",
      href: "/post-job",
      icon: PlusCircle,
      color: "bg-primary",
    },
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
  ];

  return (
    <AuthGuard>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Welcome back, {user?.name}!</h1>
            <p className="text-muted-foreground mt-2">
              Here's what's happening with your profile today.
            </p>
          </div>
          <Link href="/post-job">
            <Button className="mt-4 md:mt-0">
              <PlusCircle className="mr-2 h-4 w-4" />
              Post a Job
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Posted Jobs</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.myJobs}</div>
              <p className="text-xs text-muted-foreground">
                Active job postings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Applications
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.applications}</div>
              <p className="text-xs text-muted-foreground">
                Jobs you've applied to
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Profile Views
              </CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.views}</div>
              <p className="text-xs text-muted-foreground">Total job views</p>
            </CardContent>
          </Card>
        </div>

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
                    <CardTitle className="text-base">{action.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {action.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Jobs */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Your Recent Jobs</CardTitle>
              <Link href="/jobs">
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="h-16 bg-muted animate-pulse rounded"
                    />
                  ))}
                </div>
              ) : recentJobs.length > 0 ? (
                <div className="space-y-4">
                  {recentJobs.slice(0, 3).map((job) => (
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
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {job.applications?.length || 0} applications
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {job.views || 0} views
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No jobs posted yet</p>
                  <Link href="/post-job">
                    <Button variant="outline" size="sm" className="mt-2">
                      Post Your First Job
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recommended for You</CardTitle>
              <Link href="/ai/recommendations">
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="h-16 bg-muted animate-pulse rounded"
                    />
                  ))}
                </div>
              ) : recommendations.length > 0 ? (
                <div className="space-y-4">
                  {recommendations.slice(0, 3).map((rec) => (
                    <div key={rec.job._id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{rec.job.title}</h4>
                        <Badge variant="secondary">
                          {rec.matchScore}% match
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {rec.job.postedBy.name} • {rec.job.jobType}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Add skills to get recommendations</p>
                  <Link href="/profile">
                    <Button variant="outline" size="sm" className="mt-2">
                      Update Profile
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthGuard>
  );
}
