import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Loader2, ArrowRight, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

type VerificationState = "loading" | "success" | "error" | "expired";

interface VerificationResult {
  message: string;
  user?: {
    firstName: string;
    email: string;
  };
  expired?: boolean;
}

export default function VerifyEmailPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [verificationState, setVerificationState] = useState<VerificationState>("loading");
  const [result, setResult] = useState<VerificationResult | null>(null);

  // Get token from URL parameters
  const getTokenFromPath = () => {
    const pathParts = window.location.pathname.split('/');
    const verifyIndex = pathParts.indexOf('verify-email');
    return verifyIndex !== -1 && pathParts[verifyIndex + 1] ? pathParts[verifyIndex + 1] : null;
  };

  useEffect(() => {
    const verifyEmail = async () => {
      const token = getTokenFromPath();
      
      if (!token) {
        setVerificationState("error");
        setResult({ message: "Invalid verification link. Please check your email for the correct link." });
        return;
      }

      try {
        const response = await fetch(`/api/auth/verify-email/${token}`);
        const data = await response.json();

        if (response.ok) {
          setVerificationState("success");
          setResult(data);
          toast({
            title: "Email Verified!",
            description: "Your account is now active. You can log in.",
          });
        } else {
          if (data.expired) {
            setVerificationState("expired");
          } else {
            setVerificationState("error");
          }
          setResult(data);
        }
      } catch (error) {
        console.error("Verification error:", error);
        setVerificationState("error");
        setResult({ message: "An error occurred during verification. Please try again." });
      }
    };

    verifyEmail();
  }, [toast]);

  const handleResendVerification = () => {
    // Redirect to a page where user can request new verification
    setLocation("/check-email");
  };

  const handleGoToLogin = () => {
    setLocation("/auth");
  };

  const renderContent = () => {
    switch (verificationState) {
      case "loading":
        return (
          <>
            <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
            <CardTitle className="text-2xl font-bold text-white text-center">
              Verifying Your Email
            </CardTitle>
            <div className="text-center">
              <p className="text-gray-300">
                Please wait while we verify your email address...
              </p>
            </div>
          </>
        );

      case "success":
        return (
          <>
            <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-white text-center">
              Email Verified Successfully!
            </CardTitle>
            <div className="space-y-4 text-center">
              <p className="text-gray-300">
                Welcome to NuMusic, {result?.user?.firstName || "there"}! 🎉
              </p>
              <p className="text-green-400">
                {result?.message || "Your account is now active and ready to use."}
              </p>
              <Button
                onClick={handleGoToLogin}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                data-testid="button-go-to-login"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                Continue to Login
              </Button>
            </div>
          </>
        );

      case "expired":
        return (
          <>
            <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center">
              <XCircle className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-white text-center">
              Verification Link Expired
            </CardTitle>
            <div className="space-y-4 text-center">
              <p className="text-gray-300">
                {result?.message || "This verification link has expired or is no longer valid."}
              </p>
              <p className="text-orange-400">
                Don't worry! You can request a new verification email.
              </p>
              <Button
                onClick={handleResendVerification}
                className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                data-testid="button-request-new-verification"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Request New Verification Email
              </Button>
            </div>
          </>
        );

      case "error":
      default:
        return (
          <>
            <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center">
              <XCircle className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-white text-center">
              Verification Failed
            </CardTitle>
            <div className="space-y-4 text-center">
              <p className="text-gray-300">
                {result?.message || "Something went wrong during email verification."}
              </p>
              <div className="space-y-2">
                <Button
                  onClick={handleResendVerification}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  data-testid="button-try-again"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Request New Verification Email
                </Button>
                <Link href="/">
                  <Button variant="ghost" className="w-full text-purple-400 hover:text-purple-300 hover:bg-purple-500/10" data-testid="link-go-home">
                    Back to Home
                  </Button>
                </Link>
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-purple-950/20 to-black p-4">
      <Card className="w-full max-w-md bg-black/50 border-purple-500/20 backdrop-blur-sm">
        <CardHeader className="text-center">
          {renderContent()}
        </CardHeader>
      </Card>
    </div>
  );
}