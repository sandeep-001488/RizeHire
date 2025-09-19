"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { aiAPI, authAPI } from "@/lib/api";
import useAuthStore from "@/stores/authStore";
import { Brain, Plus, Loader2, Save } from "lucide-react";
import AuthGuard from "@/components/auth-guard/authGuard";

export default function AISkillsPage() {
  const { user, updateUser } = useAuthStore();
  const [inputText, setInputText] = useState("");
  const [extractedSkills, setExtractedSkills] = useState([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const extractSkills = async () => {
    if (!inputText.trim()) {
      alert("Please enter some text first");
      return;
    }

    setIsExtracting(true);

    try {
      const response = await aiAPI.extractSkills({ text: inputText });
      setExtractedSkills(response.data.data.skills || []);
    } catch (error) {
      alert("Failed to extract skills");
    } finally {
      setIsExtracting(false);
    }
  };

  const addSkillsToProfile = async () => {
    if (extractedSkills.length === 0) {
      alert("No skills to add");
      return;
    }

    setIsSaving(true);

    try {
      const currentSkills = user?.skills || [];
      const allSkills = [...new Set([...currentSkills, ...extractedSkills])];

      const response = await authAPI.updateProfile({ skills: allSkills });
      updateUser(response.data.data.user);

      alert("Skills added to your profile!");
      setExtractedSkills([]);
      setInputText("");
    } catch (error) {
      alert("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const removeSkill = (skillToRemove) => {
    setExtractedSkills((prev) =>
      prev.filter((skill) => skill !== skillToRemove)
    );
  };

  return (
    <AuthGuard>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <Brain className="mr-3 h-8 w-8 text-primary" />
            AI Skills Extraction
          </h1>
          <p className="text-muted-foreground mt-2">
            Use AI to automatically extract technical skills from your resume,
            bio, or any text
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Extract Skills from Text</CardTitle>
            <CardDescription>
              Paste your resume, LinkedIn profile, or any text about your
              experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="inputText">Text to Analyze</Label>
              <Textarea
                id="inputText"
                placeholder="Paste your resume, bio, or experience description here..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                rows={8}
                className="mt-1"
              />
            </div>

            <Button
              onClick={extractSkills}
              disabled={isExtracting || !inputText.trim()}
              className="w-full"
            >
              {isExtracting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing text...
                </>
              ) : (
                <>
                  <Brain className="mr-2 h-4 w-4" />
                  Extract Skills
                </>
              )}
            </Button>
          </CardContent>
        </Card>
        {extractedSkills.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Extracted Skills</CardTitle>
              <CardDescription>
                AI found {extractedSkills.length} skills in your text. Review
                and add them to your profile.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {extractedSkills.map((skill, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    onClick={() => removeSkill(skill)}
                  >
                    {skill}
                    <span className="ml-1 text-xs">×</span>
                  </Badge>
                ))}
              </div>

              <div className="flex gap-2">
                <Button onClick={addSkillsToProfile} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding to profile...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Add to Profile
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setExtractedSkills([])}
                >
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Current Profile Skills */}
        {user?.skills?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Your Current Skills</CardTitle>
              <CardDescription>
                Skills currently in your profile
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {user.skills.map((skill, index) => (
                  <Badge key={index} variant="outline">
                    {skill}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AuthGuard>
  );
}
