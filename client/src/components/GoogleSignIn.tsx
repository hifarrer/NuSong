import { useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

// Extend the global window object to include Google Identity Services
declare global {
  interface Window {
    google: any;
  }
}

interface GoogleSignInProps {
  onSuccess?: () => void;
  disabled?: boolean;
  className?: string;
}

export function GoogleSignIn({ onSuccess, disabled = false, className = '' }: GoogleSignInProps) {
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const googleSignInMutation = useMutation({
    mutationFn: async (token: string) => {
      const response = await apiRequest('/api/auth/google/verify', 'POST', { token });
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.setQueryData(['/api/auth/user'], result.user);
      if (onSuccess) {
        onSuccess();
      } else {
        setLocation('/');
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Google Sign-In Failed',
        description: error.message || 'Failed to sign in with Google',
        variant: 'destructive',
      });
    },
  });

  useEffect(() => {
    const initializeGoogleSignIn = () => {
      if (!window.google || !googleButtonRef.current) return;

      try {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: (response: any) => {
            if (response.credential) {
              googleSignInMutation.mutate(response.credential);
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'outline',
          size: 'large',
          width: '100%',
          text: 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left',
        });
      } catch (error) {
        console.error('Failed to initialize Google Sign-In:', error);
      }
    };

    // Wait for Google Identity Services to load
    const checkGoogleLoaded = () => {
      if (window.google) {
        initializeGoogleSignIn();
      } else {
        setTimeout(checkGoogleLoaded, 100);
      }
    };

    checkGoogleLoaded();
  }, [googleSignInMutation]);

  if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
    return null; // Don't render if Google Client ID is not configured
  }

  return (
    <div className={`google-signin-container ${className}`}>
      <div 
        ref={googleButtonRef} 
        className={`w-full ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
        data-testid="google-signin-button"
      />
    </div>
  );
}
