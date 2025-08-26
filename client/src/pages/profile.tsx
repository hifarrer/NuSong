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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { SubscriptionPlan } from "@shared/schema";

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [savingAvatar, setSavingAvatar] = useState(false);

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

  // Stripe customer portal mutation
  const portalMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/stripe/create-portal-session", "POST");
      return response;
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to open customer portal",
        variant: "destructive",
      });
    },
  });

  // Cancel subscription mutation
  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/stripe/cancel-subscription", "POST");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Subscription Cancelled",
        description: "Your subscription has been cancelled and will end at the current billing period.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel subscription",
        variant: "destructive",
      });
    },
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

  const handleSelectAvatar = async (index: number) => {
    try {
      setSavingAvatar(true);
      const avatarPath = `/avatars/${index}.png`;
      await apiRequest("/api/user/avatar", "PUT", { avatarPath });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Avatar updated", description: "Your profile image has been changed." });
    } catch (e: any) {
      toast({ title: "Failed to update avatar", description: e?.message || "", variant: "destructive" });
    } finally {
      setSavingAvatar(false);
    }
  };

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
    if (!user) return null;
    const userPlanId = (user as any)?.subscriptionPlanId;
    if (!userPlanId) {
      return plans.find(plan => plan.name === "Free") || null;
    }
    return plans.find(plan => plan.id === userPlanId) || plans.find(plan => plan.name === "Free") || null;
  };

  const currentPlan = getCurrentPlan();
  const userPlanStatus = (user as any)?.planStatus || 'free';
  const hasActiveSubscription = userPlanStatus === 'active' && currentPlan?.name !== 'Free';
  const canCancelSubscription = hasActiveSubscription && (user as any)?.stripeSubscriptionId;

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
          {/* Avatar Selection */}
          <Card className="bg-music-secondary border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <Settings className="mr-2 h-5 w-5 text-music-accent" />
                Profile Avatar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-14 h-14">
                  {(user as any)?.profileImageUrl ? (
                    <AvatarImage src={(user as any).profileImageUrl} alt="avatar" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <AvatarFallback>{((user as any)?.firstName?.[0] || 'U').toUpperCase()}</AvatarFallback>
                  )}
                </Avatar>
                <div className="text-sm text-gray-400">
                  Choose an avatar below. Your current avatar appears here and in the top navigation.
                </div>
              </div>
              <div className="grid grid-cols-8 gap-3">
                {Array.from({ length: 64 }, (_, i) => i + 1).map((n) => {
                  const src = `/avatars/${n}.png`;
                  const isActive = (user as any)?.profileImageUrl === src;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => handleSelectAvatar(n)}
                      disabled={savingAvatar}
                      className={`rounded-md overflow-hidden border transition-transform ${isActive ? 'border-music-accent ring-2 ring-music-accent' : 'border-gray-700 hover:border-gray-500'} ${savingAvatar ? 'opacity-50' : 'hover:scale-105'}`}
                      aria-label={`Select avatar ${n}`}
                    >
                      <img src={src} alt={`avatar ${n}`} className="w-12 h-12 object-cover" />
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          {/* Profile Information */}
          <Card className="bg-music-secondary border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
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
              <CardTitle className="flex items-center text-white">
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
                        : userPlanStatus === 'active'
                        ? "bg-green-600 text-white"
                        : userPlanStatus === 'cancelled'
                        ? "bg-yellow-600 text-white"
                        : "bg-red-600 text-white"
                      }
                    >
                      {userPlanStatus === 'active' ? 'Active' : 
                       userPlanStatus === 'cancelled' ? 'Cancelled' : 
                       userPlanStatus === 'inactive' ? 'Inactive' : 
                       currentPlan.name}
                    </Badge>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Weekly Generations:</span>
                      <span className="text-white font-medium">{currentPlan.maxGenerations}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Used This Month:</span>
                      <span className="text-white font-medium">
                        {(user as any)?.generationsUsedThisMonth || 0} / {currentPlan.maxGenerations}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Plan Status:</span>
                      <span className="text-white font-medium capitalize">{userPlanStatus}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Plan Price:</span>
                      <span className="text-white font-medium">
                        {currentPlan.name === 'Free' ? 'Free' : 
                         currentPlan.monthlyPrice ? `$${currentPlan.monthlyPrice}/mo` : 
                         currentPlan.weeklyPrice ? `$${currentPlan.weeklyPrice}/wk` : 'N/A'}
                      </span>
                    </div>
                  </div>

                  {(user as any)?.planStartDate && (
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Started:</span>
                        <span className="text-white font-medium">
                          {new Date((user as any).planStartDate).toLocaleDateString()}
                        </span>
                      </div>
                      {(user as any)?.planEndDate && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Expires:</span>
                          <span className="text-white font-medium">
                            {new Date((user as any).planEndDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <Separator className="bg-gray-600" />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">
                          {hasActiveSubscription 
                            ? "Manage your subscription, billing, and payment methods"
                            : "Want to upgrade or change your plan?"
                          }
                        </p>
                      </div>
                      {hasActiveSubscription ? (
                        <Button
                          variant="outline"
                          className="border-music-accent text-music-accent hover:bg-music-accent hover:text-white"
                          onClick={() => portalMutation.mutate()}
                          disabled={portalMutation.isPending}
                          data-testid="button-manage-subscription"
                        >
                          <CreditCard className="mr-2 h-4 w-4" />
                          {portalMutation.isPending ? "Loading..." : "Manage Subscription"}
                          <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          className="border-music-accent text-music-accent hover:bg-music-accent hover:text-white"
                          onClick={() => window.location.href = "/pricing"}
                          data-testid="button-change-plan"
                        >
                          <CreditCard className="mr-2 h-4 w-4" />
                          Change Plan
                          <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    {canCancelSubscription && (
                      <div className="flex items-center justify-between pt-4 border-t border-gray-600">
                        <div>
                          <p className="text-sm text-gray-400">
                            Cancel your subscription (will end at current billing period)
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                          onClick={() => {
                            if (confirm("Are you sure you want to cancel your subscription? You'll continue to have access until the end of your current billing period.")) {
                              cancelSubscriptionMutation.mutate();
                            }
                          }}
                          disabled={cancelSubscriptionMutation.isPending}
                          data-testid="button-cancel-subscription"
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          {cancelSubscriptionMutation.isPending ? "Cancelling..." : "Cancel Subscription"}
                        </Button>
                      </div>
                    )}
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
              <CardTitle className="flex items-center text-white">
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
              <CardTitle className="flex items-center text-white">
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
              <CardTitle className="flex items-center text-white">
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