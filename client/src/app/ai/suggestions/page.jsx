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
import useAuthStore from "@/stores/authStore";
import {
  Lightbulb,
  Target,
  BookOpen,
  TrendingUp,
  ArrowRight,
  RefreshCw,
  Loader2,
  Brain,
} from "lucide-react";
import AuthGuard from "@/components/auth-guard/authGuard";

export default function CareerSuggestionsPage() {
  const { user } = useAuthStore();
  const [suggestions, setSuggestions] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCareerSuggestions();
  }, []);

  const fetchCareerSuggestions = async () => {
    setIsLoading(true);
    try {
      const response = await aiAPI.getCareerSuggestions();
      setSuggestions(response.data.data.suggestions);
    } catch (error) {
      console.error("Error fetching career suggestions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthGuard>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              <Lightbulb className="mr-3 h-8 w-8 text-primary" />
              Career Suggestions
            </h1>
            <p className="text-muted-foreground mt-2">
              AI-powered career advice based on your profile and skills
            </p>
          </div>
          <Button onClick={fetchCareerSuggestions} disabled={isLoading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-3">
                    <div className="h-6 bg-muted rounded w-1/2"></div>
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-20 bg-muted rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : suggestions ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="mr-2 h-5 w-5 text-primary" />
                  Recommended Job Titles
                </CardTitle>
                <CardDescription>
                  Based on your current skills and experience level
                </CardDescription>
              </CardHeader>
              <CardContent>
                {suggestions.jobTitles?.length > 0 ? (
                  <div className="space-y-3">
                    {suggestions.jobTitles.map((title, index) => (
                      <div
                        key={index}
                        className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                      >
                        <h4 className="font-medium">{title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Great match for your current skill set
                        </p>
                      </div>
                    ))}
                    <Link href="/jobs">
                      <Button className="w-full mt-4">
                        Search for These Roles
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    No specific job titles suggested. Add more details to your
                    profile for better recommendations.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BookOpen className="mr-2 h-5 w-5 text-primary" />
                  Skills to Learn
                </CardTitle>
                <CardDescription>
                  Expand your expertise with these recommended skills
                </CardDescription>
              </CardHeader>
              <CardContent>
                {suggestions.skillsToLearn?.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {suggestions.skillsToLearn.map((skill, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
                        >
                          {skill}
                        </Badge>
                      ))}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>
                        💡 <strong>Tip:</strong> Learning these skills could
                        open up new opportunities and increase your market
                        value.
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    No specific skills suggested to learn at this time.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="mr-2 h-5 w-5 text-primary" />
                  Career Path Advice
                </CardTitle>
                <CardDescription>
                  Personalized guidance for your professional development
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <p className="text-muted-foreground leading-relaxed">
                    {suggestions.careerPath}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <Link href="/ai/recommendations">
                    <Button variant="outline" className="w-full">
                      <Brain className="mr-2 h-4 w-4" />
                      View Job Recommendations
                    </Button>
                  </Link>
                  <Link href="/profile">
                    <Button variant="outline" className="w-full">
                      <Target className="mr-2 h-4 w-4" />
                      Update Profile
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Lightbulb className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">
                Unable to generate suggestions
              </h3>
              <p className="text-muted-foreground mb-4">
                Add more information to your profile (bio, skills) to get better
                career suggestions.
              </p>
              <Link href="/profile">
                <Button>Update Profile</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>More AI Tools</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link href="/ai/skills">
                <Button variant="outline" className="w-full justify-start">
                  <Brain className="mr-2 h-4 w-4" />
                  Extract Skills from Text
                </Button>
              </Link>
              <Link href="/ai/recommendations">
                <Button variant="outline" className="w-full justify-start">
                  <Target className="mr-2 h-4 w-4" />
                  Job Recommendations
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  );
}
