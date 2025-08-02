"use client";

import { useState, useEffect } from "react";
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
import useAuthStore from "@/stores/authStore";
import { authAPI, aiAPI } from "@/lib/api";
import {
  Edit,
  Save,
  X,
  Plus,
  Brain,
  Loader2,
} from "lucide-react";

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isExtractingSkills, setIsExtractingSkills] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    bio: "",
    linkedinUrl: "",
    walletAddress: "",
    skills: [],
  });
  const [skillInput, setSkillInput] = useState("");

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        bio: user.bio || "",
        linkedinUrl: user.linkedinUrl || "",
        walletAddress: user.walletAddress || "",
        skills: user.skills || [],
      });
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const { email, ...payload } = formData;

    const cleanedData = Object.fromEntries(
      Object.entries(payload).filter(([_, value]) => value !== "")
    );

    try {
      const response = await authAPI.updateProfile(cleanedData);

      updateUser(response.data.data.user);

      setIsEditing(false);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
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

  const extractSkillsFromBio = async () => {
    if (!formData.bio.trim()) {
      alert("Please add a bio first to extract skills");
      return;
    }

    setIsExtractingSkills(true);

    try {
      const response = await aiAPI.extractSkills({ text: formData.bio });
      const extractedSkills = response.data.data.skills;

      const allSkills = [...new Set([...formData.skills, ...extractedSkills])];

      setFormData((prev) => ({
        ...prev,
        skills: allSkills,
      }));
    } catch (error) {
      alert("Failed to extract skills");
    } finally {
      setIsExtractingSkills(false);
    }
  };

  return (
    <AuthGuard>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Profile</h1>
            <p className="text-muted-foreground mt-2">
              Manage your personal information and skills
            </p>
          </div>
          {!isEditing && (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          )}
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    disabled={!isEditing}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    disabled={true} 
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  name="bio"
                  placeholder="Tell us about yourself, your experience, and what you're looking for..."
                  value={formData.bio}
                  onChange={handleChange}
                  disabled={!isEditing}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
                  <Input
                    id="linkedinUrl"
                    name="linkedinUrl"
                    type="url"
                    placeholder="https://linkedin.com/in/yourprofile"
                    value={formData.linkedinUrl}
                    onChange={handleChange}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="walletAddress">Wallet Address</Label>
                  <Input
                    id="walletAddress"
                    name="walletAddress"
                    placeholder="0x..."
                    value={formData.walletAddress}
                    onChange={handleChange}
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Skills</CardTitle>
                {isEditing && formData.bio && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={extractSkillsFromBio}
                    disabled={isExtractingSkills}
                  >
                    {isExtractingSkills ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Extracting...
                      </>
                    ) : (
                      <>
                        <Brain className="mr-2 h-4 w-4" />
                        AI Extract from Bio
                      </>
                    )}
                  </Button>
                )}
              </div>
              <CardDescription>
                Add your technical skills and expertise
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing && (
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
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {formData.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {formData.skills.map((skill, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className={isEditing ? "cursor-pointer" : ""}
                      onClick={() => isEditing && removeSkill(skill)}
                    >
                      {skill}
                      {isEditing && <X className="ml-1 h-3 w-3" />}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No skills added yet. Add some skills to improve your job
                  recommendations.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Profile Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">
                    {user?.createdAt
                      ? Math.floor(
                          (Date.now() - new Date(user.createdAt)) /
                            (1000 * 60 * 60 * 24)
                        )
                      : 0}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Days Active
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">
                    {formData.skills.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Skills</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">
                    {user?.applications?.length || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Applications
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">
                    {user?.jobsPosted?.length || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Jobs Posted
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {isEditing && (
            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setFormData({
                    name: user?.name || "",
                    email: user?.email || "",
                    bio: user?.bio || "",
                    linkedinUrl: user?.linkedinUrl || "",
                    walletAddress: user?.walletAddress || "",
                    skills: user?.skills || [],
                  });
                }}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          )}
        </form>
      </div>
    </AuthGuard>
  );
}
