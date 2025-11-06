import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Edit, Trash2, UserCheck, UserX, Mail, MailCheck, Calendar, Music, CreditCard, Crown, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const updateUserSchema = z.object({
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().min(1, "Last name is required").optional(),
  email: z.string().email("Invalid email address").optional(),
  emailVerified: z.boolean().optional(),
});

type UpdateUserForm = z.infer<typeof updateUserSchema>;

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  emailVerified: boolean;
  subscriptionPlanId: string | null;
  planStatus: string;
  generationsUsedThisMonth: number;
  planStartDate: string | null;
  planEndDate: string | null;
  createdAt: string;
  updatedAt: string;
  generationCount?: number;
  subscriptionPlan?: {
    id: string;
    name: string;
    description: string;
    maxGenerations: number;
  };
}

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: string;
  yearlyPrice: string;
  maxGenerations: number;
  features: string[];
  isActive: boolean;
}

export default function AdminUserManagement() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>("free");
  const [planStatus, setPlanStatus] = useState<string>("active");
  const [currentPage, setCurrentPage] = useState(1);
  const [emailFilter, setEmailFilter] = useState("");
  const [subscriptionFilter, setSubscriptionFilter] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: usersData, isLoading } = useQuery({
    queryKey: ["/api/admin/regular-users", currentPage, emailFilter, subscriptionFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "20",
      });
      
      if (emailFilter) {
        params.append("email", emailFilter);
      }
      
      if (subscriptionFilter !== "all") {
        params.append("subscriptionPlanId", subscriptionFilter);
      }
      
      const response = await apiRequest(`/api/admin/regular-users?${params.toString()}`, "GET");
      return response.json();
    },
  });

  const users = usersData?.users || [];
  const totalUsers = usersData?.total || 0;
  const totalPages = usersData?.totalPages || 1;

  // Fetch subscription plans for the dropdown
  const { data: subscriptionPlans = [] } = useQuery({
    queryKey: ["/api/admin/plans"],
    queryFn: async () => {
      const response = await apiRequest("/api/admin/plans", "GET");
      return response.json();
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateUserForm }) => {
      const response = await apiRequest(`/api/admin/regular-users/${id}`, "PUT", updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/regular-users"] });
      setEditDialogOpen(false);
      setSelectedUser(null);
      toast({
        title: "User Updated",
        description: "User has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/api/admin/regular-users/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/regular-users"] });
      toast({
        title: "User Deleted",
        description: "User and all their data have been permanently deleted.",
      });
      // Reset to first page if current page becomes empty
      if (users.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  // Update user subscription plan mutation
  const updatePlanMutation = useMutation({
    mutationFn: async ({ id, planId, status }: { id: string; planId: string | null; status: string }) => {
      const response = await apiRequest(`/api/admin/regular-users/${id}/plan`, "PUT", { planId, status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/regular-users"] });
      setPlanDialogOpen(false);
      setSelectedUser(null);
      toast({
        title: "Plan Updated",
        description: "User subscription plan has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update user plan",
        variant: "destructive",
      });
    },
  });

  // Toggle email verification mutation
  const toggleEmailVerificationMutation = useMutation({
    mutationFn: async ({ id, emailVerified }: { id: string; emailVerified: boolean }) => {
      const response = await apiRequest(`/api/admin/regular-users/${id}`, "PUT", { emailVerified });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/regular-users"] });
      toast({
        title: "Email Status Updated",
        description: "User email verification status has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update email verification status",
        variant: "destructive",
      });
    },
  });

  const editForm = useForm<UpdateUserForm>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      emailVerified: false,
    },
  });

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    editForm.reset({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      emailVerified: user.emailVerified,
    });
    setEditDialogOpen(true);
  };

  const handleUpdateUser = (data: UpdateUserForm) => {
    if (!selectedUser) return;
    
    // Only send changed fields
    const changes: UpdateUserForm = {};
    if (data.firstName !== selectedUser.firstName) changes.firstName = data.firstName;
    if (data.lastName !== selectedUser.lastName) changes.lastName = data.lastName;
    if (data.email !== selectedUser.email) changes.email = data.email;
    if (data.emailVerified !== selectedUser.emailVerified) changes.emailVerified = data.emailVerified;

    if (Object.keys(changes).length === 0) {
      setEditDialogOpen(false);
      return;
    }

    updateUserMutation.mutate({ id: selectedUser.id, updates: changes });
  };

  const handleDeleteUser = (id: string) => {
    deleteUserMutation.mutate(id);
  };

  const handleManagePlan = (user: User) => {
    setSelectedUser(user);
    setSelectedPlan(user.subscriptionPlanId || "free");
    setPlanStatus(user.planStatus || "free");
    setPlanDialogOpen(true);
  };

  const handleUpdatePlan = () => {
    if (!selectedUser) return;
    
    updatePlanMutation.mutate({
      id: selectedUser.id,
      planId: selectedPlan === "free" ? null : selectedPlan,
      status: selectedPlan === "free" ? "free" : planStatus,
    });
  };

  const handleToggleEmailVerification = (user: User) => {
    toggleEmailVerificationMutation.mutate({
      id: user.id,
      emailVerified: !user.emailVerified,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-400">Loading users...</div>
      </div>
    );
  }

  const handleFilterChange = () => {
    setCurrentPage(1); // Reset to first page when filters change
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">User Management</h2>
          <p className="text-gray-400">Manage regular users, edit their information, and handle subscriptions</p>
        </div>
        <Badge variant="outline" className="text-purple-400 border-purple-500">
          {totalUsers} Total Users
        </Badge>
      </div>

      {/* Filters */}
      <Card className="bg-gray-900/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email-filter" className="text-gray-300 mb-2 block">Search by Email</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email-filter"
                  placeholder="Search by email..."
                  value={emailFilter}
                  onChange={(e) => {
                    setEmailFilter(e.target.value);
                    handleFilterChange();
                  }}
                  className="pl-10 bg-gray-800 border-gray-600 text-white"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="subscription-filter" className="text-gray-300 mb-2 block">Filter by Subscription</Label>
              <Select
                value={subscriptionFilter}
                onValueChange={(value) => {
                  setSubscriptionFilter(value);
                  handleFilterChange();
                }}
              >
                <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="all">All Subscriptions</SelectItem>
                  <SelectItem value="null">Free Plan</SelectItem>
                  {subscriptionPlans
                    .filter((plan: SubscriptionPlan) => plan.isActive)
                    .map((plan: SubscriptionPlan) => (
                      <SelectItem key={plan.id} value={plan.id} className="text-white">
                        {plan.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-900/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">All Users</CardTitle>
          <CardDescription className="text-gray-400">
            View and manage all registered users on the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-300">User</TableHead>
                  <TableHead className="text-gray-300">Email Status</TableHead>
                  <TableHead className="text-gray-300">Subscription</TableHead>
                  <TableHead className="text-gray-300">Generations</TableHead>
                  <TableHead className="text-gray-300">Joined</TableHead>
                  <TableHead className="text-gray-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user: User) => (
                  <TableRow key={user.id} className="border-gray-700">
                    <TableCell>
                      <div>
                        <div className="font-medium text-white">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm text-gray-400">{user.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {user.emailVerified ? (
                          <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                            <UserCheck className="w-3 h-3 mr-1" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-orange-400 border-orange-500">
                            <UserX className="w-3 h-3 mr-1" />
                            Unverified
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {user.subscriptionPlan ? (
                            <>
                              <Crown className="w-4 h-4 text-yellow-400" />
                              <span className="text-white font-medium">{user.subscriptionPlan.name}</span>
                            </>
                          ) : (
                            <>
                              <CreditCard className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-400">Free Plan</span>
                            </>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {user.planStatus && user.planStatus !== "free" && (
                            <span className={`px-1.5 py-0.5 rounded text-xs ${
                              user.planStatus === 'active' ? 'bg-green-600 text-white' :
                              user.planStatus === 'expired' ? 'bg-red-600 text-white' :
                              'bg-yellow-600 text-white'
                            }`}>
                              {user.planStatus}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-gray-300">
                        <Music className="w-4 h-4" />
                        <span>{user.generationCount || 0}</span>
                        {user.subscriptionPlan && (
                          <span className="text-xs text-gray-500">/{user.subscriptionPlan.maxGenerations}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-gray-400">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(user.createdAt), 'MMM d, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                          className="text-blue-400 border-blue-500 hover:bg-blue-500/10"
                          data-testid={`button-edit-user-${user.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleEmailVerification(user)}
                          className={user.emailVerified 
                            ? "text-green-400 border-green-500 hover:bg-green-500/10" 
                            : "text-gray-400 border-gray-500 hover:bg-gray-500/10"
                          }
                          disabled={toggleEmailVerificationMutation.isPending}
                          title={user.emailVerified ? "Mark email as unverified" : "Mark email as verified"}
                          data-testid={`button-toggle-email-${user.id}`}
                        >
                          {user.emailVerified ? <MailCheck className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleManagePlan(user)}
                          className="text-yellow-400 border-yellow-500 hover:bg-yellow-500/10"
                          data-testid={`button-manage-plan-${user.id}`}
                        >
                          <Crown className="w-4 h-4" />
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-400 border-red-500 hover:bg-red-500/10"
                              data-testid={`button-delete-user-${user.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-gray-900 border-gray-700">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-white">Delete User</AlertDialogTitle>
                              <AlertDialogDescription className="text-gray-400">
                                Are you sure you want to delete <strong>{user.firstName} {user.lastName}</strong>?
                                This will permanently delete their account and all associated data including their music generations.
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-gray-700 text-white border-gray-600">
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteUser(user.id)}
                                className="bg-red-600 hover:bg-red-700"
                                data-testid={`confirm-delete-user-${user.id}`}
                              >
                                Delete User
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {users.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                No users found
              </div>
            )}
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-700">
              <div className="text-sm text-gray-400">
                Showing {(currentPage - 1) * 20 + 1} to {Math.min(currentPage * 20, totalUsers)} of {totalUsers} users
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="bg-gray-800 border-gray-600 text-white"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className={
                          currentPage === pageNum
                            ? "bg-purple-600 hover:bg-purple-700"
                            : "bg-gray-800 border-gray-600 text-white"
                        }
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="bg-gray-800 border-gray-600 text-white"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Edit User</DialogTitle>
            <DialogDescription className="text-gray-400">
              Update user information and account settings
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={editForm.handleSubmit(handleUpdateUser)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName" className="text-gray-300">First Name</Label>
                <Input
                  id="firstName"
                  {...editForm.register("firstName")}
                  className="bg-gray-800 border-gray-600 text-white"
                  data-testid="input-edit-firstName"
                />
                {editForm.formState.errors.firstName && (
                  <p className="text-red-400 text-sm mt-1">
                    {editForm.formState.errors.firstName.message}
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="lastName" className="text-gray-300">Last Name</Label>
                <Input
                  id="lastName"
                  {...editForm.register("lastName")}
                  className="bg-gray-800 border-gray-600 text-white"
                  data-testid="input-edit-lastName"
                />
                {editForm.formState.errors.lastName && (
                  <p className="text-red-400 text-sm mt-1">
                    {editForm.formState.errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="email" className="text-gray-300">Email</Label>
              <Input
                id="email"
                type="email"
                {...editForm.register("email")}
                className="bg-gray-800 border-gray-600 text-white"
                data-testid="input-edit-email"
              />
              {editForm.formState.errors.email && (
                <p className="text-red-400 text-sm mt-1">
                  {editForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-full ${editForm.watch("emailVerified") ? 'bg-green-500/20' : 'bg-gray-600/20'}`}>
                  {editForm.watch("emailVerified") ? (
                    <MailCheck className="w-4 h-4 text-green-400" />
                  ) : (
                    <Mail className="w-4 h-4 text-gray-400" />
                  )}
                </div>
                <div>
                  <Label htmlFor="emailVerified" className="text-gray-300 font-medium">
                    Email Verification Status
                  </Label>
                  <p className="text-xs text-gray-400 mt-1">
                    {editForm.watch("emailVerified") ? "Email is verified" : "Email is not verified"}
                  </p>
                </div>
              </div>
              <Switch
                id="emailVerified"
                checked={editForm.watch("emailVerified")}
                onCheckedChange={(checked) => editForm.setValue("emailVerified", checked)}
                data-testid="switch-email-verified"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                className="border-gray-600 text-gray-300"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateUserMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700"
                data-testid="button-save-user-changes"
              >
                {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Plan Management Dialog */}
      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Manage Subscription Plan</DialogTitle>
            <DialogDescription className="text-gray-400">
              Update subscription plan for <strong>{selectedUser?.firstName} {selectedUser?.lastName}</strong>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Current Plan Info */}
            {selectedUser && (
              <div className="bg-gray-800 rounded-lg p-3">
                <div className="text-sm text-gray-400 mb-1">Current Plan</div>
                <div className="flex items-center gap-2">
                  {selectedUser.subscriptionPlan ? (
                    <>
                      <Crown className="w-4 h-4 text-yellow-400" />
                      <span className="text-white font-medium">{selectedUser.subscriptionPlan.name}</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-400">Free Plan</span>
                    </>
                  )}
                </div>
                {selectedUser.planStatus !== "free" && (
                  <div className="text-xs text-gray-500 mt-1">
                    Status: <span className={`px-1.5 py-0.5 rounded ${
                      selectedUser.planStatus === 'active' ? 'bg-green-600 text-white' :
                      selectedUser.planStatus === 'expired' ? 'bg-red-600 text-white' :
                      'bg-yellow-600 text-white'
                    }`}>
                      {selectedUser.planStatus}
                    </span>
                  </div>
                )}
                <div className="text-xs text-gray-500 mt-1">
                  Generations Used: {selectedUser.generationsUsedThisMonth || 0}
                  {selectedUser.subscriptionPlan && ` / ${selectedUser.subscriptionPlan.maxGenerations}`}
                </div>
              </div>
            )}

            {/* Plan Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">New Plan</label>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="free" className="text-gray-300">Free Plan</SelectItem>
                  {subscriptionPlans
                    .filter((plan: SubscriptionPlan) => plan.isActive)
                    .map((plan: SubscriptionPlan) => (
                      <SelectItem key={plan.id} value={plan.id} className="text-white">
                        {plan.name} - {plan.maxGenerations} generations/month
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Plan Status */}
            {selectedPlan && selectedPlan !== "free" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Plan Status</label>
                <Select value={planStatus} onValueChange={setPlanStatus}>
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="active" className="text-green-400">Active</SelectItem>
                    <SelectItem value="expired" className="text-red-400">Expired</SelectItem>
                    <SelectItem value="cancelled" className="text-yellow-400">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPlanDialogOpen(false)}
              className="bg-gray-700 text-white border-gray-600"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdatePlan}
              disabled={updatePlanMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
              data-testid="button-update-plan"
            >
              {updatePlanMutation.isPending ? "Updating..." : "Update Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}