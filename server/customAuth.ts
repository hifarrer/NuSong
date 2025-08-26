import { Request, Response, NextFunction, Express } from 'express';
import session from 'express-session';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { storage } from './storage';
import type { User } from '@shared/schema';
import { EmailService } from './emailService';

declare module 'express-session' {
  interface SessionData {
    userId: string;
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

export type LoginData = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;

// Hash password
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Middleware to check if user is authenticated
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
}

// Middleware to load user from session
export async function loadUser(req: Request, res: Response, next: NextFunction) {
  if (req.session?.userId) {
    try {
      const user = await storage.getUserById(req.session.userId);
      if (user) {
        req.user = user;
      }
    } catch (error) {
      console.error('Error loading user from session:', error);
    }
  }
  next();
}

// Setup custom authentication routes
export function setupCustomAuth(app: Express) {
  // Setup session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // set to true if using HTTPS
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));
  // Load user middleware for all routes
  app.use(loadUser);

  // Register route
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      const { firstName, lastName, email, password } = registerSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: 'Email already registered' });
      }

      // Get the free plan ID
      const freePlan = await storage.getAllSubscriptionPlans();
      const freePlanId = freePlan.find(plan => plan.name === "Free")?.id;
      
      // Hash password and create user (NOT verified by default)
      const passwordHash = await hashPassword(password);
      const user = await storage.createUser({
        firstName,
        lastName,
        email,
        passwordHash,
        emailVerified: false,
        subscriptionPlanId: freePlanId || null,
        planStatus: 'free',
      });

      // Generate and set verification token
      const verificationToken = EmailService.generateVerificationToken();
      const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      await storage.setEmailVerificationToken(user.id, verificationToken, tokenExpiry);

      // Send verification email
      try {
        await EmailService.sendVerificationEmail(email, firstName, verificationToken);
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
        // Still return success - user can request resend
      }

      // DO NOT create session - user must verify email first
      res.status(201).json({ 
        message: 'Registration successful. Please check your email to verify your account.',
        email,
        firstName
      });
    } catch (error) {
      console.error('Registration error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid input data' });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Login route
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { email, password } = loginSchema.parse(req.body);

      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      // Verify password
      const isValidPassword = await verifyPassword(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      // Check if email is verified
      if (!user.emailVerified) {
        return res.status(403).json({ 
          message: 'Please verify your email address before logging in. Check your inbox for the verification link.',
          emailVerificationRequired: true
        });
      }

      // Create session
      req.session.userId = user.id;

      // Return user without password hash
      const { passwordHash: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid input data' });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Logout route
  app.post('/api/auth/logout', (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ message: 'Failed to logout' });
      }
      res.clearCookie('connect.sid');
      res.redirect('/');
    });
  });

  // Alternative logout route for compatibility
  app.get('/api/logout', (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ message: 'Failed to logout' });
      }
      res.clearCookie('connect.sid');
      res.redirect('/');
    });
  });

  // Email verification route
  app.get('/api/auth/verify-email/:token', async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      
      if (!token) {
        return res.status(400).json({ message: 'Verification token is required' });
      }

      const verifiedUser = await storage.verifyUserEmail(token);
      if (!verifiedUser) {
        return res.status(400).json({ 
          message: 'Invalid or expired verification token. Please request a new verification email.',
          expired: true
        });
      }

      // Send welcome email
      try {
        await EmailService.sendWelcomeEmail(verifiedUser.email, verifiedUser.firstName);
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Continue - verification was successful
      }

      // Return success with user info
      const { passwordHash: _, ...userWithoutPassword } = verifiedUser;
      res.json({ 
        message: 'Email verified successfully! You can now log in to your account.',
        user: userWithoutPassword,
        verified: true
      });
    } catch (error) {
      console.error('Email verification error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Resend verification email route
  app.post('/api/auth/resend-verification', async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (user.emailVerified) {
        return res.status(400).json({ message: 'Email is already verified' });
      }

      // Generate new verification token
      const verificationToken = EmailService.generateVerificationToken();
      const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      await storage.setEmailVerificationToken(user.id, verificationToken, tokenExpiry);

      // Send verification email
      await EmailService.sendVerificationEmail(user.email, user.firstName, verificationToken);

      res.json({ 
        message: 'Verification email sent. Please check your inbox.',
        email: user.email
      });
    } catch (error) {
      console.error('Resend verification error:', error);
      res.status(500).json({ message: 'Failed to send verification email' });
    }
  });

  // Request password reset
  app.post('/api/auth/request-password-reset', async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if user exists or not for security
        return res.json({ 
          message: 'If an account with that email exists, we\'ve sent password reset instructions.' 
        });
      }

      if (!user.emailVerified) {
        return res.status(400).json({ 
          message: 'Please verify your email address first before resetting your password.' 
        });
      }

      // Generate password reset token
      const resetToken = EmailService.generatePasswordResetToken();
      const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await storage.setPasswordResetToken(user.id, resetToken, tokenExpiry);

      // Send password reset email
      await EmailService.sendPasswordResetEmail(user.email, user.firstName, resetToken);

      res.json({ 
        message: 'If an account with that email exists, we\'ve sent password reset instructions.'
      });
    } catch (error) {
      console.error('Password reset request error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Reset password with token
  app.post('/api/auth/reset-password', async (req: Request, res: Response) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ message: 'Token and new password are required' });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters long' });
      }

      // Hash new password
      const passwordHash = await hashPassword(newPassword);

      // Reset password using token
      const updatedUser = await storage.resetUserPassword(token, passwordHash);
      if (!updatedUser) {
        return res.status(400).json({ 
          message: 'Invalid or expired reset token. Please request a new password reset.' 
        });
      }

      res.json({ 
        message: 'Password reset successfully. You can now log in with your new password.',
        email: updatedUser.email
      });
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Update user email route
  app.put('/api/user/email', requireAuth, async (req: Request, res: Response) => {
    try {
      const { newEmail } = req.body;
      if (!newEmail || typeof newEmail !== 'string') {
        return res.status(400).json({ message: 'New email is required' });
      }

      const userId = req.session.userId!;
      
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(newEmail);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ message: 'Email already in use' });
      }

      // Update user email
      const updatedUser = await storage.updateUserEmail(userId, newEmail);
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      const { passwordHash: _, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Update email error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Update user password route
  app.put('/api/user/password', requireAuth, async (req: Request, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current password and new password are required' });
      }

      const userId = req.session.userId!;
      const user = await storage.getUserById(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Verify current password
      const isValidPassword = await verifyPassword(currentPassword, user.passwordHash);
      if (!isValidPassword) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }

      // Hash new password
      const newPasswordHash = await hashPassword(newPassword);
      
      // Update password
      const updatedUser = await storage.updateUserPassword(userId, newPasswordHash);
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      const { passwordHash: _, ...userWithoutPassword } = updatedUser;
      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      console.error('Update password error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Update user avatar route
  app.put('/api/user/avatar', requireAuth, async (req: Request, res: Response) => {
    try {
      const { avatarPath } = req.body as { avatarPath?: string };
      if (!avatarPath || typeof avatarPath !== 'string') {
        return res.status(400).json({ message: 'avatarPath is required' });
      }

      // Basic validation: only allow images from public avatars directory
      if (!avatarPath.startsWith('/avatars/') || !avatarPath.endsWith('.png')) {
        return res.status(400).json({ message: 'Invalid avatar path' });
      }

      const userId = req.session.userId!;
      const updated = await storage.updateUser(userId, { profileImageUrl: avatarPath });
      if (!updated) {
        return res.status(404).json({ message: 'User not found' });
      }

      const { passwordHash: _, ...userWithoutPassword } = updated;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Update avatar error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get current user route
  app.get('/api/auth/user', (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Return user without password hash
    const { passwordHash: _, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });
}