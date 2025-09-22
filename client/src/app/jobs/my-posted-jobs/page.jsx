"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AuthGuard from "@/components/auth-guard/authGuard";
import useJobStore from "@/stores/jobStore";
import { formatDate } from "@/lib/utils";
import {
  Users,
  Eye,
  Calendar,
  Edit,
  Trash2,
  PlusCircle,
  Briefcase,
  MapPin,
} from "lucide-react";

export default function MyJobsPage() {
  const {
    myJobs,
    myJobsPagination,
    isLoadingMyJobs,
    fetchMyJobs,
    setMyJobsPagination,
    deleteJob,
  } = useJobStore();

  useEffect(() => {
    fetchMyJobs();
  }, [myJobsPagination.current]);

  const handleDeleteJob = async (jobId) => {
    if (confirm("Are you sure you want to delete this job?")) {
      try {
        await deleteJob(jobId);
      } catch (error) {
        alert("Failed to delete job");
      }
    }
  };

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Posted Jobs</h1>
            <p className="text-muted-foreground mt-2">
              Manage your job postings and view applications
            </p>
          </div>
          <Link href="/post-job">
            <Button className="mt-4 md:mt-0">
              <PlusCircle className="mr-2 h-4 w-4" />
              Post New Job
            </Button>
          </Link>
        </div>

        {isLoadingMyJobs ? (
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
        ) : myJobs.length > 0 ? (
          <div className="space-y-4">
            {myJobs.map((job) => (
              <Card key={job._id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between">
                    <div className="flex-1">
                      <Link href={`/jobs/${job._id}`}>
                        <h3 className="text-xl font-semibold hover:text-primary transition-colors cursor-pointer">
                          {job.title}
                        </h3>
                      </Link>

                      {job.company?.name && (
                        <p className="text-muted-foreground mt-1">
                          {job.company.name}
                        </p>
                      )}

                      <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                        {job.description}
                      </p>

                      <div className="flex flex-wrap gap-3 mt-3 text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          Posted {formatDate(job.createdAt)}
                        </div>
                        <div className="flex items-center">
                          <Eye className="h-4 w-4 mr-1" />
                          {job.views || 0} views
                        </div>
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          {job.applications?.length || 0} applications
                        </div>
                        {job.location && (
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            {job.location.city}, {job.location.country}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 mt-4">
                        <Badge variant="secondary">{job.jobType}</Badge>
                        <Badge variant="outline">{job.workMode}</Badge>
                        {job.experienceLevel && (
                          <Badge variant="outline">{job.experienceLevel}</Badge>
                        )}
                        <Badge
                          variant={job.isActive ? "default" : "destructive"}
                        >
                          {job.isActive ? "Active" : "Inactive"}
                        </Badge>
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

                    <div className="flex flex-col gap-2 mt-4 md:mt-0 md:ml-6">
                      <Link href={`/jobs/${job._id}/applicants`}>
                        <Button className="w-full">
                          <Users className="mr-2 h-4 w-4" />
                          View Applicants ({job.applicationCount || 0})
                        </Button>
                      </Link>

                      <div className="flex gap-2">
                        <Link href={`/edit-job/${job._id}`}>
                          <Button variant="outline" size="sm">
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                        </Link>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteJob(job._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {myJobsPagination.pages > 1 && (
              <div className="flex justify-center space-x-2 mt-8">
                <Button
                  variant="outline"
                  disabled={myJobsPagination.current === 1}
                  onClick={() =>
                    setMyJobsPagination({
                      ...myJobsPagination,
                      current: myJobsPagination.current - 1,
                    })
                  }
                >
                  Previous
                </Button>

                <div className="flex items-center space-x-1">
                  {[...Array(myJobsPagination.pages)].map((_, index) => {
                    const page = index + 1;
                    if (
                      page === 1 ||
                      page === myJobsPagination.pages ||
                      (page >= myJobsPagination.current - 1 &&
                        page <= myJobsPagination.current + 1)
                    ) {
                      return (
                        <Button
                          key={page}
                          variant={
                            myJobsPagination.current === page
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() =>
                            setMyJobsPagination({
                              ...myJobsPagination,
                              current: page,
                            })
                          }
                        >
                          {page}
                        </Button>
                      );
                    } else if (
                      page === myJobsPagination.current - 2 ||
                      page === myJobsPagination.current + 2
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
                  disabled={myJobsPagination.current === myJobsPagination.pages}
                  onClick={() =>
                    setMyJobsPagination({
                      ...myJobsPagination,
                      current: myJobsPagination.current + 1,
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
              <h3 className="text-lg font-medium mb-2">No jobs posted yet</h3>
              <p className="text-muted-foreground mb-4">
                Start by posting your first job opportunity.
              </p>
              <Link href="/post-job">
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Post Your First Job
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </AuthGuard>
  );
}
