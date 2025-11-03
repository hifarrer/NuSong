import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

interface HeaderProps {
  currentPage?: string;
}

export function Header({ currentPage }: HeaderProps) {
  const { user, isLoading } = useAuth();
  const [location, navigate] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsMenuOpen(false);
  };

  const isActive = (page: string) => {
    return currentPage === page;
  };

  return (
    <header className="bg-music-secondary/80 backdrop-blur-lg border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Mobile Menu - Logo as trigger */}
          <div className="md:hidden">
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <button className="flex items-center hover:opacity-80 transition-opacity">
                  <img src="/logo.png" alt="NuSong" className="h-10 w-auto" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] bg-gray-900 border-gray-800">
                <SheetHeader>
                  <SheetTitle className="text-white text-left">Menu</SheetTitle>
                </SheetHeader>
                
                <div className="mt-8">
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="navigation" className="border-gray-700">
                      <AccordionTrigger className="text-white hover:no-underline">
                        Navigation
                      </AccordionTrigger>
                      <AccordionContent>
                        <nav className="flex flex-col space-y-2">
                          <SheetClose asChild>
                            <button
                              onClick={() => handleNavigation("/")}
                              className={`text-left px-4 py-2 rounded-lg transition-colors ${
                                isActive('home') || isActive('create')
                                  ? 'text-music-blue font-medium bg-gray-800'
                                  : 'text-gray-300 hover:text-white hover:bg-gray-800'
                              }`}
                            >
                              {user ? 'Create' : 'Home'}
                            </button>
                          </SheetClose>
                          {user && (
                            <>
                              <SheetClose asChild>
                                <button
                                  onClick={() => handleNavigation("/library")}
                                  className={`text-left px-4 py-2 rounded-lg transition-colors ${
                                    isActive('library')
                                      ? 'text-music-blue font-medium bg-gray-800'
                                      : 'text-gray-300 hover:text-white hover:bg-gray-800'
                                  }`}
                                >
                                  Library
                                </button>
                              </SheetClose>
                              <SheetClose asChild>
                                <button
                                  onClick={() => handleNavigation("/community")}
                                  className={`text-left px-4 py-2 rounded-lg transition-colors ${
                                    isActive('community')
                                      ? 'text-music-blue font-medium bg-gray-800'
                                      : 'text-gray-300 hover:text-white hover:bg-gray-800'
                                  }`}
                                >
                                  Community
                                </button>
                              </SheetClose>
                              <SheetClose asChild>
                                <button
                                  onClick={() => handleNavigation("/playlists")}
                                  className={`text-left px-4 py-2 rounded-lg transition-colors ${
                                    isActive('playlists')
                                      ? 'text-music-blue font-medium bg-gray-800'
                                      : 'text-gray-300 hover:text-white hover:bg-gray-800'
                                  }`}
                                >
                                  Playlists
                                </button>
                              </SheetClose>
                              <SheetClose asChild>
                                <button
                                  onClick={() => handleNavigation("/my-band")}
                                  className={`text-left px-4 py-2 rounded-lg transition-colors ${
                                    isActive('my-band')
                                      ? 'text-music-blue font-medium bg-gray-800'
                                      : 'text-gray-300 hover:text-white hover:bg-gray-800'
                                  }`}
                                >
                                  My Band
                                </button>
                              </SheetClose>
                            </>
                          )}
                        </nav>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>

                  {/* User section below username */}
                  {!isLoading && user && (
                    <div className="mt-8 pt-8 border-t border-gray-700">
                      <div className="flex items-center space-x-3 mb-6 px-4">
                        <Avatar className="w-10 h-10">
                          {(user as any)?.profileImageUrl ? (
                            <AvatarImage src={(user as any).profileImageUrl} alt="avatar" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          ) : (
                            <AvatarFallback>
                              {(((user as any)?.firstName?.[0] || (user as any)?.email?.[0] || 'U') as string).toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <span className="text-white font-medium">
                          {(user as any)?.firstName || (user as any)?.email || "User"}
                        </span>
                      </div>
                      <div className="flex flex-col space-y-2">
                        <SheetClose asChild>
                          <button
                            onClick={() => handleNavigation("/profile")}
                            className={`text-left px-4 py-2 rounded-lg transition-colors ${
                              isActive('profile')
                                ? 'text-music-blue font-medium bg-gray-800'
                                : 'text-gray-300 hover:text-white hover:bg-gray-800'
                            }`}
                          >
                            Profile
                          </button>
                        </SheetClose>
                        <SheetClose asChild>
                          <button
                            onClick={() => handleNavigation("/pricing")}
                            className={`text-left px-4 py-2 rounded-lg transition-colors ${
                              isActive('pricing')
                                ? 'text-music-blue font-medium bg-gray-800'
                                : 'text-gray-300 hover:text-white hover:bg-gray-800'
                            }`}
                          >
                            Pricing
                          </button>
                        </SheetClose>
                        <SheetClose asChild>
                          <button
                            onClick={() => {
                              window.location.href = "/api/logout";
                            }}
                            className="text-left px-4 py-2 rounded-lg transition-colors text-gray-300 hover:text-white hover:bg-gray-800 flex items-center gap-2"
                          >
                            <LogOut className="w-4 h-4" />
                            Logout
                          </button>
                        </SheetClose>
                      </div>
                    </div>
                  )}

                  {/* Guest user section */}
                  {!isLoading && !user && (
                    <div className="mt-8 pt-8 border-t border-gray-700">
                      <div className="flex flex-col space-y-2">
                        <SheetClose asChild>
                          <button
                            onClick={() => handleNavigation("/pricing")}
                            className={`text-left px-4 py-2 rounded-lg transition-colors ${
                              isActive('pricing')
                                ? 'text-music-blue font-medium bg-gray-800'
                                : 'text-gray-300 hover:text-white hover:bg-gray-800'
                            }`}
                          >
                            Pricing
                          </button>
                        </SheetClose>
                        <SheetClose asChild>
                          <button
                            onClick={() => handleNavigation("/auth")}
                            className="text-left px-4 py-2 rounded-lg transition-colors text-gray-300 hover:text-white hover:bg-gray-800"
                          >
                            Sign In
                          </button>
                        </SheetClose>
                        <SheetClose asChild>
                          <button
                            onClick={() => handleNavigation("/auth")}
                            className="text-left px-4 py-2 rounded-lg transition-colors bg-gradient-to-r from-music-purple to-music-blue text-white font-medium"
                          >
                            Get Started
                          </button>
                        </SheetClose>
                      </div>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Desktop Logo - No trigger */}
          <a href="/" className="hidden md:flex items-center hover:opacity-80 transition-opacity">
            <img src="/logo.png" alt="NuSong" className="h-10 w-auto" />
          </a>
          
          {/* Desktop Navigation */}
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
            {user && (
              <>
                <a 
                  href="/library" 
                  className={`transition-colors ${
                    currentPage === 'library' 
                      ? 'text-music-blue font-medium' 
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  Library
                </a>
                <a 
                  href="/community" 
                  className={`transition-colors ${
                    currentPage === 'community' 
                      ? 'text-music-blue font-medium' 
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  Community
                </a>
                <a 
                  href="/playlists" 
                  className={`transition-colors ${
                    currentPage === 'playlists' 
                      ? 'text-music-blue font-medium' 
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  Playlists
                </a>
                <a 
                  href="/my-band" 
                  className={`transition-colors ${
                    currentPage === 'my-band' 
                      ? 'text-music-blue font-medium' 
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  My Band
                </a>
              </>
            )}
          </nav>
          
          {/* Desktop User Menu */}
          <div className="hidden md:flex items-center space-x-4">
            {!isLoading && user ? (
              <>
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