import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { 
  insertAdminUserSchema, 
  updateAdminUserSchema,
  type AdminUser,
  type InsertAdminUserForm,
  type UpdateAdminUserForm
} from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus, Edit, Trash2, Check, X } from "lucide-react";

export function AdminUserManagement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  const { data: users, isLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
  });

  const createForm = useForm<InsertAdminUserForm>({
    resolver: zodResolver(insertAdminUserSchema),
    defaultValues: {
      username: "",
      password: "",
      email: "",
      role: "admin",
      isActive: true,
    },
  });

  const editForm = useForm<UpdateAdminUserForm>({
    resolver: zodResolver(updateAdminUserSchema),
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertAdminUserForm) => {
      return apiRequest("/api/admin/users", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setIsCreateDialogOpen(false);
      createForm.reset();
      toast({
        title: "Success",
        description: "Admin user created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateAdminUserForm }) => {
      return apiRequest(`/api/admin/users/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setEditingUser(null);
      editForm.reset();
      toast({
        title: "Success",
        description: "Admin user updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    },
  });

  const onCreateSubmit = (data: InsertAdminUserForm) => {
    createMutation.mutate(data);
  };

  const onEditSubmit = (data: UpdateAdminUserForm) => {
    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data });
    }
  };

  const startEdit = (user: AdminUser) => {
    setEditingUser(user);
    editForm.reset({
      email: user.email || "",
      role: user.role,
      isActive: user.isActive,
    });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-800 rounded w-1/4" />
          <div className="h-32 bg-gray-800 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">User Management</h1>
          <p className="text-gray-400 mt-2">Manage admin users and permissions</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-purple-600 hover:bg-purple-700" data-testid="button-create-user">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Admin User
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-gray-800">
            <DialogHeader>
              <DialogTitle className="text-white">Create Admin User</DialogTitle>
              <DialogDescription className="text-gray-400">
                Add a new admin user to the system
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-gray-300">Username</Label>
                <Input
                  id="username"
                  placeholder="Enter username"
                  className="bg-gray-800 border-gray-700 text-gray-300"
                  {...createForm.register("username")}
                  data-testid="input-create-username"
                />
                {createForm.formState.errors.username && (
                  <p className="text-sm text-red-400">
                    {createForm.formState.errors.username.message}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  className="bg-gray-800 border-gray-700 text-gray-300"
                  {...createForm.register("password")}
                  data-testid="input-create-password"
                />
                {createForm.formState.errors.password && (
                  <p className="text-sm text-red-400">
                    {createForm.formState.errors.password.message}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email"
                  className="bg-gray-800 border-gray-700 text-gray-300"
                  {...createForm.register("email")}
                  data-testid="input-create-email"
                />
                {createForm.formState.errors.email && (
                  <p className="text-sm text-red-400">
                    {createForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Role</Label>
                <Select 
                  value={createForm.watch("role")} 
                  onValueChange={(value) => createForm.setValue("role", value as "admin" | "super_admin")}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-300" data-testid="select-create-role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                  data-testid="button-cancel-create"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700"
                  data-testid="button-submit-create"
                >
                  {createMutation.isPending ? "Creating..." : "Create User"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Admin Users</CardTitle>
          <CardDescription className="text-gray-400">
            List of all admin users in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-gray-800">
                <TableHead className="text-gray-300">Username</TableHead>
                <TableHead className="text-gray-300">Email</TableHead>
                <TableHead className="text-gray-300">Role</TableHead>
                <TableHead className="text-gray-300">Status</TableHead>
                <TableHead className="text-gray-300">Last Login</TableHead>
                <TableHead className="text-gray-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user) => (
                <TableRow key={user.id} className="border-gray-800">
                  <TableCell className="text-white font-medium">
                    {user.username}
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {user.email || "-"}
                  </TableCell>
                  <TableCell className="text-gray-300">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      user.role === "super_admin" 
                        ? "bg-purple-500/20 text-purple-400" 
                        : "bg-blue-500/20 text-blue-400"
                    }`}>
                      {user.role === "super_admin" ? "Super Admin" : "Admin"}
                    </span>
                  </TableCell>
                  <TableCell className="text-gray-300">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      user.isActive 
                        ? "bg-green-500/20 text-green-400" 
                        : "bg-red-500/20 text-red-400"
                    }`}>
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {user.lastLoginAt 
                      ? new Date(user.lastLoginAt).toLocaleDateString()
                      : "Never"
                    }
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(user)}
                        className="text-blue-400 hover:bg-blue-500/10"
                        data-testid={`button-edit-${user.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Admin User</DialogTitle>
            <DialogDescription className="text-gray-400">
              Update admin user information
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-email" className="text-gray-300">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  placeholder="Enter email"
                  className="bg-gray-800 border-gray-700 text-gray-300"
                  {...editForm.register("email")}
                  data-testid="input-edit-email"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Role</Label>
                <Select 
                  value={editForm.watch("role")} 
                  onValueChange={(value) => editForm.setValue("role", value as "admin" | "super_admin")}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-300" data-testid="select-edit-role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-new-password" className="text-gray-300">New Password (optional)</Label>
                <Input
                  id="edit-new-password"
                  type="password"
                  placeholder="Enter new password"
                  className="bg-gray-800 border-gray-700 text-gray-300"
                  {...editForm.register("newPassword")}
                  data-testid="input-edit-password"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEditingUser(null)}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700"
                  data-testid="button-submit-edit"
                >
                  {updateMutation.isPending ? "Updating..." : "Update User"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}