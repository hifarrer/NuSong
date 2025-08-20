import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Plus, Trash2, DollarSign } from "lucide-react";
import type { SubscriptionPlan } from "@shared/schema";

interface PlanFormData {
  name: string;
  description: string;
  features: string[];
  monthlyPrice: string;
  yearlyPrice: string;
  monthlyPriceId: string;
  yearlyPriceId: string;
  sortOrder: number;
  isActive: boolean;
}

export function AdminPlanManagement() {
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [formData, setFormData] = useState<PlanFormData>({
    name: "",
    description: "",
    features: [],
    monthlyPrice: "0",
    yearlyPrice: "0",
    monthlyPriceId: "",
    yearlyPriceId: "",
    sortOrder: 0,
    isActive: true,
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["/api/admin/plans"],
  });

  const createPlanMutation = useMutation({
    mutationFn: async (data: PlanFormData) => {
      return await apiRequest("/api/admin/plans", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/plans"] });
      setShowCreateDialog(false);
      resetForm();
      toast({
        title: "Success",
        description: "Subscription plan created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create subscription plan",
        variant: "destructive",
      });
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PlanFormData }) => {
      return await apiRequest(`/api/admin/plans/${id}`, "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/plans"] });
      setShowEditDialog(false);
      setEditingPlan(null);
      resetForm();
      toast({
        title: "Success",
        description: "Subscription plan updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update subscription plan",
        variant: "destructive",
      });
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/admin/plans/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/plans"] });
      toast({
        title: "Success",
        description: "Subscription plan deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete subscription plan",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      features: [],
      monthlyPrice: "0",
      yearlyPrice: "0",
      monthlyPriceId: "",
      yearlyPriceId: "",
      sortOrder: 0,
      isActive: true,
    });
  };

  const handleCreatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    createPlanMutation.mutate(formData);
  };

  const handleUpdatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    updatePlanMutation.mutate({ id: editingPlan.id, data: formData });
  };

  const handleEditPlan = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || "",
      features: plan.features || [],
      monthlyPrice: plan.monthlyPrice || "0",
      yearlyPrice: plan.yearlyPrice || "0",
      monthlyPriceId: plan.monthlyPriceId || "",
      yearlyPriceId: plan.yearlyPriceId || "",
      sortOrder: plan.sortOrder || 0,
      isActive: plan.isActive,
    });
    setShowEditDialog(true);
  };

  const handleDeletePlan = (id: string) => {
    if (confirm("Are you sure you want to delete this subscription plan?")) {
      deletePlanMutation.mutate(id);
    }
  };

  const openCreateDialog = () => {
    resetForm();
    setShowCreateDialog(true);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Subscription Plans</h2>
          <p className="text-gray-400 mt-1">Manage subscription plans and pricing</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button 
              onClick={openCreateDialog}
              className="bg-purple-600 hover:bg-purple-700" 
              data-testid="button-create-plan"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-gray-700 max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-white">Create Subscription Plan</DialogTitle>
              <DialogDescription className="text-gray-400">
                Create a new subscription plan with pricing and features
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreatePlan} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-200 text-sm font-medium">Plan Name</label>
                  <Input 
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-gray-800 border-gray-600 text-white mt-1"
                    placeholder="Basic, Pro, Premium"
                    required
                    data-testid="input-plan-name"
                  />
                </div>
                <div>
                  <label className="text-gray-200 text-sm font-medium">Sort Order</label>
                  <Input 
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                    className="bg-gray-800 border-gray-600 text-white mt-1"
                    placeholder="0"
                    data-testid="input-sort-order"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-200 text-sm font-medium">Description</label>
                <Textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-gray-800 border-gray-600 text-white mt-1"
                  placeholder="• Feature 1&#10;• Feature 2&#10;• Feature 3"
                  rows={4}
                  data-testid="textarea-description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-200 text-sm font-medium">Monthly Price ($)</label>
                  <Input 
                    type="number"
                    step="0.01"
                    value={formData.monthlyPrice}
                    onChange={(e) => setFormData({ ...formData, monthlyPrice: e.target.value })}
                    className="bg-gray-800 border-gray-600 text-white mt-1"
                    placeholder="9.99"
                    data-testid="input-monthly-price"
                  />
                </div>
                <div>
                  <label className="text-gray-200 text-sm font-medium">Yearly Price ($)</label>
                  <Input 
                    type="number"
                    step="0.01"
                    value={formData.yearlyPrice}
                    onChange={(e) => setFormData({ ...formData, yearlyPrice: e.target.value })}
                    className="bg-gray-800 border-gray-600 text-white mt-1"
                    placeholder="99.99"
                    data-testid="input-yearly-price"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-200 text-sm font-medium">Monthly Stripe Price ID</label>
                  <Input 
                    value={formData.monthlyPriceId}
                    onChange={(e) => setFormData({ ...formData, monthlyPriceId: e.target.value })}
                    className="bg-gray-800 border-gray-600 text-white mt-1"
                    placeholder="price_..."
                    data-testid="input-monthly-price-id"
                  />
                </div>
                <div>
                  <label className="text-gray-200 text-sm font-medium">Yearly Stripe Price ID</label>
                  <Input 
                    value={formData.yearlyPriceId}
                    onChange={(e) => setFormData({ ...formData, yearlyPriceId: e.target.value })}
                    className="bg-gray-800 border-gray-600 text-white mt-1"
                    placeholder="price_..."
                    data-testid="input-yearly-price-id"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded"
                    data-testid="checkbox-is-active"
                  />
                  <span className="text-gray-200">Active</span>
                </label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowCreateDialog(false)}
                  className="border-gray-600 text-gray-300"
                  data-testid="button-cancel-create"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createPlanMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700"
                  data-testid="button-submit-create"
                >
                  {createPlanMutation.isPending ? "Creating..." : "Create Plan"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan: SubscriptionPlan) => (
          <Card key={plan.id} className="bg-gray-800 border-gray-700" data-testid={`card-plan-${plan.id}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">{plan.name}</CardTitle>
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEditPlan(plan)}
                    className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                    data-testid={`button-edit-${plan.id}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeletePlan(plan.id)}
                    className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                    data-testid={`button-delete-${plan.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <CardDescription className="text-gray-400">
                Sort Order: {plan.sortOrder} • {plan.isActive ? "Active" : "Inactive"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400 flex items-center">
                    <DollarSign className="w-4 h-4 mr-1" />
                    Monthly
                  </span>
                  <span className="text-white font-semibold" data-testid={`text-monthly-price-${plan.id}`}>
                    ${plan.monthlyPrice}/mo
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400 flex items-center">
                    <DollarSign className="w-4 h-4 mr-1" />
                    Yearly
                  </span>
                  <span className="text-white font-semibold" data-testid={`text-yearly-price-${plan.id}`}>
                    ${plan.yearlyPrice}/yr
                  </span>
                </div>
                {plan.description && (
                  <div className="text-sm text-gray-300">
                    <div className="font-medium mb-1">Features:</div>
                    <div className="whitespace-pre-line text-xs">
                      {plan.description}
                    </div>
                  </div>
                )}
                {(plan.monthlyPriceId || plan.yearlyPriceId) && (
                  <div className="text-xs text-gray-500 space-y-1">
                    {plan.monthlyPriceId && (
                      <div>Monthly ID: {plan.monthlyPriceId}</div>
                    )}
                    {plan.yearlyPriceId && (
                      <div>Yearly ID: {plan.yearlyPriceId}</div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Subscription Plan</DialogTitle>
            <DialogDescription className="text-gray-400">
              Update subscription plan details and pricing
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdatePlan} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-gray-200 text-sm font-medium">Plan Name</label>
                <Input 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-gray-800 border-gray-600 text-white mt-1"
                  required
                  data-testid="input-edit-plan-name"
                />
              </div>
              <div>
                <label className="text-gray-200 text-sm font-medium">Sort Order</label>
                <Input 
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                  className="bg-gray-800 border-gray-600 text-white mt-1"
                  data-testid="input-edit-sort-order"
                />
              </div>
            </div>

            <div>
              <label className="text-gray-200 text-sm font-medium">Description</label>
              <Textarea 
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-gray-800 border-gray-600 text-white mt-1"
                rows={4}
                data-testid="textarea-edit-description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-gray-200 text-sm font-medium">Monthly Price ($)</label>
                <Input 
                  type="number"
                  step="0.01"
                  value={formData.monthlyPrice}
                  onChange={(e) => setFormData({ ...formData, monthlyPrice: e.target.value })}
                  className="bg-gray-800 border-gray-600 text-white mt-1"
                  data-testid="input-edit-monthly-price"
                />
              </div>
              <div>
                <label className="text-gray-200 text-sm font-medium">Yearly Price ($)</label>
                <Input 
                  type="number"
                  step="0.01"
                  value={formData.yearlyPrice}
                  onChange={(e) => setFormData({ ...formData, yearlyPrice: e.target.value })}
                  className="bg-gray-800 border-gray-600 text-white mt-1"
                  data-testid="input-edit-yearly-price"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-gray-200 text-sm font-medium">Monthly Stripe Price ID</label>
                <Input 
                  value={formData.monthlyPriceId}
                  onChange={(e) => setFormData({ ...formData, monthlyPriceId: e.target.value })}
                  className="bg-gray-800 border-gray-600 text-white mt-1"
                  data-testid="input-edit-monthly-price-id"
                />
              </div>
              <div>
                <label className="text-gray-200 text-sm font-medium">Yearly Stripe Price ID</label>
                <Input 
                  value={formData.yearlyPriceId}
                  onChange={(e) => setFormData({ ...formData, yearlyPriceId: e.target.value })}
                  className="bg-gray-800 border-gray-600 text-white mt-1"
                  data-testid="input-edit-yearly-price-id"
                />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded"
                  data-testid="checkbox-edit-is-active"
                />
                <span className="text-gray-200">Active</span>
              </label>
            </div>

            <div className="flex justify-end space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowEditDialog(false)}
                className="border-gray-600 text-gray-300"
                data-testid="button-cancel-edit"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updatePlanMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700"
                data-testid="button-submit-edit"
              >
                {updatePlanMutation.isPending ? "Updating..." : "Update Plan"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {plans.length === 0 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <DollarSign className="w-12 h-12 text-gray-500 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No subscription plans</h3>
            <p className="text-gray-400 text-center mb-4">
              Get started by creating your first subscription plan
            </p>
            <Button 
              onClick={openCreateDialog}
              className="bg-purple-600 hover:bg-purple-700"
              data-testid="button-create-first-plan"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Plan
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}