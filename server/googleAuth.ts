import { OAuth2Client } from 'google-auth-library';
import { storage } from './storage';
import { hashPassword } from './customAuth';

export class GoogleAuthService {
  private static client: OAuth2Client;

  static initialize() {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.warn('Google OAuth credentials not configured. Google Sign-In will be disabled.');
      return;
    }

    this.client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || `${process.env.BASE_URL || 'http://localhost:5000'}/api/auth/google/callback`
    );
  }

  static getAuthUrl(): string {
    if (!this.client) {
      throw new Error('Google OAuth not initialized');
    }

    return this.client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
      ],
      prompt: 'select_account'
    });
  }

  static async verifyToken(token: string): Promise<GoogleUserInfo> {
    if (!this.client) {
      throw new Error('Google OAuth not initialized');
    }

    try {
      const ticket = await this.client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new Error('Invalid token payload');
      }

      return {
        id: payload.sub,
        email: payload.email!,
        name: payload.name!,
        picture: payload.picture,
        emailVerified: payload.email_verified || false
      };
    } catch (error) {
      console.error('Google token verification failed:', error);
      throw new Error('Invalid Google token');
    }
  }

  static async handleGoogleAuth(googleUser: GoogleUserInfo): Promise<{ user: any; isNewUser: boolean }> {
    try {
      // Check if user exists by Google ID
      let user = await storage.getUserByGoogleId(googleUser.id);
      let isNewUser = false;

      if (user) {
        // Update Google info if needed
        if (user.googleEmail !== googleUser.email || user.googleName !== googleUser.name) {
          await storage.updateUser(user.id, {
            googleEmail: googleUser.email,
            googleName: googleUser.name,
            googlePicture: googleUser.picture,
            emailVerified: true // Google emails are pre-verified
          });
          user = await storage.getUserById(user.id);
        }
      } else {
        // Check if user exists by email (for account syncing)
        const existingUser = await storage.getUserByEmail(googleUser.email);
        
        if (existingUser) {
          // Sync existing account with Google
          await storage.updateUser(existingUser.id, {
            googleId: googleUser.id,
            googleEmail: googleUser.email,
            googleName: googleUser.name,
            googlePicture: googleUser.picture,
            emailVerified: true, // Mark as verified since Google verified it
            authMethod: existingUser.passwordHash ? 'both' : 'google'
          });
          user = await storage.getUserById(existingUser.id);
        } else {
          // Create new user
          const freePlan = await storage.getAllSubscriptionPlans();
          const freePlanId = freePlan.find(plan => plan.name === "Free")?.id;

          user = await storage.createUser({
            firstName: googleUser.name.split(' ')[0] || 'User',
            lastName: googleUser.name.split(' ').slice(1).join(' ') || '',
            email: googleUser.email,
            passwordHash: null, // No password for Google users
            emailVerified: true, // Google emails are pre-verified
            googleId: googleUser.id,
            googleEmail: googleUser.email,
            googleName: googleUser.name,
            googlePicture: googleUser.picture,
            authMethod: 'google',
            subscriptionPlanId: freePlanId || null,
            planStatus: 'free',
          });
          isNewUser = true;
        }
      }

      if (!user) {
        throw new Error('Failed to create or retrieve user');
      }

      return { user, isNewUser };
    } catch (error) {
      console.error('Google auth handling failed:', error);
      throw new Error('Authentication failed');
    }
  }
}

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
  emailVerified: boolean;
}
