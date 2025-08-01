"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import AuthGuard from "@/components/auth/AuthGuard";
import useJobStore from "@/stores/jobStore";
import { jobsAPI } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import {
  Users,
  Mail,
  MapPin,
  Calendar,
  FileText,
  Check,
  X,
  Clock,
  ArrowLeft,
  ExternalLink,
  Loader2,
  User,
} from "lucide-react";

export default function JobApplicantsPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id;

  const {
    jobApplicants,
    applicantsStats,
    applicantsPagination,
    isLoadingApplicants,
    setJobApplicants,
    setApplicantsStats,
    setApplicantsPagination,
    setLoadingApplicants,
    updateApplicantStatus,
    clearJobApplicants,
  } = useJobStore();

  const [currentJob, setCurrentJob] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(null);

  useEffect(() => {
    if (jobId) {
      fetchJobDetails();
      fetchApplicants("all");
    }

    return () => {
      clearJobApplicants();
    };
  }, [jobId]);

  useEffect(() => {
    if (jobId && activeTab) {
      fetchApplicants(activeTab);
    }
  }, [activeTab, applicantsPagination.current]);

  const fetchJobDetails = async () => {
    try {
      const response = await jobsAPI.getJob(jobId);
      setCurrentJob(response.data.data.job);
    } catch (error) {
      console.error("Error fetching job details:", error);
      toast.error("Failed to load job details");
      router.push("/jobs");
    }
  };

  const fetchApplicants = async (status = "all") => {
    console.log("🔍 fetchApplicants called with:", { jobId, status });
    setLoadingApplicants(true);
    try {
      const params = {
        page: applicantsPagination.current,
        limit: applicantsPagination.limit,
        status: status,
      };

      console.log("📡 Making API call with params:", params);
      console.log("🌐 API URL will be:", `/jobs/${jobId}/applicants`);

      const response = await jobsAPI.getJobApplicants(jobId, params);

      console.log("✅ API response received:", response.data);

      const { applicants, pagination, stats } = response.data.data;

      console.log("📊 Data extracted:", {
        applicantsCount: applicants.length,
        paginationInfo: pagination,
        statsInfo: stats,
      });

      setJobApplicants(applicants);
      setApplicantsPagination(pagination);
      setApplicantsStats(stats);
    } catch (error) {
      console.error("💥 Error fetching applicants:", error);
      console.error("📋 Error response:", error.response?.data);
      console.error("🌐 Error status:", error.response?.status);

      if (error.response?.status === 403) {
        toast.error("You are not authorized to view these applicants");
        router.push("/jobs");
      } else if (error.response?.status === 404) {
        toast.error("Job not found");
        router.push("/jobs");
      } else {
        toast.error("Failed to load applicants");
      }
    } finally {
      setLoadingApplicants(false);
    }
  };

  const handleStatusUpdate = async (applicationId, newStatus) => {
    setUpdatingStatus(applicationId);
    try {
      await jobsAPI.updateApplicationStatus(jobId, applicationId, {
        status: newStatus,
      });

      updateApplicantStatus(applicationId, newStatus);
      toast.success(`Application ${newStatus} successfully`);

      fetchApplicants(activeTab);
    } catch (error) {
      console.error("Error updating application status:", error);
      toast.error("Failed to update application status");
    } finally {
      setUpdatingStatus(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "accepted":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="p-1"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-3xl font-bold">Job Applicants</h1>
            </div>
            <p className="text-muted-foreground">
              Managing applications for "{currentJob?.title}"
            </p>
          </div>
          <Link href={`/jobs/${jobId}`}>
            <Button variant="outline">
              <ExternalLink className="mr-2 h-4 w-4" />
              View Job Details
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {applicantsStats.totalApplications}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Total Applications
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {applicantsStats.pendingApplications}
                  </p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Check className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {applicantsStats.acceptedApplications}
                  </p>
                  <p className="text-sm text-muted-foreground">Accepted</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <X className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {applicantsStats.rejectedApplications}
                  </p>
                  <p className="text-sm text-muted-foreground">Rejected</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Applications</CardTitle>
            <CardDescription>
              Review and manage job applications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">
                  All ({applicantsStats.totalApplications})
                </TabsTrigger>
                <TabsTrigger value="pending">
                  Pending ({applicantsStats.pendingApplications})
                </TabsTrigger>
                <TabsTrigger value="accepted">
                  Accepted ({applicantsStats.acceptedApplications})
                </TabsTrigger>
                <TabsTrigger value="rejected">
                  Rejected ({applicantsStats.rejectedApplications})
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-6">
                {isLoadingApplicants ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, index) => (
                      <Card key={index}>
                        <CardContent className="p-6">
                          <div className="animate-pulse space-y-3">
                            <div className="flex items-center space-x-3">
                              <div className="h-12 w-12 bg-muted rounded-full"></div>
                              <div className="space-y-2">
                                <div className="h-4 bg-muted rounded w-32"></div>
                                <div className="h-3 bg-muted rounded w-24"></div>
                              </div>
                            </div>
                            <div className="h-16 bg-muted rounded w-full"></div>
                            <div className="flex space-x-2">
                              <div className="h-8 bg-muted rounded w-20"></div>
                              <div className="h-8 bg-muted rounded w-20"></div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : jobApplicants.length > 0 ? (
                  <div className="space-y-4">
                    {jobApplicants.map((applicant) => (
                      <Card
                        key={applicant.applicationId}
                        className="hover:shadow-lg transition-shadow"
                      >
                        <CardContent className="p-6">
                          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-start space-x-4">
                                <Avatar className="h-12 w-12">
                                  <AvatarImage
                                    src={applicant.user.profileImage}
                                    alt={applicant.user.name}
                                  />
                                  <AvatarFallback>
                                    {getInitials(applicant.user.name)}
                                  </AvatarFallback>
                                </Avatar>

                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h3 className="text-lg font-semibold">
                                      {applicant.user.name}
                                    </h3>
                                    <Badge
                                      className={getStatusColor(
                                        applicant.status
                                      )}
                                    >
                                      {applicant.status}
                                    </Badge>
                                  </div>

                                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-3">
                                    <div className="flex items-center">
                                      <Mail className="h-4 w-4 mr-1" />
                                      {applicant.user.email}
                                    </div>
                                    <div className="flex items-center">
                                      <Calendar className="h-4 w-4 mr-1" />
                                      Applied {formatDate(applicant.appliedAt)}
                                    </div>
                                    {applicant.user.location && (
                                      <div className="flex items-center">
                                        <MapPin className="h-4 w-4 mr-1" />
                                        {applicant.user.location}
                                      </div>
                                    )}
                                  </div>

                                  {applicant.user.skills &&
                                    applicant.user.skills.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mb-3">
                                        {applicant.user.skills
                                          .slice(0, 5)
                                          .map((skill, index) => (
                                            <Badge
                                              key={index}
                                              variant="outline"
                                              className="text-xs"
                                            >
                                              {skill}
                                            </Badge>
                                          ))}
                                        {applicant.user.skills.length > 5 && (
                                          <Badge
                                            variant="outline"
                                            className="text-xs"
                                          >
                                            +{applicant.user.skills.length - 5}{" "}
                                            more
                                          </Badge>
                                        )}
                                      </div>
                                    )}

                                  {applicant.coverLetter && (
                                    <div className="bg-muted p-3 rounded-lg">
                                      <h4 className="font-medium text-sm mb-2 flex items-center">
                                        <FileText className="h-4 w-4 mr-1" />
                                        Cover Letter:
                                      </h4>
                                      <p className="text-sm text-muted-foreground line-clamp-3">
                                        {applicant.coverLetter}
                                      </p>
                                      {applicant.coverLetter.length > 150 && (
                                        <Dialog>
                                          <DialogTrigger asChild>
                                            <Button
                                              variant="link"
                                              size="sm"
                                              className="p-0 h-auto text-xs"
                                              onClick={() =>
                                                setSelectedApplicant(applicant)
                                              }
                                            >
                                              Read more...
                                            </Button>
                                          </DialogTrigger>
                                          <DialogContent className="max-w-2xl">
                                            <DialogHeader>
                                              <DialogTitle>
                                                Cover Letter -{" "}
                                                {applicant.user.name}
                                              </DialogTitle>
                                              <DialogDescription>
                                                Application for{" "}
                                                {currentJob.title}
                                              </DialogDescription>
                                            </DialogHeader>
                                            <div className="mt-4">
                                              <p className="text-sm whitespace-pre-wrap">
                                                {applicant.coverLetter}
                                              </p>
                                            </div>
                                          </DialogContent>
                                        </Dialog>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col gap-2 md:min-w-[140px]">
                              {applicant.status === "pending" && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      handleStatusUpdate(
                                        applicant.applicationId,
                                        "accepted"
                                      )
                                    }
                                    disabled={
                                      updatingStatus === applicant.applicationId
                                    }
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    {updatingStatus ===
                                    applicant.applicationId ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <>
                                        <Check className="mr-2 h-4 w-4" />
                                        Accept
                                      </>
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() =>
                                      handleStatusUpdate(
                                        applicant.applicationId,
                                        "rejected"
                                      )
                                    }
                                    disabled={
                                      updatingStatus === applicant.applicationId
                                    }
                                  >
                                    {updatingStatus ===
                                    applicant.applicationId ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <>
                                        <X className="mr-2 h-4 w-4" />
                                        Reject
                                      </>
                                    )}
                                  </Button>
                                </>
                              )}

                              {applicant.status === "accepted" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleStatusUpdate(
                                      applicant.applicationId,
                                      "pending"
                                    )
                                  }
                                  disabled={
                                    updatingStatus === applicant.applicationId
                                  }
                                >
                                  {updatingStatus ===
                                  applicant.applicationId ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    "Move to Pending"
                                  )}
                                </Button>
                              )}

                              {applicant.status === "rejected" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleStatusUpdate(
                                      applicant.applicationId,
                                      "pending"
                                    )
                                  }
                                  disabled={
                                    updatingStatus === applicant.applicationId
                                  }
                                >
                                  {updatingStatus ===
                                  applicant.applicationId ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    "Reconsider"
                                  )}
                                </Button>
                              )}

                              {applicant.user.linkedinUrl && (
                                <Button size="sm" variant="outline" asChild>
                                  <a
                                    href={applicant.user.linkedinUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    LinkedIn
                                  </a>
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {applicantsPagination.pages > 1 && (
                      <div className="flex justify-center space-x-2 mt-6">
                        <Button
                          variant="outline"
                          disabled={applicantsPagination.current === 1}
                          onClick={() =>
                            setApplicantsPagination({
                              ...applicantsPagination,
                              current: applicantsPagination.current - 1,
                            })
                          }
                        >
                          Previous
                        </Button>

                        <div className="flex items-center space-x-1">
                          {[...Array(applicantsPagination.pages)].map(
                            (_, index) => {
                              const page = index + 1;
                              if (
                                page === 1 ||
                                page === applicantsPagination.pages ||
                                (page >= applicantsPagination.current - 1 &&
                                  page <= applicantsPagination.current + 1)
                              ) {
                                return (
                                  <Button
                                    key={page}
                                    variant={
                                      applicantsPagination.current === page
                                        ? "default"
                                        : "outline"
                                    }
                                    size="sm"
                                    onClick={() =>
                                      setApplicantsPagination({
                                        ...applicantsPagination,
                                        current: page,
                                      })
                                    }
                                  >
                                    {page}
                                  </Button>
                                );
                              } else if (
                                page === applicantsPagination.current - 2 ||
                                page === applicantsPagination.current + 2
                              ) {
                                return (
                                  <span key={page} className="px-2">
                                    ...
                                  </span>
                                );
                              }
                              return null;
                            }
                          )}
                        </div>

                        <Button
                          variant="outline"
                          disabled={
                            applicantsPagination.current ===
                            applicantsPagination.pages
                          }
                          onClick={() =>
                            setApplicantsPagination({
                              ...applicantsPagination,
                              current: applicantsPagination.current + 1,
                            })
                          }
                        >
                          Next
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="text-center py-12">
                      <User className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="text-lg font-medium mb-2">
                        No {activeTab === "all" ? "" : activeTab} applications
                        found
                      </h3>
                      <p className="text-muted-foreground">
                        {activeTab === "all"
                          ? "No one has applied to this job yet."
                          : `No ${activeTab} applications for this job.`}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  );
}
