"use client";
import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, UploadCloud, CheckCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function ParseResume() {
  const { user, parseResume, isLoading, error, clearError } = useAuthStore();
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileName(selectedFile.name);
      clearError();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please select a file to upload.");
      return;
    }

    const result = await parseResume(file);

    if (result.success) {
      toast.success("Resume parsed successfully!");
      setFile(null);
      setFileName("");
    } else {
      toast.error(result.error || "Failed to parse resume.");
    }
  };

  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardHeader>
        <CardTitle>AI Resume Parser</CardTitle>
        <CardDescription>
          Upload your resume (PDF, DOCX) to auto-fill your skills and profile.
          <br />
          <strong>This is required to apply for jobs.</strong>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="resume-upload"
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-background hover:bg-muted"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <UploadCloud className="w-8 h-8 mb-3 text-muted-foreground" />
                <p className="mb-2 text-sm text-muted-foreground">
                  <span className="font-semibold">Click to upload</span> or drag
                  and drop
                </p>
                <p className="text-xs text-muted-foreground">
                  PDF, DOC, DOCX (MAX. 10MB)
                </p>
              </div>
              <Input
                id="resume-upload"
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx"
              />
            </label>
            {fileName && (
              <p className="text-sm text-center text-muted-foreground">
                Selected: <strong>{fileName}</strong>
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || !file}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Parsing...
              </>
            ) : (
              "Parse Resume"
            )}
          </Button>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}
        </form>

        {user?.parsedResume && (
          <div className="mt-6 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <h4 className="font-semibold text-green-800 dark:text-green-200">
                Resume parsed successfully!
              </h4>
            </div>
            <p className="text-sm text-green-700 dark:text-green-300 mt-2">
              Your profile is now active. You can apply for jobs.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
