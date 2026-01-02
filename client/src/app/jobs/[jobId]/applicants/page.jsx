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
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { FaLinkedin } from "react-icons/fa"

// Helper function to get resume URL - now uses direct Cloudinary URLs
const getResumeViewUrl = (cloudinaryUrl) => {
  if (!cloudinaryUrl) return null;
  
  // With "PDF and ZIP files delivery" enabled in Cloudinary,
  // we can use direct URLs without authentication
  return cloudinaryUrl;
};

export default function JobApplicantsPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId;

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
  const [expandedFeedback, setExpandedFeedback] = useState({});

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

      const { applicants, pagination, stats } = response.data.data;
      console.log("Fetched applicants:", applicants);
      setJobApplicants(applicants);
      setApplicantsPagination(pagination);
      setApplicantsStats(stats);
    } catch (error) {
      console.error("Error fetching applicants:", error);
      toast.error("Failed to load applicants");
      router.push("/jobs");
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

    fetchApplicantsWithParams = async (params) => {
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
        router.push("/jobs");
      } finally {
        setIsLoadingApplicants(false);
      }
    };
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
                Back
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
            {/* Mobile Tabs */}
            <div className="md:hidden mb-6">
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value)}
                className="w-full p-3 border border-input bg-background rounded-md text-sm font-medium"
              >
                <option value="all">
                  All ({applicantsStats.totalApplications})
                </option>
                <option value="pending">
                  Pending ({applicantsStats.pendingApplications})
                </option>
                <option value="viewed">
                  Viewed ({applicantsStats.viewedApplications})
                </option>
                <option value="moving-forward">
                  Moving ({applicantsStats.movingForwardApplications})
                </option>
                <option value="accepted">
                  Accepted ({applicantsStats.acceptedApplications})
                </option>
                <option value="rejected">
                  Rejected ({applicantsStats.rejectedApplications})
                </option>
              </select>
            </div>
            {/* Desktop tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="hidden md:grid w-full grid-cols-6">
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
                        <CardContent className="p-4 md:p-6">
                          <div className="space-y-4">
                            {/* Mobile Action Buttons - Show at top on mobile */}
                            <div className="md:hidden">
                              <div className="flex flex-col gap-2">
                                {applicant.status === "pending" && (
                                  <>
                                    <div className="grid grid-cols-2 gap-2">
                                      <Button
                                        size="sm"
                                        onClick={() =>
                                          handleStatusUpdate(
                                            applicant.applicationId,
                                            "viewed"
                                          )
                                        }
                                        disabled={
                                          updatingStatus ===
                                          applicant.applicationId
                                        }
                                        variant="outline"
                                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                                      >
                                        {updatingStatus ===
                                        applicant.applicationId ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                          <>
                                            {/* <Eye className="mr-1 h-3 w-3" /> */}
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
                                          updatingStatus ===
                                          applicant.applicationId
                                        }
                                        className="bg-purple-600 hover:bg-purple-700 text-xs"
                                      >
                                        {updatingStatus ===
                                        applicant.applicationId ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                          <>
                                            {/* <ArrowRight className="mr-1 h-3 w-3" /> */}
                                            Move Forward
                                          </>
                                        )}
                                      </Button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      <Button
                                        size="sm"
                                        onClick={() =>
                                          handleStatusUpdate(
                                            applicant.applicationId,
                                            "accepted"
                                          )
                                        }
                                        disabled={
                                          updatingStatus ===
                                          applicant.applicationId
                                        }
                                        className="bg-green-600 hover:bg-green-700 text-xs"
                                      >
                                        {updatingStatus ===
                                        applicant.applicationId ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                          <>
                                            <Check className="mr-1 h-3 w-3" />
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
                                          updatingStatus ===
                                          applicant.applicationId
                                        }
                                        className="text-xs"
                                      >
                                        {updatingStatus ===
                                        applicant.applicationId ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                          <>
                                            <X className="mr-1 h-3 w-3" />
                                            Reject
                                          </>
                                        )}
                                      </Button>
                                    </div>
                                  </>
                                )}

                                {applicant.status === "viewed" && (
                                  <>
                                    <div className="grid grid-cols-2 gap-2">
                                      <Button
                                        size="sm"
                                        onClick={() =>
                                          handleStatusUpdate(
                                            applicant.applicationId,
                                            "moving-forward"
                                          )
                                        }
                                        disabled={
                                          updatingStatus ===
                                          applicant.applicationId
                                        }
                                        className="bg-purple-600 hover:bg-purple-700 text-xs"
                                      >
                                        {updatingStatus ===
                                        applicant.applicationId ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                          <>
                                            <ArrowRight className="mr-1 h-3 w-3" />
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
                                          updatingStatus ===
                                          applicant.applicationId
                                        }
                                        className="bg-green-600 hover:bg-green-700 text-xs"
                                      >
                                        {updatingStatus ===
                                        applicant.applicationId ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                          <>
                                            <Check className="mr-1 h-3 w-3" />
                                            Accept
                                          </>
                                        )}
                                      </Button>
                                    </div>
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
                                        updatingStatus ===
                                        applicant.applicationId
                                      }
                                      className="w-full text-xs"
                                    >
                                      {updatingStatus ===
                                      applicant.applicationId ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <>
                                          <X className="mr-1 h-3 w-3" />
                                          Reject
                                        </>
                                      )}
                                    </Button>
                                  </>
                                )}

                                {applicant.status === "moving-forward" && (
                                  <div className="grid grid-cols-2 gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() =>
                                        handleStatusUpdate(
                                          applicant.applicationId,
                                          "accepted"
                                        )
                                      }
                                      disabled={
                                        updatingStatus ===
                                        applicant.applicationId
                                      }
                                      className="bg-green-600 hover:bg-green-700 text-xs"
                                    >
                                      {updatingStatus ===
                                      applicant.applicationId ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <>
                                          <Check className="mr-1 h-3 w-3" />
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
                                        updatingStatus ===
                                        applicant.applicationId
                                      }
                                      className="text-xs"
                                    >
                                      {updatingStatus ===
                                      applicant.applicationId ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <>
                                          <X className="mr-1 h-3 w-3" />
                                          Reject
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                )}

                                {/* Always show feedback and LinkedIn buttons on mobile */}
                                <div className="grid grid-cols-1 gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      setFeedbackDialog({
                                        open: true,
                                        applicationId: applicant.applicationId,
                                      })
                                    }
                                    className="text-xs"
                                  >
                                    <MessageSquare className="mr-1 h-3 w-3" />
                                    Add Feedback
                                  </Button>
                                  {applicant.user && applicant.user.linkedinUrl && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      asChild
                                      className="text-xs bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                                    >
                                      <a
                                        href={applicant.user.linkedinUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        <FaLinkedin className="mr-1 h-3 w-3" />
                                        LinkedIn
                                      </a>
                                    </Button>
                                  )}
                                </div>
                                {/* Resume Buttons */}
                                
                              {/* Resume Button - Single option to view */}
{applicant.resumeUrl && (
  <div className="mb-3">
    <Button
      size="sm"
      variant="outline"
      asChild
      className="w-full"
    >
      <a
        href={getResumeViewUrl(applicant.resumeUrl)}
        target="_blank"
        rel="noopener noreferrer"
      >
        <FileText className="mr-2 h-4 w-4" />
        View Resume (PDF)
      </a>
    </Button>
  </div>
)}


                                {/* Show Rejection Reason for Recruiters */}
                                {applicant.status === "rejected" && applicant.rejectionReason && (
                                  <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                    <h4 className="font-medium text-xs md:text-sm text-red-800 dark:text-red-300 mb-1 flex items-center">
                                      <X className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                                      Rejection Reason:
                                    </h4>
                                    <p className="text-xs md:text-sm text-red-700 dark:text-red-400">
                                      {applicant.rejectionReason}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                {/* min-w-0 allows flex child to shrink */}
                                <div className="flex items-start space-x-3 md:space-x-4">
                                  <Avatar className="h-10 w-10 md:h-12 md:w-12 flex-shrink-0">
                                    <AvatarImage
                                      src={applicant?.user?.profileImage}
                                      alt={applicant?.user?.name}
                                    />
                                    <AvatarFallback>
                                      {getInitials(applicant.user.name)}
                                    </AvatarFallback>
                                  </Avatar>

                                  <div className="flex-1 min-w-0">
                                    {/* min-w-0 allows flex child to shrink */}
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                                      <h3 className="text-base md:text-lg font-semibold break-words">
                                        {applicant.user.name}
                                      </h3>
                                      <Badge
                                        className={`${getStatusColor(applicant.status)} w-fit text-xs`}
                                      >
                                        {applicant.status}
                                      </Badge>
                                    </div>
                                    <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 text-xs md:text-sm text-muted-foreground mb-3">
                                      <div className="flex items-center min-w-0">
                                        <a
                                          href={`mailto:${applicant.user.email}`}
                                          className="flex items-center hover:text-primary transition-colors group"
                                          title="Send email"
                                        >
                                          <Mail className="h-3 w-3 md:h-4 md:w-4 mr-1 flex-shrink-0 text-red-500 group-hover:text-red-600" />
                                          <span className="break-all underline decoration-dotted">
                                            {applicant.user.email}
                                          </span>
                                        </a>
                                      </div>
                                      <div className="flex items-center">
                                        <Calendar className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                                        <span>
                                          Applied{" "}
                                          {formatDate(applicant.appliedAt)}
                                        </span>
                                      </div>
                                      {applicant.user.location && (
                                        <div className="flex items-center min-w-0">
                                          <MapPin className="h-3 w-3 md:h-4 md:w-4 mr-1 flex-shrink-0" />
                                          <span className="break-words">
                                            {applicant.user.location}
                                          </span>
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
                                                className="text-xs break-words"
                                              >
                                                {skill}
                                              </Badge>
                                            ))}
                                          {applicant.user.skills.length > 5 && (
                                            <Badge
                                              variant="outline"
                                              className="text-xs"
                                            >
                                              +
                                              {applicant.user.skills.length - 5}{" "}
                                              more
                                            </Badge>
                                          )}
                                        </div>
                                      )}
                                    {applicant.coverLetter && (
                                      <div className="bg-muted p-3 rounded-lg mb-3">
                                        <h4 className="font-medium text-xs md:text-sm mb-2 flex items-center">
                                          <FileText className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                                          Cover Letter:
                                        </h4>
                                        <p className="text-xs md:text-sm text-muted-foreground line-clamp-3 break-words">
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
                                                  setSelectedApplicant(
                                                    applicant
                                                  )
                                                }
                                              >
                                                Read more...
                                              </Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-scroll">
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
                                                <p className="text-sm whitespace-pre-wrap break-words">
                                                  {applicant.coverLetter}
                                                </p>
                                              </div>
                                            </DialogContent>
                                          </Dialog>
                                        )}
                                      </div>
                                    )}
                                    {/* Resume Buttons */}
                                 {/* Resume Button - Mobile */}
{applicant.resumeUrl && (
  <Button
    size="sm"
    variant="outline"
    asChild
    className="w-full text-xs"
  >
    <a
      href={getResumeViewUrl(applicant.resumeUrl)}
      target="_blank"
      rel="noopener noreferrer"
    >
      <FileText className="mr-1 h-3 w-3" />
      View Resume
    </a>
  </Button>
)}

                                    {/* Show Rejection Reason for Recruiters */}
                                    {applicant.status === "rejected" && applicant.rejectionReason && (
                                      <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                        <h4 className="font-medium text-xs md:text-sm text-red-800 dark:text-red-300 mb-1 flex items-center">
                                          <X className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                                          Rejection Reason:
                                        </h4>
                                        <p className="text-xs md:text-sm text-red-700 dark:text-red-400">
                                          {applicant.rejectionReason}
                                        </p>
                                      </div>
                                    )}
                                    {/* View Full Details Button */}
                                    <div className="mb-3">
                                      <Dialog>
                                        <DialogTrigger asChild>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-xs md:text-sm"
                                          >
                                            <User className="mr-2 h-3 w-3 md:h-4 md:w-4" />
                                            View Full Details
                                          </Button>
                                          
                                        </DialogTrigger>
                                        <DialogContent className="max-w-2xl w-[95vw] max-h-[80vh] overflow-y-auto">
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
                                              applicant.user.skills.length >
                                                0 ? (
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
                                                <p className="text-sm bg-muted p-3 rounded-lg break-words">
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
                                                  className="text-blue-600 hover:underline break-all"
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
                                        <div className="mt-3">
                                          <div className="flex items-center justify-between mb-3">
                                            <h4 className="font-medium text-xs md:text-sm flex items-center text-gray-50">
                                              <MessageSquare
                                                className="h-3 w-3 md:h-4 md:w-4 mr-1 text-teal-600"
                                                strokeWidth={3}
                                              />
                                              Feedback (
                                              {applicant.feedback.length}):
                                            </h4>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={() =>
                                                toggleFeedback(
                                                  applicant.applicationId
                                                )
                                              }
                                              className="text-xs p-1 h-auto bg-gray-600"
                                            >
                                              {expandedFeedback[
                                                applicant.applicationId
                                              ] ? (
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
                                          {expandedFeedback[
                                            applicant.applicationId
                                          ] && (
                                            <div className="space-y-2">
                                              {applicant.feedback.map(
                                                (feedback, index) => (
                                                  <div
                                                    key={index}
                                                    className={`relative p-3 rounded-lg border-l-4 w-full ${getFeedbackStatusColor(
                                                      index,
                                                      applicant.feedback?.length
                                                    )}`}
                                                  >
                                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                                                      <p className="text-xs md:text-sm break-words flex-1 leading-relaxed">
                                                        {feedback.message}
                                                      </p>
                                                      {feedback.createdAt && (
                                                        <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                                                          {formatDate(
                                                            feedback.createdAt
                                                          )}
                                                        </span>
                                                      )}
                                                    </div>
                                                  </div>
                                                )
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                  </div>
                                </div>
                              </div>

                              {/* Desktop Action Buttons - Hidden on mobile */}
                              <div className="hidden md:flex flex-col gap-2 min-w-[140px]">
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
                                        updatingStatus ===
                                        applicant.applicationId
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
                                        updatingStatus ===
                                        applicant.applicationId
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
                                        updatingStatus ===
                                        applicant.applicationId
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
                                        updatingStatus ===
                                        applicant.applicationId
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
                                        updatingStatus ===
                                        applicant.applicationId
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
                                        updatingStatus ===
                                        applicant.applicationId
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
                                        updatingStatus ===
                                        applicant.applicationId
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
                                        updatingStatus ===
                                        applicant.applicationId
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
                                        updatingStatus ===
                                        applicant.applicationId
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

                                {/* Feedback Button - Always show on desktop */}
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

                                {/* LinkedIn Button on desktop */}
                                {applicant.user.linkedinUrl && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    asChild
                                    className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                                  >
                                    <a
                                      href={applicant.user.linkedinUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                                                              <FaLinkedin className="mr-1 h-3 w-3" />

                                      LinkedIn
                                    </a>
                                  </Button>
                                )}
                              </div>
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