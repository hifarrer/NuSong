import { Music } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-music-secondary/80 backdrop-blur-lg border-t border-gray-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <img src="/logo.png" alt="NuSong" className="h-8 w-auto" />
              <span className="text-xl font-bold text-white">NuSong</span>
            </div>
            <p className="text-gray-400 text-sm">
              Create, share, and discover amazing AI-generated music. 
              Your creative journey starts here.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-white font-semibold">Quick Links</h3>
            <nav className="flex flex-col space-y-2">
              <a 
                href="/pricing" 
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                Pricing
              </a>
              <a 
                href="/contact" 
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                Contact
              </a>
              <a 
                href="/privacy" 
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                Privacy Policy
              </a>
              <a 
                href="/terms" 
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                Terms of Service
              </a>
            </nav>
          </div>

          {/* Social & Info */}
          <div className="space-y-4">
            <h3 className="text-white font-semibold">Connect</h3>
            <div className="flex items-center space-x-2 text-gray-400">
              <Music className="w-4 h-4" />
              <span className="text-sm">Powered by AI Music Generation</span>
            </div>
            <p className="text-gray-500 text-xs">
              © {currentYear} NuSong. All rights reserved.
            </p>
          </div>
        </div>

        {/* Bottom Border */}
        <div className="border-t border-gray-700 mt-8 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-gray-500 text-sm">
              Made with ❤️ for music creators everywhere
            </p>
            <div className="flex items-center space-x-4 text-gray-500 text-sm">
              <span>Version 1.0</span>
              <span>•</span>
              <span>Beta</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
