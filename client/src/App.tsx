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
      
      {/* Main app routes */}
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/library" component={MyLibrary} />
          <Route path="/profile" component={Profile} />
        </>
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
        <div className="relative min-h-screen bg-black/40" style={{ zIndex: 1 }}>
          <Toaster />
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
