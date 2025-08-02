"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { aiAPI, jobsAPI } from "@/lib/api";
import {
  Brain,
  ArrowLeft,
  RefreshCw,
  MessageCircle,
  Lightbulb,
  HelpCircle,
  Loader2,
} from "lucide-react";
import AuthGuard from "@/components/auth-guard/authGuard";

export default function InterviewQuestionsPage({ params }) {
  const { jobId } = params;
  const router = useRouter();
  const [job, setJob] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    fetchJobAndQuestions();
  }, [jobId]);

  const fetchJobAndQuestions = async () => {
    try {
      const [jobResponse, questionsResponse] = await Promise.allSettled([
        jobsAPI.getJob(jobId),
        aiAPI.getInterviewQuestions(jobId),
      ]);

      if (jobResponse.status === "fulfilled") {
        setJob(jobResponse.value.data.data.job);
      }

      if (questionsResponse.status === "fulfilled") {
        setQuestions(questionsResponse.value.data.data.questions || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateNewQuestions = async () => {
    setIsGenerating(true);
    try {
      const response = await aiAPI.getInterviewQuestions(jobId);
      setQuestions(response.data.data.questions || []);
    } catch (error) {
      alert("Failed to generate new questions");
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AuthGuard>
    );
  }

  if (!job) {
    return (
      <AuthGuard>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Job not found</h2>
          <Link href="/jobs">
            <Button>Back to Jobs</Button>
          </Link>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button onClick={generateNewQuestions} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Generate New Questions
              </>
            )}
          </Button>
        </div>

        {/* Job Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Brain className="mr-2 h-6 w-6 text-primary" />
              Interview Preparation for: {job.title}
            </CardTitle>
            <CardDescription>
              AI-generated interview questions based on the job requirements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge>{job.jobType}</Badge>
              <Badge variant="outline">{job.workMode}</Badge>
              {job.experienceLevel && (
                <Badge variant="outline">{job.experienceLevel}</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Company: {job.postedBy.name}
            </p>
          </CardContent>
        </Card>

        {/* Interview Questions */}
        {questions.length > 0 ? (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageCircle className="mr-2 h-5 w-5" />
                  Interview Questions ({questions.length})
                </CardTitle>
                <CardDescription>
                  Practice these questions to prepare for your interview
                </CardDescription>
              </CardHeader>
            </Card>

            {questions.map((question, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium mb-2">
                        Question {index + 1}:
                      </h3>
                      <p className="text-muted-foreground">{question}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Tips Card */}
            <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <CardHeader>
                <CardTitle className="flex items-center text-blue-800 dark:text-blue-200">
                  <Lightbulb className="mr-2 h-5 w-5" />
                  Interview Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="text-blue-700 dark:text-blue-300">
                <ul className="space-y-2 text-sm">
                  <li>
                    • Take time to understand each question before answering
                  </li>
                  <li>
                    • Use the STAR method (Situation, Task, Action, Result) for
                    behavioral questions
                  </li>
                  <li>• Prepare specific examples from your experience</li>
                  <li>• Ask clarifying questions if needed</li>
                  <li>• Practice your answers out loud</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <HelpCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">
                No questions generated yet
              </h3>
              <p className="text-muted-foreground mb-4">
                Click the generate button to create AI-powered interview
                questions for this position.
              </p>
              <Button onClick={generateNewQuestions} disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Questions...
                  </>
                ) : (
                  <>
                    <Brain className="mr-2 h-4 w-4" />
                    Generate Interview Questions
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Link href={`/jobs/${jobId}`}>
            <Button variant="outline">View Job Details</Button>
          </Link>
          <Link href="/ai/recommendations">
            <Button variant="outline">More AI Tools</Button>
          </Link>
        </div>
      </div>
    </AuthGuard>
  );
}
