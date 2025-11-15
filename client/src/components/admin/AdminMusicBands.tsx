import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Users, Search, Music2, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface BandMember {
  id: string;
  bandId: string;
  name: string;
  role: string;
  imageUrl?: string | null;
  description?: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}

interface Band {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  bandImageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profileImageUrl?: string | null;
  };
  members: BandMember[];
}

export function AdminMusicBands() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch all bands
  const { data: bands, isLoading } = useQuery({
    queryKey: ["/api/admin/bands"],
    retry: false,
  });

  // Filter bands based on search
  const filteredBands = ((bands as Band[] || []) as Band[]).filter((band) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      band.name?.toLowerCase().includes(query) ||
      band.description?.toLowerCase().includes(query) ||
      band.user?.email?.toLowerCase().includes(query) ||
      band.user?.firstName?.toLowerCase().includes(query) ||
      band.user?.lastName?.toLowerCase().includes(query) ||
      band.members.some(m => 
        m.name?.toLowerCase().includes(query) || 
        m.role?.toLowerCase().includes(query)
      )
    );
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-white">Loading music bands...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Music Bands</h1>
          <p className="text-gray-400">
            View all user-created music bands and their members
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Music2 className="h-4 w-4 text-blue-400" />
              <div>
                <p className="text-sm text-gray-400">Total Bands</p>
                <p className="text-xl font-bold text-white">{(bands as Band[] || []).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-green-400" />
              <div>
                <p className="text-sm text-gray-400">Total Members</p>
                <p className="text-xl font-bold text-white">
                  {(bands as Band[] || []).reduce((sum, band) => sum + (band.members?.length || 0), 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-purple-400" />
              <div>
                <p className="text-sm text-gray-400">Bands with Images</p>
                <p className="text-xl font-bold text-white">
                  {(bands as Band[] || []).filter(b => b.bandImageUrl).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Filter */}
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search" className="text-gray-400 mb-2 block">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by band name, description, user, or member..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bands List */}
      <div className="space-y-4">
        {filteredBands.length === 0 ? (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-8 text-center">
              <Music2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No bands found</h3>
              <p className="text-gray-400">
                {searchQuery ? "No bands match your search criteria." : "No bands have been created yet."}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredBands.map((band) => {
            const displayName = band.user
              ? [`${band.user.firstName || ''}`.trim(), `${band.user.lastName || ''}`.trim()]
                  .filter(Boolean)
                  .join(' ') || band.user.email || 'Unknown user'
              : 'Unknown user';
            const initials = band.user
              ? `${(band.user.firstName?.[0] || 'U').toUpperCase()}${(band.user.lastName?.[0] || '').toUpperCase()}`
              : 'UU';
            
            return (
              <Card key={band.id} className="bg-gray-800 border-gray-700">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Band Image and Info */}
                    <div className="flex flex-col sm:flex-row gap-4 flex-1">
                      {/* Band Image */}
                      <div className="flex-shrink-0">
                        <div className="w-32 h-32 rounded-lg bg-gray-700 overflow-hidden border border-gray-600">
                          {band.bandImageUrl ? (
                            <img 
                              src={band.bandImageUrl} 
                              alt={band.name} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Music2 className="h-12 w-12 text-gray-500" />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Band Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-xl font-semibold text-white mb-1">
                              {band.name}
                            </h3>
                            <div className="flex items-center space-x-2 mb-2">
                              <Avatar className="w-6 h-6">
                                {band.user?.profileImageUrl ? (
                                  <AvatarImage src={band.user.profileImageUrl} alt={displayName} />
                                ) : (
                                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                                )}
                              </Avatar>
                              <span className="text-sm text-gray-400">by {displayName}</span>
                            </div>
                          </div>
                        </div>
                        
                        {band.description && (
                          <p className="text-sm text-gray-400 mb-3">{band.description}</p>
                        )}
                        
                        <div className="text-xs text-gray-500 space-y-1">
                          <p><strong>Created:</strong> {band.createdAt ? new Date(band.createdAt).toLocaleDateString() : "N/A"}</p>
                          <p><strong>Members:</strong> {band.members?.length || 0}</p>
                        </div>
                      </div>
                    </div>

                    {/* Band Members */}
                    <div className="lg:w-96">
                      <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center">
                        <Users className="h-4 w-4 mr-2" />
                        Band Members ({band.members?.length || 0})
                      </h4>
                      {band.members && band.members.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-3">
                          {band.members.map((member) => (
                            <div
                              key={member.id}
                              className="bg-gray-700 rounded-lg p-3 border border-gray-600"
                            >
                              <div className="w-16 h-16 mx-auto rounded bg-gray-600 overflow-hidden flex items-center justify-center mb-2">
                                {member.imageUrl ? (
                                  <img 
                                    src={member.imageUrl} 
                                    alt={member.name} 
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <User className="h-6 w-6 text-gray-400" />
                                )}
                              </div>
                              <div className="text-center">
                                <p className="text-sm font-medium text-white truncate">{member.name}</p>
                                <p className="text-xs text-gray-400 truncate">{member.role}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500 text-center py-4">
                          No members added yet
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

