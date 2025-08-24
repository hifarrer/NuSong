import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Header } from "@/components/Header";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  User, 
  Settings, 
  CreditCard, 
  Shield, 
  Music,
  Crown,
  Mail,
  Key,
  ChevronRight,
  LogOut
} from "lucide-react";
import type { SubscriptionPlan } from "@shared/schema";

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form states
  const [emailData, setEmailData] = useState({
    newEmail: (user as any)?.email || "",
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Fetch subscription plans
  const { data: plans = [] } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/plans"],
  });

  // Update email mutation
  const updateEmailMutation = useMutation({
    mutationFn: async (data: { newEmail: string }) => {
      const response = await apiRequest("PUT", "/api/user/email", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Email updated successfully",
        description: "Your email address has been changed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update email",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update password mutation
  const updatePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await apiRequest("PUT", "/api/user/password", data);
      return response.json();
    },
    onSuccess: () => {
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      toast({
        title: "Password updated successfully",
        description: "Your password has been changed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update password",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emailData.newEmail === (user as any)?.email) {
      toast({
        title: "No changes made",
        description: "The email address is the same as your current email.",
        variant: "destructive",
      });
      return;
    }
    updateEmailMutation.mutate({ newEmail: emailData.newEmail });
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "New password and confirmation don't match.",
        variant: "destructive",
      });
      return;
    }
    if (passwordData.newPassword.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }
    updatePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    });
  };

  const getCurrentPlan = () => {
    return plans.find(plan => plan.name === "Free") || plans[0]; // Default to Free plan
  };

  const currentPlan = getCurrentPlan();

  if (!user) {
    return (
      <div className="min-h-screen bg-music-dark text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please sign in to access your profile</h1>
          <Button onClick={() => window.location.href = "/auth"}>
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-music-dark text-white">
      <Header currentPage="profile" />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Account Settings</h1>
          <p className="text-gray-400">Manage your account, subscription, and preferences</p>
        </div>

        <div className="grid gap-6">
          {/* Profile Information */}
          <Card className="bg-music-secondary border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5 text-music-accent" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-300">First Name</label>
                  <div className="mt-1 text-white bg-music-dark px-3 py-2 rounded-md border border-gray-600">
                    {(user as any)?.firstName || 'Not set'}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300">Last Name</label>
                  <div className="mt-1 text-white bg-music-dark px-3 py-2 rounded-md border border-gray-600">
                    {(user as any)?.lastName || 'Not set'}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">Current Email</label>
                <div className="mt-1 text-white bg-music-dark px-3 py-2 rounded-md border border-gray-600 flex items-center">
                  <Mail className="mr-2 h-4 w-4 text-gray-400" />
                  {(user as any)?.email || 'Not set'}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Subscription */}
          <Card className="bg-music-secondary border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Crown className="mr-2 h-5 w-5 text-music-accent" />
                Current Subscription
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentPlan ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{currentPlan.name} Plan</h3>
                      <p className="text-gray-400">{currentPlan.description}</p>
                    </div>
                    <Badge 
                      variant={currentPlan.name === "Free" ? "secondary" : "default"}
                      className={currentPlan.name === "Free" 
                        ? "bg-gray-600 text-gray-200" 
                        : "bg-gradient-to-r from-music-purple to-music-blue text-white"
                      }
                    >
                      {currentPlan.name}
                    </Badge>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Monthly Generations:</span>
                      <span className="text-white font-medium">{currentPlan.maxGenerations}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Monthly Price:</span>
                      <span className="text-white font-medium">
                        {(currentPlan.monthlyPrice && parseFloat(currentPlan.monthlyPrice) > 0) ? `$${currentPlan.monthlyPrice}/mo` : "Free"}
                      </span>
                    </div>
                  </div>

                  <Separator className="bg-gray-600" />

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">Want to upgrade or downgrade your plan?</p>
                    </div>
                    <Button
                      variant="outline"
                      className="border-music-accent text-music-accent hover:bg-music-accent hover:text-white"
                      onClick={() => window.location.href = "/pricing"}
                      data-testid="button-manage-subscription"
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      Change Plan
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400">No subscription information available</p>
              )}
            </CardContent>
          </Card>

          {/* Update Email */}
          <Card className="bg-music-secondary border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Mail className="mr-2 h-5 w-5 text-music-blue" />
                Update Email Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateEmail} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-300">New Email Address</label>
                  <Input
                    type="email"
                    value={emailData.newEmail}
                    onChange={(e) => setEmailData({ newEmail: e.target.value })}
                    className="mt-1 bg-music-dark border-gray-600 text-white"
                    required
                    data-testid="input-new-email"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={updateEmailMutation.isPending}
                  className="bg-music-blue hover:bg-blue-600"
                  data-testid="button-update-email"
                >
                  {updateEmailMutation.isPending ? "Updating..." : "Update Email"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Update Password */}
          <Card className="bg-music-secondary border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Key className="mr-2 h-5 w-5 text-music-green" />
                Update Password
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-300">Current Password</label>
                  <Input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="mt-1 bg-music-dark border-gray-600 text-white"
                    required
                    data-testid="input-current-password"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300">New Password</label>
                  <Input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="mt-1 bg-music-dark border-gray-600 text-white"
                    required
                    minLength={8}
                    data-testid="input-new-password"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300">Confirm New Password</label>
                  <Input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="mt-1 bg-music-dark border-gray-600 text-white"
                    required
                    minLength={8}
                    data-testid="input-confirm-password"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={updatePasswordMutation.isPending}
                  className="bg-music-green hover:bg-green-600"
                  data-testid="button-update-password"
                >
                  {updatePasswordMutation.isPending ? "Updating..." : "Update Password"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Account Security */}
          <Card className="bg-music-secondary border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="mr-2 h-5 w-5 text-music-purple" />
                Account Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-white">Login Sessions</h4>
                  <p className="text-sm text-gray-400">Manage your active login sessions</p>
                </div>
                <Button variant="outline" size="sm" className="border-gray-600 text-gray-300">
                  View Sessions
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}