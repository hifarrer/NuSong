import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Settings, Shield, CreditCard, Webhook, Eye, EyeOff } from "lucide-react";
import type { SiteSetting } from "@shared/schema";

interface SettingFormData {
  [key: string]: string;
}

interface AdminPasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export function AdminSiteSettings() {
  const [settingsData, setSettingsData] = useState<SettingFormData>({});
  const [passwordForm, setPasswordForm] = useState<AdminPasswordForm>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings = [], isLoading } = useQuery<SiteSetting[]>({
    queryKey: ["/api/admin/settings"],
  });

  // Initialize form data when settings load
  useEffect(() => {
    if (settings.length > 0) {
      const formData: SettingFormData = {};
      settings.forEach((setting) => {
        formData[setting.key] = setting.value || "";
      });
      setSettingsData(formData);
    }
  }, [settings]);

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      return await apiRequest("/api/admin/settings", "PUT", { key, value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({
        title: "Success",
        description: "Setting updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update setting",
        variant: "destructive",
      });
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async (data: AdminPasswordForm) => {
      return await apiRequest("/api/admin/change-password", "PUT", data);
    },
    onSuccess: () => {
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      toast({
        title: "Success",
        description: "Admin password updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update password",
        variant: "destructive",
      });
    },
  });

  const handleSettingChange = (key: string, value: string) => {
    setSettingsData({ ...settingsData, [key]: value });
  };

  const handleSaveSetting = (key: string) => {
    updateSettingMutation.mutate({ key, value: settingsData[key] || "" });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast({
        title: "Error",
        description: "New password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }
    updatePasswordMutation.mutate(passwordForm);
  };

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords({ ...showPasswords, [field]: !showPasswords[field] });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const getSetting = (key: string) => {
    return settings.find((s) => s.key === key)?.value || "";
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <Settings className="w-6 h-6 text-purple-400" />
        <div>
          <h2 className="text-2xl font-bold text-white">Site Settings</h2>
          <p className="text-gray-400 mt-1">Configure site settings and integrations</p>
        </div>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-gray-800">
          <TabsTrigger value="general" className="data-[state=active]:bg-purple-600">
            General
          </TabsTrigger>
          <TabsTrigger value="stripe" className="data-[state=active]:bg-purple-600">
            Stripe
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="data-[state=active]:bg-purple-600">
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-purple-600">
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                General Site Settings
              </CardTitle>
              <CardDescription className="text-gray-400">
                Configure basic site information and branding
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-200 text-sm font-medium">Site Name</label>
                  <div className="flex space-x-2 mt-1">
                    <Input
                      value={settingsData.site_name || getSetting("site_name")}
                      onChange={(e) => handleSettingChange("site_name", e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="AI Music Studio"
                      data-testid="input-site-name"
                    />
                    <Button
                      onClick={() => handleSaveSetting("site_name")}
                      disabled={updateSettingMutation.isPending}
                      className="bg-purple-600 hover:bg-purple-700"
                      data-testid="button-save-site-name"
                    >
                      Save
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-gray-200 text-sm font-medium">Site Description</label>
                  <div className="flex space-x-2 mt-1">
                    <Input
                      value={settingsData.site_description || getSetting("site_description")}
                      onChange={(e) => handleSettingChange("site_description", e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="AI-powered music generation platform"
                      data-testid="input-site-description"
                    />
                    <Button
                      onClick={() => handleSaveSetting("site_description")}
                      disabled={updateSettingMutation.isPending}
                      className="bg-purple-600 hover:bg-purple-700"
                      data-testid="button-save-site-description"
                    >
                      Save
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-gray-200 text-sm font-medium">Support Email</label>
                  <div className="flex space-x-2 mt-1">
                    <Input
                      type="email"
                      value={settingsData.support_email || getSetting("support_email")}
                      onChange={(e) => handleSettingChange("support_email", e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="support@aimusic.studio"
                      data-testid="input-support-email"
                    />
                    <Button
                      onClick={() => handleSaveSetting("support_email")}
                      disabled={updateSettingMutation.isPending}
                      className="bg-purple-600 hover:bg-purple-700"
                      data-testid="button-save-support-email"
                    >
                      Save
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-gray-200 text-sm font-medium">Contact Email</label>
                  <div className="flex space-x-2 mt-1">
                    <Input
                      type="email"
                      value={settingsData.contact_email || getSetting("contact_email")}
                      onChange={(e) => handleSettingChange("contact_email", e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="contact@aimusic.studio"
                      data-testid="input-contact-email"
                    />
                    <Button
                      onClick={() => handleSaveSetting("contact_email")}
                      disabled={updateSettingMutation.isPending}
                      className="bg-purple-600 hover:bg-purple-700"
                      data-testid="button-save-contact-email"
                    >
                      Save
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stripe" className="space-y-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <CreditCard className="w-5 h-5 mr-2" />
                Stripe Integration
              </CardTitle>
              <CardDescription className="text-gray-400">
                Configure Stripe API keys for payment processing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="text-gray-200 text-sm font-medium">Stripe Publishable Key</label>
                  <div className="flex space-x-2 mt-1">
                    <Input
                      value={settingsData.stripe_publishable_key || getSetting("stripe_publishable_key")}
                      onChange={(e) => handleSettingChange("stripe_publishable_key", e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="pk_live_..."
                      data-testid="input-stripe-publishable-key"
                    />
                    <Button
                      onClick={() => handleSaveSetting("stripe_publishable_key")}
                      disabled={updateSettingMutation.isPending}
                      className="bg-purple-600 hover:bg-purple-700"
                      data-testid="button-save-stripe-publishable-key"
                    >
                      Save
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-gray-200 text-sm font-medium">Stripe Secret Key</label>
                  <div className="flex space-x-2 mt-1">
                    <Input
                      type="password"
                      value={settingsData.stripe_secret_key || getSetting("stripe_secret_key")}
                      onChange={(e) => handleSettingChange("stripe_secret_key", e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="sk_live_..."
                      data-testid="input-stripe-secret-key"
                    />
                    <Button
                      onClick={() => handleSaveSetting("stripe_secret_key")}
                      disabled={updateSettingMutation.isPending}
                      className="bg-purple-600 hover:bg-purple-700"
                      data-testid="button-save-stripe-secret-key"
                    >
                      Save
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-gray-200 text-sm font-medium">Stripe Webhook Endpoint Secret</label>
                  <div className="flex space-x-2 mt-1">
                    <Input
                      type="password"
                      value={settingsData.stripe_webhook_secret || getSetting("stripe_webhook_secret")}
                      onChange={(e) => handleSettingChange("stripe_webhook_secret", e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="whsec_..."
                      data-testid="input-stripe-webhook-secret"
                    />
                    <Button
                      onClick={() => handleSaveSetting("stripe_webhook_secret")}
                      disabled={updateSettingMutation.isPending}
                      className="bg-purple-600 hover:bg-purple-700"
                      data-testid="button-save-stripe-webhook-secret"
                    >
                      Save
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
                <p className="text-blue-300 text-sm">
                  <strong>Note:</strong> Stripe keys are stored securely and masked for security. 
                  Make sure to use your live keys for production and test keys for development.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Webhook className="w-5 h-5 mr-2" />
                Webhook Configuration
              </CardTitle>
              <CardDescription className="text-gray-400">
                Configure webhook endpoints and settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Webhook Setup Instructions */}
              <div className="bg-gray-700 border border-gray-600 rounded-lg p-4 space-y-4">
                <h4 className="text-md font-semibold text-blue-400">Stripe Webhook Setup Instructions</h4>
                <div className="space-y-3 text-sm text-gray-300">
                  <div>
                    <p className="font-medium text-white mb-2">1. Go to your Stripe Dashboard</p>
                    <p>Navigate to <span className="text-blue-400">Developers → Webhooks</span> in your Stripe dashboard.</p>
                  </div>
                  
                  <div>
                    <p className="font-medium text-white mb-2">2. Create a new webhook endpoint</p>
                    <p>Click "Add endpoint" and use this URL:</p>
                    <div className="bg-gray-900 border border-gray-500 rounded p-2 mt-1 font-mono text-green-400 text-xs">
                      {typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/stripe` : '/api/webhooks/stripe'}
                    </div>
                  </div>
                  
                  <div>
                    <p className="font-medium text-white mb-2">3. Select events to send</p>
                    <p>Add these essential events for subscription management:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1 mt-2">
                      <div className="font-mono text-xs bg-gray-800 px-2 py-1 rounded text-green-400">customer.subscription.created</div>
                      <div className="font-mono text-xs bg-gray-800 px-2 py-1 rounded text-green-400">customer.subscription.updated</div>
                      <div className="font-mono text-xs bg-gray-800 px-2 py-1 rounded text-green-400">customer.subscription.deleted</div>
                      <div className="font-mono text-xs bg-gray-800 px-2 py-1 rounded text-green-400">invoice.payment_succeeded</div>
                      <div className="font-mono text-xs bg-gray-800 px-2 py-1 rounded text-green-400">invoice.payment_failed</div>
                      <div className="font-mono text-xs bg-gray-800 px-2 py-1 rounded text-green-400">payment_intent.succeeded</div>
                    </div>
                  </div>
                  
                  <div>
                    <p className="font-medium text-white mb-2">4. Copy the webhook secret</p>
                    <p>After creating the webhook, copy the signing secret (whsec_...) and add it to your Stripe settings in the previous tab.</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-gray-200 text-sm font-medium">Your Webhook Endpoint URL</label>
                <div className="flex space-x-2 mt-1">
                  <Input
                    value={typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/stripe` : '/api/webhooks/stripe'}
                    readOnly
                    className="bg-gray-700 border-gray-600 text-gray-300 cursor-not-allowed"
                    data-testid="input-webhook-endpoint-url"
                  />
                  <Button
                    onClick={() => {
                      const url = typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/stripe` : '/api/webhooks/stripe';
                      navigator.clipboard.writeText(url);
                      toast({
                        title: "Copied!",
                        description: "Webhook URL copied to clipboard",
                      });
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                    data-testid="button-copy-webhook-url"
                  >
                    Copy URL
                  </Button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  This is your webhook endpoint URL. Copy this to your Stripe dashboard.
                </p>
              </div>

              <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-700 rounded-lg">
                <p className="text-yellow-300 text-sm">
                  <strong>Important:</strong> Make sure your webhook endpoint secret is configured in the Stripe tab above. 
                  This ensures secure webhook verification and prevents unauthorized requests.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Admin Security
              </CardTitle>
              <CardDescription className="text-gray-400">
                Change admin password and security settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label className="text-gray-200 text-sm font-medium">Current Password</label>
                  <div className="relative mt-1">
                    <Input
                      type={showPasswords.current ? "text" : "password"}
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      className="bg-gray-700 border-gray-600 text-white pr-10"
                      placeholder="Enter current password"
                      required
                      data-testid="input-current-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-white"
                      onClick={() => togglePasswordVisibility("current")}
                      data-testid="button-toggle-current-password"
                    >
                      {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-gray-200 text-sm font-medium">New Password</label>
                  <div className="relative mt-1">
                    <Input
                      type={showPasswords.new ? "text" : "password"}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      className="bg-gray-700 border-gray-600 text-white pr-10"
                      placeholder="Enter new password (min 6 characters)"
                      required
                      minLength={6}
                      data-testid="input-new-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-white"
                      onClick={() => togglePasswordVisibility("new")}
                      data-testid="button-toggle-new-password"
                    >
                      {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-gray-200 text-sm font-medium">Confirm New Password</label>
                  <div className="relative mt-1">
                    <Input
                      type={showPasswords.confirm ? "text" : "password"}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      className="bg-gray-700 border-gray-600 text-white pr-10"
                      placeholder="Confirm new password"
                      required
                      data-testid="input-confirm-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-white"
                      onClick={() => togglePasswordVisibility("confirm")}
                      data-testid="button-toggle-confirm-password"
                    >
                      {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="submit"
                    disabled={updatePasswordMutation.isPending}
                    className="bg-red-600 hover:bg-red-700"
                    data-testid="button-change-password"
                  >
                    {updatePasswordMutation.isPending ? "Updating..." : "Change Password"}
                  </Button>
                </div>
              </form>

              <div className="mt-6 p-4 bg-red-900/20 border border-red-700 rounded-lg">
                <p className="text-red-300 text-sm">
                  <strong>Security Notice:</strong> Changing your password will log you out of all active sessions. 
                  Make sure to save your new password securely.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}