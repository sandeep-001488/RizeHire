"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AuthGuard from "@/components/auth-guard/authGuard";
import { jobsAPI, aiAPI } from "@/lib/api";
import { ArrowLeft, Loader2, Brain, Save } from "lucide-react";
import RoleGuard from "@/components/auth-guard/RoleGuard";

export default function EditJobPage({ params }) {
  const { jobId } = use(params);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    isActive: true,
    hardConstraints: {
      gender: null,
      minYears: null,
      maxYears: null,
    },
  });
  const [skillInput, setSkillInput] = useState("");
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    fetchJobDetails();
  }, [jobId]);

  const fetchJobDetails = async () => {
    try {
      const response = await jobsAPI.getJob(jobId);
      const job = response.data.data.job;

      setFormData({
        title: job.title || "",
        description: job.description || "",
        skills: Array.isArray(job.skills)
          ? job.skills.filter((skill) => typeof skill === "string")
          : [],
        jobType: job.jobType || "full-time",
        workMode: job.workMode || "remote",
        location: job.location || { city: "", state: "", country: "" },
        budget: job.budget || {
          min: "",
          max: "",
          currency: "USD",
          period: "monthly",
        },
        experienceLevel: job.experienceLevel || "mid",
        applicationUrl: job.applicationUrl || "",
        applicationEmail: job.applicationEmail || "",
        applicationDeadline: job.applicationDeadline
          ? new Date(job.applicationDeadline).toISOString().split("T")[0]
          : "",
        tags: Array.isArray(job.tags)
          ? job.tags.filter((tag) => typeof tag === "string")
          : [],
        isActive: job.isActive !== undefined ? job.isActive : true,
        hardConstraints: job.hardConstraints || {
          gender: null,
          minYears: null,
          maxYears: null,
        },
      });
    } catch (error) {
      console.error("Error fetching job:", error);
      router.push("/jobs");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const jobData = {
        ...formData,
        skills: Array.isArray(formData.skills)
          ? formData.skills.filter(
              (skill) => typeof skill === "string" && skill.trim() !== ""
            )
          : [],
        tags: Array.isArray(formData.tags)
          ? formData.tags.filter(
              (tag) => typeof tag === "string" && tag.trim() !== ""
            )
          : [],
        budget: formData.budget.min
          ? {
              ...formData.budget,
              min: formData.budget.min
                ? Number(formData.budget.min)
                : undefined,
              max: formData.budget.max
                ? Number(formData.budget.max)
                : undefined,
            }
          : undefined,
        location: formData.location.city ? formData.location : undefined,
        hardConstraints: {
          gender: formData.hardConstraints?.gender || null,
          minYears: formData.hardConstraints?.minYears
            ? Number(formData.hardConstraints.minYears)
            : null,
          maxYears: formData.hardConstraints?.maxYears
            ? Number(formData.hardConstraints.maxYears)
            : null,
        },
      };

      await jobsAPI.updateJob(jobId, jobData);
      router.push(`/jobs/${jobId}`);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update job");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

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
        [name]: type === "checkbox" ? checked : value,
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
    <RoleGuard allowedRoles={["poster"]}>
      <div className="max-w-4xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Edit Job Posting</h1>
              <p className="text-muted-foreground mt-2">
                Update your job details and requirements
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Job Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="isActive">
                  Job is active and accepting applications
                </Label>
              </div>
            </CardContent>
          </Card>

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
              <CardTitle>Required Skills</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex gap-2">
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Hard Constraints (Optional)</CardTitle>
              <CardDescription>
                Set strict requirements that candidates must meet. Leave blank
                for no restrictions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="hardConstraints.gender">Required Gender</Label>
                <select
                  id="hardConstraints.gender"
                  name="hardConstraints.gender"
                  value={formData.hardConstraints?.gender || ""}
                  onChange={handleChange}
                  className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md"
                >
                  <option value="">No Restriction</option>
                  <option value="male">Male Only</option>
                  <option value="female">Female Only</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  ⚠️ Gender-based restrictions may be illegal in many
                  jurisdictions
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="hardConstraints.minYears">
                    Min Years Experience
                  </Label>
                  <Input
                    id="hardConstraints.minYears"
                    name="hardConstraints.minYears"
                    type="number"
                    min="0"
                    placeholder="e.g., 2"
                    value={formData.hardConstraints?.minYears || ""}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <Label htmlFor="hardConstraints.maxYears">
                    Max Years Experience
                  </Label>
                  <Input
                    id="hardConstraints.maxYears"
                    name="hardConstraints.maxYears"
                    type="number"
                    min="0"
                    placeholder="e.g., 10"
                    value={formData.hardConstraints?.maxYears || ""}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex gap-2">
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
                        variant="secondary"
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
                  Updating...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Update Job
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </RoleGuard>
  );
}
