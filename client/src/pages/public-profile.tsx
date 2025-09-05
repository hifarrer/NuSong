import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { User, Calendar, Disc } from "lucide-react";
import { createSlug } from "@/lib/urlUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/loading-spinner";
import { Header } from "@/components/Header";

interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
  createdAt: string;
}

interface Album {
  id: string;
  name: string;
  coverUrl?: string;
  createdAt: string;
}

interface PublicProfileData {
  user: User;
  albums: Album[];
  tracks: any[]; // Keep for API compatibility but not used in UI
}

export default function PublicProfile() {
  const [location, navigate] = useLocation();
  // Support both old /profile/username and new /u/username URLs
  const username = location.includes('/profile/') 
    ? location.split('/profile/')[1]
    : location.split('/u/')[1];
  const [data, setData] = useState<PublicProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!username) {
      setError("Invalid username");
      setLoading(false);
      return;
    }

    const fetchPublicProfile = async () => {
      try {
        const response = await fetch(`/api/profile/${username}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError("User not found");
          } else {
            setError("Failed to load profile");
          }
          return;
        }
        
        const profileData = await response.json();
        setData(profileData);
      } catch (err) {
        console.error("Error fetching public profile:", err);
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchPublicProfile();
  }, [username]);


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black/50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-black/50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <User className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Profile Not Found</h1>
            <p className="text-gray-400">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black/50">
      <Header />
      <div className="container mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {data.user.profileImageUrl && (
              <div className="w-32 h-32 md:w-48 md:h-48 rounded-full overflow-hidden border border-gray-700 bg-gray-800 flex items-center justify-center">
                <img 
                  src={data.user.profileImageUrl} 
                  alt={`${data.user.firstName} ${data.user.lastName}`} 
                  className="w-full h-full object-cover" 
                />
              </div>
            )}
            <div className="text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                {data.user.firstName} {data.user.lastName}
              </h1>
              <p className="text-gray-400 mb-2">@{data.user.username}</p>
              <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
                <Calendar className="w-4 h-4 text-gray-400" />
                <p className="text-gray-400">
                  Joined {formatDate(data.user.createdAt)}
                </p>
              </div>
              <div className="flex gap-4 justify-center md:justify-start text-sm text-gray-400">
                <div className="flex items-center gap-1">
                  <Disc className="w-4 h-4" />
                  <span>{data.albums.length} album{data.albums.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Albums Section Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">Albums</h2>
        </div>

        {/* Albums Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.albums.length === 0 ? (
              <div className="col-span-full text-center py-8">
                <Disc className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No albums yet</p>
              </div>
            ) : (
              data.albums.map((album) => (
                <Card 
                  key={album.id} 
                  className="bg-music-secondary border-gray-700 hover:border-gray-600 transition-colors cursor-pointer"
                  onClick={() => navigate(`/u/${username}/${createSlug(album.name)}`)}
                >
                  <CardContent className="p-4">
                    <div className="aspect-square rounded-lg overflow-hidden border border-gray-700 bg-gray-800 flex items-center justify-center mb-4">
                      {album.coverUrl ? (
                        <img 
                          src={album.coverUrl} 
                          alt={album.name} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <Disc className="w-12 h-12 text-gray-600" />
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-white truncate mb-1">
                      {album.name}
                    </h3>
                    <p className="text-gray-400 text-sm">
                      Created {formatDate(album.createdAt)}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

      </div>
    </div>
  );
}
