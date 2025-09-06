import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import MyLibrary from "@/pages/my-library";
import Profile from "@/pages/profile";
import Pricing from "@/pages/pricing";
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";
import Contact from "@/pages/contact";
import Auth from "@/pages/auth";
import AdminLogin from "@/pages/admin-login";
import AdminDashboard from "@/pages/admin-dashboard";
import TrackPage from "@/pages/track";
import CheckEmailPage from "@/pages/check-email";
import VerifyEmailPage from "@/pages/verify-email";
import ResetPasswordPage from "@/pages/reset-password";
import SharedAlbum from "@/pages/shared-album";
import PublicProfile from "@/pages/public-profile";
import PublicAlbum from "@/pages/public-album";
import PublicTrack from "@/pages/public-track";
import PlaylistsPage from "@/pages/playlists";
import MyBand from "@/pages/my-band";
import { Footer } from "@/components/Footer";
// Use direct path to video in public folder
const backgroundVideo = "/nusongBG.mp4";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {/* Admin routes */}
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/:page*" component={AdminDashboard} />
      <Route path="/admin" component={AdminDashboard} />
      
      {/* Email verification and password reset routes */}
      <Route path="/check-email" component={CheckEmailPage} />
      <Route path="/verify-email/:token" component={VerifyEmailPage} />
      <Route path="/reset-password/:token" component={ResetPasswordPage} />
      
      {/* Public routes */}
      <Route path="/pricing" component={Pricing} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/contact" component={Contact} />
      <Route path="/auth" component={Auth} />
      <Route path="/track/:id" component={TrackPage} />
      <Route path="/share/:token" component={SharedAlbum} />
      <Route path="/profile/:username" component={PublicProfile} />
      <Route path="/u/:username/:albumSlug/:trackId" component={PublicTrack} />
      <Route path="/u/:username/:albumSlug" component={PublicAlbum} />
      <Route path="/u/:username" component={PublicProfile} />
      
      {/* Main app routes */}
      {isLoading ? (
        // Show loading state for all routes while authentication is loading
        <Route path="*" component={() => (
          <div className="min-h-screen bg-music-dark flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-music-blue mx-auto mb-4"></div>
              <p className="text-gray-400">Loading...</p>
            </div>
          </div>
        )} />
      ) : isAuthenticated ? (
        <>
          <Route path="/" component={Home} />
          <Route path="/library" component={MyLibrary} />
          <Route path="/playlists" component={PlaylistsPage} />
          <Route path="/my-band" component={MyBand} />
          <Route path="/profile" component={Profile} />
        </>
      ) : (
        <Route path="/" component={Landing} />
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {/* Background Video */}
        <div className="fixed inset-0" style={{ zIndex: -10 }}>
          <video
            className="w-full h-full object-cover"
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            onError={(e) => console.error('Video error:', e)}
            onLoadStart={() => console.log('Video loading started')}
            onCanPlay={() => console.log('Video can play')}
            onPlay={() => console.log('Video started playing')}
          >
            <source src={backgroundVideo} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
        
        {/* Content overlay with semi-transparent background for readability */}
        <div className="relative min-h-screen bg-black/40 flex flex-col" style={{ zIndex: 1 }}>
          <Toaster />
          <div className="flex-1">
            <Router />
          </div>
          <Footer />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
