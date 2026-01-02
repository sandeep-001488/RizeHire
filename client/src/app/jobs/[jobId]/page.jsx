"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import useAuthStore from "@/stores/authStore";
import { jobsAPI, aiAPI, applicationsAPI } from "@/lib/api";
import { formatDate, formatSalary } from "@/lib/utils";
import {
  MapPin,
  Clock,
  Users,
  ExternalLink,
  Mail,
  Edit,
  Trash2,
  Send,
  Brain,
  ArrowLeft,
  Loader2,
  AlertCircle,
} from "lucide-react";

export default function JobDetailPage({ params }) {
  const unwrappedParams = React.use(params);
  const { jobId } = unwrappedParams;
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  // Job and application state
  const [job, setJob] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [matchScore, setMatchScore] = useState(null);
  const [interviewQuestions, setInterviewQuestions] = useState([]);
  const [showQuestions, setShowQuestions] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Resume parse validation state
  // These states control the alert shown when a seeker hasn't parsed their resume
  const [showResumeAlert, setShowResumeAlert] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(10); // 10-second countdown before auto-redirect

  useEffect(() => {
    fetchJobDetails();
  }, [jobId]);

  useEffect(() => {
    if (job && isAuthenticated) {
      // console.log(" job:", job);
      fetchMatchScore();
    }
  }, [job, isAuthenticated]);

  /**
   * Resume Parse Validation Effect
   * Checks if the authenticated seeker has parsed their resume
   * If not, shows an alert and prevents job application
   * Only applies to seekers, not posters
   */
  useEffect(() => {
    if (isAuthenticated && user && user.role === "seeker") {
      // Check if parsedResume exists and has data
      const hasParsedResume = user.parsedResume && Object.keys(user.parsedResume).length > 0;
      if (!hasParsedResume) {
        setShowResumeAlert(true); // Show warning alert
      }
    }
  }, [isAuthenticated, user]);

  /**
   * Auto-Redirect Countdown Timer
   * Counts down from 10 seconds and automatically redirects to profile page
   * User can manually redirect or dismiss the alert
   * Timer cleans up on component unmount
   */
  useEffect(() => {
    if (showResumeAlert && redirectCountdown > 0) {
      const timer = setTimeout(() => {
        setRedirectCountdown(redirectCountdown - 1);
      }, 1000);
      // Cleanup timer on unmount or when dependencies change
      return () => clearTimeout(timer);
    } else if (showResumeAlert && redirectCountdown === 0) {
      // Redirect when countdown reaches 0
      router.push("/profile");
    }
  }, [showResumeAlert, redirectCountdown, router]);

  const fetchJobDetails = async () => {
    try {
      const response = await jobsAPI.getJob(jobId);
      setJob(response.data.data.job);
    } catch (error) {
      console.error("Error fetching job:", error);
      router.push("/jobs");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMatchScore = async () => {
    try {
      const response = await aiAPI.getJobMatch(jobId);
      setMatchScore(response.data.data.matchScore);
    } catch (error) {
      console.error("Error fetching match score:", error);
    }
  };

  const fetchInterviewQuestions = async () => {
    try {
      const response = await aiAPI.getInterviewQuestions(jobId);
      setInterviewQuestions(response.data.data.questions);
      setShowQuestions(true);
    } catch (error) {
      console.error("Error fetching interview questions:", error);
      alert("Failed to fetch interview questions. Please try again later.");
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        "Are you sure you want to delete this job? This action cannot be undone."
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      await jobsAPI.deleteJob(jobId);

      alert("Job deleted successfully!");

      router.push("/jobs");
    } catch (error) {
      console.error("Error deleting job:", error);

      let errorMessage = "Failed to delete job";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 403) {
        errorMessage = "You don't have permission to delete this job";
      } else if (error.response?.status === 404) {
        errorMessage = "Job not found";
      }
      alert(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleApply = async (e) => {
    e.preventDefault();
    setIsApplying(true);

    try {
      if (!coverLetter.trim()) {
        alert("Cover letter is required");
        return;
      }

      if (coverLetter.trim().length < 10) {
        alert("Cover letter must be at least 10 characters long");
        return;
      }

      if (!isAuthenticated || !user) {
        alert("Please log in to apply for this job");
        return;
      }

      const formData = new FormData();
      formData.append("coverLetter", coverLetter.trim());
      formData.append("resume", selectedResume); // Append the resume file

      const response = await applicationsAPI.applyToJob(jobId, formData);

      await fetchJobDetails();
      setCoverLetter("");
      setSelectedResume(null);

      alert("Application submitted successfully!");
    } catch (error) {
      let errorMessage = "Failed to submit application";

      if (error.response) {
        if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.status === 401) {
          errorMessage = "Please log in to apply for this job";
        } else if (error.response.status === 403) {
          errorMessage = "You don't have permission to apply for this job";
        } else if (error.response.status === 404) {
          errorMessage = "Job not found";
        } else if (error.response.status === 400) {
          errorMessage =
            "Invalid application data. Please check your cover letter.";
        } else if (error.response.status >= 500) {
          errorMessage = "Server error. Please try again later.";
        }
      } else if (error.request) {
        console.error("🌐 Network error:", error.request);
        errorMessage =
          "Network error. Please check your connection and try again.";
      } else {
        console.error("⚠️ Other error:", error.message);
        errorMessage = error.message || "An unexpected error occurred";
      }
    } finally {
      setIsApplying(false);
    }
  };


  const hasApplied = job?.hasApplied || false;
  const [selectedResume, setSelectedResume] = useState(null);
  const isJobPoster = user && job && job.postedBy && job.postedBy._id === user._id ? true : false;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-400px">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Job not found</h2>
        <Link href="/jobs">
          <Button>Back to Jobs</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      {/*
        Resume Parse Alert Component
        Displays when a seeker hasn't parsed their resume yet
        Features:
        - Orange warning alert with clear message
        - 10-second countdown timer with auto-redirect
        - Manual "Go to Profile Now" button for immediate action
        - "Dismiss" button to close alert and continue browsing
        - Form fields below are disabled when this alert is shown
      */}
      {showResumeAlert && (
        <Alert variant="destructive" className="border-orange-500 bg-orange-50 dark:bg-orange-950">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-800 dark:text-orange-200">Resume Not Parsed</AlertTitle>
          <AlertDescription className="text-orange-700 dark:text-orange-300">
            <p className="mb-2">
              You need to parse your resume before applying for jobs. Please go to your profile and upload your resume.
            </p>
            <p className="font-semibold">
              Redirecting to your profile in {redirectCountdown} second{redirectCountdown !== 1 ? 's' : ''}...
            </p>
            <div className="mt-3 flex gap-2">
              {/* Immediate redirect button */}
              <Button
                size="sm"
                onClick={() => router.push("/profile")}
                className="bg-orange-600 hover:bg-orange-700"
              >
                Go to Profile Now
              </Button>
              {/* Dismiss alert and reset countdown */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowResumeAlert(false);
                  setRedirectCountdown(10); // Reset countdown for next time
                }}
                className="border-orange-600 text-orange-600 hover:bg-orange-100"
              >
                Dismiss
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between">
            <div className="flex-1">
              <CardTitle className="text-2xl lg:text-3xl">
                {job.title}
              </CardTitle>
              <CardDescription className="text-lg mt-2">
                {job.postedBy?.name}
              </CardDescription>

              <div className="flex flex-wrap gap-3 mt-4">
                <div className="flex items-center text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 mr-1" />
                  {job.location
                    ? `${job.location.city}, ${job.location.country}`
                    : job.workMode}
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 mr-1" />
                  Posted {formatDate(job.createdAt)}
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Users className="h-4 w-4 mr-1" />
                  {job.applications?.length || 0} applications
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                <Badge>{job.jobType}</Badge>
                <Badge variant="outline">{job.workMode}</Badge>
                {job.experienceLevel && (
                  <Badge variant="outline">{job.experienceLevel}</Badge>
                )}
                {matchScore && (
                  <Badge
                    variant="secondary"
                    className="bg-primary/10 text-primary"
                  >
                    {matchScore}% match
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-6 md:mt-0">
              {job.budget && (
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">
                    {formatSalary(
                      job.budget.min,
                      job.budget.max,
                      job.budget.currency,
                      job.budget.period
                    )}
                  </div>
                </div>
              )}

              {isJobPoster ? (
                <div className="flex gap-2">
                  <Link href={`/edit-job/${job._id}`}>
                    <Button variant="outline" size="sm">
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </>
                    )}
                  </Button>
                </div>
              ) : isAuthenticated && !hasApplied ? (
                <Button
                  onClick={() =>
                    document.getElementById("apply-section")?.scrollIntoView()
                  }
                >
                  Apply Now
                </Button>
              ) : hasApplied ? (
                <Badge className="w-fit">Applied</Badge>
              ) : null}
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Job Description</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                {job.description.split("\n").map((paragraph, index) => (
                  <p key={index} className="mb-4">
                    {paragraph}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>

          {job.skills && job.skills.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Skills Required</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((skill, index) => (
                    <Badge key={index} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {isAuthenticated && !isJobPoster && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Brain className="mr-2 h-5 w-5" />
                  Interview Preparation
                </CardTitle>
                <CardDescription>
                  Get AI-generated interview questions for this position
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!showQuestions ? (
                  <Button onClick={fetchInterviewQuestions} variant="outline">
                    <Brain className="mr-2 h-4 w-4" />
                    Generate Interview Questions
                  </Button>
                ) : (
                  <div className="space-y-3">
                    {interviewQuestions.map((question, index) => (
                      <div key={index} className="p-3 bg-muted rounded-lg">
                        <p className="font-medium">Q{index + 1}:</p>
                        <p className="text-sm mt-1">{question}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {isAuthenticated && !isJobPoster && !hasApplied && (
            <Card id="apply-section">
              <CardHeader>
                <CardTitle>Apply for this Position</CardTitle>
                <CardDescription>
                  {showResumeAlert
                    ? "Please parse your resume before applying"
                    : "Tell the employer why you're the perfect fit for this role"}
                </CardDescription>
              </CardHeader>
              <CardContent>
             <form onSubmit={handleApply} className="space-y-4">
  <div>
    <Label htmlFor="coverLetter">Cover Letter</Label>
    {/* Disabled when resume not parsed to prevent application submission */}
    <Textarea
      id="coverLetter"
      placeholder="Write a compelling cover letter..."
      value={coverLetter}
      onChange={(e) => setCoverLetter(e.target.value)}
      rows={6}
      required
      disabled={showResumeAlert} // Prevents editing when resume not parsed
    />
  </div>
  
  <div className="space-y-2">
    <Label htmlFor="resume">Upload Resume</Label>
    <div className="flex items-center gap-2">
      <label
        htmlFor="resume"
        className="flex-1 flex items-center justify-center px-4 py-2 border-2 border-dashed border-muted-foreground/25 rounded-lg hover:border-primary/50 hover:bg-accent/50 transition-colors cursor-pointer"
      >
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" x2="12" y1="3" y2="15" />
            </svg>
            <span className="font-medium">
              {selectedResume ? "Change file" : "Choose file"}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            PDF or DOCX (Max 10MB)
          </p>
        </div>
      </label>
      <input
        type="file"
        id="resume"
        accept=".pdf,.docx"
        onChange={(e) => setSelectedResume(e.target.files[0])}
        className="hidden"
        disabled={showResumeAlert}
      />
    </div>
    
    {selectedResume && (
      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-green-600"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <p className="text-sm font-medium flex-1">
          {selectedResume.name}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setSelectedResume(null)}
          className="h-auto p-1"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" x2="6" y1="6" y2="18" />
            <line x1="6" x2="18" y1="6" y2="18" />
          </svg>
        </Button>
      </div>
    )}
  </div>
  
  <Button
    type="submit"
    disabled={isApplying || showResumeAlert}
    className="w-full"
  >
    {isApplying ? (
      <>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Submitting...
      </>
    ) : showResumeAlert ? (
      <>
        <AlertCircle className="mr-2 h-4 w-4" />
        Parse Resume First
      </>
    ) : (
      <>
        <Send className="mr-2 h-4 w-4" />
        Submit Application
      </>
    )}
  </Button>
</form>
              </CardContent>
            </Card>
          )}

          {matchScore && (
            <Card>
              <CardHeader>
                <CardTitle>Application Analysis</CardTitle>
                <CardDescription>
                  Here's why you {matchScore.decision.status === "shortlist" ? "were shortlisted" : matchScore.decision.status === "manual_review" ? "require manual review" : "were not selected"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p>
                  <strong>Final Score:</strong> {matchScore.decision.final_score.toFixed(2)}
                </p>
                <p>
                  <strong>Reason:</strong> {matchScore.decision.reason}
                </p>
                <p>
                  <strong>Key Contributions:</strong>
                </p>
                <ul className="list-disc pl-5">
                  <li>
                    Skill Match: {matchScore.percent_contribution.skill_match.toFixed(1)}%
                  </li>
                  <li>
                    Experience: {matchScore.percent_contribution.exp_score.toFixed(1)}%
                  </li>
                  <li>
                    Education: {matchScore.percent_contribution.education_match.toFixed(1)}%
                  </li>
                  <li>
                    Resume Confidence: {matchScore.percent_contribution.resume_confidence.toFixed(1)}%
                  </li>
                </ul>
                <p className="text-sm text-muted-foreground">
                  <strong>Notes:</strong> {matchScore.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Job Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium">{job.jobType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Work Mode</span>
                <span className="font-medium">{job.workMode}</span>
              </div>
              {job.experienceLevel && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Experience</span>
                  <span className="font-medium">{job.experienceLevel}</span>
                </div>
              )}
              {job.applicationDeadline && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deadline</span>
                  <span className="font-medium">
                    {formatDate(job.applicationDeadline)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>About the Employer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium">{job?.postedBy?.name}</h4>
                {job?.postedBy?.bio && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {job.postedBy.bio}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                {job?.postedBy?.linkedinUrl && (
                  <a
                    href={job.postedBy.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      LinkedIn
                    </Button>
                  </a>
                )}
                {job?.postedBy?.email && (
                  <a href={`mailto:${job.postedBy.email}`}>
                    <Button variant="outline" size="sm">
                      <Mail className="mr-2 h-4 w-4" />
                      Email
                    </Button>
                  </a>
                )}
              </div>
            </CardContent>
          </Card>

          {(job?.applicationUrl || job?.applicationEmail) && (
            <Card>
              <CardHeader>
                <CardTitle>How to Apply</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {job.applicationUrl && (
                  <a
                    href={job.applicationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" className="w-full">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Apply on Company Website
                    </Button>
                  </a>
                )}
                {job.applicationEmail && (
                  <a href={`mailto:${job.applicationEmail}`}>
                    <Button variant="outline" className="w-full">
                      <Mail className="mr-2 h-4 w-4" />
                      Apply via Email
                    </Button>
                  </a>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
