import { useState } from "react";
import { useLocation } from "wouter";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  Settings, 
  Music,
  Music2,
  Database,
  Wrench,
  LogOut,
  Menu,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigationItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/admin" },
  { id: "users", label: "User Management", icon: Users, path: "/admin/users" },
  { id: "plans", label: "Subscription Plans", icon: CreditCard, path: "/admin/plans" },
  { id: "tracks", label: "Music Tracks", icon: Music, path: "/admin/tracks" },
  { id: "bands", label: "Music Bands", icon: Music2, path: "/admin/bands" },
  { id: "settings", label: "Site Settings", icon: Settings, path: "/admin/settings" },
  { id: "database", label: "Database Mgmt", icon: Database, path: "/admin/database" },
  { id: "maintenance", label: "Maintenance", icon: Wrench, path: "/admin/maintenance" },
];

export function AdminSidebar() {
  const [, navigate] = useLocation();
  const { adminUser, logout } = useAdminAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const currentPath = window.location.pathname;

  const handleLogout = async () => {
    await logout.mutateAsync();
    navigate("/admin/login");
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="sm"
        className="fixed top-4 left-4 z-50 md:hidden bg-gray-900 hover:bg-gray-800 text-white"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        data-testid="button-mobile-menu"
      >
        {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed left-0 top-0 z-40 h-full w-64 bg-gray-900 border-r border-gray-800 transform transition-transform duration-200 ease-in-out md:relative md:transform-none",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-gray-800">
            <h1 className="text-xl font-bold text-white">NuSong</h1>
            <p className="text-sm text-gray-400 mt-1">Admin Dashboard</p>
          </div>

          {/* User info */}
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {adminUser?.username?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-white">{adminUser?.username}</p>
                <p className="text-xs text-gray-400 capitalize">{adminUser?.role}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.path;
              
              return (
                <Button
                  key={item.id}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start text-left h-auto p-3",
                    isActive 
                      ? "bg-purple-600/20 text-purple-400 border-l-2 border-purple-400" 
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  )}
                  onClick={() => handleNavigation(item.path)}
                  data-testid={`nav-${item.id}`}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  <span>{item.label}</span>
                </Button>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-gray-800">
            <Button
              variant="ghost"
              className="w-full justify-start text-red-400 hover:bg-red-500/10 hover:text-red-300"
              onClick={handleLogout}
              disabled={logout.isPending}
              data-testid="button-logout"
            >
              <LogOut className="h-5 w-5 mr-3" />
              <span>{logout.isPending ? "Signing out..." : "Sign Out"}</span>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}