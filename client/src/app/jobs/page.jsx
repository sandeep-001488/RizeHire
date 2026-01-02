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
} from "lucide-react";

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

  useEffect(() => {
    fetchJobs();
    // console.log(user);
  }, [filters, pagination.current]);

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

  const jobTypes = [
    "full-time",
    "part-time",
    "contract",
    "freelance",
    "internship",
  ];
  const workModes = ["remote", "hybrid", "onsite"];
  const experienceLevels = ["entry", "junior", "mid", "senior", "expert"];

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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
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
                      <Link href={`/jobs/${job._id}`}>
                        <h3 className="text-xl font-semibold hover:text-primary transition-colors cursor-pointer">
                          {job.title}
                        </h3>
                      </Link>
                      <p className="text-muted-foreground mt-1">
                        {job.postedBy?.name || "Sandeep"}
                      </p>

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
