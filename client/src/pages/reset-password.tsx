import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Music, Eye, EyeOff, Lock, CheckCircle, AlertCircle } from "lucide-react";
import backgroundVideo from "/nusongBG.mp4";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation, Link } from "wouter";
import { z } from "zod";

const resetPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [token, setToken] = useState<string>("");
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  // Extract token from URL
  useEffect(() => {
    const path = window.location.pathname;
    const tokenMatch = path.match(/\/reset-password\/(.+)$/);
    if (tokenMatch) {
      setToken(tokenMatch[1]);
    } else {
      toast({
        title: "Invalid Reset Link",
        description: "This password reset link is invalid or malformed.",
        variant: "destructive",
      });
      setLocation("/auth");
    }
  }, [setLocation, toast]);

  const resetForm = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const resetMutation = useMutation({
    mutationFn: async (data: ResetPasswordForm) => {
      const response = await apiRequest("/api/auth/reset-password", "POST", {
        token,
        newPassword: data.password,
      });
      return response.json();
    },
    onSuccess: (result) => {
      setIsSuccess(true);
      toast({
        title: "Password Reset Successful",
        description: result.message || "Your password has been reset successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Reset Failed",
        description: error.message || "Failed to reset password. The link may be expired.",
        variant: "destructive",
      });
    },
  });

  const onResetPassword = (data: ResetPasswordForm) => {
    resetMutation.mutate(data);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* Background Video */}
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0"
        >
          <source src={backgroundVideo} type="video/mp4" />
        </video>

        {/* Content overlay */}
        <div className="relative z-10 bg-black/40 min-h-screen flex items-center justify-center">
          <Card className="w-full max-w-md bg-gray-800/50 border-gray-700 backdrop-blur-sm">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-white">Password Reset Complete</CardTitle>
              <CardDescription className="text-gray-400">
                Your password has been successfully changed. You can now sign in with your new password.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Link href="/auth">
                <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white">
                  Go to Sign In
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0"
      >
        <source src={backgroundVideo} type="video/mp4" />
      </video>

      {/* Content overlay */}
      <div className="relative z-10 bg-black/40 min-h-screen flex items-center justify-center">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center">
            <Card className="w-full max-w-md bg-gray-800/50 border-gray-700 backdrop-blur-sm">
              <CardHeader className="text-center">
                <div className="flex items-center justify-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                    <Music className="text-white text-xl" />
                  </div>
                  <h1 className="text-2xl font-bold text-white">NuSong</h1>
                </div>
                <CardTitle className="text-2xl font-bold text-white">Reset Your Password</CardTitle>
                <CardDescription className="text-gray-400">
                  Enter your new password below
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={resetForm.handleSubmit(onResetPassword)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password" className="text-gray-300">New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="new-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter new password"
                        className="pl-10 pr-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                        data-testid="input-new-password"
                        {...resetForm.register("password")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {resetForm.formState.errors.password && (
                      <p className="text-red-400 text-sm">{resetForm.formState.errors.password.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password" className="text-gray-300">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm new password"
                        className="pl-10 pr-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                        data-testid="input-confirm-password"
                        {...resetForm.register("confirmPassword")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {resetForm.formState.errors.confirmPassword && (
                      <p className="text-red-400 text-sm">{resetForm.formState.errors.confirmPassword.message}</p>
                    )}
                  </div>
                  
                  <div className="pt-2">
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                      disabled={resetMutation.isPending}
                      data-testid="button-reset-password"
                    >
                      {resetMutation.isPending ? "Resetting..." : "Reset Password"}
                    </Button>
                  </div>

                  <div className="text-center pt-4">
                    <Link href="/auth">
                      <button className="text-sm text-purple-400 hover:text-purple-300 underline">
                        Back to Sign In
                      </button>
                    </Link>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}