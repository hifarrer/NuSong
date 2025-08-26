import { useLocation } from "wouter";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminDashboardContent } from "@/components/admin/AdminDashboardContent";
import AdminUserManagement from "@/components/admin/AdminUserManagement";
import { AdminPlanManagement } from "@/components/admin/AdminPlanManagement";
import { AdminSiteSettings } from "@/components/admin/AdminSiteSettings";
import { AdminMusicTracks } from "@/components/admin/AdminMusicTracks";
import { AdminMaintenance } from "@/components/admin/AdminMaintenance";

export default function AdminDashboard() {
  const { isAuthenticated, isLoading } = useAdminAuth();
  const [, navigate] = useLocation();
  const currentPath = window.location.pathname;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    navigate("/admin/login");
    return null;
  }

  const renderContent = () => {
    if (currentPath === "/admin/users") {
      return <AdminUserManagement />;
    }
    if (currentPath === "/admin/tracks") {
      return <AdminMusicTracks />;
    }
    if (currentPath === "/admin/plans") {
      return <AdminPlanManagement />;
    }
    if (currentPath === "/admin/settings") {
      return <AdminSiteSettings />;
    }
    if (currentPath === "/admin/maintenance") {
      return <AdminMaintenance />;
    }
    return <AdminDashboardContent />;
  };

  return (
    <div className="min-h-screen bg-black flex">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {renderContent()}
      </div>
    </div>
  );
}