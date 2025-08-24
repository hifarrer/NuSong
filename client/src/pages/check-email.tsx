import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Mail, RefreshCw, Check, ArrowLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface CheckEmailPageState {
  email?: string;
  firstName?: string;
}

export default function CheckEmailPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [userInfo, setUserInfo] = useState<CheckEmailPageState>({});
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    // Get email info from navigation state or localStorage
    const navigationState = (window.history.state as CheckEmailPageState) || {};
    const savedEmail = localStorage.getItem("pendingVerificationEmail");
    const savedFirstName = localStorage.getItem("pendingVerificationFirstName");
    
    setUserInfo({
      email: navigationState.email || savedEmail || "",
      firstName: navigationState.firstName || savedFirstName || ""
    });

    // Set resend email input
    setResendEmail(navigationState.email || savedEmail || "");

    // Clear temporary storage after loading
    if (savedEmail) {
      localStorage.removeItem("pendingVerificationEmail");
      localStorage.removeItem("pendingVerificationFirstName");
    }
  }, []);

  const handleResendEmail = async () => {
    if (!resendEmail.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter your email address to resend verification.",
        variant: "destructive",
      });
      return;
    }

    setResendingEmail(true);
    try {
      await apiRequest("POST", "/api/auth/resend-verification", { 
        email: resendEmail.trim() 
      });
      
      setEmailSent(true);
      toast({
        title: "Email Sent",
        description: "A new verification email has been sent. Check your inbox.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to Send Email",
        description: error.message || "Could not send verification email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setResendingEmail(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-purple-950/20 to-black p-4">
      <Card className="w-full max-w-md bg-black/50 border-purple-500/20 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
            {emailSent ? (
              <Check className="w-8 h-8 text-white" />
            ) : (
              <Mail className="w-8 h-8 text-white" />
            )}
          </div>
          <CardTitle className="text-2xl font-bold text-white">
            Check Your Email
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {userInfo.email && (
            <div className="text-center">
              <p className="text-gray-300 mb-2">
                Hi {userInfo.firstName && userInfo.firstName.trim() !== "" ? userInfo.firstName : "there"}! 👋
              </p>
              <p className="text-gray-300 mb-4">
                We've sent a verification link to:
              </p>
              <p className="font-semibold text-purple-400 bg-purple-500/10 px-4 py-2 rounded-lg border border-purple-500/20">
                {userInfo.email}
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div className="text-sm text-gray-400 space-y-2">
              <p className="flex items-center">
                <span className="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>
                Click the verification link in your email
              </p>
              <p className="flex items-center">
                <span className="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>
                Check your spam folder if you don't see it
              </p>
              <p className="flex items-center">
                <span className="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>
                The link expires in 24 hours
              </p>
            </div>

            <div className="border-t border-purple-500/20 pt-4">
              <p className="text-sm text-gray-400 mb-3">
                Didn't receive the email? Enter your email address:
              </p>
              <div className="space-y-3">
                <Input
                  type="email"
                  placeholder="Enter your email address"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  className="bg-black/50 border-purple-500/30 text-white placeholder:text-gray-500 focus:border-purple-500"
                  data-testid="input-resend-email"
                />
                <Button
                  onClick={handleResendEmail}
                  disabled={resendingEmail}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  data-testid="button-resend-verification"
                >
                  {resendingEmail ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Resend Verification Email
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="text-center pt-4 border-t border-purple-500/20">
              <Link href="/">
                <Button variant="ghost" className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10" data-testid="link-back-home">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}