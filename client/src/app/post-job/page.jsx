"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AuthGuard from "@/components/auth-guard/authGuard";
import { jobsAPI, aiAPI } from "@/lib/api";
import {
  AlertTriangle,
  Loader2,
  Brain,
  CreditCard,
} from "lucide-react";

export default function PostJobPage() {
  const router = useRouter();
  const [step, setStep] = useState(1); 
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feeInfo, setFeeInfo] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    skills: [],
    jobType: "full-time",
    workMode: "remote",
    location: {
      city: "",
      state: "",
      country: "",
    },
    budget: {
      min: "",
      max: "",
      currency: "USD",
      period: "monthly",
    },
    experienceLevel: "mid",
    applicationUrl: "",
    applicationEmail: "",
    applicationDeadline: "",
    tags: [],
    paymentTxHash: "",
  });
  const [skillInput, setSkillInput] = useState("");
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    checkPaymentStatus();
  }, []);

  const checkPaymentStatus = async () => {
    try {
      setStep(2);
    } catch (error) {
      console.error("Error checking payment status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.paymentTxHash) {
      setFormData((prev) => ({
        ...prev,
        paymentTxHash: "demo_tx_" + Date.now(),
      }));
    }

    setIsSubmitting(true);

    try {
      const jobData = {
        ...formData,
        budget: formData.budget.min ? formData.budget : undefined,
        location: formData.location.city ? formData.location : undefined,
        paymentTxHash: formData.paymentTxHash || "demo_tx_" + Date.now(),
      };

      const response = await jobsAPI.createJob(jobData);
      router.push(`/jobs`);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to post job");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const addSkill = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        skills: [...prev.skills, skillInput.trim()],
      }));
      setSkillInput("");
    }
  };

  const removeSkill = (skillToRemove) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((skill) => skill !== skillToRemove),
    }));
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const optimizeDescription = async () => {
    try {
      const response = await aiAPI.optimizeDescription({
        description: formData.description,
        title: formData.title,
        jobType: formData.jobType,
      });

      setFormData((prev) => ({
        ...prev,
        description: response.data.data.optimizedDescription,
      }));
    } catch (error) {
      console.error("Error optimizing description:", error);
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
  const budgetPeriods = ["hourly", "daily", "monthly", "yearly", "project"];

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="max-w-4xl mx-auto">
        {step === 1 ? (
          <Card>
            <CardHeader className="text-center">
              <div className="h-16 w-16 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-8 w-8 text-orange-600" />
              </div>
              <CardTitle className="text-2xl">Payment Required</CardTitle>
              <CardDescription>
                To post a job on RizeHire, please complete a blockchain payment
                first.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <div className="bg-muted p-4 rounded-lg">
                <h3 className="font-semibold mb-2">
                  Platform Fee: 0.001 ETH (~$2.50)
                </h3>
                <p className="text-sm text-muted-foreground">
                  This fee helps maintain the platform and ensures quality job
                  postings.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button onClick={() => setStep(2)} variant="outline">
                  I've Already Paid
                </Button>
                <Button>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Proceed to Payment
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Post a New Job</h1>
                <p className="text-muted-foreground mt-2">
                  Share your opportunity with thousands of talented developers
                </p>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Job Title</Label>
                  <Input
                    id="title"
                    name="title"
                    placeholder="e.g. Senior React Developer"
                    value={formData.title}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="description">Job Description</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={optimizeDescription}
                      disabled={!formData.description}
                    >
                      <Brain className="mr-2 h-4 w-4" />
                      AI Optimize
                    </Button>
                  </div>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Describe the role, responsibilities, and requirements..."
                    value={formData.description}
                    onChange={handleChange}
                    rows={8}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="jobType">Job Type</Label>
                    <select
                      id="jobType"
                      name="jobType"
                      value={formData.jobType}
                      onChange={handleChange}
                      className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md"
                      required
                    >
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
                      name="workMode"
                      value={formData.workMode}
                      onChange={handleChange}
                      className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md"
                      required
                    >
                      {workModes.map((mode) => (
                        <option key={mode} value={mode}>
                          {mode.charAt(0).toUpperCase() + mode.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="experienceLevel">Experience Level</Label>
                    <select
                      id="experienceLevel"
                      name="experienceLevel"
                      value={formData.experienceLevel}
                      onChange={handleChange}
                      className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md"
                    >
                      {experienceLevels.map((level) => (
                        <option key={level} value={level}>
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Skills & Tags</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Required Skills</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      placeholder="Add a skill"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyPress={(e) =>
                        e.key === "Enter" && (e.preventDefault(), addSkill())
                      }
                    />
                    <Button type="button" onClick={addSkill}>
                      Add
                    </Button>
                  </div>
                  {formData.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {formData.skills.map((skill, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => removeSkill(skill)}
                        >
                          {skill} ×
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <Label>Tags (Optional)</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      placeholder="Add a tag"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) =>
                        e.key === "Enter" && (e.preventDefault(), addTag())
                      }
                    />
                    <Button type="button" onClick={addTag}>
                      Add
                    </Button>
                  </div>
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {formData.tags.map((tag, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="cursor-pointer"
                          onClick={() => removeTag(tag)}
                        >
                          {tag} ×
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Location & Compensation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="location.city">City</Label>
                    <Input
                      id="location.city"
                      name="location.city"
                      placeholder="San Francisco"
                      value={formData.location.city}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <Label htmlFor="location.state">State/Province</Label>
                    <Input
                      id="location.state"
                      name="location.state"
                      placeholder="California"
                      value={formData.location.state}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <Label htmlFor="location.country">Country</Label>
                    <Input
                      id="location.country"
                      name="location.country"
                      placeholder="United States"
                      value={formData.location.country}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="budget.min">Min Budget</Label>
                    <Input
                      id="budget.min"
                      name="budget.min"
                      type="number"
                      placeholder="5000"
                      value={formData.budget.min}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <Label htmlFor="budget.max">Max Budget</Label>
                    <Input
                      id="budget.max"
                      name="budget.max"
                      type="number"
                      placeholder="8000"
                      value={formData.budget.max}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <Label htmlFor="budget.currency">Currency</Label>
                    <select
                      id="budget.currency"
                      name="budget.currency"
                      value={formData.budget.currency}
                      onChange={handleChange}
                      className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="ETH">ETH</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="budget.period">Period</Label>
                    <select
                      id="budget.period"
                      name="budget.period"
                      value={formData.budget.period}
                      onChange={handleChange}
                      className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md"
                    >
                      {budgetPeriods.map((period) => (
                        <option key={period} value={period}>
                          {period.charAt(0).toUpperCase() + period.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Application Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="applicationEmail">
                    Application Email (Optional)
                  </Label>
                  <Input
                    id="applicationEmail"
                    name="applicationEmail"
                    type="email"
                    placeholder="careers@company.com"
                    value={formData.applicationEmail}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <Label htmlFor="applicationUrl">
                    Application URL (Optional)
                  </Label>
                  <Input
                    id="applicationUrl"
                    name="applicationUrl"
                    type="url"
                    placeholder="https://company.com/careers/apply"
                    value={formData.applicationUrl}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <Label htmlFor="applicationDeadline">
                    Application Deadline (Optional)
                  </Label>
                  <Input
                    id="applicationDeadline"
                    name="applicationDeadline"
                    type="date"
                    value={formData.applicationDeadline}
                    onChange={handleChange}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Posting Job...
                  </>
                ) : (
                  "Post Job"
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </AuthGuard>
  );
}
