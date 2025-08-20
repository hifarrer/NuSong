import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { AdminUser, AdminLogin } from "@shared/schema";

export function useAdminAuth() {
  const queryClient = useQueryClient();

  const { data: adminUser, isLoading } = useQuery({
    queryKey: ["/api/admin/user"],
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: AdminLogin) => {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Login failed");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/user"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/logout", { method: "POST" });
      if (!response.ok) {
        throw new Error("Logout failed");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });

  return {
    adminUser: adminUser as AdminUser | undefined,
    isLoading,
    isAuthenticated: !!adminUser,
    login: loginMutation,
    logout: logoutMutation,
  };
}