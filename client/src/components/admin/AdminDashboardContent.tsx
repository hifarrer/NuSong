import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Music, Eye, EyeOff, TrendingUp, UserPlus } from "lucide-react";

interface DashboardStats {
  totalUsers: number;
  totalGenerations: number;
  publicTracks: number;
  privateTracks: number;
  newUsersToday: number;
  generationsToday: number;
}

export function AdminDashboardContent() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/dashboard/stats"],
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-800 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Users",
      value: stats?.totalUsers || 0,
      icon: Users,
      description: "Registered users",
      color: "text-blue-400",
    },
    {
      title: "Total Generations",
      value: stats?.totalGenerations || 0,
      icon: Music,
      description: "Music tracks created",
      color: "text-purple-400",
    },
    {
      title: "Public Tracks",
      value: stats?.publicTracks || 0,
      icon: Eye,
      description: "Publicly visible",
      color: "text-green-400",
    },
    {
      title: "Private Tracks",
      value: stats?.privateTracks || 0,
      icon: EyeOff,
      description: "User private tracks",
      color: "text-yellow-400",
    },
    {
      title: "New Users Today",
      value: stats?.newUsersToday || 0,
      icon: UserPlus,
      description: "Users joined today",
      color: "text-cyan-400",
    },
    {
      title: "Generations Today",
      value: stats?.generationsToday || 0,
      icon: TrendingUp,
      description: "Tracks created today",
      color: "text-pink-400",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-2">
          Welcome to the NuSong admin dashboard
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="bg-gray-900 border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {stat.value.toLocaleString()}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Activity Overview */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Platform Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Public vs Private Tracks</span>
              <div className="flex items-center space-x-4">
                <span className="text-green-400">
                  {stats?.publicTracks || 0} public
                </span>
                <span className="text-yellow-400">
                  {stats?.privateTracks || 0} private
                </span>
              </div>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div
                className="bg-green-400 h-2 rounded-full"
                style={{
                  width: `${
                    stats?.totalGenerations
                      ? (stats.publicTracks / stats.totalGenerations) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button 
              className="p-4 bg-gray-800 hover:bg-gray-700 rounded-lg text-left transition-colors"
              onClick={() => window.location.href = '/admin/users'}
              data-testid="quick-action-users"
            >
              <Users className="h-8 w-8 text-blue-400 mb-2" />
              <h3 className="font-medium text-white">Manage Users</h3>
              <p className="text-sm text-gray-400">Add, edit, or remove admin users</p>
            </button>
            <button 
              className="p-4 bg-gray-800 hover:bg-gray-700 rounded-lg text-left transition-colors"
              onClick={() => window.location.href = '/admin/plans'}
              data-testid="quick-action-plans"
            >
              <Music className="h-8 w-8 text-purple-400 mb-2" />
              <h3 className="font-medium text-white">Subscription Plans</h3>
              <p className="text-sm text-gray-400">Configure pricing and features</p>
            </button>
            <button 
              className="p-4 bg-gray-800 hover:bg-gray-700 rounded-lg text-left transition-colors"
              onClick={() => window.location.href = '/admin/tracks'}
              data-testid="quick-action-tracks"
            >
              <Eye className="h-8 w-8 text-green-400 mb-2" />
              <h3 className="font-medium text-white">Music Tracks</h3>
              <p className="text-sm text-gray-400">View and moderate user content</p>
            </button>
            <button 
              className="p-4 bg-gray-800 hover:bg-gray-700 rounded-lg text-left transition-colors"
              onClick={() => window.location.href = '/admin/settings'}
              data-testid="quick-action-settings"
            >
              <TrendingUp className="h-8 w-8 text-pink-400 mb-2" />
              <h3 className="font-medium text-white">Site Settings</h3>
              <p className="text-sm text-gray-400">Configure platform settings</p>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}