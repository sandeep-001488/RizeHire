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
import AuthGuard from "@/components/auth-guard/authGuard";
import { applicationsAPI, jobsAPI } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageSquare,
  ArrowRight,
  Eye,
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
  User,
  Loader2,
} from "lucide-react";

export default function JobApplicantsPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId;
  console.log(params);

  // Local state management
  const [jobApplicants, setJobApplicants] = useState([]);
  const [applicantsStats, setApplicantsStats] = useState({
    totalApplications: 0,
    pendingApplications: 0,
    viewedApplications: 0,
    movingForwardApplications: 0,
    acceptedApplications: 0,
    rejectedApplications: 0,
  });
  const [applicantsPagination, setApplicantsPagination] = useState({
    current: 1,
    pages: 1,
    total: 0,
    limit: 10,
  });
  const [isLoadingApplicants, setIsLoadingApplicants] = useState(false);
  const [currentJob, setCurrentJob] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [feedbackDialog, setFeedbackDialog] = useState({
    open: false,
    applicationId: null,
  });
  const [feedbackMessage, setFeedbackMessage] = useState("");

  useEffect(() => {
    if (jobId) {
      fetchJobDetails();
      fetchApplicants("all");
    }
  }, [jobId]);

  useEffect(() => {
    if (jobId && activeTab) {
      fetchApplicants(activeTab);
    }
  }, [activeTab]);

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
    console.log("🔍 Starting fetchApplicants with:", { jobId, status });
    setIsLoadingApplicants(true);
    try {
      const params = {
        page: applicantsPagination.current,
        limit: applicantsPagination.limit,
      };
      if (status !== "all") {
        params.status = status;
      }

      const response = await applicationsAPI.getJobApplicants(jobId, params);
      console.log("Fetched applicants:", response.data.data);

      const { applicants, pagination, stats } = response.data.data;
      setJobApplicants(applicants);
      setApplicantsPagination(pagination);
      setApplicantsStats(stats);
    } catch (error) {
      console.error("Error response:", error.response?.data);
      console.error("Error status:", error.response?.status);

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
      setIsLoadingApplicants(false);
    }
  };

  const handleStatusUpdate = async (applicationId, newStatus) => {
    setUpdatingStatus(applicationId);
    try {
      await applicationsAPI.updateApplicationStatus(applicationId, {
        status: newStatus,
      });

      toast.success(`Application ${newStatus} successfully`);

      // Refresh applicants to get updated data
      await fetchApplicants(activeTab);
    } catch (error) {
      console.error("Error updating application status:", error);
      toast.error("Failed to update application status");
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleAddFeedback = async (applicationId) => {
    if (!feedbackMessage.trim()) {
      toast.error("Please enter feedback message");
      return;
    }

    try {
      await applicationsAPI.addFeedback(applicationId, {
        message: feedbackMessage,
      });
      setFeedbackDialog({ open: false, applicationId: null });
      setFeedbackMessage("");
      toast.success("Feedback sent to applicant");

      // Refresh applicants to get updated data
      await fetchApplicants(activeTab);
    } catch (error) {
      console.error("Error adding feedback:", error);
      toast.error("Failed to send feedback");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "viewed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "moving-forward":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
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

  const handlePageChange = (newPage) => {
    setApplicantsPagination((prev) => ({ ...prev, current: newPage }));
    // Trigger refetch with new page
    const params = {
      page: newPage,
      limit: applicantsPagination.limit,
    };
    if (activeTab !== "all") {
      params.status = activeTab;
    }

    fetchApplicantsWithParams(params);
  };

  const fetchApplicantsWithParams = async (params) => {
    setIsLoadingApplicants(true);
    try {
      const response = await applicationsAPI.getJobApplicants(jobId, params);
      const { applicants, pagination, stats } = response.data.data;
      setJobApplicants(applicants);
      setApplicantsPagination(pagination);
      setApplicantsStats(stats);
    } catch (error) {
      console.error("Error fetching applicants:", error);
      toast.error("Failed to load applicants");
    } finally {
      setIsLoadingApplicants(false);
    }
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
                <Eye className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {applicantsStats.viewedApplications}
                  </p>
                  <p className="text-sm text-muted-foreground">Viewed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <ArrowRight className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {applicantsStats.movingForwardApplications}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Moving Forward
                  </p>
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

        {/* Applications Section */}
        <Card>
          <CardHeader>
            <CardTitle>Applications</CardTitle>
            <CardDescription>
              Review and manage job applications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="all">
                  All ({applicantsStats.totalApplications})
                </TabsTrigger>
                <TabsTrigger value="pending">
                  Pending ({applicantsStats.pendingApplications})
                </TabsTrigger>
                <TabsTrigger value="viewed">
                  Viewed ({applicantsStats.viewedApplications})
                </TabsTrigger>
                <TabsTrigger value="moving-forward">
                  Moving ({applicantsStats.movingForwardApplications})
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
                                          <DialogContent className="max-w-2xl h-100 overflow-y-scroll">
                                            <DialogHeader>
                                              <DialogTitle>
                                                Cover Letter -{" "}
                                                {applicant.user.name}
                                              </DialogTitle>
                                              <DialogDescription>
                                                Application for{" "}
                                                {currentJob?.title}
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
                                  {/* View Full Details Button */}
                                  <div className="mt-3">
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button variant="outline" size="sm">
                                          <User className="mr-2 h-4 w-4" />
                                          View Full Details
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                                        <DialogHeader>
                                          <DialogTitle>
                                            Full Application Details -{" "}
                                            {applicant.user.name}
                                          </DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4 mt-4">
                                          <div>
                                            <h4 className="font-semibold mb-2">
                                              Skills
                                            </h4>
                                            {applicant.user.skills &&
                                            applicant.user.skills.length > 0 ? (
                                              <div className="flex flex-wrap gap-2">
                                                {applicant.user.skills.map(
                                                  (skill, index) => (
                                                    <Badge
                                                      key={index}
                                                      variant="outline"
                                                    >
                                                      {skill}
                                                    </Badge>
                                                  )
                                                )}
                                              </div>
                                            ) : (
                                              <p className="text-muted-foreground">
                                                No skills listed
                                              </p>
                                            )}
                                          </div>

                                          {applicant.user.bio && (
                                            <div>
                                              <h4 className="font-semibold mb-2">
                                                Bio
                                              </h4>
                                              <p className="text-sm bg-muted p-3 rounded-lg">
                                                {applicant.user.bio}
                                              </p>
                                            </div>
                                          )}

                                          {applicant.user.linkedinUrl && (
                                            <div>
                                              <h4 className="font-semibold mb-2">
                                                LinkedIn
                                              </h4>
                                              <a
                                                href={
                                                  applicant.user.linkedinUrl
                                                }
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:underline"
                                              >
                                                {applicant.user.linkedinUrl}
                                              </a>
                                            </div>
                                          )}
                                        </div>
                                      </DialogContent>
                                    </Dialog>
                                  </div>
                                  {/* Display Feedback */}
                                  {applicant.feedback &&
                                    applicant.feedback.length > 0 && (
                                      <div className="mt-4 space-y-2">
                                        <h4 className="font-medium text-sm flex items-center">
                                          <MessageSquare className="h-4 w-4 mr-1" />
                                          Feedback:
                                        </h4>

                                        {applicant.feedback.map(
                                          (feedback, index) => (
                                            <div
                                              key={index}
                                              className={`relative p-3 rounded-lg border-l-4 ${getFeedbackStatusColor(
                                                index,
                                                applicant.feedback?.length
                                              )}`}
                                            >
                                              <p className="text-sm">
                                                {feedback.message}
                                              </p>
                                              {feedback.createdAt && (
                                                <p className="absolute text-xs text-muted-foreground right-2 bottom-1">
                                                  {formatDate(
                                                    feedback.createdAt
                                                  )}
                                                </p>
                                              )}
                                            </div>
                                          )
                                        )}
                                      </div>
                                    )}
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col gap-2 md:min-w-[140px]">
                              {applicant.status === "pending" && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      handleStatusUpdate(
                                        applicant.applicationId,
                                        "viewed"
                                      )
                                    }
                                    disabled={
                                      updatingStatus === applicant.applicationId
                                    }
                                    variant="outline"
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                  >
                                    {updatingStatus ===
                                    applicant.applicationId ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <>
                                        <Eye className="mr-2 h-4 w-4" />
                                        Mark as Viewed
                                      </>
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      handleStatusUpdate(
                                        applicant.applicationId,
                                        "moving-forward"
                                      )
                                    }
                                    disabled={
                                      updatingStatus === applicant.applicationId
                                    }
                                    className="bg-purple-600 hover:bg-purple-700"
                                  >
                                    {updatingStatus ===
                                    applicant.applicationId ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <>
                                        <ArrowRight className="mr-2 h-4 w-4" />
                                        Move Forward
                                      </>
                                    )}
                                  </Button>
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

                              {applicant.status === "viewed" && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      handleStatusUpdate(
                                        applicant.applicationId,
                                        "moving-forward"
                                      )
                                    }
                                    disabled={
                                      updatingStatus === applicant.applicationId
                                    }
                                    className="bg-purple-600 hover:bg-purple-700"
                                  >
                                    {updatingStatus ===
                                    applicant.applicationId ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <>
                                        <ArrowRight className="mr-2 h-4 w-4" />
                                        Move Forward
                                      </>
                                    )}
                                  </Button>
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

                              {applicant.status === "moving-forward" && (
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

                              {/* Feedback Button - Always show */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setFeedbackDialog({
                                    open: true,
                                    applicationId: applicant.applicationId,
                                  })
                                }
                              >
                                <MessageSquare className="mr-2 h-4 w-4" />
                                Add Feedback
                              </Button>

                              {/* LinkedIn Button */}
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

                    {/* Pagination */}
                    {applicantsPagination.pages > 1 && (
                      <div className="flex justify-center space-x-2 mt-6">
                        <Button
                          variant="outline"
                          disabled={applicantsPagination.current === 1}
                          onClick={() =>
                            handlePageChange(applicantsPagination.current - 1)
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
                                    onClick={() => handlePageChange(page)}
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
                            handlePageChange(applicantsPagination.current + 1)
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

      {/* Feedback Dialog */}
      <Dialog
        open={feedbackDialog.open}
        onOpenChange={(open) =>
          setFeedbackDialog({ open, applicationId: null })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Feedback to Applicant</DialogTitle>
            <DialogDescription>
              Provide constructive feedback about their application
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Write your feedback here..."
              value={feedbackMessage}
              onChange={(e) => setFeedbackMessage(e.target.value)}
              rows={4}
            />
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() =>
                  setFeedbackDialog({ open: false, applicationId: null })
                }
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleAddFeedback(feedbackDialog.applicationId)}
                disabled={!feedbackMessage.trim()}
              >
                Send Feedback
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AuthGuard>
  );
}
