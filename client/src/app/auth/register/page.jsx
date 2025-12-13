"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; 
import useAuthStore from "@/stores/authStore";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "", 
    gender: "",
    walletAddress: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { register, isLoading, error, clearError } = useAuthStore();

const handleSubmit = async (e) => {
  e.preventDefault();
  clearError();

  if (!formData.role) {
    toast.error("Please select a role.");
    return;
  }

  // Clean data: remove optional fields if they are empty
  const cleanedData = { ...formData };
  
  // Remove gender field entirely if user is a poster
  if (formData.role === "poster") {
    delete cleanedData.gender;
  }
  
  if (!cleanedData.walletAddress) {
    delete cleanedData.walletAddress;
  }

  const result = await register(cleanedData);

  if (result.success) {
    toast.success("Account created! Redirecting...");
    router.push("/dashboard");
  } else {
    toast.error(result.error);
  }
};

  const handleChange = (e) => {
    if (error) clearError();
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleRoleChange = (value) => {
    if (error) clearError();
    setFormData((prev) => ({
      ...prev,
      role: value,
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-bg py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          <CardDescription>
            Join RizeHire and start your journey
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="•••••••• (min. 6 characters)"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">I am a...</Label>
              <Select
                value={formData.role}
                onValueChange={handleRoleChange}
                disabled={isLoading}
                required
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="seeker">
                    Job Seeker (I want to find a job)
                  </SelectItem>
                  <SelectItem value="poster">
                    Job Poster (I want to hire)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Gender field - Only for seekers */}
            {formData.role === "seeker" ? (
              <div className="space-y-2">
                <Label htmlFor="gender">Gender *</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => {
                    if (error) clearError();
                    setFormData((prev) => ({ ...prev, gender: value }));
                  }}
                  disabled={isLoading}
                  required
                >
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="Select your gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="walletAddress">Wallet Address (Optional)</Label>
              <Input
                id="walletAddress"
                name="walletAddress"
                placeholder="0x... (Required for posters to post jobs)"
                value={formData.walletAddress}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">
              Already have an account?{" "}
            </span>
            <Link
              href="/auth/login"
              className="text-primary hover:underline font-medium"
            >
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}