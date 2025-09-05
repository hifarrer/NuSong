import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";

interface HeaderProps {
  currentPage?: string;
}

export function Header({ currentPage }: HeaderProps) {
  const { user, isLoading } = useAuth();

  return (
    <header className="bg-music-secondary/80 backdrop-blur-lg border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <a href="/" className="flex items-center hover:opacity-80 transition-opacity">
            <img src="/logo.png" alt="NuSong" className="h-10 w-auto" />
          </a>
          
          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <a 
              href="/" 
              className={`transition-colors ${
                currentPage === 'home' || currentPage === 'create' 
                  ? 'text-music-blue font-medium' 
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              {user ? 'Create' : 'Home'}
            </a>
            <a 
              href="/pricing" 
              className={`transition-colors ${
                currentPage === 'pricing' 
                  ? 'text-music-blue font-medium' 
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Pricing
            </a>
            <a 
              href="/contact" 
              className={`transition-colors ${
                currentPage === 'contact' 
                  ? 'text-music-blue font-medium' 
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Contact
            </a>
            <a 
              href="/privacy" 
              className={`transition-colors ${
                currentPage === 'privacy' 
                  ? 'text-music-blue font-medium' 
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Privacy
            </a>
            <a 
              href="/terms" 
              className={`transition-colors ${
                currentPage === 'terms' 
                  ? 'text-music-blue font-medium' 
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Terms
            </a>
          </nav>
          
          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {!isLoading && user ? (
              <>
                <a href="/library" className="text-gray-300 hover:text-white transition-colors px-3 py-2">
                  Library
                </a>
                <a href="/playlists" className="text-gray-300 hover:text-white transition-colors px-3 py-2">
                  Playlists
                </a>
                <a href="/profile" className="flex items-center space-x-3 hover:bg-gray-800/50 rounded-lg px-3 py-2 transition-colors">
                  <Avatar className="w-8 h-8">
                    {(user as any)?.profileImageUrl ? (
                      <AvatarImage src={(user as any).profileImageUrl} alt="avatar" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    ) : (
                      <AvatarFallback>
                        {(((user as any)?.firstName?.[0] || (user as any)?.email?.[0] || 'U') as string).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <span className="text-sm text-gray-300 hover:text-white transition-colors">
                    {(user as any)?.firstName || (user as any)?.email || "User"}
                  </span>
                </a>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.location.href = "/api/logout"}
                  data-testid="button-logout"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </>
            ) : currentPage === 'auth' ? (
              <span className="text-gray-400 text-sm">Sign In / Sign Up</span>
            ) : (
              <>
                <Button
                  variant="ghost"
                  className="text-gray-300 hover:text-white"
                  onClick={() => window.location.href = "/auth"}
                >
                  Sign In
                </Button>
                <Button
                  className="bg-gradient-to-r from-music-purple to-music-blue hover:from-purple-600 hover:to-blue-600 text-white font-medium transition-all transform hover:scale-105"
                  onClick={() => window.location.href = "/auth"}
                >
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}