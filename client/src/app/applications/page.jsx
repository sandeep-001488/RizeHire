"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  XCircle,
  TrendingUp,
  CheckCircle,
  AlertCircle,
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
  const router = useRouter();
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState(null);

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

                      {/* Message Button - Show if recruiter has sent messages */}
                      {application.hasMessages && (
                        <div className="mt-4">
                          <Button
                            onClick={() => router.push(`/messages?application=${application._id}`)}
                            variant="outline"
                            className="w-full md:w-auto"
                          >
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Message Recruiter
                            {application.unreadMessageCount > 0 && (
                              <Badge variant="destructive" className="ml-2">
                                {application.unreadMessageCount} new
                              </Badge>
                            )}
                          </Button>
                        </div>
                      )}

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

                      {/* Enhanced Rejection Feedback Section */}
                      {application.status === "rejected" && (
                        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg">
                          <div className="flex items-start gap-3">
                            <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                            <div className="flex-1">
                              <h4 className="font-semibold text-red-900 dark:text-red-100 mb-2">
                                Application Not Selected
                              </h4>

                              {/* Match Score */}
                              {application.matchScore !== undefined && (
                                <div className="mb-3">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-medium text-red-800 dark:text-red-200">
                                      Match Score:
                                    </span>
                                    <Badge
                                      variant="outline"
                                      className={`
                                        ${application.matchScore >= 70 ? "bg-green-100 text-green-800 border-green-300" : ""}
                                        ${application.matchScore >= 40 && application.matchScore < 70 ? "bg-yellow-100 text-yellow-800 border-yellow-300" : ""}
                                        ${application.matchScore < 40 ? "bg-red-100 text-red-800 border-red-300" : ""}
                                      `}
                                    >
                                      {application.matchScore}%
                                    </Badge>
                                  </div>
                                  {/* Progress Bar */}
                                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                                    <div
                                      className={`h-full transition-all ${
                                        application.matchScore >= 70 ? "bg-green-500" :
                                        application.matchScore >= 40 ? "bg-yellow-500" :
                                        "bg-red-500"
                                      }`}
                                      style={{ width: `${application.matchScore}%` }}
                                    />
                                  </div>
                                </div>
                              )}

                              {/* Rejection Reason */}
                              {application.rejectionReason && (
                                <div className="mb-3">
                                  <p className="text-sm text-red-800 dark:text-red-200">
                                    <strong>Reason:</strong> {application.rejectionReason}
                                  </p>
                                </div>
                              )}

                              {/* View Detailed Feedback Button */}
                              {application.feedback && application.feedback.length > 0 && (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="mt-2 border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/20"
                                    >
                                      <TrendingUp className="mr-2 h-4 w-4" />
                                      View Detailed Feedback & Improvement Tips
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                                    <DialogHeader>
                                      <DialogTitle className="flex items-center gap-2">
                                        <TrendingUp className="h-5 w-5 text-blue-600" />
                                        Detailed Feedback & Improvement Suggestions
                                      </DialogTitle>
                                      <DialogDescription>
                                        Learn how to improve for future opportunities
                                      </DialogDescription>
                                    </DialogHeader>

                                    <div className="mt-6 space-y-4">
                                      {/* Match Score Section */}
                                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                                          <AlertCircle className="h-5 w-5" />
                                          Your Match Score
                                        </h3>
                                        <div className="flex items-center gap-3">
                                          <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                                            {application.matchScore}%
                                          </span>
                                          <div className="flex-1">
                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                                              <div
                                                className={`h-full transition-all ${
                                                  application.matchScore >= 70 ? "bg-green-500" :
                                                  application.matchScore >= 40 ? "bg-yellow-500" :
                                                  "bg-red-500"
                                                }`}
                                                style={{ width: `${application.matchScore}%` }}
                                              />
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                              {application.matchScore >= 70 ? "Strong match - keep building on this!" :
                                               application.matchScore >= 40 ? "Moderate match - focus on key skills" :
                                               "Low match - develop core skills for this role"}
                                            </p>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Feedback Messages */}
                                      {application.feedback.map((feedback, index) => (
                                        <div
                                          key={index}
                                          className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                                        >
                                          <div className="flex items-start gap-2 mb-2">
                                            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                                            <span className="text-xs text-muted-foreground">
                                              {formatDate(feedback.createdAt)}
                                            </span>
                                          </div>
                                          <p className="text-sm whitespace-pre-wrap leading-relaxed">
                                            {feedback.message}
                                          </p>
                                        </div>
                                      ))}

                                      {/* Encouragement Section */}
                                      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                                        <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                                          ✨ Keep Going!
                                        </h3>
                                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                          Every application is a learning opportunity. Use this feedback to strengthen your profile and apply to more opportunities. You're making progress!
                                        </p>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              )}
                            </div>
                          </div>
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
                          {getStatusInfo(application.status).description}
                        </p>
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
