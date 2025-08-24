import { Button } from "@/components/ui/button";
import { Music, User, LogOut } from "lucide-react";
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
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-music-purple to-music-blue rounded-xl flex items-center justify-center">
              <Music className="text-white text-lg" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-music-purple to-music-blue bg-clip-text text-transparent">
              NuMusic
            </h1>
          </div>
          
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
                <a href="/profile" className="flex items-center space-x-3 hover:bg-gray-800/50 rounded-lg px-3 py-2 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-music-purple to-music-blue flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm text-gray-300 hover:text-white transition-colors">
                    {(user as any)?.firstName || (user as any)?.email || "User"}
                  </span>
                </a>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.location.href = "/api/auth/logout"}
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