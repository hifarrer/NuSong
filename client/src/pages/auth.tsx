import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Music, Eye, EyeOff, Mail, Lock, User } from "lucide-react";
import backgroundVideo from "/background-video.mp4";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { z } from "zod";
import { useEffect } from "react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;
type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function Auth() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const forgotPasswordForm = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      const response = await apiRequest("/api/auth/login", "POST", data);
      return response.json();
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/auth/user"], user);
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
      setLocation("/");
    },
    onError: (error: any) => {
      // Handle email verification required case
      if (error.message && error.message.includes("verify your email")) {
        toast({
          title: "Email Verification Required",
          description: "Please check your email and click the verification link before logging in.",
          variant: "destructive",
        });
        // Redirect to check-email page so user can resend if needed
        setLocation("/check-email");
      } else {
        toast({
          title: "Login failed",
          description: error.message || "Invalid email or password",
          variant: "destructive",
        });
      }
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterForm) => {
      const response = await apiRequest("/api/auth/register", "POST", data);
      return response.json();
    },
    onSuccess: (result) => {
      // Registration successful - redirect to check email page
      // Save user info temporarily for the check-email page
      localStorage.setItem("pendingVerificationEmail", result.email || "");
      localStorage.setItem("pendingVerificationFirstName", result.firstName || "");
      
      toast({
        title: "Registration Successful!",
        description: "Please check your email to verify your account.",
      });
      
      setLocation("/check-email");
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: ForgotPasswordForm) => {
      const response = await apiRequest("/api/auth/request-password-reset", "POST", data);
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Reset Email Sent",
        description: result.message || "If an account with that email exists, we've sent password reset instructions.",
      });
      setShowForgotPassword(false);
      forgotPasswordForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Reset Failed",
        description: error.message || "Failed to send reset email",
        variant: "destructive",
      });
    },
  });

  const onLogin = (data: LoginForm) => {
    loginMutation.mutate(data);
  };

  const onRegister = (data: RegisterForm) => {
    registerMutation.mutate(data);
  };

  const onForgotPassword = (data: ForgotPasswordForm) => {
    forgotPasswordMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
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
        onLoadStart={() => console.log("Video loading started")}
        onCanPlay={() => console.log("Video can play")}
        onPlay={() => console.log("Video started playing")}
      >
        <source src={backgroundVideo} type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Content overlay */}
      <div className="relative z-10 bg-black/40 min-h-screen">
        <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-screen">
          {/* Hero Section */}
          <div className="text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start space-x-3 mb-8">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                <Music className="text-white text-xl" />
              </div>
              <h1 className="text-3xl font-bold text-white">NuMusic</h1>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Create Amazing Music with <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Artificial Intelligence</span>
            </h2>
            
            <p className="text-xl text-gray-300 mb-8">
              Join thousands of creators who are already using AI to compose, generate, and transform music. 
              Turn your ideas into professional tracks in seconds.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
                <h4 className="font-semibold text-white mb-2">Text to Music</h4>
                <p className="text-gray-400 text-sm">Generate complete songs from simple text descriptions</p>
              </div>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
                <h4 className="font-semibold text-white mb-2">Audio Enhancement</h4>
                <p className="text-gray-400 text-sm">Transform and remix existing audio with AI</p>
              </div>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
                <h4 className="font-semibold text-white mb-2">Professional Quality</h4>
                <p className="text-gray-400 text-sm">Export high-quality tracks ready for streaming</p>
              </div>
            </div>
          </div>

          {/* Auth Form */}
          <div className="flex justify-center lg:justify-end">
            <Card className="w-full max-w-md bg-gray-800/50 border-gray-700 backdrop-blur-sm">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold text-white">Get Started</CardTitle>
                <CardDescription className="text-gray-400">
                  Create your account or sign in to continue
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="login" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-gray-700">
                    <TabsTrigger value="login" className="data-[state=active]:bg-purple-600">Sign In</TabsTrigger>
                    <TabsTrigger value="register" className="data-[state=active]:bg-purple-600">Sign Up</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="login" className="space-y-4 mt-6">
                    <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-email" className="text-gray-300">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            id="login-email"
                            type="email"
                            placeholder="Enter your email"
                            className="pl-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                            data-testid="input-login-email"
                            {...loginForm.register("email")}
                          />
                        </div>
                        {loginForm.formState.errors.email && (
                          <p className="text-red-400 text-sm">{loginForm.formState.errors.email.message}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="login-password" className="text-gray-300">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            id="login-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            className="pl-10 pr-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                            data-testid="input-login-password"
                            {...loginForm.register("password")}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {loginForm.formState.errors.password && (
                          <p className="text-red-400 text-sm">{loginForm.formState.errors.password.message}</p>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between mt-4">
                        <button
                          type="button"
                          onClick={() => setShowForgotPassword(true)}
                          className="text-sm text-purple-400 hover:text-purple-300 underline"
                          data-testid="link-forgot-password"
                        >
                          Forgot Password?
                        </button>
                      </div>

                      <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                        disabled={loginMutation.isPending}
                        data-testid="button-login"
                      >
                        {loginMutation.isPending ? "Signing In..." : "Sign In"}
                      </Button>
                    </form>
                  </TabsContent>
                  
                  <TabsContent value="register" className="space-y-4 mt-6">
                    <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="register-firstname" className="text-gray-300">First Name</Label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              id="register-firstname"
                              type="text"
                              placeholder="First name"
                              className="pl-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                              data-testid="input-register-firstname"
                              {...registerForm.register("firstName")}
                            />
                          </div>
                          {registerForm.formState.errors.firstName && (
                            <p className="text-red-400 text-sm">{registerForm.formState.errors.firstName.message}</p>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="register-lastname" className="text-gray-300">Last Name</Label>
                          <Input
                            id="register-lastname"
                            type="text"
                            placeholder="Last name"
                            className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                            data-testid="input-register-lastname"
                            {...registerForm.register("lastName")}
                          />
                          {registerForm.formState.errors.lastName && (
                            <p className="text-red-400 text-sm">{registerForm.formState.errors.lastName.message}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="register-email" className="text-gray-300">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            id="register-email"
                            type="email"
                            placeholder="Enter your email"
                            className="pl-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                            data-testid="input-register-email"
                            {...registerForm.register("email")}
                          />
                        </div>
                        {registerForm.formState.errors.email && (
                          <p className="text-red-400 text-sm">{registerForm.formState.errors.email.message}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="register-password" className="text-gray-300">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            id="register-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Create a password"
                            className="pl-10 pr-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                            data-testid="input-register-password"
                            {...registerForm.register("password")}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {registerForm.formState.errors.password && (
                          <p className="text-red-400 text-sm">{registerForm.formState.errors.password.message}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="register-confirm-password" className="text-gray-300">Confirm Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            id="register-confirm-password"
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm your password"
                            className="pl-10 pr-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                            data-testid="input-register-confirm-password"
                            {...registerForm.register("confirmPassword")}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {registerForm.formState.errors.confirmPassword && (
                          <p className="text-red-400 text-sm">{registerForm.formState.errors.confirmPassword.message}</p>
                        )}
                      </div>
                      
                      <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                        disabled={registerMutation.isPending}
                        data-testid="button-register"
                      >
                        {registerMutation.isPending ? "Creating Account..." : "Create Account"}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      </div>

      {/* Forgot Password Modal */}
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent className="sm:max-w-md bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Reset Your Password</DialogTitle>
            <DialogDescription className="text-gray-400">
              Enter your email address and we'll send you a link to reset your password.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={forgotPasswordForm.handleSubmit(onForgotPassword)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email" className="text-gray-300">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="Enter your email"
                  className="pl-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  data-testid="input-forgot-email"
                  {...forgotPasswordForm.register("email")}
                />
              </div>
              {forgotPasswordForm.formState.errors.email && (
                <p className="text-red-400 text-sm">{forgotPasswordForm.formState.errors.email.message}</p>
              )}
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForgotPassword(false)}
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
                data-testid="button-cancel-forgot"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={forgotPasswordMutation.isPending}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                data-testid="button-submit-forgot"
              >
                {forgotPasswordMutation.isPending ? "Sending..." : "Send Reset Link"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}