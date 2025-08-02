"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { jobsAPI } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { FileText, Clock, MapPin, Eye } from "lucide-react";
import AuthGuard from "@/components/auth-guard/authGuard";

export default function ApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const response = await jobsAPI.getMyApplications();
      setApplications(response.data.data.applications);
    } catch (error) {
      console.error("Error fetching applications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "reviewed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "accepted":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Applications</h1>
          <p className="text-muted-foreground mt-2">
            Track the status of your job applications
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-3">
                    <div className="h-6 bg-muted rounded w-3/4"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                    <div className="h-4 bg-muted rounded w-full"></div>
                    <div className="flex space-x-2">
                      <div className="h-6 bg-muted rounded w-16"></div>
                      <div className="h-6 bg-muted rounded w-16"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : applications.length > 0 ? (
          <div className="space-y-4">
            {applications.map((application) => (
              <Card
                key={application.job._id}
                className="hover:shadow-lg transition-shadow"
              >
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between">
                    <div className="flex-1">
                      <Link href={`/jobs/${application.job._id}`}>
                        <h3 className="text-xl font-semibold hover:text-primary transition-colors cursor-pointer">
                          {application.job.title}
                        </h3>
                      </Link>
                      <p className="text-muted-foreground mt-1">
                        {application.job.postedBy.name}
                      </p>

                      <div className="flex flex-wrap gap-3 mt-3 text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          Applied{" "}
                          {formatDate(application.application.appliedAt)}
                        </div>
                        {application.job.location && (
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            {application.job.location.city},{" "}
                            {application.job.location.country}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 mt-4">
                        <Badge variant="secondary">
                          {application.job.jobType}
                        </Badge>
                        <Badge variant="outline">
                          {application.job.workMode}
                        </Badge>
                        <Badge
                          className={getStatusColor(
                            application.application.status
                          )}
                        >
                          {application.application.status || "pending"}
                        </Badge>
                      </div>

                      {application.application.coverLetter && (
                        <div className="mt-4 p-3 bg-muted rounded-lg">
                          <h4 className="font-medium text-sm mb-2">
                            Your Cover Letter:
                          </h4>
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {application.application.coverLetter}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 mt-4 md:mt-0 md:ml-6">
                      <Link href={`/jobs/${application.job._id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="mr-2 h-4 w-4" />
                          View Job
                        </Button>
                      </Link>

                      {application.application.status === "accepted" && (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 text-center">
                          🎉 Congratulations!
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No applications yet</h3>
              <p className="text-muted-foreground mb-4">
                Start applying to jobs to see them here.
              </p>
              <Link href="/jobs">
                <Button>Browse Jobs</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </AuthGuard>
  );
}
