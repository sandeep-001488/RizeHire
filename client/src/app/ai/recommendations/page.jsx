"use client";

import { useState, useEffect } from "react";
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
import { aiAPI } from "@/lib/api";
import { formatDate, formatSalary } from "@/lib/utils";
import {
  Brain,
  TrendingUp,
  MapPin,
  Clock,
  ArrowRight,
  Lightbulb,
  Target,
  BookOpen,
} from "lucide-react";
import AuthGuard from "@/components/auth-guard/authGuard";

export default function AIRecommendationsPage() {
  const [recommendations, setRecommendations] = useState([]);
  const [careerSuggestions, setCareerSuggestions] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRecommendations();
    fetchCareerSuggestions();
  }, []);

  const fetchRecommendations = async () => {
    try {
      const response = await aiAPI.getRecommendations();
      setRecommendations(response.data.data.recommendations || []);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
    }
  };

  const fetchCareerSuggestions = async () => {
    try {
      const response = await aiAPI.getCareerSuggestions();
      setCareerSuggestions(response.data.data.suggestions);
    } catch (error) {
      console.error("Error fetching career suggestions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getMatchColor = (score) => {
    if (score >= 80)
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
    if (score >= 60)
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
    if (score >= 40)
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
    return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
  };

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <Brain className="mr-3 h-8 w-8 text-primary" />
            AI Recommendations
          </h1>
          <p className="text-muted-foreground mt-2">
            Personalized job recommendations and career insights powered by AI
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-3">
                    <div className="h-6 bg-muted rounded w-3/4"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                    <div className="h-4 bg-muted rounded w-full"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Job Recommendations */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="mr-2 h-5 w-5" />
                    Recommended Jobs
                  </CardTitle>
                  <CardDescription>
                    Jobs that match your skills and profile
                  </CardDescription>
                </CardHeader>
              </Card>

              {recommendations.length > 0 ? (
                recommendations.map((rec) => (
                  <Card
                    key={rec.job._id}
                    className="hover:shadow-lg transition-shadow"
                  >
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Link href={`/jobs/${rec.job._id}`}>
                              <h3 className="text-xl font-semibold hover:text-primary transition-colors cursor-pointer">
                                {rec.job.title}
                              </h3>
                            </Link>
                            <Badge className={getMatchColor(rec.matchScore)}>
                              {rec.matchScore}% match
                            </Badge>
                          </div>

                          <p className="text-muted-foreground mb-3">
                            {rec.job.postedBy.name}
                          </p>

                          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                            {rec.job.description}
                          </p>

                          <div className="flex flex-wrap gap-2 mb-3">
                            <Badge variant="secondary">{rec.job.jobType}</Badge>
                            <Badge variant="outline">{rec.job.workMode}</Badge>
                            {rec.job.experienceLevel && (
                              <Badge variant="outline">
                                {rec.job.experienceLevel}
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center text-sm text-muted-foreground">
                            <Clock className="h-3 w-3 mr-1" />
                            Posted {formatDate(rec.job.createdAt)}
                            {rec.job.location && (
                              <>
                                <MapPin className="h-3 w-3 ml-4 mr-1" />
                                {rec.job.location.city},{" "}
                                {rec.job.location.country}
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end mt-4 md:mt-0 md:ml-6">
                          {rec.job.budget && (
                            <div className="text-lg font-semibold text-primary mb-3">
                              {formatSalary(
                                rec.job.budget.min,
                                rec.job.budget.max,
                                rec.job.budget.currency,
                                rec.job.budget.period
                              )}
                            </div>
                          )}

                          <Link href={`/jobs/${rec.job._id}`}>
                            <Button>
                              View Details
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <Brain className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-medium mb-2">
                      No recommendations yet
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Add skills to your profile to get personalized job
                      recommendations.
                    </p>
                    <Link href="/profile">
                      <Button>Update Profile</Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Career Suggestions Sidebar */}
            <div className="space-y-6">
              {careerSuggestions && (
                <>
                  {/* Job Titles to Target */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center text-lg">
                        <Target className="mr-2 h-5 w-5" />
                        Target Roles
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {careerSuggestions.jobTitles?.length > 0 ? (
                        <div className="space-y-2">
                          {careerSuggestions.jobTitles.map((title, index) => (
                            <div
                              key={index}
                              className="p-2 bg-muted rounded text-sm"
                            >
                              {title}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No specific job titles suggested.
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Skills to Learn */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center text-lg">
                        <BookOpen className="mr-2 h-5 w-5" />
                        Skills to Learn
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {careerSuggestions.skillsToLearn?.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {careerSuggestions.skillsToLearn.map(
                            (skill, index) => (
                              <Badge key={index} variant="outline">
                                {skill}
                              </Badge>
                            )
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No specific skills suggested to learn.
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Career Path Advice */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center text-lg">
                        <Lightbulb className="mr-2 h-5 w-5" />
                        Career Advice
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {careerSuggestions.careerPath}
                      </p>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* Action Cards */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Explore More AI Tools
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link href="/ai/skills">
                    <Button variant="outline" className="w-full justify-start">
                      <Brain className="mr-2 h-4 w-4" />
                      Extract Skills from Text
                    </Button>
                  </Link>
                  <Link href="/ai/suggestions">
                    <Button variant="outline" className="w-full justify-start">
                      <Lightbulb className="mr-2 h-4 w-4" />
                      Get Career Suggestions
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
