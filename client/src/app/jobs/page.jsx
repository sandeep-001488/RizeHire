"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import useJobStore from "@/stores/jobStore";
import useAuthStore from "@/stores/authStore";
import { jobsAPI } from "@/lib/api";
import { formatDate, formatSalary } from "@/lib/utils";
import {
  Search,
  Filter,
  MapPin,
  Clock,
  Users,
  Briefcase,
  ArrowRight,
  Loader2,
  PlusCircle,
  Eye,
  Star,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function JobsPage() {
  const {
    jobs,
    filters,
    pagination,
    isLoading,
    setJobs,
    setFilters,
    setPagination,
    setLoading,
  } = useJobStore();

  const { user, isAuthenticated } = useAuthStore();
  const [showFilters, setShowFilters] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [showAllRecommendations, setShowAllRecommendations] = useState(false);

  useEffect(() => {
    fetchJobs();
    // Fetch recommendations if user is a seeker
    if (user?.role === "seeker") {
      fetchRecommendations();
    }
    // console.log(user);
  }, [filters, pagination.current, user]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        limit: pagination.limit,
        ...filters,
        skills: filters.skills.join(","),
      };

      const response = await jobsAPI.getJobs(params);
      const { jobs, pagination: paginationData } = response.data.data;

      setJobs(jobs);
      setPagination(paginationData);
    } catch (error) {
      console.error("Error fetching jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendations = async () => {
    setLoadingRecommendations(true);
    try {
      const response = await jobsAPI.getRecommendations({ limit: 5 });
      setRecommendations(response.data.data.recommendations || []);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters({ [key]: value });
    setPagination({ ...pagination, current: 1 });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchJobs();
  };

  const isJobOwner = (job) => {
    return isAuthenticated && user && job?.postedBy?._id === user?._id;
  };

  // Get match badge styling
  const getMatchBadgeStyle = (matchScore) => {
    if (matchScore >= 80) {
      return "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300";
    } else if (matchScore >= 60) {
      return "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300";
    } else if (matchScore >= 40) {
      return "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300";
    } else {
      return "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900/30 dark:text-gray-300";
    }
  };

  const jobTypes = [
    "full-time",
    "part-time",
    "contract",
    "freelance",
    "internship",
  ];
  const workModes = ["remote", "hybrid", "onsite"];
  const experienceLevels = ["entry", "junior", "mid", "senior", "expert"];
  
  // NEW: Category and Industry options
  const categories = [
    "technology",
    "business",
    "marketing",
    "finance",
    "healthcare",
    "education",
    "creative",
    "operations",
    "sales",
    "engineering",
    "legal",
    "hr",
    "other",
  ];
  
  const industries = [
    "IT & Software",
    "Banking & Finance",
    "Healthcare & Medical",
    "Education & Training",
    "Retail & E-commerce",
    "Manufacturing",
    "Consulting",
    "Media & Entertainment",
    "Real Estate",
    "Hospitality & Tourism",
    "Telecommunications",
    "Automotive",
    "Energy & Utilities",
    "Government & Public Sector",
    "Non-Profit",
    "Other",
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Find Your Next Opportunity</h1>
          <p className="text-muted-foreground mt-2">
            Discover {pagination.total} jobs from top companies
          </p>
        </div>
        {isAuthenticated && user?.role === "poster" && (
          <Link href="/post-job">
            <Button className="mt-4 md:mt-0">
              <PlusCircle className="mr-2 h-4 w-4" />
              Post a Job
            </Button>
          </Link>
        )}
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search jobs, companies, or skills..."
                    value={filters.search}
                    onChange={(e) =>
                      handleFilterChange("search", e.target.value)
                    }
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Filters
                </Button>
                <Button type="submit">Search</Button>
              </div>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 pt-4 border-t">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    value={filters.category || ""}
                    onChange={(e) =>
                      handleFilterChange("category", e.target.value)
                    }
                    className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md"
                  >
                    <option value="">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="industry">Industry</Label>
                  <select
                    id="industry"
                    value={filters.industry || ""}
                    onChange={(e) =>
                      handleFilterChange("industry", e.target.value)
                    }
                    className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md"
                  >
                    <option value="">All Industries</option>
                    {industries.map((ind) => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="jobType">Job Type</Label>
                  <select
                    id="jobType"
                    value={filters.jobType}
                    onChange={(e) =>
                      handleFilterChange("jobType", e.target.value)
                    }
                    className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md"
                  >
                    <option value="">All Types</option>
                    {jobTypes.map((type) => (
                      <option key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="workMode">Work Mode</Label>
                  <select
                    id="workMode"
                    value={filters.workMode}
                    onChange={(e) =>
                      handleFilterChange("workMode", e.target.value)
                    }
                    className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md"
                  >
                    <option value="">All Modes</option>
                    {workModes.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="experienceLevel">Experience</Label>
                  <select
                    id="experienceLevel"
                    value={filters.experienceLevel}
                    onChange={(e) =>
                      handleFilterChange("experienceLevel", e.target.value)
                    }
                    className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md"
                  >
                    <option value="">All Levels</option>
                    {experienceLevels.map((level) => (
                      <option key={level} value={level}>
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    placeholder="City, State, Country"
                    value={filters.location}
                    onChange={(e) =>
                      handleFilterChange("location", e.target.value)
                    }
                  />
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Personalized Recommendations Section (for seekers only) */}
      {user?.role === "seeker" && recommendations.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-blue-600" />
            <h2 className="text-2xl font-bold">Recommended For You</h2>
            <Badge variant="secondary" className="ml-2">Top Matches</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.slice(0, showAllRecommendations ? recommendations.length : 3).map((job) => (
              <Card key={job._id} className="hover:shadow-lg transition-all border-2 border-blue-200 dark:border-blue-800">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <Badge className="bg-green-100 text-green-800 border-green-300">
                      <Sparkles className="h-3 w-3 mr-1" />
                      {job.matchScore}% Match
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {job.matchCategory}
                    </Badge>
                  </div>

                  <Link href={`/jobs/${job._id}`}>
                    <h3 className="font-semibold hover:text-primary transition-colors cursor-pointer line-clamp-1">
                      {job.title}
                    </h3>
                  </Link>
                  <p className="text-sm text-muted-foreground mb-2">{job.postedBy?.name}</p>

                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                    {job.whyThisJob}
                  </p>

                  {/* ML Prediction Badge */}
                  {job.mlPrediction && (
                    <div className="mb-3 p-2 bg-linear-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-md border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-purple-700 dark:text-purple-300">
                            AI Prediction
                          </p>
                          <p className="text-sm font-bold text-purple-900 dark:text-purple-100">
                            {job.mlPrediction.acceptanceProbability}% Success Rate
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700 border-purple-300">
                          {job.mlPrediction.confidence}
                        </Badge>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1 mb-3">
                    {job.matchBreakdown?.skills?.matchingSkills?.slice(0, 3).map((skill, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs bg-green-100 text-green-800">
                        {skill}
                      </Badge>
                    ))}
                  </div>

                  <Link href={`/jobs/${job._id}`}>
                    <Button size="sm" className="w-full">
                      Apply Now <ArrowRight className="ml-2 h-3 w-3" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>

          {recommendations.length > 3 && (
            <div className="text-center mt-4">
              <Button
                variant="outline"
                onClick={() => setShowAllRecommendations(!showAllRecommendations)}
              >
                {showAllRecommendations ? (
                  <>Show Less</>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Show {recommendations.length - 3} More Recommendations
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}

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
      ) : jobs.length > 0 ? (
        <div className="space-y-4">
          {jobs
            .filter((job) => !isJobOwner(job))
            .map((job) => (
              <Card key={job._id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between">
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <Link href={`/jobs/${job._id}`} className="flex-1 min-w-0">
                          <h3 className="text-xl font-semibold hover:text-primary transition-colors cursor-pointer">
                            {job.title}
                          </h3>
                        </Link>

                        {/* Match Score Badge (for seekers only) */}
                        {user?.role === "seeker" && job.matchScore !== undefined && (
                          <Badge
                            variant="outline"
                            className={`${getMatchBadgeStyle(job.matchScore)} flex items-center gap-1 font-semibold shrink-0`}
                          >
                            {job.matchScore >= 80 && <Sparkles className="h-3 w-3" />}
                            {job.matchScore}% Match
                          </Badge>
                        )}
                      </div>

                      <p className="text-muted-foreground mt-1">
                        {job.postedBy?.name || "Sandeep"}
                      </p>

                      {/* Match Category (for seekers only) */}
                      {user?.role === "seeker" && job.matchCategory && job.matchScore >= 60 && (
                        <div className="mt-2 flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            <Star className="h-3 w-3 mr-1" />
                            {job.matchCategory}
                          </Badge>
                        </div>
                      )}

                      {/* Why This Job (for seekers only) */}
                      {user?.role === "seeker" && job.whyThisJob && job.matchScore >= 40 && (
                        <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-md">
                          <p className="text-xs text-blue-800 dark:text-blue-300 flex items-start gap-1">
                            <TrendingUp className="h-3 w-3 mt-0.5 shrink-0" />
                            <span>{job.whyThisJob}</span>
                          </p>
                        </div>
                      )}

                      {/* ML Prediction (for seekers only) */}
                      {user?.role === "seeker" && job.mlPrediction && (
                        <div className={`mt-2 p-2 rounded-md border ${
                          job.mlPrediction.acceptanceProbability >= 70
                            ? "bg-green-50 dark:bg-green-900/10 border-green-300 dark:border-green-800"
                            : job.mlPrediction.acceptanceProbability >= 50
                            ? "bg-blue-50 dark:bg-blue-900/10 border-blue-300 dark:border-blue-800"
                            : job.mlPrediction.acceptanceProbability >= 30
                            ? "bg-yellow-50 dark:bg-yellow-900/10 border-yellow-300 dark:border-yellow-800"
                            : "bg-orange-50 dark:bg-orange-900/10 border-orange-300 dark:border-orange-800"
                        }`}>
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-semibold flex items-center gap-1">
                              <Sparkles className="h-3 w-3" />
                              AI Acceptance Prediction
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {job.mlPrediction.confidence} confidence
                            </Badge>
                          </div>
                          <p className={`text-lg font-bold ${
                            job.mlPrediction.acceptanceProbability >= 70
                              ? "text-green-700 dark:text-green-300"
                              : job.mlPrediction.acceptanceProbability >= 50
                              ? "text-blue-700 dark:text-blue-300"
                              : job.mlPrediction.acceptanceProbability >= 30
                              ? "text-yellow-700 dark:text-yellow-300"
                              : "text-orange-700 dark:text-orange-300"
                          }`}>
                            {job.mlPrediction.acceptanceProbability}% Acceptance Rate
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {job.mlPrediction.recommendation}
                          </p>
                        </div>
                      )}

                      <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                        {job.description}
                      </p>

                      <div className="flex flex-wrap gap-2 mt-4">
                        <Badge variant="secondary">{job.jobType}</Badge>
                        <Badge variant="outline">{job.workMode}</Badge>
                        {job.experienceLevel && (
                          <Badge variant="outline">{job.experienceLevel}</Badge>
                        )}
                        {job.location && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3 mr-1" />
                            {job.location.city}, {job.location.country}
                          </div>
                        )}
                      </div>

                      {job.skills && job.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {job.skills.slice(0, 5).map((skill, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="text-xs"
                            >
                              {skill}
                            </Badge>
                          ))}
                          {job.skills.length > 5 && (
                            <Badge variant="outline" className="text-xs">
                              +{job.skills.length - 5} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end mt-4 md:mt-0 md:ml-6">
                      {job.budget && (
                        <div className="text-lg font-semibold text-primary mb-2">
                          {formatSalary(
                            job.budget.min,
                            job.budget.max,
                            job.budget.currency,
                            job.budget.period
                          )}
                        </div>
                      )}

                      <div className="flex items-center text-sm text-muted-foreground mb-3">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatDate(job.createdAt)}
                      </div>

                      <div className="flex flex-col gap-2">
                        <Link href={`/jobs/${job._id}`}>
                          <Button>
                            View Details
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>

                        {/* Match Details Button (for seekers only) */}
                        {user?.role === "seeker" && job.matchBreakdown && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Star className="mr-2 h-4 w-4" />
                                Match Details
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                  <Sparkles className="h-5 w-5 text-blue-600" />
                                  Why This Job Matches You
                                </DialogTitle>
                                <DialogDescription>
                                  {job.title} at {job.postedBy?.name}
                                </DialogDescription>
                              </DialogHeader>

                              <div className="mt-4 space-y-4">
                                {/* Overall Score */}
                                <div className="p-4 bg-linear-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                  <h3 className="font-semibold mb-2">Overall Match Score</h3>
                                  <div className="flex items-center gap-3">
                                    <span className="text-4xl font-bold text-blue-600">{job.matchScore}%</span>
                                    <div className="flex-1">
                                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                                        <div
                                          className={`h-full rounded-full ${
                                            job.matchScore >= 80 ? "bg-green-500" :
                                            job.matchScore >= 60 ? "bg-blue-500" :
                                            job.matchScore >= 40 ? "bg-yellow-500" : "bg-gray-400"
                                          }`}
                                          style={{ width: `${job.matchScore}%` }}
                                        />
                                      </div>
                                      <p className="text-xs text-muted-foreground mt-1">{job.matchCategory}</p>
                                    </div>
                                  </div>
                                </div>

                                {/* ML Prediction */}
                                {job.mlPrediction && (
                                  <div className="p-4 bg-linear-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border-2 border-purple-300 dark:border-purple-700">
                                    <div className="flex items-center gap-2 mb-3">
                                      <Sparkles className="h-5 w-5 text-purple-600" />
                                      <h3 className="font-semibold text-purple-900 dark:text-purple-100">AI Acceptance Prediction</h3>
                                      <Badge className="ml-auto bg-purple-600 text-white">
                                        {job.mlPrediction.confidence} confidence
                                      </Badge>
                                    </div>

                                    <div className="mb-3">
                                      <div className="flex items-center gap-3">
                                        <span className="text-4xl font-bold text-purple-600">
                                          {job.mlPrediction.acceptanceProbability}%
                                        </span>
                                        <div className="flex-1">
                                          <p className="text-sm font-medium text-purple-900 dark:text-purple-100 mb-1">
                                            Success Probability
                                          </p>
                                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                                            <div
                                              className="h-full rounded-full bg-linear-to-r from-purple-500 to-pink-500"
                                              style={{ width: `${job.mlPrediction.acceptanceProbability}%` }}
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="bg-white/50 dark:bg-gray-800/50 p-3 rounded-md">
                                      <p className="text-sm font-medium text-purple-900 dark:text-purple-100 mb-1">
                                        {job.mlPrediction.recommendation}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {job.mlPrediction.insight}
                                      </p>
                                    </div>

                                    <p className="text-xs text-muted-foreground mt-2 italic">
                                      🤖 Based on machine learning analysis of historical application patterns
                                    </p>
                                  </div>
                                )}

                                {/* Skills Breakdown */}
                                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
                                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                                    <Briefcase className="h-4 w-4" />
                                    Skills Match ({job.matchBreakdown?.skills?.score}%)
                                  </h3>
                                  {job.matchBreakdown?.skills?.matchingSkills?.length > 0 && (
                                    <div className="mb-3">
                                      <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-1">
                                        ✓ Skills You Have:
                                      </p>
                                      <div className="flex flex-wrap gap-1">
                                        {job.matchBreakdown.skills.matchingSkills.map((skill, idx) => (
                                          <Badge key={idx} variant="secondary" className="bg-green-100 text-green-800">
                                            {skill}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {job.matchBreakdown?.skills?.missingSkills?.length > 0 && (
                                    <div>
                                      <p className="text-sm font-medium text-orange-700 dark:text-orange-400 mb-1">
                                        📚 Skills to Develop:
                                      </p>
                                      <div className="flex flex-wrap gap-1">
                                        {job.matchBreakdown.skills.missingSkills.map((skill, idx) => (
                                          <Badge key={idx} variant="outline" className="text-orange-700 border-orange-300">
                                            {skill}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Experience */}
                                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
                                  <h3 className="font-semibold mb-2">
                                    Experience Match ({job.matchBreakdown?.experience?.score}%)
                                  </h3>
                                  <p className="text-sm text-muted-foreground">
                                    {job.matchBreakdown?.experience?.explanation}
                                  </p>
                                </div>

                                {/* Location */}
                                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
                                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                                    <MapPin className="h-4 w-4" />
                                    Location Match ({job.matchBreakdown?.location?.score}%)
                                  </h3>
                                  <p className="text-sm text-muted-foreground">
                                    {job.matchBreakdown?.location?.explanation}
                                  </p>
                                </div>

                                {/* Recommendation */}
                                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                                  <h3 className="font-semibold mb-2">💡 Our Recommendation</h3>
                                  <p className="text-sm">{job.recommendation}</p>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}

                        {isJobOwner(job) && (
                          <Link href={`/jobs/${job._id}/applicants`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                            >
                              <Users className="mr-2 h-4 w-4" />
                              View Applicants
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          {/* //added */}
          {jobs.filter((job) => !isJobOwner(job)).length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <Briefcase className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">
                  No other jobs found
                </h3>
                <p className="text-muted-foreground mb-4">
                  All available jobs are posted by you. Try different filters or
                  check back later.
                </p>
              </CardContent>
            </Card>
          )}

          {pagination.pages > 1 && (
            <div className="flex justify-center space-x-2 mt-8">
              <Button
                variant="outline"
                disabled={pagination.current === 1}
                onClick={() =>
                  setPagination({
                    ...pagination,
                    current: pagination.current - 1,
                  })
                }
              >
                Previous
              </Button>

              <div className="flex items-center space-x-1">
                {[...Array(pagination.pages)].map((_, index) => {
                  const page = index + 1;
                  if (
                    page === 1 ||
                    page === pagination.pages ||
                    (page >= pagination.current - 1 &&
                      page <= pagination.current + 1)
                  ) {
                    return (
                      <Button
                        key={page}
                        variant={
                          pagination.current === page ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() =>
                          setPagination({ ...pagination, current: page })
                        }
                      >
                        {page}
                      </Button>
                    );
                  } else if (
                    page === pagination.current - 2 ||
                    page === pagination.current + 2
                  ) {
                    return (
                      <span key={page} className="px-2">
                        ...
                      </span>
                    );
                  }
                  return null;
                })}
              </div>

              <Button
                variant="outline"
                disabled={pagination.current === pagination.pages}
                onClick={() =>
                  setPagination({
                    ...pagination,
                    current: pagination.current + 1,
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
            <Briefcase className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">No jobs found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search criteria or browse all available
              positions.
            </p>
            <Button
              onClick={() => {
                setFilters({
                  search: "",
                  category: "",
                  industry: "",
                  jobType: "",
                  workMode: "",
                  location: "",
                  experienceLevel: "",
                  skills: [],
                });
              }}
            >
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
