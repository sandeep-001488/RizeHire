"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import AuthGuard from "@/components/auth-guard/authGuard";
import { applicationsAPI } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import {
  FileText,
  Clock,
  MapPin,
  Eye,
  MessageSquare,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function ApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [expandedFeedback, setExpandedFeedback] = useState({});

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const response = await applicationsAPI.getMyApplications();
      setApplications(response.data.data.applications);
    } catch (error) {
      console.error("Error fetching applications:", error.response?.data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(()=>{
    console.log("applications",applications);
    
  },[])

  const toggleFeedback = (applicationId) => {
    setExpandedFeedback((prev) => ({
      ...prev,
      [applicationId]: !prev[applicationId],
    }));
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

  const getStatusInfo = (status) => {
    switch (status) {
      case "pending":
        return {
          color:
            "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
          description: "Your application is under review",
        };
      case "viewed":
        return {
          color:
            "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
          description: "Recruiter has reviewed your application",
        };
      case "moving-forward":
        return {
          color:
            "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
          description: "You're moving forward in the process!",
        };
      case "accepted":
        return {
          color:
            "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
          description: "Congratulations! Your application was accepted",
        };
      case "rejected":
        return {
          color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
          description: "Application was not selected this time",
        };
      default:
        return {
          color:
            "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
          description: "Status unknown",
        };
    }
  };
  const getFeedbackStatusColor = (feedbackIndex, totalFeedbacks) => {
    const statusProgression = [
      "pending",
      "viewed",
      "moving-forward",
      "accepted",
    ];
    const progressIndex = Math.min(feedbackIndex, statusProgression.length - 1);
    const status = statusProgression[progressIndex];
    switch (status) {
      case "pending":
        return "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-400";
      case "viewed":
        return "bg-blue-50 dark:bg-blue-900/20 border-blue-400";
      case "moving-forward":
        return "bg-purple-50 dark:bg-purple-900/20 border-purple-400";
      case "accepted":
        return "bg-green-50 dark:bg-green-900/20 border-green-400";
      default:
        return "bg-gray-50 dark:bg-gray-900/20 border-gray-400";
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
                        {application?.job?.postedBy?.name}
                      </p>

                      <div className="flex flex-wrap gap-3 mt-3 text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          Applied {formatDate(application.appliedAt)}
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
                        <Badge className={getStatusColor(application.status)}>
                          {application.status || "pending"}
                        </Badge>
                      </div>

                      {application.coverLetter && (
                        <div className="mt-4 p-3 bg-muted rounded-lg">
                          <h4 className="font-medium text-sm mb-2">
                            Your Cover Letter:
                          </h4>
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {application.coverLetter}
                          </p>
                          {application.coverLetter.length > 150 && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="link"
                                  size="sm"
                                  className="p-0 h-auto text-xs mt-2"
                                  onClick={() =>
                                    setSelectedApplication(application)
                                  }
                                >
                                  Read more...
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl max-h-[60vh] md:max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>Cover Letter</DialogTitle>
                                  <DialogDescription>
                                    Application for {application.job.title}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="mt-4">
                                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                                    {application.coverLetter}
                                  </p>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      )}
                      {/* {added } */}
                      {application.feedback &&
                        application.feedback.length > 0 && (
                          <div className="mt-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-sm flex items-center">
                                <MessageSquare
                                  className="h-4 w-4 mr-1 text-pink-700"
                                  strokeWidth={3}
                                />
                                Recruiter Feedback (
                                {application.feedback.length}):
                              </h4>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => toggleFeedback(application._id)}
                                className="text-xs p-1 h-auto bg-gray-600"
                              >
                                {expandedFeedback[application._id] ? (
                                  <>
                                    <ChevronUp
                                      className="h-4 w-5 mr-1 text-white"
                                      strokeWidth={5}
                                    />
                                    Hide
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown
                                      className="h-4 w-5 mr-1 text-white"
                                      strokeWidth={5}
                                    />
                                    Show
                                  </>
                                )}
                              </Button>
                            </div>

                            {expandedFeedback[application._id] && (
                              <div className="space-y-2">
                                {application.feedback.map((feedback, index) => (
                                  <div
                                    key={index}
                                    className={`relative p-3 rounded-lg border-l-4 ${getFeedbackStatusColor(
                                      index,
                                      application.feedback?.length
                                    )}`}
                                  >
                                    <p className="text-sm">
                                      {feedback.message}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {formatDate(feedback.createdAt)}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
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

                      {/* added */}
                      <div className="flex flex-col gap-1">
                        <Badge
                          className={getStatusInfo(application.status).color}
                        >
                          {application.status || "pending"}
                        </Badge>
                        <p className="text-xs text-muted-foreground">
-------
                          {getStatusInfo(application.status).description}
                        </p>
                        {application.rejectionReason && (
                         <p className="text-xs text-red-500 mt-1">
                           Reason: {application.rejectionReason}
                         </p>
                       )}
                      </div>
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
