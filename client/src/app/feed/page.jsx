"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AuthGuard from "@/components/auth-guard/authGuard";
import { jobsAPI } from "@/lib/api";
import { formatDate, formatSalary } from "@/lib/utils";
import {
  TrendingUp,
  MapPin,
  Clock,
  Users,
  ArrowRight,
  Search,
  Filter,
  Loader2,
  Briefcase,
} from "lucide-react";

export default function FeedPage() {
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchLatestJobs();
  }, []);

  const fetchLatestJobs = async () => {
    try {
      const response = await jobsAPI.getJobs({
        limit: 20,
        sortBy: "createdAt",
        sortOrder: "desc",
        search: searchTerm,
      });
      setJobs(response.data.data.jobs);
    } catch (error) {
      console.error("Error fetching jobs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchLatestJobs();
  };

  return (
    <AuthGuard>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <TrendingUp className="mr-3 h-8 w-8 text-primary" />
            Job Feed
          </h1>
          <p className="text-muted-foreground mt-2">
            Latest job opportunities from the community
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSearch} className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search jobs, companies, or skills..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button type="submit">Search</Button>
              <Link href="/jobs">
                <Button variant="outline">
                  <Filter className="mr-2 h-4 w-4" />
                  Advanced Filters
                </Button>
              </Link>
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
                    <div className="h-16 bg-muted rounded w-full"></div>
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
            {jobs.map((job) => (
              <Card key={job._id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col space-y-4">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between">
                      <div className="flex-1">
                        <Link href={`/jobs/${job._id}`}>
                          <h3 className="text-xl font-semibold hover:text-primary transition-colors cursor-pointer">
                            {job.title}
                          </h3>
                        </Link>
                        <p className="text-muted-foreground mt-1">
                          {job.postedBy.name}
                        </p>

                        <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {formatDate(job.createdAt)}
                          </div>
                          {job.location && (
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 mr-1" />
                              {job.location.city}, {job.location.country}
                            </div>
                          )}
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-1" />
                            {job.applications?.length || 0} applications
                          </div>
                        </div>
                      </div>

                      {job.budget && (
                        <div className="text-right mt-4 md:mt-0">
                          <div className="text-lg font-semibold text-primary">
                            {formatSalary(
                              job.budget.min,
                              job.budget.max,
                              job.budget.currency,
                              job.budget.period
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {job.description}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{job.jobType}</Badge>
                      <Badge variant="outline">{job.workMode}</Badge>
                      {job.experienceLevel && (
                        <Badge variant="outline">{job.experienceLevel}</Badge>
                      )}
                    </div>

                    {job.skills && job.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {job.skills.slice(0, 6).map((skill, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="text-xs"
                          >
                            {skill}
                          </Badge>
                        ))}
                        {job.skills.length > 6 && (
                          <Badge variant="outline" className="text-xs">
                            +{job.skills.length - 6} more
                          </Badge>
                        )}
                      </div>
                    )}

                    <div className="flex justify-end">
                      <Link href={`/jobs/${job._id}`}>
                        <Button>
                          View Details
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Briefcase className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No jobs found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm
                  ? "Try a different search term"
                  : "No jobs available at the moment."}
              </p>
              {searchTerm && (
                <Button
                  onClick={() => {
                    setSearchTerm("");
                    fetchLatestJobs();
                  }}
                >
                  Clear Search
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AuthGuard>
  );
}
